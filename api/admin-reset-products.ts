import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CONFIRM_TOKEN = "Zp5yfLu10ofwT51X6BhH1ftMKV84DGDdm_SAB8mA4TI";
const BATCH_SIZE = 300;

const b64url = (input: string | Buffer) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");
const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const databaseRoot = () => `projects/${projectId()}/databases/(default)`;
const firestoreBase = () => `https://firestore.googleapis.com/v1/${databaseRoot()}/documents`;

async function readJsonSafe(response: Response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { rawText: raw.slice(0, 500) };
  }
}

async function getAccessToken() {
  if (!projectId()) throw new Error("Missing Firebase project id environment variable");
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!email || !key) throw new Error("Missing service account environment variables");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const data: any = await readJsonSafe(response);
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error?.message || data.rawText || "Unable to get access token");
  }
  return data.access_token as string;
}

async function firestoreFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data: any = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(data.error?.message || data.rawText || `Firestore request failed (${response.status})`);
  }
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  if (String(req.query.confirm || "") !== CONFIRM_TOKEN || String(req.query.scope || "") !== "products") {
    return res.status(403).json({ ok: false, message: "Invalid confirmation" });
  }

  try {
    const token = await getAccessToken();
    const listUrl = `${firestoreBase()}/products?pageSize=${BATCH_SIZE}&showMissing=false`;
    const listed: any = await firestoreFetch(token, listUrl);
    const documents = Array.isArray(listed.documents) ? listed.documents : [];

    if (!documents.length) {
      return res.status(200).json({ ok: true, deleted: 0, hasMore: false, collection: "products" });
    }

    const writes = documents
      .map((document: any) => ({ delete: String(document.name || "") }))
      .filter((write: any) => write.delete);

    const committed: any = await firestoreFetch(
      token,
      `https://firestore.googleapis.com/v1/${databaseRoot()}/documents:commit`,
      {
        method: "POST",
        body: JSON.stringify({ writes }),
      },
    );

    return res.status(200).json({
      ok: true,
      deleted: writes.length,
      hasMore: documents.length === BATCH_SIZE,
      collection: "products",
      commitTime: committed.commitTime || null,
    });
  } catch (error) {
    console.error("product reset failed", error);
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Product reset failed",
    });
  }
}
