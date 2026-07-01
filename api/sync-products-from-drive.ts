import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const allowedExtensions = [".htm", ".html", ".csv"];

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

type NormalizedProduct = {
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
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const cleanSigningKey = (value = "") => value.replace(/\\n/g, "\n");

async function getAccessToken() {
  const email = process.env.DRIVE_CLIENT_EMAIL;
  const signingKey = cleanSigningKey(process.env.DRIVE_SIGNING_KEY);

  if (!email || !signingKey) {
    throw new Error("Missing Drive service account environment variables");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: email,
      scope:
        "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/datastore",
      aud: OAUTH_TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), signingKey);
  const assertion = `${unsigned}.${b64url(signature)}`;

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to get access token");
  }
  return data.access_token as string;
}

function projectId() {
  const id = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!id) throw new Error("Missing Firebase project id environment variable");
  return id;
}

function firestoreBase() {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

async function latestDriveFile(token: string, folderId: string) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,modifiedTime,size)",
    orderBy: "modifiedTime desc",
    pageSize: "20",
  });
  const response = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Unable to list Drive files");
  return (data.files || []).find((file: any) => {
    const name = String(file.name || "").toLowerCase();
    return allowedExtensions.some((ext) => name.endsWith(ext));
  });
}

async function downloadDriveFile(token: string, fileId: string) {
  const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Unable to download Drive file");
  const buffer = await response.arrayBuffer();
  const big5 = new TextDecoder("big5").decode(buffer);
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  return big5.includes("GSNO") || big5.includes("GSNAME") ? big5 : utf8;
}

const stripTags = (html: string) =>
  html
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const num = (value: string) => {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

function parseHtmlProducts(html: string): NormalizedProduct[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1]))
  );
  const headerIndex = rows.findIndex(
    (row) => row.includes("GSNO") && row.some((cell) => cell.includes("GSNAME"))
  );
  if (headerIndex < 0) throw new Error("Invalid POS product file: missing header row");

  const headers = rows[headerIndex];
  const indexOf = (name: string) => headers.findIndex((header) => header === name);
  const get = (row: string[], name: string) => {
    const index = indexOf(name);
    return index >= 0 ? row[index] || "" : "";
  };

  return rows
    .slice(headerIndex + 1)
    .map((row) => {
      const barcode = get(row, "GSNOLINK") || get(row, "GSNO");
      const name = get(row, "GSNAME");
      return {
        barcode,
        name,
        category: get(row, "CSNAME") || get(row, "GSTYPE"),
        supplierCode: get(row, "SPNO1") || get(row, "SPNO"),
        supplier: get(row, "SPNAME") || get(row, "SPNO1") || get(row, "SPNO"),
        cost: num(get(row, "PRCHLPRICE") || get(row, "LPRICE")),
        price: num(get(row, "SALEPRICE0") || get(row, "SALEPRICE1")),
        untaxed: num(get(row, "TAXPRICE")),
        spec: get(row, "GSSPEC") || get(row, "SPEC") || "",
      };
    })
    .filter((product) => product.barcode && product.name);
}

function valueToFs(value: any): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, valueToFs(val)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function fsToJs(value: any): any {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, val]) => [key, fsToJs(val)]));
  }
  return undefined;
}

function productFields(product: NormalizedProduct, extra: Record<string, any> = {}) {
  return Object.fromEntries(
    Object.entries({
      barcode: product.barcode,
      name: product.name,
      nameVi: "",
      nameId: "",
      translationStatus: { vi: "empty", id: "empty" },
      category: product.category,
      supplierCode: product.supplierCode,
      supplier: product.supplier,
      cost: product.cost,
      price: product.price,
      untaxed: product.untaxed || product.price,
      spec: product.spec,
      stock: 0,
      source: "googleDrive",
      updatedAt: new Date().toISOString(),
      ...extra,
    }).map(([key, value]) => [key, valueToFs(value)])
  );
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Firestore request failed");
  return data;
}

async function getSyncState(token: string) {
  const url = `${firestoreBase()}/syncState/driveLatest`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  const data = await response.json();
  const fields = data.fields || {};
  return Object.fromEntries(Object.entries(fields).map(([key, val]) => [key, fsToJs(val)]));
}

async function saveSyncState(token: string, file: any) {
  await firestoreFetch(token, `${firestoreBase()}/syncState/driveLatest`, {
    method: "PATCH",
    body: JSON.stringify({
      fields: {
        fileId: valueToFs(file.id),
        fileName: valueToFs(file.name),
        fileModifiedTime: valueToFs(file.modifiedTime),
        syncedAt: valueToFs(new Date().toISOString()),
      },
    }),
  });
}

