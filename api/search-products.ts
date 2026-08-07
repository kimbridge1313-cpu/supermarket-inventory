import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const IDENTITY_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");
const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const firebaseApiKey = () => process.env.VITE_FIREBASE_API_KEY || "";

async function readJsonSafe(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return { rawText: raw.slice(0, 500) }; }
}

async function verifyFirebaseIdToken(idToken: string) {
  if (!firebaseApiKey()) throw new Error("Missing Firebase API key");
  const response = await fetch(`${IDENTITY_LOOKUP_URL}?key=${encodeURIComponent(firebaseApiKey())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const data: any = await readJsonSafe(response);
  if (!response.ok || !Array.isArray(data.users) || !data.users.length) {
    const message = data.error?.message || data.rawText || "Invalid Firebase login";
    const error: any = new Error(message);
    error.status = 401;
    throw error;
  }
  return data.users[0];
}

async function getServiceAccountToken() {
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!projectId() || !email || !key) throw new Error("Missing Firestore service account configuration");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now
  }));
  const unsigned = `${header}.${payload}`;
  const assertion = `${unsigned}.${b64url(crypto.sign("RSA-SHA256", Buffer.from(unsigned), key))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data: any = await readJsonSafe(response);
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error?.message || data.error || `OAuth ${response.status}`);
  return data.access_token as string;
}

function normalizeSearch(text: string) {
  return String(text || "").toLowerCase().replace(/[\s\-－_()（）\[\]【】.,，、/\\]+/g, "").trim();
}

function jsValue(value: any): any {
  if (!value) return undefined;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map((item: any) => jsValue(item));
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, val]) => [key, jsValue(val)]));
  return undefined;
}

function productDocument(document: any) {
  const rawId = String(document.name || "").split("/").pop() || "";
  let docId = rawId;
  try { docId = decodeURIComponent(rawId); } catch {}
  return {
    docId,
    ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, jsValue(value)]))
  };
}

function longSearchWindows(term: string) {
  const chars = [...term];
  const windows: string[] = [];
  for (let i = 0; i <= chars.length - 4 && windows.length < 10; i++) {
    const value = chars.slice(i, i + 4).join("");
    if (value && !windows.includes(value)) windows.push(value);
  }
  return windows;
}

function productMatchesTerm(product: any, term: string) {
  const values = [
    product?.barcode,
    product?.name,
    product?.labelName,
    product?.nameVi,
    product?.nameVietnamese,
    product?.nameId,
    product?.nameIndonesian,
    product?.category,
    product?.supplier,
    product?.supplierCode,
    product?.spec,
  ];
  return values.some((value) => normalizeSearch(String(value || "")).includes(term));
}

async function queryProducts(token: string, input: string) {
  const raw = String(input || "").trim();
  const term = normalizeSearch(raw);
  const looksLikeBarcode = /^[0-9A-Za-z]+$/.test(raw) && raw.length >= 5;
  if (!looksLikeBarcode && term.length < 2) return [];

  const isLongTextSearch = !looksLikeBarcode && [...term].length > 4;
  const fieldPath = looksLikeBarcode ? "barcode" : "searchKeywords";
  const windows = isLongTextSearch ? longSearchWindows(term) : [];
  const op = looksLikeBarcode ? "EQUAL" : isLongTextSearch ? "ARRAY_CONTAINS_ANY" : "ARRAY_CONTAINS";
  const value = looksLikeBarcode
    ? { stringValue: raw }
    : isLongTextSearch
      ? { arrayValue: { values: windows.map((window) => ({ stringValue: window })) } }
      : { stringValue: term };

  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)/documents:runQuery`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "products" }],
          where: { fieldFilter: { field: { fieldPath }, op, value } },
          limit: looksLikeBarcode ? 1 : isLongTextSearch ? 200 : 20
        }
      }),
      signal: controller.signal
    });
    const data: any = await readJsonSafe(response);
    if (!response.ok) {
      const error: any = new Error(data.error?.message || data.rawText || `Firestore ${response.status}`);
      error.status = response.status;
      error.code = data.error?.status || "FIRESTORE_ERROR";
      throw error;
    }
    const products = (Array.isArray(data) ? data : [])
      .filter((row: any) => row.document)
      .map((row: any) => productDocument(row.document));
    return isLongTextSearch
      ? products.filter((product: any) => productMatchesTerm(product, term)).slice(0, 20)
      : products;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Firestore server query timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
  const authorization = String(req.headers.authorization || "");
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) return res.status(401).json({ ok: false, code: "AUTH_REQUIRED", message: "請重新登入後再查詢" });

  try {
    await verifyFirebaseIdToken(idToken);
    const token = await getServiceAccountToken();
    const products = await queryProducts(token, String(req.query.q || ""));
    return res.status(200).json({ ok: true, products, count: products.length, mode: "server" });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      ok: false,
      code: error?.code || (status === 401 ? "AUTH_ERROR" : "SEARCH_ERROR"),
      message: error?.message || String(error)
    });
  }
}
