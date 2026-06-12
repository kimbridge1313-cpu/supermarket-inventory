import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const FEIE_URL = "https://api.de.feieyun.com/Api/Open/";

type SuccessPayload = {
  ok: true;
  orderId?: string;
  message: string;
};

type ErrorPayload = {
  ok: false;
  message: string;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<SuccessPayload | ErrorPayload>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const { user, ukey, sn, content, times = 1 } = req.body ?? {};

    if (!user || !ukey || !sn || !content) {
      return res.status(400).json({
        ok: false,
        message: "Missing required parameters",
      });
    }

    const stime = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHash("sha1")
      .update(`${user}${ukey}${stime}`)
      .digest("hex");

    const form = new URLSearchParams();
    form.set("user", String(user));
    form.set("stime", stime);
    form.set("sig", sig);
    form.set("apiname", "Open_printMsg");
    form.set("sn", String(sn));
    form.set("content", String(content));
    form.set("times", String(times));

    const response = await fetch(FEIE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const result = await response.json();

    if (result?.ret === 0) {
      return res.status(200).json({
        ok: true,
        orderId: result.data,
        message: "Print job submitted",
      });
    }

    return res.status(400).json({
      ok: false,
      message: result?.msg ?? "Feie API error",
    });
  } catch (error) {
    console.error("feie print api failed", error);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
