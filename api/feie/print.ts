import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

type PrintBody = {
  user?: string;
  ukey?: string;
  sn?: string;
  content?: string;
  times?: number;
};

type FeieResponse = {
  ret?: number;
  msg?: string;
  data?: unknown;
  serverExecutedTime?: number;
};

const FEIE_PRINT_URL = "https://api.feieyun.cn/Api/Open/printMsg";

function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ ok: false, message });
}

function makeSignature(user: string, ukey: string, stime: string): string {
  return crypto.createHash("sha1").update(`${user}${ukey}${stime}`).digest("hex");
}

function coerceTimes(value: unknown): number {
  const num = Number(value ?? 1);
  if (!Number.isFinite(num) || num <= 0) return 1;
  return Math.floor(num);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const body = (req.body ?? {}) as PrintBody;
  const user = String(body.user ?? "").trim();
  const ukey = String(body.ukey ?? "").trim();
  const sn = String(body.sn ?? "").trim();
  const content = String(body.content ?? "").trim();
  const times = coerceTimes(body.times);

  if (!user) return badRequest(res, "Missing required field: user");
  if (!ukey) return badRequest(res, "Missing required field: ukey");
  if (!sn) return badRequest(res, "Missing required field: sn");
  if (!content) return badRequest(res, "Missing required field: content");

  const stime = String(Math.floor(Date.now() / 1000));
  const sig = makeSignature(user, ukey, stime);

  const params = new URLSearchParams({
    user,
    stime,
    sig,
    apiname: "Open_printMsg",
    sn,
    content,
    times: String(times),
  });

  try {
    const response = await fetch(FEIE_PRINT_URL, {
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
        message: `Feie HTTP ${response.status}`,
        raw: parsed,
      });
    }

    const feie = parsed as FeieResponse;
    const ok = feie.ret === 0;
    return res.status(ok ? 200 : 500).json({
      ok,
      message: ok ? "列印任務已送出" : feie.msg || "飛鵝列印失敗",
      raw: parsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      ok: false,
      message: `Failed to call Feie print API: ${message}`,
    });
  }
}
