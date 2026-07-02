import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type ProductRow = { barcode: string; name: string; category?: string; supplierCode?: string; supplier?: string; cost?: number; price?: number; untaxed?: number; spec?: string };
type FsDoc = { url: string; id: string; data: Record<string, any> };
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
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => fsValue(item)) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, fsValue(val)])) } };
  return { stringValue: String(value) };
}
function jsValue(value: any): any { if (!value) return undefined; if ("stringValue" in value) return value.stringValue; if ("integerValue" in value) return Number(value.integerValue); if ("doubleValue" in value) return Number(value.doubleValue); if ("booleanValue" in value) return Boolean(value.booleanValue); if ("arrayValue" in value) return (value.arrayValue.values || []).map((item: any) => jsValue(item)); if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, val]) => [key, jsValue(val)])); return undefined; }

async function fsFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const data: any = await readJsonSafe(response, "Firestore");
  if (!response.ok) throw new Error(data.error?.message || data.rawText || "Firestore request failed");
  return data;
}
function docToFsDoc(document: any): FsDoc { const id = String(document.name || "").split("/").pop() || ""; return { url: `https://firestore.googleapis.com/v1/${document.name}`, id, data: Object.fromEntries(Object.entries(document.fields || {}).map(([key, val]) => [key, jsValue(val)])) }; }
async function listCollection(token: string, collectionName: string) { const docs: FsDoc[] = []; let pageToken = ""; do { const params = new URLSearchParams({ pageSize: "1000" }); if (pageToken) params.set("pageToken", pageToken); const data = await fsFetch(token, `${firestoreBase()}/${collectionName}?${params}`); docs.push(...(data.documents || []).map((document: any) => docToFsDoc(document))); pageToken = data.nextPageToken || ""; } while (pageToken); return docs; }
function indexByField(docs: FsDoc[], field: string) { const map = new Map<string, FsDoc>(); docs.forEach((doc) => { const value = String(doc.data[field] || "").trim(); if (value) map.set(value, doc); }); return map; }
function indexProductsByName(products: FsDoc[]) { const map = new Map<string, FsDoc[]>(); products.forEach((product) => { const name = String(product.data.name || "").trim(); if (!name) return; const list = map.get(name) || []; list.push(product); map.set(name, list); }); return map; }
function supplierKey(product: ProductRow) { return String(product.supplierCode || product.supplier || "").trim(); }

function cleanNamePrefix(name: string) { return String(name || "").replace(/^\s*[（(][^）)]{1,6}[）)]\s*/g, "").trim(); }
function extractSpec(name: string) { const specs: string[] = []; let match: RegExpExecArray | null; while ((match = specPattern.exec(name)) !== null) specs.push(match[0].replace(/\s+/g, "")); specPattern.lastIndex = 0; return specs.join(" "); }
function generateLabelName(name: string) { let base = cleanNamePrefix(name); const spec = extractSpec(base); if (spec) { base = base.replace(specPattern, ""); specPattern.lastIndex = 0; } base = base.replace(/[（(].*?[）)]/g, "").replace(/口味/g, "").replace(/袋裝|盒裝|罐裝|瓶裝|家庭號|補充包|經濟包/g, "").replace(/\s+/g, "").trim(); const flavor = flavorWords.find((word) => base.includes(word)); if (flavor) { const main = base.replace(flavor, "").replace(/[－\-—_]/g, "").trim(); return { labelName: main ? `${main}－${flavor}` : flavor, spec }; } return { labelName: base.length > 14 ? base.slice(0, 14) : base, spec }; }

function productCreateFields(product: ProductRow) { const generated = generateLabelName(product.name); return Object.fromEntries(Object.entries({ barcode: product.barcode, name: product.name, labelName: generated.labelName, nameVi: "", nameId: "", translationStatus: { vi: "empty", id: "empty" }, category: product.category || "", supplierCode: product.supplierCode || "", supplier: product.supplier || "", cost: Number(product.cost || 0), price: Number(product.price || 0), untaxed: Number(product.untaxed || product.price || 0), spec: product.spec || generated.spec, stock: 0, source: "upload_rows", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).map(([key, value]) => [key, fsValue(value)])); }
async function createProduct(token: string, product: ProductRow) { const data = await fsFetch(token, `${firestoreBase()}/products`, { method: "POST", body: JSON.stringify({ fields: productCreateFields(product) }) }); return data.name ? docToFsDoc(data) : null; }
async function updateDocFields(token: string, documentUrl: string, fields: Record<string, any>) { const params = new URLSearchParams(); Object.keys(fields).forEach((key) => params.append("updateMask.fieldPaths", key)); await fsFetch(token, `${documentUrl}?${params}`, { method: "PATCH", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fsValue(value)])) }) }); }
async function createRecord(token: string, collectionName: string, payload: Record<string, any>) { await fsFetch(token, `${firestoreBase()}/${collectionName}`, { method: "POST", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, fsValue(value)])) }) }); }

