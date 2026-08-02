import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");
const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";

async function readJsonSafe(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return { rawText: raw.slice(0, 500) }; }
}

async function getAccessToken() {
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!projectId() || !email || !key) throw new Error("Missing service account configuration");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/datastore", aud: TOKEN_URL, exp: now + 3600, iat: now }));
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
  try {
    const token = await getAccessToken();
    const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)/documents:runQuery`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "products" }], limit: 1 } })
    });
    const data: any = await readJsonSafe(response);
    if (!response.ok) {
      return res.status(200).json({ ok: false, firestoreStatus: response.status, code: data.error?.status || "UNKNOWN", message: data.error?.message || data.rawText || "Firestore request failed" });
    }
    const rows = Array.isArray(data) ? data : [];
    return res.status(200).json({ ok: true, firestoreStatus: response.status, returnedDocuments: rows.filter((row: any) => row.document).length });
  } catch (error: any) {
    return res.status(200).json({ ok: false, code: "PROBE_ERROR", message: error?.message || String(error) });
  }
}
