import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");
const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const firestoreBase = () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;

async function readJsonSafe(response: Response, label: string) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { error: { message: `${label} returned non-JSON response: ${raw.slice(0, 500)}` }, rawText: raw.slice(0, 500) }; }
}

async function getAccessToken() {
  if (!projectId()) throw new Error("Missing Firebase project id environment variable");
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!email || !key) throw new Error("Missing service account environment variables");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/datastore", aud: TOKEN_URL, exp: now + 3600, iat: now }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), key);
  const response = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(signature)}` }) });
  const data: any = await readJsonSafe(response, "Google OAuth");
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error?.message || data.error || "Unable to get access token");
  return data.access_token as string;
}

function jsValue(value: any): any {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("arrayValue" in value) return (value.arrayValue.values || []).map((item: any) => jsValue(item));
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, val]) => [key, jsValue(val)]));
  return undefined;
}

function normalizeSearch(text: string) {
  return String(text || "").toLowerCase().replace(/[\s\-－_()（）\[\]【】.,，、/\\]+/g, "").trim();
}

function supplierDoc(document: any) {
  return {
    id: String(document.name || "").split("/").pop() || "",
    ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, val]) => [key, jsValue(val)]))
  };
}

async function runSupplierKeywordQuery(token: string, keyword: string, maxResults: number) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: "suppliers" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "searchKeywords" },
          op: "ARRAY_CONTAINS",
          value: { stringValue: keyword }
        }
      },
      limit: maxResults
    }
  };
  const response = await fetch(`${firestoreBase()}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data: any = await readJsonSafe(response, "Firestore supplier search");
  if (!response.ok) throw new Error(data.error?.message || data.rawText || "Unable to search suppliers");
  return (Array.isArray(data) ? data : []).filter((row: any) => row.document).map((row: any) => supplierDoc(row.document));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
  try {
    const q = normalizeSearch(String(req.query.q || ""));
    const maxResults = Math.min(20, Math.max(1, Number(req.query.limit || 20)));
    if (!q) return res.status(200).json({ ok: true, suppliers: [], count: 0, message: "請輸入廠商代號或廠商名稱再查詢" });
    const token = await getAccessToken();
    const suppliers = await runSupplierKeywordQuery(token, q, maxResults);
    suppliers.sort((a, b) => String(a.code || a.name || "").localeCompare(String(b.code || b.name || ""), "zh-Hant"));
    return res.status(200).json({ ok: true, suppliers, count: suppliers.length, q });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Unable to search suppliers" });
  }
}
