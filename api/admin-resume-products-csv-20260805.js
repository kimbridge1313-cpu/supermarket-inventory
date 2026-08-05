import crypto from "node:crypto";

export const config = { maxDuration: 60 };

const SECRET = "kf-resume-20260805-y7N4dQ3pV9sL";
const FILE_ID = "10Q2sVnm6nwDHLlzt_KI6q4j78nznKYJr";
const JOB_ID = "productsCsv20260802";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const BATCH_SIZE = 250;
const MAX_PER_CALL = 1000;
const MAX_RUN_MS = 45000;

const flavorWords = ["巧克力","牛奶","草莓","起司","海苔","原味","辣味","甜辣","紅燒牛肉","蔥燒牛肉","豚骨","咖哩","檸檬","水蜜桃","葡萄","蘋果","芒果","鳳梨","蜂蜜","抹茶","焙茶","奶茶","黑糖","焦糖","香草","咖啡","可可","鹽味","海鹽","蒜香","麻辣","泡菜"];
const specPattern = /\d+(?:\.\d+)?\s?(?:ml|mL|ML|cc|CC|l|L|g|G|kg|KG|公克|公斤|斤|台斤|兩|入|抽|包|罐|瓶|盒|袋|片|枚|pcs|PCS)/g;

const projectId = () => process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");
const documentsRoot = () => `projects/${projectId()}/databases/(default)/documents`;
const firestoreBase = () => `https://firestore.googleapis.com/v1/${documentsRoot()}`;
const b64url = (input) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function readJsonSafe(response, label) {
  const raw = await response.text();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { return { error: { message: `${label} returned non-JSON: ${raw.slice(0, 500)}` }, rawText: raw.slice(0, 500) }; }
}

async function getAccessToken() {
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!projectId()) throw new Error("Missing Firebase project id");
  if (!email || !key) throw new Error("Missing service account credentials");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/datastore",
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));
  const unsigned = `${header}.${payload}`;
  const assertion = `${unsigned}.${b64url(crypto.sign("RSA-SHA256", Buffer.from(unsigned), key))}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await readJsonSafe(response, "OAuth");
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error?.message || data.error || "OAuth failed");
  return data.access_token;
}

async function downloadCsv(token) {
  const response = await fetch(`${DRIVE_API}/files/${FILE_ID}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Unable to download CSV: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = new TextDecoder("big5").decode(buffer);
  return { buffer, text };
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((value) => String(value || "").trim().toLowerCase());
  return rows.slice(1).filter((cells) => cells.some((value) => String(value || "").trim())).map((cells, index) => {
    const item = { __row: index + 2 };
    headers.forEach((header, col) => { item[header] = String(cells[col] || "").trim(); });
    return item;
  });
}

