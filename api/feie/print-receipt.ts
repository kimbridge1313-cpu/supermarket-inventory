import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { buildFeiePriceCard, escapeFeieText } from "../../lib/feie-price-card.mjs";

const FEIE_URL = process.env.FEIE_API_URL ?? "https://api.jp.feieyun.com/Api/Open/";
const IDENTITY_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

async function readJsonSafe(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return { rawText: raw.slice(0, 500) }; }
}

async function verifyFirebaseIdToken(idToken: string) {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || "";
  if (!apiKey) throw Object.assign(new Error("Missing Firebase API key"), { status: 500, code: "AUTH_CONFIG_ERROR" });
  const response = await fetch(`${IDENTITY_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data: any = await readJsonSafe(response);
  if (!response.ok || !Array.isArray(data.users) || !data.users.length) {
    throw Object.assign(new Error(data.error?.message || data.rawText || "Invalid Firebase login"), {
      status: 401,
      code: "AUTH_ERROR",
    });
  }
  return data.users[0];
}

function getBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); }
    catch { return {}; }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

function feedLines() {
  const value = Number(process.env.FEIE_FEED_LINES_BEFORE_CUT || "0");
  return Number.isFinite(value) ? Math.max(0, Math.min(8, value)) : 0;
}

function normalizePrinterSn(value: unknown) {
  const sn = escapeFeieText(value);
  if (!sn) return "";
  if (!/^[0-9A-Za-z_-]{1,64}$/.test(sn)) throw Object.assign(new Error("Invalid printer SN"), { status: 400, code: "INVALID_PRINTER_SN" });
  return sn;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });

  const authorization = String(req.headers.authorization || "");
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", message: "請重新登入後再操作貨卡" });

  try {
    await verifyFirebaseIdToken(idToken);
    const body = getBody(req);
    if ("content" in body || "times" in body) {
      return res.status(400).json({ ok: false, code: "RAW_CONTENT_NOT_ALLOWED", message: "不得直接傳入列印指令或份數" });
    }

    const action = body.action === "print" ? "print" : body.action === "preview" ? "preview" : "";
    if (!action) return res.status(400).json({ ok: false, code: "INVALID_ACTION", message: "action 必須是 preview 或 print" });
    if (!body.product || typeof body.product !== "object") {
      return res.status(400).json({ ok: false, code: "INVALID_PRODUCT", message: "缺少商品資料" });
    }

    const printerSn = normalizePrinterSn(body.sn || process.env.FEIE_DEFAULT_SN || "");
    const card = buildFeiePriceCard({ product: body.product, settings: body.settings, feedLines: feedLines() });
    const fingerprint = crypto.createHash("sha256").update(card.markup).digest("hex").slice(0, 16);

    if (action === "preview") {
      return res.status(200).json({
        ok: true,
        action,
        markup: card.markup,
        content: { ...card.content, printerSn: printerSn || "使用 Vercel 預設印表機" },
        fingerprint,
      });
    }

    const user = process.env.FEIE_USER;
    const secret = process.env.FEIE_SECRET;
    if (!user || !secret || !printerSn) {
      return res.status(500).json({ ok: false, code: "FEIE_CONFIG_ERROR", message: "飛鵝帳號、密鑰或印表機 SN 尚未設定" });
    }

    const stime = Math.floor(Date.now() / 1000).toString();
    const sig = crypto.createHash("sha1").update(`${user}${secret}${stime}`).digest("hex");
    const form = new URLSearchParams({
      user,
      stime,
      sig,
      apiname: "Open_printMsg",
      sn: printerSn,
      content: card.markup,
      times: "1",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(FEIE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: controller.signal,
      });
      const result: any = await readJsonSafe(response);
      if (!response.ok || result?.ret !== 0) {
        return res.status(502).json({
          ok: false,
          code: "FEIE_API_ERROR",
          message: result?.msg || result?.rawText || `飛鵝 API 回應 ${response.status}`,
        });
      }
      return res.status(200).json({
        ok: true,
        action,
        orderId: result.data,
        message: "貨卡已送出列印",
        content: { ...card.content, printerSn },
        fingerprint,
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({ ok: false, code: "FEIE_TIMEOUT", message: "飛鵝列印請求逾時" });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    console.error("feie price card api failed", error);
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      code: error?.code || "FEIE_PRINT_ERROR",
      message: error?.message || "Internal server error",
    });
  }
}
