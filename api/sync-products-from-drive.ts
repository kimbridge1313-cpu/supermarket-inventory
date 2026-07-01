import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const ALLOWED_EXTENSIONS = [".htm", ".html"];

const flavorWords = [
  "巧克力", "牛奶", "草莓", "起司", "海苔", "原味", "辣味", "甜辣", "紅燒牛肉", "蔥燒牛肉",
  "豚骨", "咖哩", "檸檬", "水蜜桃", "葡萄", "蘋果", "芒果", "鳳梨", "蜂蜜", "抹茶",
  "焙茶", "奶茶", "黑糖", "焦糖", "香草", "咖啡", "可可", "鹽味", "海鹽", "蒜香",
  "麻辣", "泡菜"
];

const specPattern = /\d+(?:\.\d+)?\s?(?:ml|mL|ML|cc|CC|l|L|g|G|kg|KG|公克|公斤|斤|台斤|兩|入|抽|包|罐|瓶|盒|袋|片|枚|pcs|PCS)/g;

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FsValue> } };

type ProductRow = {
  barcode: string;
  name: string;
  category: string;
  supplierCode: string;
  supplier: string;
  cost: number;
  price: number;
  untaxed: number;
  spec: string;
};

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\n/g, "\n");

function getProjectId() {
  const id = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!id) throw new Error("Missing Firebase project id environment variable");
  return id;
}

function firestoreBase() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function cleanNamePrefix(name: string) {
  return String(name || "").replace(/^\s*[（(][^）)]{1,6}[）)]\s*/g, "").trim();
}

function extractSpec(name: string) {
  const specs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = specPattern.exec(name)) !== null) specs.push(match[0].replace(/\s+/g, ""));
  specPattern.lastIndex = 0;
  return specs.join(" ");
}

function generateLabelName(name: string) {
  let base = cleanNamePrefix(name);
  const spec = extractSpec(base);
  if (spec) {
    base = base.replace(specPattern, "");
    specPattern.lastIndex = 0;
  }
  base = base
    .replace(/[（(].*?[）)]/g, "")
    .replace(/口味/g, "")
    .replace(/袋裝|盒裝|罐裝|瓶裝|家庭號|補充包|經濟包/g, "")
    .replace(/\s+/g, "")
    .trim();

  const flavor = flavorWords.find((word) => base.includes(word));
  if (flavor) {
    const main = base.replace(flavor, "").replace(/[－\-—_]/g, "").trim();
    return { labelName: main ? `${main}－${flavor}` : flavor, spec };
  }

  return { labelName: base.length > 14 ? base.slice(0, 14) : base, spec };
}

async function getAccessToken() {
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const key = signingKey();
  if (!email || !key) throw new Error("Missing Drive service account environment variables");

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
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), key);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || "Unable to get access token");
  return data.access_token as string;
}

async function driveLatestFile(token: string, folderId: string) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime,size)",
    orderBy: "modifiedTime desc",
    pageSize: "20",
  });
  const response = await fetch(`${DRIVE_API}/files?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Unable to list Drive files");
  return (data.files || []).find((file: any) => {
    const name = String(file.name || "").toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  });
}

async function downloadText(token: string, fileId: string) {
  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Unable to download Drive file");
  const buffer = await response.arrayBuffer();
  const big5 = new TextDecoder("big5").decode(buffer);
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  return big5.includes("GSNO") || big5.includes("GSNAME") ? big5 : utf8;
}

const strip = (html: string) => html.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

const toNumber = (value: string) => {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

function parsePosHtml(html: string): ProductRow[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => strip(cell[1]))
  );
  const headerIndex = rows.findIndex((row) => row.includes("GSNO") && row.some((cell) => cell.includes("GSNAME")));
  if (headerIndex < 0) throw new Error("Invalid POS product file: missing header row");

  const headers = rows[headerIndex];
  const col = (name: string) => headers.findIndex((header) => header === name);
  const get = (row: string[], name: string) => {
    const index = col(name);
    return index >= 0 ? row[index] || "" : "";
  };

  return rows.slice(headerIndex + 1).map((row) => ({
    barcode: get(row, "GSNOLINK") || get(row, "GSNO"),
    name: get(row, "GSNAME"),
    category: get(row, "CSNAME") || get(row, "GSTYPE"),
    supplierCode: get(row, "SPNO1") || get(row, "SPNO"),
    supplier: get(row, "SPNAME") || get(row, "SPNO1") || get(row, "SPNO"),
    cost: toNumber(get(row, "PRCHLPRICE") || get(row, "LPRICE")),
    price: toNumber(get(row, "SALEPRICE0") || get(row, "SALEPRICE1")),
    untaxed: toNumber(get(row, "TAXPRICE")),
    spec: get(row, "GSSPEC") || get(row, "SPEC") || "",
  })).filter((product) => product.barcode && product.name);
}

function fsValue(value: any): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, fsValue(val)])) } };
  return { stringValue: String(value) };
}

function jsValue(value: any): any {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, val]) => [key, jsValue(val)]));
  }
  return undefined;
}

async function fsFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Firestore request failed");
  return data;
}

async function getSyncState(token: string) {
  const response = await fetch(`${firestoreBase()}/syncState/driveLatest`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  const data = await response.json();
  return Object.fromEntries(Object.entries(data.fields || {}).map(([key, val]) => [key, jsValue(val)]));
}

async function saveSyncState(token: string, file: any) {
  await fsFetch(token, `${firestoreBase()}/syncState/driveLatest`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { fileId: fsValue(file.id), fileName: fsValue(file.name), fileModifiedTime: fsValue(file.modifiedTime), syncedAt: fsValue(new Date().toISOString()) } }),
  });
}

async function findProduct(token: string, barcode: string) {
  const data = await fsFetch(token, `${firestoreBase()}:runQuery`, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "products" }], where: { fieldFilter: { field: { fieldPath: "barcode" }, op: "EQUAL", value: { stringValue: barcode } } }, limit: 1 } }),
  });
  const document = data.find((row: any) => row.document)?.document;
  if (!document) return null;
  return { url: `https://firestore.googleapis.com/v1/${document.name}`, data: Object.fromEntries(Object.entries(document.fields || {}).map(([key, val]) => [key, jsValue(val)])) };
}