async function syncSuppliers(token: string, batch: ProductRow[], suppliersByKey: Map<string, FsDoc>) {
  const keys = [...new Set(batch.map((product) => supplierKey(product)).filter(Boolean))];
  let created = 0, updated = 0;
  for (const key of keys) {
    const product = batch.find((item) => supplierKey(item) === key);
    if (!product) continue;
    const payload = { code: product.supplierCode || key, name: product.supplier || product.supplierCode || key, source: "upload_rows", updatedAt: new Date().toISOString() };
    const existing = suppliersByKey.get(key);
    if (!existing) {
      const data = await fsFetch(token, `${firestoreBase()}/suppliers`, { method: "POST", body: JSON.stringify({ fields: Object.fromEntries(Object.entries({ ...payload, productCount: 0, createdAt: new Date().toISOString() }).map(([field, value]) => [field, fsValue(value)])) }) });
      if (data.name) suppliersByKey.set(key, docToFsDoc(data));
      created += 1;
    } else {
      const hasChange = Object.entries(payload).some(([field, value]) => existing.data[field] !== value);
      if (hasChange) { await updateDocFields(token, existing.url, payload); existing.data = { ...existing.data, ...payload }; updated += 1; }
    }
  }
  return { created, updated };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });
  const rows = Array.isArray(req.body?.products) ? req.body.products as ProductRow[] : [];
  if (!rows.length) return res.status(400).json({ ok: false, message: "Missing product rows" });
  const fileName = String(req.body?.fileName || "uploaded-pos-file.htm");
  const cursor = Math.max(0, Number(req.body?.cursor || 0));
  const totalRows = Math.max(rows.length, Number(req.body?.totalRows || rows.length));
  const startedAt = new Date().toISOString();

  try {
    const token = await getAccessToken();
    const existingProducts = await listCollection(token, "products");
    const existingSuppliers = await listCollection(token, "suppliers");
    const productsByBarcode = indexByField(existingProducts, "barcode");
    const productsByName = indexProductsByName(existingProducts);
    const suppliersByCode = indexByField(existingSuppliers, "code");
    const suppliersByName = indexByField(existingSuppliers, "name");
    const suppliersByKey = new Map<string, FsDoc>([...suppliersByCode, ...suppliersByName]);
    const supplierResult = await syncSuppliers(token, rows, suppliersByKey);
    let createdCount = 0, updatedCount = 0, skippedCount = 0, reviewCount = 0, errorCount = 0;

    for (const product of rows) {
      try {
        const existing = productsByBarcode.get(String(product.barcode || "")) || null;
        const generated = generateLabelName(product.name || "");
        if (!existing) {
          const sameNameProducts = (productsByName.get(product.name || "") || []).filter((match) => String(match.data.barcode || "") !== String(product.barcode || ""));
          const created = await createProduct(token, product);
          if (created) { productsByBarcode.set(String(product.barcode || ""), created); const list = productsByName.get(product.name || "") || []; list.push(created); productsByName.set(product.name || "", list); }
          if (sameNameProducts.length) { reviewCount += 1; await createRecord(token, "productReviewQueue", { type: "same_name_new_barcode", status: "pending", mode: "initial_upload_rows", name: product.name, newBarcode: product.barcode, newPrice: Number(product.price || 0), possibleOldProducts: sameNameProducts.map((match) => ({ docId: match.id, barcode: match.data.barcode || "", price: Number(match.data.price || 0), labelName: match.data.labelName || "" })), message: "新條碼商品與既有商品名稱完全相同，請確認是否為商品換條碼。", createdAt: new Date().toISOString() }); }
          createdCount += 1;
          continue;
        }
        const changes: Record<string, any> = { category: product.category || "", supplierCode: product.supplierCode || "", supplier: product.supplier || "", cost: Number(product.cost || 0), price: Number(product.price || 0), untaxed: Number(product.untaxed || product.price || 0), spec: product.spec || existing.data.spec || generated.spec || "", source: "upload_rows", updatedAt: new Date().toISOString() };
        if (!existing.data.labelName) changes.labelName = generated.labelName;
        if (existing.data.name !== product.name) { changes.pendingNameFromPos = product.name; reviewCount += 1; }
        const hasAnyChange = Object.entries(changes).some(([key, value]) => existing.data[key] !== value);
        if (hasAnyChange) { await updateDocFields(token, existing.url, changes); existing.data = { ...existing.data, ...changes }; updatedCount += 1; } else { skippedCount += 1; }
      } catch (error) { console.error("row import failed", product.barcode, error); errorCount += 1; }
    }

    await createRecord(token, "syncRuns", { status: "partial", mode: "initial_upload_rows", fileName, startedAt, finishedAt: new Date().toISOString(), cursor, totalRows, processedRows: rows.length, createdCount, updatedCount, skippedCount, reviewCount, errorCount, suppliersCreated: supplierResult.created, suppliersUpdated: supplierResult.updated });
    return res.status(200).json({ ok: true, mode: "initial_upload_rows", fileName, cursor, totalRows, processedRows: rows.length, createdCount, updatedCount, skippedCount, reviewCount, errorCount, suppliersCreated: supplierResult.created, suppliersUpdated: supplierResult.updated });
  } catch (error) {
    console.error("row import failed", error);
    return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Row import failed" });
  }
}
