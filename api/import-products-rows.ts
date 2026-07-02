import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ProductRow = { barcode: string; name: string; category?: string; supplierCode?: string; supplier?: string; cost?: number; price?: number; untaxed?: number; spec?: string };
type FsValue = { stringValue: string } | { integerValue: string } | { doubleValue: number } | { booleanValue: boolean } | { nullValue: null } | { mapValue: { fields: Record<string, FsValue> } } | { arrayValue: { values: FsValue[] } };

const specPattern = /\d+(?:\.\d+)?\s?(?:ml|mL|ML|cc|CC|l|L|g|G|kg|KG|公克|公斤|斤|台斤|兩|入|抽|包|罐|瓶|盒|袋|片|枚|pcs|PCS)/g;
const flavorWords = ["巧克力", "牛奶", "草莓", "起司", "海苔", "原味", "辣味", "甜辣", "紅燒牛肉", "蔥燒牛肉", "豚骨", "咖哩", "檸檬", "水蜜桃", "葡萄", "蘋果", "芒果", "鳳梨", "蜂蜜", "抹茶", "焙茶", "奶茶", "黑糖", "焦糖", "香草", "咖啡", "可可", "鹽味", "海鹽", "蒜香", "麻辣", "泡菜"];

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

function fsValue(value: any): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.slice(0, 180).map((item) => fsValue(item)) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, fsValue(val)])) } };
  return { stringValue: String(value) };
}

async function fsFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const data: any = await readJsonSafe(response, "Firestore");
  if (!response.ok) throw new Error(data.error?.message || data.rawText || "Firestore request failed");
  return data;
}

function cleanNamePrefix(name: string) { return String(name || "").replace(/^\s*[（(][^）)]{1,6}[）)]\s*/g, "").trim(); }
function extractSpec(name: string) { const specs: string[] = []; let match: RegExpExecArray | null; while ((match = specPattern.exec(name)) !== null) specs.push(match[0].replace(/\s+/g, "")); specPattern.lastIndex = 0; return specs.join(" "); }
function generateLabelName(name: string) { let base = cleanNamePrefix(name); const spec = extractSpec(base); if (spec) { base = base.replace(specPattern, ""); specPattern.lastIndex = 0; } base = base.replace(/[（(].*?[）)]/g, "").replace(/口味/g, "").replace(/袋裝|盒裝|罐裝|瓶裝|家庭號|補充包|經濟包/g, "").replace(/\s+/g, "").trim(); const flavor = flavorWords.find((word) => base.includes(word)); if (flavor) { const main = base.replace(flavor, "").replace(/[－\-—_]/g, "").trim(); return { labelName: main ? `${main}－${flavor}` : flavor, spec }; } return { labelName: base.length > 14 ? base.slice(0, 14) : base, spec }; }
function docIdFromValue(value: string) { return encodeURIComponent(String(value || "").trim()).replace(/\./g, "%2E").slice(0, 900) || `empty-${Date.now()}`; }
function supplierKey(product: ProductRow) { return String(product.supplierCode || product.supplier || "").trim(); }
function normalizeSearch(text: string) { return String(text || "").toLowerCase().replace(/[\s\-－_()（）\[\]【】.,，、/\\]+/g, "").trim(); }
function keywordsFromText(...values: string[]) {
  const set = new Set<string>();
  for (const value of values) {
    const clean = normalizeSearch(value);
    if (!clean) continue;
    set.add(clean);
    if (/^[a-z0-9]+$/.test(clean)) {
      for (let len = 2; len <= Math.min(8, clean.length); len++) set.add(clean.slice(0, len));
    }
    const chars = [...clean];
    for (let n = 1; n <= 4; n++) {
      for (let i = 0; i <= chars.length - n; i++) set.add(chars.slice(i, i + n).join(""));
    }
  }
  return [...set].filter(Boolean).slice(0, 180);
}