function toNumber(value) {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
function cleanNamePrefix(name) { return String(name || "").replace(/^\s*[（(][^）)]{1,6}[）)]\s*/g, "").trim(); }
function extractSpec(name) {
  const specs = [];
  let match;
  while ((match = specPattern.exec(name)) !== null) specs.push(match[0].replace(/\s+/g, ""));
  specPattern.lastIndex = 0;
  return specs.join(" ");
}
function generateLabelName(name) {
  let base = cleanNamePrefix(name);
  const spec = extractSpec(base);
  if (spec) { base = base.replace(specPattern, ""); specPattern.lastIndex = 0; }
  base = base.replace(/[（(].*?[）)]/g, "").replace(/口味/g, "").replace(/袋裝|盒裝|罐裝|瓶裝|家庭號|補充包|經濟包/g, "").replace(/\s+/g, "").trim();
  const flavor = flavorWords.find((word) => base.includes(word));
  if (flavor) {
    const main = base.replace(flavor, "").replace(/[－\-—_]/g, "").trim();
    return { labelName: main ? `${main}－${flavor}` : flavor, spec };
  }
  return { labelName: base.length > 14 ? base.slice(0, 14) : base, spec };
}
function normalizeSearch(text) { return String(text || "").toLowerCase().replace(/[\s\-－_()（）\[\]【】.,，、/\\]+/g, "").trim(); }
function keywordsFromText(...values) {
  const set = new Set();
  for (const value of values) {
    const clean = normalizeSearch(value);
    if (!clean) continue;
    set.add(clean);
    if (/^[a-z0-9]+$/.test(clean)) for (let len = 2; len <= Math.min(8, clean.length); len++) set.add(clean.slice(0, len));
    const chars = [...clean];
    for (let n = 1; n <= 4; n++) for (let i = 0; i <= chars.length - n; i++) set.add(chars.slice(i, i + n).join(""));
  }
  return [...set].filter(Boolean).slice(0, 180);
}
function docIdFromValue(value) { return encodeURIComponent(String(value || "").trim()).replace(/\./g, "%2E").slice(0, 900); }
function selectPrice(row) {
  const p0 = toNumber(row.saleprice0), p1 = toNumber(row.saleprice1), p2 = toNumber(row.saleprice2);
  return p0 > 0 ? p0 : p1 > 0 ? p1 : p2;
}
function productFromRow(row, importedAt) {
  const barcode = String(row.gsno || "").trim();
  const name = String(row.gsname || "").trim();
  const generated = generateLabelName(name);
  const price = selectPrice(row);
  const categoryCode = String(row.csno1 || "").trim();
  const category = String(row.csname || "").trim();
  const supplierCode = String(row.spno1 || "").trim();
  const supplier = String(row.spname || "").trim();
  return {
    barcode,
    name,
    labelName: generated.labelName,
    searchKeywords: keywordsFromText(barcode, name, generated.labelName, category, categoryCode, supplier, supplierCode, generated.spec),
    nameVi: "",
    nameId: "",
    translationStatus: { vi: "empty", id: "empty" },
    categoryCode,
    category,
    departmentCode: String(row.dvno1 || "").trim(),
    supplierCode,
    supplier,
    cost: toNumber(row.lprice),
    price,
    untaxed: price,
    salePrice0: toNumber(row.saleprice0),
    salePrice1: toNumber(row.saleprice1),
    salePrice2: toNumber(row.saleprice2),
    spec: generated.spec,
    firstDate: String(row.firstdate || "").trim(),
    lastDate: String(row.lastdate || "").trim(),
    lastPurchaseDate: String(row.lastrpdate || "").trim(),
    lastSaleDate: String(row.lastsldate || "").trim(),
    stock: 0,
    source: "drive_csv_import",
    sourceFileId: FILE_ID,
    sourceRow: Number(row.__row || 0),
    createdAt: importedAt,
    updatedAt: importedAt,
  };
}
function fsValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.slice(0, 180).map(fsValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, fsValue(val)])) } };
  return { stringValue: String(value) };
}
function fieldsFromObject(object) { return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fsValue(value)])); }
function jsValue(value) {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, val]) => [key, jsValue(val)]));
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(jsValue);
  return undefined;
}
async function fsRequest(token, url, init = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const data = await readJsonSafe(response, "Firestore");
  if (!response.ok) throw new Error(data.error?.message || data.rawText || `Firestore ${response.status}`);
  return data;
}
async function readJob(token) {
  const response = await fetch(`${firestoreBase()}/importJobs/${JOB_ID}`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  const data = await readJsonSafe(response, "Import job");
  if (!response.ok) throw new Error(data.error?.message || "Unable to read import job");
  return Object.fromEntries(Object.entries(data.fields || {}).map(([key, value]) => [key, jsValue(value)]));
}
async function commitBatch(token, products, nextCursor, meta) {
  const importedAt = new Date().toISOString();
  const writes = products.map((row) => {
    const product = productFromRow(row, importedAt);
    return { update: { name: `${documentsRoot()}/products/${docIdFromValue(product.barcode)}`, fields: fieldsFromObject(product) } };
  });
  writes.push({ update: { name: `${documentsRoot()}/importJobs/${JOB_ID}`, fields: fieldsFromObject({ ...meta, cursor: nextCursor, completed: nextCursor >= meta.importableRows, updatedAt: importedAt }) } });
  await fsRequest(token, `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents:commit`, { method: "POST", body: JSON.stringify({ writes }) });
}
async function countProducts(token) {
  const data = await fsRequest(token, `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents:runAggregationQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredAggregationQuery: { aggregations: [{ alias: "count", count: {} }], structuredQuery: { from: [{ collectionId: "products" }] } } })
  });
  const first = Array.isArray(data) ? data[0] : data;
  return Number(first?.result?.aggregateFields?.count?.integerValue || 0);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false, message: "Method not allowed" });
  if (String(req.query?.token || "") !== SECRET) return res.status(403).json({ ok: false, message: "Forbidden" });
  const started = Date.now();
  try {
    const token = await getAccessToken();
    const { buffer, text } = await downloadCsv(token);
    const parsedRows = parseCsv(text);
    const lastByBarcode = new Map();
    for (const row of parsedRows) {
      const barcode = String(row.gsno || "").trim();
      if (barcode) lastByBarcode.set(barcode, row);
    }
    const uniqueRows = [...lastByBarcode.values()];
    const importable = uniqueRows.filter((row) => String(row.gsname || "").trim());
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = await readJob(token);
    if (existing?.fileSha256 && existing.fileSha256 !== sha256) throw new Error("CSV file changed since the original import");
    const meta = {
      status: "running",
      fileId: FILE_ID,
      fileName: "單品資料.csv",
      fileSha256: sha256,
      totalRows: parsedRows.length,
      uniqueRows: uniqueRows.length,
      duplicateRows: parsedRows.length - uniqueRows.length,
      emptyNameRows: uniqueRows.length - importable.length,
      replacementCharacters: (text.match(/�/g) || []).length,
      importableRows: importable.length,
      startedAt: existing?.startedAt || new Date().toISOString(),
    };
    let cursor = Math.max(0, Number(existing?.cursor || 0));
    let importedThisCall = 0;
    let commits = 0;
    while (cursor < importable.length && importedThisCall < MAX_PER_CALL && Date.now() - started < MAX_RUN_MS) {
      const batch = importable.slice(cursor, Math.min(cursor + BATCH_SIZE, importable.length));
      const nextCursor = cursor + batch.length;
      await commitBatch(token, batch, nextCursor, meta);
      cursor = nextCursor;
      importedThisCall += batch.length;
      commits += 1;
    }
    const completed = cursor >= importable.length;
    const productCount = completed ? await countProducts(token) : null;
    return res.status(200).json({ ok: true, cursor, importedThisCall, commits, completed, productCount, importableRows: importable.length, remaining: Math.max(0, importable.length - cursor), elapsedMs: Date.now() - started });
  } catch (error) {
    console.error("resume CSV import failed", error);
    return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Import failed", elapsedMs: Date.now() - started });
  }
}