function productCreateFields(product: ProductRow) {
  const generated = generateLabelName(product.name);
  return Object.fromEntries(Object.entries({
    barcode: product.barcode,
    name: product.name,
    labelName: generated.labelName,
    nameVi: "",
    nameId: "",
    translationStatus: { vi: "empty", id: "empty" },
    category: product.category,
    supplierCode: product.supplierCode,
    supplier: product.supplier,
    cost: product.cost,
    price: product.price,
    untaxed: product.untaxed || product.price,
    spec: product.spec || generated.spec,
    stock: 0,
    source: "googleDrive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).map(([key, value]) => [key, fsValue(value)]));
}

async function createProduct(token: string, product: ProductRow) {
  await fsFetch(token, `${firestoreBase()}/products`, { method: "POST", body: JSON.stringify({ fields: productCreateFields(product) }) });
}

async function updateProduct(token: string, documentUrl: string, fields: Record<string, any>) {
  const params = new URLSearchParams();
  Object.keys(fields).forEach((key) => params.append("updateMask.fieldPaths", key));
  await fsFetch(token, `${documentUrl}?${params}`, { method: "PATCH", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fsValue(value)])) }) });
}

async function createRecord(token: string, collectionName: string, payload: Record<string, any>) {
  await fsFetch(token, `${firestoreBase()}/${collectionName}`, { method: "POST", body: JSON.stringify({ fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, fsValue(value)])) }) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const folderId = req.body?.folderId || process.env.DRIVE_FOLDER_ID;
  if (!folderId) return res.status(400).json({ ok: false, message: "Missing Drive folder id" });

  const startedAt = new Date().toISOString();

  try {
    const token = await getAccessToken();
    const file = await driveLatestFile(token, folderId);
    if (!file) return res.status(404).json({ ok: false, message: "No valid product file found" });

    const state = await getSyncState(token);
    if (state?.fileId === file.id && state?.fileModifiedTime === file.modifiedTime) {
      await createRecord(token, "syncRuns", { status: "skipped", fileId: file.id, fileName: file.name, fileModifiedTime: file.modifiedTime, startedAt, finishedAt: new Date().toISOString(), message: "Latest file already synced" });
      return res.status(200).json({ ok: true, status: "skipped", file });
    }

    const html = await downloadText(token, file.id);
    const products = parsePosHtml(html);
    if (!products.length) throw new Error("No valid product rows parsed");

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let reviewCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const existing = await findProduct(token, product.barcode);
        const generated = generateLabelName(product.name);
        if (!existing) {
          await createProduct(token, product);
          await createRecord(token, "labelPrintQueue", { barcode: product.barcode, name: product.name, labelName: generated.labelName, oldPrice: 0, newPrice: product.price, reason: "new_product", status: "pending", createdAt: new Date().toISOString() });
          createdCount += 1;
          continue;
        }

        const oldPrice = Number(existing.data.price || 0);
        const changes: Record<string, any> = {
          category: product.category,
          supplierCode: product.supplierCode,
          supplier: product.supplier,
          cost: product.cost,
          price: product.price,
          untaxed: product.untaxed || product.price,
          spec: product.spec || existing.data.spec || generated.spec || "",
          source: "googleDrive",
          updatedAt: new Date().toISOString(),
        };

        if (!existing.data.labelName) changes.labelName = generated.labelName;

        if (existing.data.name !== product.name) {
          changes.pendingNameFromPos = product.name;
          reviewCount += 1;
        }

        const hasPriceChanged = oldPrice !== product.price;
        const hasAnyChange = Object.entries(changes).some(([key, value]) => existing.data[key] !== value);

        if (hasAnyChange) {
          await updateProduct(token, existing.url, changes);
          updatedCount += 1;
          if (hasPriceChanged) {
            await createRecord(token, "labelPrintQueue", { barcode: product.barcode, name: existing.data.name || product.name, labelName: existing.data.labelName || generated.labelName, oldPrice, newPrice: product.price, reason: "price_changed", status: "pending", createdAt: new Date().toISOString() });
          }
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        console.error("product sync row failed", product.barcode, error);
        errorCount += 1;
      }
    }

    await saveSyncState(token, file);
    await createRecord(token, "syncRuns", { status: "success", fileId: file.id, fileName: file.name, fileModifiedTime: file.modifiedTime, startedAt, finishedAt: new Date().toISOString(), totalRows: products.length, createdCount, updatedCount, skippedCount, reviewCount, errorCount });

    return res.status(200).json({ ok: true, file, totalRows: products.length, createdCount, updatedCount, skippedCount, reviewCount, errorCount });
  } catch (error) {
    console.error("drive sync failed", error);
    return res.status(500).json({ ok: false, message: error instanceof Error ? error.message : "Drive sync failed" });
  }
}
