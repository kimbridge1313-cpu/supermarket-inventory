const ALLOWED_TARGETS = new Set(["vi", "id"]);

function normalizeTarget(value: unknown): "vi" | "id" | null {
  return typeof value === "string" && ALLOWED_TARGETS.has(value) ? (value as "vi" | "id") : null;
}

function normalizeSource(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "zh-TW";
}

function extractTranslatedText(payload: unknown): string {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return "";

  return payload[0]
    .map((item) => {
      if (!Array.isArray(item)) return "";
      return typeof item[0] === "string" ? item[0] : "";
    })
    .join("")
    .trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const source = normalizeSource(req.body?.source);
  const target = normalizeTarget(req.body?.target);

  if (!text) {
    return res.status(400).json({ message: "缺少 text" });
  }

  if (!target) {
    return res.status(400).json({ message: "target 只支援 vi 或 id" });
  }

  try {
    const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
    endpoint.searchParams.set("client", "gtx");
    endpoint.searchParams.set("sl", source);
    endpoint.searchParams.set("tl", target);
    endpoint.searchParams.set("dt", "t");
    endpoint.searchParams.set("q", text);

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "supermarket-inventory-translation/1.0",
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      return res.status(502).json({ message: raw || "翻譯服務失敗" });
    }

    const data = await response.json();
    const translatedText = extractTranslatedText(data);

    if (!translatedText) {
      return res.status(502).json({ message: "翻譯服務沒有回傳內容" });
    }

    return res.status(200).json({
      text: translatedText,
      source,
      target,
    });
  } catch (error) {
    console.error("translate-product api failed", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "自動翻譯失敗",
    });
  }
}
