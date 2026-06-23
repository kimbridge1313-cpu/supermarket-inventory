import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

type StatusBody = {
  user?: string;
  ukey?: string;
  sn?: string;
};

type FeieResponse = {
  ret?: number;
  msg?: string;
  data?: unknown;
  serverExecutedTime?: number;
};

const FEIE_STATUS_URL = "https://api.feieyun.cn/Api/Open/queryPrinterStatus";

function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ ok: false, status: message });
}

function makeSignature(user: string, ukey: string, stime: string): string {
  return crypto.createHash("sha1").update(`${user}${ukey}${stime}`).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, status: "Method not allowed" });
  }

  const body = (req.body ?? {}) as StatusBody;
  const user = String(body.user ?? "").trim();
  const ukey = String(body.ukey ?? "").trim();
  const sn = String(body.sn ?? "").trim();

  if (!user) return badRequest(res, "Missing required field: user");
  if (!ukey) return badRequest(res, "Missing required field: ukey");
  if (!sn) return badRequest(res, "Missing required field: sn");

  const stime = String(Math.floor(Date.now() / 1000));
  const sig = makeSignature(user, ukey, stime);

  const params = new URLSearchParams({
    user,
    stime,
    sig,
    apiname: "Open_queryPrinterStatus",
    sn,
  });

  try {
    const response = await fetch(FEIE_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
    });

    const rawText = await response.text();
    let parsed: FeieResponse | string = rawText;
    try {
      parsed = JSON.parse(rawText) as FeieResponse;
    } catch {
      // keep raw text for debugging
    }

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        status: `Feie HTTP ${response.status}`,
        raw: parsed,
      });
    }

    const feie = parsed as FeieResponse;
    const ok = feie.ret === 0;
    return res.status(ok ? 200 : 500).json({
      ok,
      status: ok ? String(feie.data ?? feie.msg ?? "已取得狀態") : feie.msg || "飛鵝狀態查詢失敗",
      raw: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      ok: false,
      status: `Failed to call Feie status API: ${message}`,
    });
  }
}
