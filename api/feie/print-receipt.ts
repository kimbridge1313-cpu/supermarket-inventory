import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const FEIE_URL = process.env.FEIE_API_URL ?? "https://api.jp.feieyun.com/Api/Open/";
const CUT_TAG = "<CUT>";

type SuccessPayload = {
  ok: true;
  orderId?: string;
  message: string;
};

type ErrorPayload = {
  ok: false;
  message: string;
};

function estimatePrintedLines(content: string) {
  const text = content
    .replace(/<CUT>/g, "")
    .replace(/<BC128_[ABC]>[^<]*<\/BC128_[ABC]>/g, "BARCODE")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .trim();

  const explicitBreaks = (content.match(/<BR>/g) || []).length;
  const weightedChars = [...text].reduce((total, char) => {
    return total + (char.charCodeAt(0) > 255 ? 1 : 0.5);
  }, 0);

  return explicitBreaks + Math.ceil(weightedChars / 12);
}

function dynamicFeedLines(content: string) {
  const forced = Number(process.env.FEIE_FEED_LINES_BEFORE_CUT || "");
  if (Number.isFinite(forced) && forced > 0) return Math.max(1, Math.min(8, forced));

  const estimatedLines = estimatePrintedLines(content);
  if (estimatedLines <= 6) return 1;
  if (estimatedLines <= 10) return 2;
  return 3;
}

function normalizePrintContent(rawContent: unknown) {
  const contentWithoutCut = String(rawContent ?? "")
    .replaceAll(CUT_TAG, "")
    .replace(/(<BR>\s*)+$/g, "");
  const feed = "<BR>".repeat(dynamicFeedLines(contentWithoutCut));
  return `${contentWithoutCut}${feed}${CUT_TAG}`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<SuccessPayload | ErrorPayload>
) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const { sn: bodySn, content, times = 1 } = req.body ?? {};
    const user = process.env.FEIE_USER;
    const secret = process.env.FEIE_SECRET;
    const sn = bodySn || process.env.FEIE_DEFAULT_SN;

    if (!user || !secret) {
      return res.status(500).json({ ok: false, message: "Missing Feie environment variables on Vercel" });
    }

    if (!sn || !content) {
      return res.status(400).json({ ok: false, message: "Missing printer SN or print content" });
    }

    const printContent = normalizePrintContent(content);
    const stime = Math.floor(Date.now() / 1000).toString();
    const sig = crypto.createHash("sha1").update(`${user}${secret}${stime}`).digest("hex");

    const form = new URLSearchParams();
    form.set("user", user);
    form.set("stime", stime);
    form.set("sig", sig);
    form.set("apiname", "Open_printMsg");
    form.set("sn", String(sn));
    form.set("content", printContent);
    form.set("times", String(times));

    const response = await fetch(FEIE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const result = await response.json();

    if (result?.ret === 0) {
      return res.status(200).json({ ok: true, orderId: result.data, message: "Print job submitted" });
    }

    return res.status(400).json({ ok: false, message: result?.msg ?? "Feie API error" });
  } catch (error) {
    console.error("feie print api failed", error);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
}