async function findProduct(token: string, barcode: string) {
  const data = await firestoreFetch(token, `${firestoreBase()}:runQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "products" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "barcode" },
            op: "EQUAL",
            value: { stringValue: barcode },
          },
        },
        limit: 1,
      },
    }),
  });
  const match = data.find((row: any) => row.document)?.document;
  if (!match) return null;
  const fields = match.fields || {};
  return {
    name: match.name,
    data: Object.fromEntries(Object.entries(fields).map(([key, val]) => [key, fsToJs(val)])),
  };
}

async function createProduct(token: string, product: NormalizedProduct) {
  return firestoreFetch(token, `${firestoreBase()}/products`, {
    method: "POST",
    body: JSON.stringify({ fields: productFields(product, { createdAt: new Date().toISOString() }) }),
  });
}

async function updateProduct(token: string, documentName: string, fields: Record<string, any>) {
  const updateFields = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, valueToFs(value)]));
  const params = new URLSearchParams();
  Object.keys(updateFields).forEach((key) => params.append("updateMask.fieldPaths", key));
  return firestoreFetch(token, `${documentName}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: updateFields }),
  });
}

async function queueLabel(token: string, product: NormalizedProduct, oldPrice: number, reason: string) {
  await firestoreFetch(token, `${firestoreBase()}/labelPrintQueue`, {
    method: "POST",
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries({
          barcode: product.barcode,
          name: product.name,
          oldPrice,
          newPrice: product.price,
          reason,
          status: "pending",
          createdAt: new Date().toISOString(),
        }).map(([key, value]) => [key, valueToFs(value)])
      ),
    }),
  });
}

async function writeSyncRun(token: string, payload: Record<string, any>) {
  await firestoreFetch(token, `${firestoreBase()}/syncRuns`, {
    method: "POST",
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, valueToFs(value)])),
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const folderId = req.body?.folderId || process.env.DRIVE_FOLDER_ID;
  if (!folderId) return res.status(400).json({ ok: false, message: "Missing Drive folder id" });

  const startedAt = new Date().toISOString();

  try {
    const token = await getAccessToken();
    const file = await latestDriveFile(token, folderId);
    if (!file) return res.status(404).json({ ok: false, message: "No valid product file found" });

    const state = await getSyncState(token);
    if (state?.fileId === file.id && state?.fileModifiedTime === file.modifiedTime) {
      await writeSyncRun(token, {
        status: "skipped",
        fileId: file.id,
        fileName: file.name,
        fileModifiedTime: file.modifiedTime,
        startedAt,
        finishedAt: new Date().toISOString(),
        message: "Latest file already synced",
      });
      return res.status(200).json({ ok: true, status: "skipped", file });
    }

    const text = await downloadDriveFile(token, file.id);
    const products = file.name.toLowerCase().endsWith(".csv")
      ? []
      : parseHtmlProducts(text);
    if (!products.length) throw new Error("No valid product rows parsed");

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let reviewCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const existing = await findProduct(token, product.barcode);
        if (!existing) {
          await createProduct(token, product);
          await queueLabel(token, product, 0, "new_product");
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
          spec: product.spec || existing.data.spec || "",
          source: "googleDrive",
          updatedAt: new Date().toISOString(),
        };

        if (existing.data.name !== product.name) {
          changes.pendingNameFromPos = product.name;
          reviewCount += 1;
        }

        const hasPriceChanged = oldPrice !== product.price;
        const changed = Object.entries(changes).some(([key, value]) => existing.data[key] !== value);
        if (changed) {
          await updateProduct(token, existing.name, changes);
          updatedCount += 1;
          if (hasPriceChanged) await queueLabel(token, product, oldPrice, "price_changed");
        } else {
          skippedCount += 1;
        }
      } catch (rowError) {
        console.error("product sync row failed", product.barcode, rowError);
        errorCount += 1;
      }
    }

    await saveSyncState(token, file);
    await writeSyncRun(token, {
      status: "success",
      fileId: file.id,
      fileName: file.name,
      fileModifiedTime: file.modifiedTime,
      startedAt,
      finishedAt: new Date().toISOString(),
      totalRows: products.length,
      createdCount,
      updatedCount,
      skippedCount,
      reviewCount,
      errorCount,
    });

    return res.status(200).json({
      ok: true,
      file,
      totalRows: products.length,
      createdCount,
      updatedCount,
      skippedCount,
      reviewCount,
      errorCount,
    });
  } catch (error) {
    console.error("drive sync failed", error);
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Drive sync failed",
    });
  }
}