function productFields(product: ProductRow) {
  const generated = generateLabelName(product.name || "");
  const labelName = generated.labelName;
  return {
    barcode: product.barcode,
    name: product.name,
    labelName,
    searchKeywords: keywordsFromText(product.barcode, product.name || "", labelName, product.category || "", product.supplier || "", product.supplierCode || "", product.spec || ""),
    nameVi: "",
    nameId: "",
    translationStatus: { vi: "empty", id: "empty" },
    category: product.category || "",
    supplierCode: product.supplierCode || "",
    supplier: product.supplier || "",
    cost: Number(product.cost || 0),
    price: Number(product.price || 0),
    untaxed: Number(product.untaxed || product.price || 0),
    spec: product.spec || generated.spec,
    stock: 0,
    source: "upload_rows",
    updatedAt: new Date().toISOString()
  };
}

async function upsertProduct(token: string, product: ProductRow) {
  const docId = docIdFromValue(product.barcode);
  const fields = { ...productFields(product), createdAt: new Date().toISOString() };
  await fsFetch(token, `${firestoreBase()}/products/${docId}`, { method: "PATCH", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fsValue(value)])) }) });
}

async function upsertSupplier(token: string, product: ProductRow, supplierCounts: Record<string, number>) {
  const key = supplierKey(product);
  if (!key) return false;
  const docId = docIdFromValue(key);
  const name = product.supplier || product.supplierCode || key;
  const code = product.supplierCode || key;
  const fields = {
    code,
    name,
    searchKeywords: keywordsFromText(code, name),
    source: "upload_rows",
    productCount: Number(supplierCounts[key] || 0),
    updatedAt: new Date().toISOString()
  };
  await fsFetch(token, `${firestoreBase()}/suppliers/${docId}`, { method: "PATCH", body: JSON.stringify({ fields: Object.fromEntries(Object.entries({ ...fields, createdAt: new Date().toISOString() }).map(([field, value]) => [field, fsValue(value)])) }) });
  return true;
}

async function createRecord(token: string, collectionName: string, payload: Record<string, any>) {
  await fsFetch(token, `${firestoreBase()}/${collectionName}`, { method: "POST", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, fsValue(value)])) }) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });
  const rows = Array.isArray(req.body?.products) ? req.body.products as ProductRow[] : [];
  if (!rows.length) return res.status(400).json({ ok: false, message: "Missing product rows" });
  const fileName = String(req.body?.fileName || "uploaded-pos-file.htm");
  const cursor = Math.max(0, Number(req.body?.cursor || 0));
  const totalRows = Math.max(rows.length, Number(req.body?.totalRows || rows.length));
  const supplierCounts = req.body?.supplierCounts && typeof req.body.supplierCounts === "object" ? req.body.supplierCounts as Record<string, number> : {};
  const startedAt = new Date().toISOString();

  try {
    const token = await getAccessToken();
    let upsertedCount = 0, supplierTouched = 0, errorCount = 0;
    const supplierKeys = new Set<string>();

    for (const product of rows) {
      try {
        if (!product.barcode || !product.name) continue;
        await upsertProduct(token, product);
        upsertedCount += 1;
        const key = supplierKey(product);
        if (key && !supplierKeys.has(key)) {
          supplierKeys.add(key);
          const touched = await upsertSupplier(token, product, supplierCounts);
          if (touched) supplierTouched += 1;
        }
      } catch (error) {
        console.error("row import failed", product.barcode, error);
        errorCount += 1;
      }
    }

    await createRecord(token, "syncRuns", { status: "partial", mode: "initial_upload_rows_fast", fileName, startedAt, finishedAt: new Date().toISOString(), cursor, totalRows, processedRows: rows.length, upsertedCount, supplierTouched, errorCount });
    return res.status(200).json({ ok: true, mode: "initial_upload_rows_fast", fileName, cursor, totalRows, processedRows: rows.length, upsertedCount, createdCount: upsertedCount, updatedCount: 0, skippedCount: 0, reviewCount: 0, errorCount, suppliersCreated: supplierTouched, suppliersUpdated: 0 });
  } catch (error) {
    console.error("row import failed", error);
    return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Row import failed" });
  }
}
