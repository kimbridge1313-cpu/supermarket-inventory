import React, { useEffect, useMemo, useState } from "react";
import {
  ScanLine,
  Package,
  ArrowDownToLine,
  Printer,
  FileText,
  Pencil,
  Plus,
  CheckCircle2,
  Trash2,
  Truck,
  Layers3,
  Box,
  ChevronDown,
  ChevronUp,
  Settings,
  SlidersHorizontal,
  Upload,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import Barcode from "react-barcode";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  setDoc,
} from "firebase/firestore";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { app, db } from "@/lib/firebase";

type TranslationStatus = {
  vi: "empty" | "auto" | "reviewed";
  id: "empty" | "auto" | "reviewed";
};

type HistoryRecord = {
  date: string;
  type: "進貨" | "退貨";
  qty: number;
  price: number;
  amount: number;
};

type Product = {
  docId?: string;
  barcode: string;
  name: string;
  nameVi: string;
  nameId: string;
  translationStatus: TranslationStatus;
  category: string;
  supplierCode: string;
  supplier: string;
  cost: number;
  price: number;
  untaxed: number;
  stock: number;
  history: HistoryRecord[];
};

type Supplier = {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  note: string;
  active: boolean;
};

type BatchLine = {
  barcode: string;
  product: string;
  supplier: string;
  qty: number;
  price: number;
  amount: number;
  edited?: boolean;
};

type BatchRecord = {
  docId?: string;
  id: string;
  date: string;
  supplier: string;
  totalAmount: number;
  itemCount: number;
  lines: BatchLine[];
};

type LabelTemplate = {
  id: string;
  name: string;
  paperSize: string;
  showNameZh: boolean;
  showNameVi: boolean;
  showNameId: boolean;
  showCategory: boolean;
  showBarcode: boolean;
  showSpec: boolean;
  showUpdatedDate: boolean;
  priceSize: "sm" | "md" | "lg";
  active: boolean;
};

type PrinterDevice = {
  id: string;
  name: string;
  brand: string;
  model: string;
  usage: "貨卡" | "小票" | "備用";
  connectionType: "Wi-Fi" | "Bluetooth" | "Cloud API";
  ipAddress: string;
  port: string;
  deviceId: string;
  paperWidth: string;
  cutterEnabled: boolean;
  isDefault: boolean;
  status: "已連線" | "未連線";
};

type SystemSettings = {
  storeName: string;
  feieUser: string;
  feieUkey: string;
};

type PrintJobResult = {
  ok: boolean;
  orderId?: string;
  message: string;
};

type NavKey =
  | "products"
  | "inbound"
  | "stock"
  | "labels"
  | "records"
  | "settings";

type NavItem = {
  key: NavKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
};

type FlowItem = {
  name: string;
  barcode: string;
  supplier: string;
  qty: number;
  price: number;
  amount: number;
};

type ProductAction =
  | {
      type: "edit" | "print" | "price" | "disable";
      product: Product;
    }
  | null;

type NewProductFields = {
  barcode: string;
  name: string;
  nameVi: string;
  nameId: string;
  translationStatus: TranslationStatus;
  category: string;
  supplierCode: string;
  supplier: string;
  cost: number;
  price: number;
  untaxed: number;
  stock: number;
};

type EditableProductFields = Pick<
  Product,
  | "name"
  | "nameVi"
  | "nameId"
  | "translationStatus"
  | "barcode"
  | "category"
  | "supplierCode"
  | "supplier"
  | "cost"
  | "price"
  | "untaxed"
>;

type TranslationTarget = "vi" | "id";

const initialProducts: Product[] = [
  {
    barcode: "4710012345678",
    name: "可口可樂 600ml",
    nameVi: "Coca-Cola 600ml",
    nameId: "Coca-Cola 600ml",
    translationStatus: { vi: "reviewed", id: "reviewed" },
    category: "飲料",
    supplierCode: "V001",
    supplier: "大發商行",
    cost: 21,
    price: 35,
    untaxed: 33,
    stock: 48,
    history: [
      { date: "2026-06-07", type: "進貨", qty: 24, price: 21, amount: 504 },
      { date: "2026-06-05", type: "進貨", qty: 30, price: 20, amount: 600 },
      { date: "2026-06-03", type: "退貨", qty: -6, price: 20, amount: -120 },
    ],
  },
  {
    barcode: "4710098765432",
    name: "統一鮮奶吐司",
    nameVi: "Bánh mì sữa tươi Uni-President",
    nameId: "Roti tawar susu Uni-President",
    translationStatus: { vi: "auto", id: "auto" },
    category: "麵包",
    supplierCode: "V002",
    supplier: "晨光食品",
    cost: 28,
    price: 45,
    untaxed: 43,
    stock: 16,
    history: [
      { date: "2026-06-08", type: "進貨", qty: 12, price: 28, amount: 336 },
      { date: "2026-06-06", type: "進貨", qty: 15, price: 27, amount: 405 },
    ],
  },
  {
    barcode: "4710001122334",
    name: "義美雞蛋豆腐",
    nameVi: "Đậu phụ trứng I-Mei",
    nameId: "Tahu telur I-Mei",
    translationStatus: { vi: "auto", id: "auto" },
    category: "冷藏",
    supplierCode: "V003",
    supplier: "信成冷鏈",
    cost: 19,
    price: 29,
    untaxed: 28,
    stock: 9,
    history: [
      { date: "2026-06-08", type: "進貨", qty: 20, price: 19, amount: 380 },
      { date: "2026-06-04", type: "退貨", qty: -3, price: 19, amount: -57 },
    ],
  },
];

const initialSuppliers: Supplier[] = [
  {
    id: "sup-001",
    code: "V001",
    name: "大發商行",
    contact: "陳先生",
    phone: "0912-345-678",
    note: "飲料類常用供應商",
    active: true,
  },
  {
    id: "sup-002",
    code: "V002",
    name: "晨光食品",
    contact: "林小姐",
    phone: "0922-888-112",
    note: "吐司與常溫麵包",
    active: true,
  },
  {
    id: "sup-003",
    code: "V003",
    name: "信成冷鏈",
    contact: "王先生",
    phone: "0931-246-810",
    note: "冷藏豆腐、冷藏食品",
    active: true,
  },
];

const initialBatchRecords: BatchRecord[] = [
  {
    id: "BATCH-20260608-001",
    date: "2026-06-08",
    supplier: "晨光食品",
    itemCount: 2,
    totalAmount: 741,
    lines: [
      {
        barcode: "4710098765432",
        product: "統一鮮奶吐司",
        supplier: "晨光食品",
        qty: 12,
        price: 28,
        amount: 336,
      },
      {
        barcode: "4710012345678",
        product: "可口可樂 600ml",
        supplier: "大發商行",
        qty: 15,
        price: 27,
        amount: 405,
      },
    ],
  },
];

const initialLabelTemplates: LabelTemplate[] = [
  {
    id: "tpl-a",
    name: "模板 A｜標準售價卡",
    paperSize: "4 × 6 cm",
    showNameZh: true,
    showNameVi: false,
    showNameId: false,
    showCategory: false,
    showBarcode: true,
    showSpec: true,
    showUpdatedDate: false,
    priceSize: "lg",
    active: true,
  },
];

const initialPrinterDevices: PrinterDevice[] = [
  {
    id: "printer-001",
    name: "貨卡印表機 A",
    brand: "飛鵝",
    model: "V58WHC",
    usage: "貨卡",
    connectionType: "Cloud API",
    ipAddress: "",
    port: "",
    deviceId: "FG-V58-001",
    paperWidth: "57mm",
    cutterEnabled: true,
    isDefault: true,
    status: "已連線",
  },
];

const initialSystemSettings: SystemSettings = {
  storeName: "嘉義門市",
  feieUser: "",
  feieUkey: "",
};

const navItems: NavItem[] = [
  { key: "products", label: "商品主檔", shortLabel: "商品", icon: Package },
  { key: "inbound", label: "進貨作業", shortLabel: "進貨", icon: ArrowDownToLine },
  { key: "stock", label: "庫存查詢", shortLabel: "庫存", icon: Box },
  { key: "labels", label: "貨卡列印", shortLabel: "貨卡", icon: Printer },
  { key: "records", label: "批次紀錄", shortLabel: "紀錄", icon: Layers3 },
  { key: "settings", label: "設定", shortLabel: "設定", icon: Settings },
];

const mobileNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[4],
  navItems[5],
];

function calculateAmount(qty: number, price: number): number {
  return qty * price;
}

function calculateTotal(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function calculateTotalQty(items: { qty: number }[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

function findProductByQuery(list: Product[], queryText: string): Product | null {
  const normalized = queryText.trim();
  if (!normalized) return null;
  return (
    list.find(
      (item) =>
        item.barcode.includes(normalized) ||
        item.name.includes(normalized) ||
        item.nameVi.includes(normalized) ||
        item.nameId.includes(normalized)
    ) ?? null
  );
}

function getLowStockCount(list: Product[], threshold = 10): number {
  return list.filter((item) => item.stock <= threshold).length;
}

function getActiveSupplierCount(list: Supplier[]): number {
  return list.filter((item) => item.active).length;
}

function filterBatchRecords(
  list: BatchRecord[],
  dateQuery: string,
  supplierQuery: string
) {
  return list.filter((item) => {
    const matchDate = !dateQuery || item.date === dateQuery;
    const matchSupplier = !supplierQuery || item.supplier.includes(supplierQuery);
    return matchDate && matchSupplier;
  });
}

function recalcBatchTotals(record: BatchRecord): BatchRecord {
  const lines = record.lines.map((line) => ({
    ...line,
    amount: calculateAmount(line.qty, line.price),
  }));

  return {
    ...record,
    lines,
    itemCount: lines.length,
    totalAmount: calculateTotal(lines),
  };
}

function normalizeBarcodeValue(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();
  return cleaned || "000000000000";
}

function normalizeStoreName(value: string): string {
  return value.trim() || "未設定門店";
}

function buildFeieBarcodeTag(value: string) {
  const normalized = normalizeBarcodeValue(value);
  const isDigitsOnly = /^[0-9]+$/.test(normalized);
  const isUpperAlphaNumeric = /^[0-9A-Z]+$/.test(normalized);
  const isMixedAlphaNumeric = /^[0-9A-Za-z!@#$%^&*()\-_=+]+$/.test(normalized);

  if (isDigitsOnly && normalized.length <= 22) {
    return `<BC128_C>${normalized}</BC128_C>`;
  }

  if (isUpperAlphaNumeric && normalized.length <= 14) {
    return `<BC128_A>${normalized}</BC128_A>`;
  }

  if (isMixedAlphaNumeric && normalized.length <= 14) {
    return `<BC128_B>${normalized}</BC128_B>`;
  }

  return normalized;
}

function buildFlowItem(product: Product, qty: number): FlowItem {
  return {
    name: product.name,
    barcode: product.barcode,
    supplier: product.supplier,
    qty,
    price: product.cost,
    amount: calculateAmount(qty, product.cost),
  };
}

function parseBatchInputValue(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return fallback;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : fallback;
}

function makeCsv(rows: (string | number | boolean)[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function parseCsvFile(file: File) {
  const text = await file.text();
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const parseCell = (cell: string) => cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
  return lines.slice(1).map((line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(parseCell));
}

function normalizeLegacyText(value: unknown) {
  return String(value ?? "")
    .split(" ").join(" ")
    .split("null").join("")
    .trim();
}

function parseLegacyNumber(value: unknown) {
  const normalized = normalizeLegacyText(value).split(",").join("");
  const next = Number(normalized);
  return Number.isFinite(next) ? next : 0;
}

function resolveSupplierByCode(list: Supplier[], supplierCode: string, fallbackName = "") {
  const normalizedCode = supplierCode.trim();
  if (!normalizedCode) {
    return { supplierCode: "", supplier: fallbackName.trim() };
  }
  const matched = list.find((item) => item.code.trim() === normalizedCode);
  if (matched) {
    return { supplierCode: matched.code, supplier: matched.name };
  }
  return { supplierCode: normalizedCode, supplier: fallbackName.trim() || normalizedCode };
}

async function parseLegacyHtmlProductFile(file: File): Promise<NewProductFields[]> {
  const buffer = await file.arrayBuffer();
  let html = "";

  for (const encoding of ["big5", "utf-8"] as const) {
    try {
      html = new TextDecoder(encoding, { fatal: false }).decode(buffer);
      if (html.includes("GSNAME") && html.includes("SALEPRICE0")) break;
    } catch (error) {
      console.error(`decode legacy html failed: ${encoding}`, error);
    }
  }

  if (!html) throw new Error("無法讀取單品資料檔案");

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const rows = Array.from(parsed.querySelectorAll("table tr"));
  if (rows.length <= 1) throw new Error("單品資料表格為空");

  const headers = Array.from(rows[0].querySelectorAll("td,th")).map((cell) => normalizeLegacyText(cell.textContent));
  const getCell = (cells: string[], key: string) => {
    const index = headers.indexOf(key);
    return index >= 0 ? cells[index] ?? "" : "";
  };

  return rows
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll("td,th")).map((cell) => normalizeLegacyText(cell.textContent)))
    .filter((cells) => cells.length > 0)
    .map((cells) => {
      const barcode = normalizeLegacyText(getCell(cells, "GSNOLINK")) || normalizeLegacyText(getCell(cells, "GSNO"));
      const name = normalizeLegacyText(getCell(cells, "GSNAME"));
      const supplierCode = normalizeLegacyText(getCell(cells, "SPNO1")) || normalizeLegacyText(getCell(cells, "SPNO"));
      const supplier = normalizeLegacyText(getCell(cells, "SPNAME")) || supplierCode;
      const category = normalizeLegacyText(getCell(cells, "CSNAME")) || normalizeLegacyText(getCell(cells, "GSTYPE"));
      const cost = parseLegacyNumber(getCell(cells, "PRCHLPRICE")) || parseLegacyNumber(getCell(cells, "LPRICE"));
      const price = parseLegacyNumber(getCell(cells, "SALEPRICE0")) || parseLegacyNumber(getCell(cells, "SALEPRICE1"));
      const untaxed = parseLegacyNumber(getCell(cells, "TAXPRICE")) || price;

      return {
        barcode,
        name,
        nameVi: "",
        nameId: "",
        translationStatus: { vi: "empty", id: "empty" },
        category,
        supplierCode,
        supplier,
        cost,
        price,
        untaxed,
        stock: 0,
      } as NewProductFields;
    })
    .filter((item) => item.barcode && item.name);
}

async function requestAutoTranslate(text: string, target: TranslationTarget): Promise<string> {
  const normalized = text.trim();
  if (!normalized) return "";

  const response = await fetch("/api/translate-product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: normalized,
      source: "zh-TW",
      target,
    }),
  });

  const rawText = await response.text();
  let result: { text?: string; message?: string } | null = null;

  if (rawText) {
    try {
      result = JSON.parse(rawText) as { text?: string; message?: string };
    } catch (error) {
      console.error("parse translate response failed", error, rawText);
    }
  }

  if (!response.ok) {
    throw new Error(result?.message || rawText || "自動翻譯失敗");
  }

  const translated = result?.text?.trim() || "";
  if (!translated) {
    throw new Error("翻譯服務沒有回傳內容");
  }

  return translated;
}

function buildFeieReceiptContent({
  storeName,
  product,
  template,
  printer,
}: {
  storeName: string;
  product: Product;
  template: LabelTemplate;
  printer: PrinterDevice | null;
}) {
  const lines: string[] = [];

  if (template.showBarcode) {
    lines.push(buildFeieBarcodeTag(product.barcode));
  }

  lines.push(normalizeStoreName(storeName));

  if (template.showNameZh) {
    lines.push(`<B>${product.name}</B>`);
  }

  if (template.showNameVi && product.nameVi.trim()) {
    lines.push(product.nameVi.trim());
  }

  if (template.showNameId && product.nameId.trim()) {
    lines.push(product.nameId.trim());
  }

  if (template.showSpec) {
    lines.push(`規格：600ml`);
  }

  lines.push(`<RIGHT><B><B>${product.price}</B></B>元</RIGHT>`);

  return lines.join("<BR>");
}

function BarcodeGraphic({
  value,
  width = 1.8,
  height = 56,
  fontSize = 12,
  margin = 6,
  wrapperClassName = "",
}: {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
  wrapperClassName?: string;
}) {
  const normalized = normalizeBarcodeValue(value);

  return (
    <div className={`rounded-lg border bg-white px-3 py-2 ${wrapperClassName}`.trim()}>
      <div className="overflow-x-auto">
        <Barcode
          value={normalized}
          format="CODE128"
          width={width}
          height={height}
          margin={margin}
          fontSize={fontSize}
          textMargin={4}
          displayValue={true}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>
    </div>
  );
}

function CompactBatchNumberInput({
  value,
  readOnly = false,
  onChange,
}: {
  value: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (readOnly || !onChange) return;
    const next = parseBatchInputValue(draft, value);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={draft}
      readOnly={readOnly}
      onChange={(e) => {
        const next = e.target.value;
        const isValidDraft =
          next === "" ||
          next === "-" ||
          Array.from(next).every((char, idx) =>
            char === "-" ? idx === 0 : char >= "0" && char <= "9"
          );
        if (isValidDraft) setDraft(next);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          e.currentTarget.blur();
        }
      }}
      className="h-8 w-[48px] min-w-[48px] max-w-[48px] rounded-md px-1.5 text-left [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

function BatchTable({
  lines,
  editable = false,
  onQtyChange,
  onPriceChange,
  onDelete,
}: {
  lines: BatchLine[];
  editable?: boolean;
  onQtyChange?: (index: number, value: number) => void;
  onPriceChange?: (index: number, value: number) => void;
  onDelete?: (index: number) => void;
}) {
  const batchGridTemplate =
    "minmax(180px, 1.8fr) minmax(56px, 0.55fr) minmax(64px, 0.62fr) minmax(96px, 0.82fr) 32px";

  return (
    <div className="w-full overflow-x-auto rounded-xl border bg-white">
      <div className="min-w-[440px]">
        <div
          className="grid border-b bg-slate-50 text-left text-sm"
          style={{ gridTemplateColumns: batchGridTemplate }}
        >
          <div className="pl-3 pr-2 py-3 font-medium">商品</div>
          <div className="px-1 py-3 font-medium">數量</div>
          <div className="pl-1 pr-4 py-3 font-medium">單價</div>
          <div className="pl-5 pr-1 py-3 font-medium">小計</div>
          <div className="px-0 py-3 font-medium"></div>
        </div>

        <div>
          {lines.map((line, index) => (
            <div
              key={`${line.barcode}-${index}`}
              className="grid items-start border-t text-sm first:border-t-0"
              style={{ gridTemplateColumns: batchGridTemplate }}
            >
              <div className="min-w-0 pl-3 pr-1.5 py-2.5">
                <div className="font-medium leading-snug">{line.product}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {line.barcode}｜{line.supplier}
                </div>
              </div>
              <div className="pl-1 pr-3 py-2.5">
                <CompactBatchNumberInput
                  value={line.qty}
                  readOnly={!editable}
                  onChange={editable && onQtyChange ? (value) => onQtyChange(index, value) : undefined}
                />
              </div>
              <div className="pl-1 pr-3 py-2.5">
                <CompactBatchNumberInput
                  value={line.price}
                  readOnly={!editable}
                  onChange={editable && onPriceChange ? (value) => onPriceChange(index, value) : undefined}
                />
              </div>
              <div className="pl-5 pr-1 py-2.5 font-medium whitespace-nowrap">NT$ {line.amount}</div>
              <div className="flex justify-center px-0 py-2.5">
                <Button variant="outline" size="icon" className="h-5 w-5 rounded-md" onClick={() => onDelete?.(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductActionModal({
  action,
  suppliers,
  onClose,
  onSaveEdit,
}: {
  action: ProductAction;
  suppliers: Supplier[];
  onClose: () => void;
  onSaveEdit: (originalBarcode: string, patch: EditableProductFields) => Promise<void> | void;
}) {
  const [editForm, setEditForm] = useState<EditableProductFields | null>(null);
  const [translatingTarget, setTranslatingTarget] = useState<TranslationTarget | null>(null);
  const [translateNotice, setTranslateNotice] = useState("");

  useEffect(() => {
    if (!action || action.type !== "edit") {
      setEditForm(null);
      return;
    }
    setEditForm({
      name: action.product.name,
      nameVi: action.product.nameVi,
      nameId: action.product.nameId,
      translationStatus: action.product.translationStatus,
      barcode: action.product.barcode,
      category: action.product.category,
      supplierCode: action.product.supplierCode,
      supplier: action.product.supplier,
      cost: action.product.cost,
      price: action.product.price,
      untaxed: action.product.untaxed,
    });
  }, [action]);

  if (!action) return null;
  const isEdit = action.type === "edit" && editForm !== null;

  const autoTranslateEditField = async (target: TranslationTarget) => {
    if (!editForm?.name.trim()) {
      setTranslateNotice("請先填寫中文商品名稱");
      return;
    }

    try {
      setTranslatingTarget(target);
      setTranslateNotice("");
      const translated = await requestAutoTranslate(editForm.name, target);
      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              [target === "vi" ? "nameVi" : "nameId"]: translated,
              translationStatus: {
                ...prev.translationStatus,
                [target]: "auto",
              },
            }
          : prev
      );
      setTranslateNotice(target === "vi" ? "已自動翻譯越南文" : "已自動翻譯印尼文");
    } catch (error) {
      console.error("auto translate edit field failed", error);
      setTranslateNotice(error instanceof Error ? error.message : "自動翻譯失敗");
    } finally {
      setTranslatingTarget(null);
    }
  };

  const autoTranslateAllEditFields = async () => {
    if (!editForm?.name.trim()) {
      setTranslateNotice("請先填寫中文商品名稱");
      return;
    }

    try {
      setTranslatingTarget("vi");
      setTranslateNotice("");
      const [viText, idText] = await Promise.all([
        requestAutoTranslate(editForm.name, "vi"),
        requestAutoTranslate(editForm.name, "id"),
      ]);
      setEditForm((prev) =>
        prev
          ? {
              ...prev,
              nameVi: viText,
              nameId: idText,
              translationStatus: {
                vi: "auto",
                id: "auto",
              },
            }
          : prev
      );
      setTranslateNotice("已自動翻譯越南文與印尼文");
    } catch (error) {
      console.error("auto translate all edit fields failed", error);
      setTranslateNotice(error instanceof Error ? error.message : "自動翻譯失敗");
    } finally {
      setTranslatingTarget(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 lg:items-center">
      <div className="flex max-h-[86vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{action.type === "edit" ? "修改商品" : action.type === "print" ? "列印貨卡" : action.type === "price" ? "變更價格" : "停用商品"}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {action.type === "edit" ? "可直接修改商品主檔資料。" : "此步驟為前端原型操作。"}
              </div>
            </div>
            {isEdit ? (
              <Button type="button" variant="outline" className="h-8 shrink-0 rounded-lg px-3 text-[11px]" onClick={autoTranslateAllEditFields} disabled={translatingTarget !== null || !editForm?.name.trim()}>
                {translatingTarget ? "翻譯中..." : "翻譯全部"}
              </Button>
            ) : null}
          </div>
        </div>
        {isEdit ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">中文商品名稱</div>
              <Input value={editForm.name} onChange={(e) => setEditForm((prev) => prev ? { ...prev, name: e.target.value } : prev)} className="mt-2" />
            </div>
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>越南文商品名稱</span><Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => autoTranslateEditField("vi")} disabled={translatingTarget !== null}>{translatingTarget === "vi" ? "翻譯中..." : "自動翻譯"}</Button></div>
              <Input value={editForm.nameVi} onChange={(e) => setEditForm((prev) => prev ? { ...prev, nameVi: e.target.value, translationStatus: { ...prev.translationStatus, vi: e.target.value.trim() ? "reviewed" : "empty" } } : prev)} className="mt-2" />
            </div>
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>印尼文商品名稱</span><Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => autoTranslateEditField("id")} disabled={translatingTarget !== null}>{translatingTarget === "id" ? "翻譯中..." : "自動翻譯"}</Button></div>
              <Input value={editForm.nameId} onChange={(e) => setEditForm((prev) => prev ? { ...prev, nameId: e.target.value, translationStatus: { ...prev.translationStatus, id: e.target.value.trim() ? "reviewed" : "empty" } } : prev)} className="mt-2" />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">商品條碼</div>
              <Input value={editForm.barcode} onChange={(e) => setEditForm((prev) => prev ? { ...prev, barcode: e.target.value } : prev)} className="mt-2" />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">分類</div>
              <Input value={editForm.category} onChange={(e) => setEditForm((prev) => prev ? { ...prev, category: e.target.value } : prev)} className="mt-2" />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">廠商</div>
              <select value={editForm.supplierCode} onChange={(e) => {
                const matchedSupplier = suppliers.find((supplier) => supplier.code === e.target.value);
                setEditForm((prev) => prev ? { ...prev, supplierCode: e.target.value, supplier: matchedSupplier?.name ?? prev.supplier } : prev);
              }} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {suppliers.filter((supplier) => supplier.active).map((supplier) => (
                  <option key={supplier.id} value={supplier.code}>{supplier.code}｜{supplier.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">主檔進貨價</div><Input type="number" value={editForm.cost} onChange={(e) => setEditForm((prev) => prev ? { ...prev, cost: Number(e.target.value) } : prev)} className="mt-2" /></div>
              <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">販售價</div><Input type="number" value={editForm.price} onChange={(e) => setEditForm((prev) => prev ? { ...prev, price: Number(e.target.value) } : prev)} className="mt-2" /></div>
              <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">未稅價</div><Input type="number" value={editForm.untaxed} onChange={(e) => setEditForm((prev) => prev ? { ...prev, untaxed: Number(e.target.value) } : prev)} className="mt-2" /></div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 text-sm">
            <div className="rounded-xl border p-3">
              <div className="font-medium">{action.product.name}</div>
              <div className="text-xs text-muted-foreground">{action.product.barcode}</div>
            </div>
          </div>
        )}
        {translateNotice ? <div className="px-4 pt-3 text-sm text-muted-foreground">{translateNotice}</div> : null}
        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>關閉</Button>
          <Button className="rounded-xl" onClick={async () => { if (isEdit && editForm) await onSaveEdit(action.product.barcode, editForm); onClose(); }}>
            {isEdit ? "儲存修改" : "確認"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  item,
  isOpen = false,
  onToggle,
  onSelect,
  onEdit,
  onPrint,
  onChangePrice,
  onDisable,
}: {
  item: Product;
  isOpen?: boolean;
  onToggle?: () => void;
  onSelect?: (item: Product) => void;
  onEdit?: (item: Product) => void;
  onPrint?: (item: Product) => void;
  onChangePrice?: (item: Product) => void;
  onDisable?: (item: Product) => void;
}) {
  const handleClick = () => {
    if (onToggle) return onToggle();
    if (onSelect) return onSelect(item);
  };

  return (
    <div className="rounded-2xl border bg-white">
      <button type="button" onClick={handleClick} className="w-full p-4 text-left transition hover:shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">{item.barcode}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary">{item.category}</Badge>
              <Badge variant="outline">{item.supplier}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm">售價 NT$ {item.price}</div>
              <div className="text-xs text-muted-foreground">庫存 {item.stock}</div>
            </div>
            {onToggle ? (isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />) : null}
          </div>
        </div>
      </button>
      {onToggle && isOpen ? (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">分類</div><div>{item.category}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">廠商</div><div>{item.supplier}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">主檔進貨價</div><div>NT$ {item.cost}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">販售價</div><div>NT$ {item.price}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">未稅價</div><div>NT$ {item.untaxed}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">目前庫存</div><div>{item.stock}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onEdit?.(item)}><Pencil className="h-4 w-4" />修改商品</Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onChangePrice?.(item)}><FileText className="h-4 w-4" />變更價格</Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onPrint?.(item)}><Printer className="h-4 w-4" />列印貨卡</Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => onDisable?.(item)}><Trash2 className="h-4 w-4" />停用商品</Button>
          </div>
          <Separator className="my-3" />
          <div className="space-y-3">
            <div className="font-medium">最近異動</div>
            {item.history.map((h, i) => (
              <div key={`${item.barcode}-${h.date}-${i}`} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div>
                  <div>{h.date}｜{h.type}</div>
                  <div className="text-xs text-muted-foreground">數量 {h.qty} ・ 單價 NT$ {h.price}</div>
                </div>
                <div className="font-medium">NT$ {h.amount}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductMaster({
  products,
  suppliers,
  onSaveEdit,
  onCreateProduct,
  onImportProducts,
  onRemoveDuplicateProducts,
  onDeleteAllProducts,
}: {
  products: Product[];
  suppliers: Supplier[];
  onSaveEdit: (barcode: string, patch: EditableProductFields) => Promise<void> | void;
  onCreateProduct: (payload: NewProductFields) => Promise<void> | void;
  onImportProducts: (payload: NewProductFields[]) => Promise<void> | void;
  onRemoveDuplicateProducts: () => Promise<void> | void;
  onDeleteAllProducts: () => Promise<void> | void;
}) {
  const [queryText, setQueryText] = useState("");
  const [dedupingProducts, setDedupingProducts] = useState(false);
  const [deletingAllProducts, setDeletingAllProducts] = useState(false);
  const [openId, setOpenId] = useState<string>(products[0]?.barcode ?? "");
  const [productAction, setProductAction] = useState<ProductAction>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [importingProducts, setImportingProducts] = useState(false);
  const [createTranslateNotice, setCreateTranslateNotice] = useState("");
  const [createTranslatingTarget, setCreateTranslatingTarget] = useState<TranslationTarget | null>(null);
  const [createForm, setCreateForm] = useState<NewProductFields>({
    barcode: "",
    name: "",
    nameVi: "",
    nameId: "",
    translationStatus: { vi: "empty", id: "empty" },
    category: "",
    supplierCode: suppliers.find((supplier) => supplier.active)?.code ?? "",
    supplier: suppliers.find((supplier) => supplier.active)?.name ?? "",
    cost: 0,
    price: 0,
    untaxed: 0,
    stock: 0,
  });

  const filtered = useMemo(() => {
    const q = queryText.trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.includes(q) ||
        p.nameVi.includes(q) ||
        p.nameId.includes(q) ||
        p.barcode.includes(q) ||
        p.supplier.includes(q)
    );
  }, [products, queryText]);

  const exportProducts = () => {
    const csv = makeCsv([
      ["barcode", "name", "nameVi", "nameId", "translationStatusVi", "translationStatusId", "category", "supplierCode", "supplier", "cost", "price", "untaxed", "stock"],
      ...products.map((product) => [product.barcode, product.name, product.nameVi, product.nameId, product.translationStatus.vi, product.translationStatus.id, product.category, product.supplierCode, product.supplier, product.cost, product.price, product.untaxed, product.stock]),
    ]);
    downloadCsv("products-export.csv", csv);
  };

  const importProducts = async (file: File | null) => {
    if (!file) return;

    try {
      setImportingProducts(true);
      setScanNotice(`正在匯入：${file.name}`);

      let payload: NewProductFields[] = [];

      if (file.name.toLowerCase().endsWith(".htm") || file.name.toLowerCase().endsWith(".html")) {
        payload = await parseLegacyHtmlProductFile(file);
      } else {
        const rows = await parseCsvFile(file);
        payload = rows
          .map((parts) => {
            const resolvedSupplier = resolveSupplierByCode(suppliers, parts[7] || "", parts[8] || suppliers.find((supplier) => supplier.active)?.name || "");
            return {
              barcode: parts[0] || "",
              name: parts[1] || "",
              nameVi: parts[2] || "",
              nameId: parts[3] || "",
              translationStatus: { vi: (parts[4] as TranslationStatus["vi"]) || "empty", id: (parts[5] as TranslationStatus["id"]) || "empty" },
              category: parts[6] || "",
              supplierCode: resolvedSupplier.supplierCode,
              supplier: resolvedSupplier.supplier,
              cost: Number(parts[9] || 0),
              price: Number(parts[10] || 0),
              untaxed: Number(parts[11] || 0),
              stock: Number(parts[12] || 0),
            };
          })
          .filter((item) => item.barcode && item.name);
      }

      if (payload.length === 0) {
        setScanNotice("匯入檔案中沒有可用商品資料");
        return;
      }

      await onImportProducts(payload.map((item) => {
        const resolvedSupplier = resolveSupplierByCode(suppliers, item.supplierCode, item.supplier);
        return {
          ...item,
          supplierCode: resolvedSupplier.supplierCode,
          supplier: resolvedSupplier.supplier,
        };
      }));
      setScanNotice(`已匯入 ${payload.length} 筆商品`);
    } catch (error) {
      console.error("import products failed", error);
      setScanNotice(error instanceof Error ? `匯入失敗：${error.message}` : "匯入失敗");
    } finally {
      setImportingProducts(false);
    }
  };

  const autoTranslateCreateField = async (target: TranslationTarget) => {
    if (!createForm.name.trim()) {
      setCreateTranslateNotice("請先填寫中文商品名稱");
      return;
    }

    try {
      setCreateTranslatingTarget(target);
      setCreateTranslateNotice("");
      const translated = await requestAutoTranslate(createForm.name, target);
      setCreateForm((prev) => ({
        ...prev,
        [target === "vi" ? "nameVi" : "nameId"]: translated,
        translationStatus: {
          ...prev.translationStatus,
          [target]: "auto",
        },
      }));
      setCreateTranslateNotice(target === "vi" ? "已自動翻譯越南文" : "已自動翻譯印尼文");
    } catch (error) {
      console.error("auto translate create field failed", error);
      setCreateTranslateNotice(error instanceof Error ? error.message : "自動翻譯失敗");
    } finally {
      setCreateTranslatingTarget(null);
    }
  };

  const autoTranslateAllCreateFields = async () => {
    if (!createForm.name.trim()) {
      setCreateTranslateNotice("請先填寫中文商品名稱");
      return;
    }

    try {
      setCreateTranslatingTarget("vi");
      setCreateTranslateNotice("");
      const [viText, idText] = await Promise.all([
        requestAutoTranslate(createForm.name, "vi"),
        requestAutoTranslate(createForm.name, "id"),
      ]);
      setCreateForm((prev) => ({
        ...prev,
        nameVi: viText,
        nameId: idText,
        translationStatus: {
          vi: "auto",
          id: "auto",
        },
      }));
      setCreateTranslateNotice("已自動翻譯越南文與印尼文");
    } catch (error) {
      console.error("auto translate all create fields failed", error);
      setCreateTranslateNotice(error instanceof Error ? error.message : "自動翻譯失敗");
    } finally {
      setCreateTranslatingTarget(null);
    }
  };

  const handleScanSearch = () => {
    const matched = findProductByQuery(products, scanValue);
    if (!matched) {
      setScanNotice(`找不到商品：${scanValue}`);
      return;
    }
    setQueryText(matched.barcode);
    setOpenId(matched.barcode);
    setScanNotice(`已找到：${matched.name}`);
    setScanOpen(false);
    setScanValue("");
  };

  return (
    <div className="pb-20 lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>商品主檔</CardTitle>
          <CardDescription>支援搜尋、掃碼查詢、新增商品，以及匯入 / 匯出商品資料。</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1">
              <Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="搜尋商品名稱 / 條碼 / 廠商" />
            </div>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { setScanOpen(true); setScanNotice(""); }}><ScanLine className="h-4 w-4" />掃碼</Button>
            <Button className="gap-2 rounded-xl" onClick={() => { setCreateOpen(true); setCreateTranslateNotice(""); }}><Plus className="h-4 w-4" />新增</Button>
            <label className="inline-flex">
              <input type="file" accept=".csv,.htm,.html" className="hidden" onChange={(e) => { importProducts(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
              <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium shadow-sm cursor-pointer"><Upload className="h-4 w-4" />{importingProducts ? "匯入中..." : "匯入 CSV / 單品資料"}</span>
            </label>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={exportProducts}><Download className="h-4 w-4" />匯出</Button>
            <Button variant="outline" className="gap-2 rounded-xl" disabled={deletingAllProducts} onClick={async () => {
              try {
                setDeletingAllProducts(true);
                setScanNotice("正在清空全部商品...");
                await onDeleteAllProducts();
                setScanNotice("已清空全部商品資料");
              } catch (error) {
                console.error("delete all products failed", error);
                setScanNotice(error instanceof Error ? `清空失敗：${error.message}` : "清空失敗");
              } finally {
                setDeletingAllProducts(false);
              }
            }}><Trash2 className="h-4 w-4" />{deletingAllProducts ? "清空中..." : "清空商品"}</Button>
            <Button variant="outline" className="gap-2 rounded-xl" disabled={dedupingProducts} onClick={async () => {
              try {
                setDedupingProducts(true);
                setScanNotice("正在刪除重複商品...");
                await onRemoveDuplicateProducts();
                setScanNotice("已刪除重複商品（依條碼保留一筆）");
              } catch (error) {
                console.error("remove duplicate products failed", error);
                setScanNotice(error instanceof Error ? `刪除失敗：${error.message}` : "刪除失敗");
              } finally {
                setDedupingProducts(false);
              }
            }}><Trash2 className="h-4 w-4" />{dedupingProducts ? "處理中..." : "刪除重複商品"}</Button>
          </div>

          {scanNotice ? <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">{scanNotice}</div> : null}

          <div className="space-y-3">
            {filtered.map((item) => {
              const isOpen = openId === item.barcode;
              return (
                <ProductRow
                  key={item.barcode}
                  item={item}
                  isOpen={isOpen}
                  onToggle={() => setOpenId(isOpen ? "" : item.barcode)}
                  onEdit={(product) => setProductAction({ type: "edit", product })}
                  onPrint={(product) => setProductAction({ type: "print", product })}
                  onChangePrice={(product) => setProductAction({ type: "price", product })}
                  onDisable={(product) => setProductAction({ type: "disable", product })}
                />
              );
            })}
          </div>

          <ProductActionModal action={productAction} suppliers={suppliers} onClose={() => setProductAction(null)} onSaveEdit={onSaveEdit} />

          {scanOpen ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 lg:items-center">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="border-b p-4"><div className="text-lg font-semibold">掃碼查詢商品</div><div className="mt-1 text-sm text-muted-foreground">先用輸入條碼模擬掃碼，找到後會自動展開商品。</div></div>
                <div className="space-y-3 p-4"><Input value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="輸入條碼或商品名稱" onKeyDown={(e) => { if (e.key === "Enter") handleScanSearch(); }} autoFocus /></div>
                <div className="grid grid-cols-2 gap-2 border-t p-4"><Button variant="outline" className="rounded-xl" onClick={() => setScanOpen(false)}>取消</Button><Button className="rounded-xl" onClick={handleScanSearch}>搜尋</Button></div>
              </div>
            </div>
          ) : null}

          {createOpen ? (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 lg:items-center">
              <div className="flex max-h-[86vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="border-b p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">新增商品</div>
                      <div className="mt-1 text-sm text-muted-foreground">新增後會直接寫入 Firebase 商品主檔。</div>
                    </div>
                    <Button type="button" variant="outline" className="h-8 shrink-0 rounded-lg px-3 text-[11px]" onClick={autoTranslateAllCreateFields} disabled={createTranslatingTarget !== null || !createForm.name.trim()}>
                      {createTranslatingTarget ? "翻譯中..." : "翻譯全部"}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">中文商品名稱</div><Input value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} className="mt-2" /></div>
                  <div className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>越南文商品名稱</span><Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => autoTranslateCreateField("vi")} disabled={createTranslatingTarget !== null}>{createTranslatingTarget === "vi" ? "翻譯中..." : "自動翻譯"}</Button></div><Input value={createForm.nameVi} onChange={(e) => setCreateForm((prev) => ({ ...prev, nameVi: e.target.value, translationStatus: { ...prev.translationStatus, vi: e.target.value.trim() ? "reviewed" : "empty" } }))} className="mt-2" /></div>
                  <div className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>印尼文商品名稱</span><Button type="button" variant="outline" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => autoTranslateCreateField("id")} disabled={createTranslatingTarget !== null}>{createTranslatingTarget === "id" ? "翻譯中..." : "自動翻譯"}</Button></div><Input value={createForm.nameId} onChange={(e) => setCreateForm((prev) => ({ ...prev, nameId: e.target.value, translationStatus: { ...prev.translationStatus, id: e.target.value.trim() ? "reviewed" : "empty" } }))} className="mt-2" /></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">商品條碼</div><Input value={createForm.barcode} onChange={(e) => setCreateForm((prev) => ({ ...prev, barcode: e.target.value }))} className="mt-2" /></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">分類</div><Input value={createForm.category} onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))} className="mt-2" /></div>
                  <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">廠商</div><select value={createForm.supplierCode} onChange={(e) => {
                    const matchedSupplier = suppliers.find((supplier) => supplier.code === e.target.value);
                    setCreateForm((prev) => ({ ...prev, supplierCode: e.target.value, supplier: matchedSupplier?.name ?? prev.supplier }));
                  }} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.code}>{supplier.code}｜{supplier.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">主檔進貨價</div><Input type="number" value={createForm.cost} onChange={(e) => setCreateForm((prev) => ({ ...prev, cost: Number(e.target.value) }))} className="mt-2" /></div>
                    <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">販售價</div><Input type="number" value={createForm.price} onChange={(e) => setCreateForm((prev) => ({ ...prev, price: Number(e.target.value) }))} className="mt-2" /></div>
                    <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">未稅價</div><Input type="number" value={createForm.untaxed} onChange={(e) => setCreateForm((prev) => ({ ...prev, untaxed: Number(e.target.value) }))} className="mt-2" /></div>
                    <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">庫存</div><Input type="number" value={createForm.stock} onChange={(e) => setCreateForm((prev) => ({ ...prev, stock: Number(e.target.value) }))} className="mt-2" /></div>
                  </div>
                </div>
                {createTranslateNotice ? <div className="px-4 pt-3 text-sm text-muted-foreground">{createTranslateNotice}</div> : null}
                <div className="grid grid-cols-2 gap-2 border-t p-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>取消</Button>
                  <Button className="rounded-xl" onClick={async () => { await onCreateProduct(createForm); setCreateOpen(false); setCreateForm({
                        barcode: "",
                        name: "",
                        nameVi: "",
                        nameId: "",
                        translationStatus: { vi: "empty", id: "empty" },
                        category: "",
                        supplierCode: suppliers.find((supplier) => supplier.active)?.code ?? "",
                        supplier: suppliers.find((supplier) => supplier.active)?.name ?? "",
                        cost: 0,
                        price: 0,
                        untaxed: 0,
                        stock: 0,
                      }); }}>儲存新增</Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InboundQtyModal({
  open,
  product,
  qty,
  setQty,
  onClose,
  onConfirm,
}: {
  open: boolean;
  product: Product | null;
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 lg:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4"><div className="text-lg font-semibold">輸入數量</div><div className="mt-1 text-sm text-muted-foreground">掃碼後直接輸入數量並儲存，正數為進貨、負數為退貨。</div></div>
        <div className="space-y-4 p-4">
          <div className="rounded-xl border p-3"><div className="font-medium">{product.name}</div><div className="text-xs text-muted-foreground">{product.barcode}</div><div className="mt-3 text-sm text-muted-foreground">主檔進價 NT$ {product.cost}</div></div>
          <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">數量</div><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-2 text-lg" autoFocus /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-4"><Button variant="outline" className="rounded-xl" onClick={onClose}>取消</Button><Button className="rounded-xl" onClick={onConfirm} disabled={qty === 0}>儲存並繼續</Button></div>
      </div>
    </div>
  );
}

function InboundWorkbench({
  products,
  onSaveBatch,
}: {
  products: Product[];
  onSaveBatch: (items: FlowItem[]) => Promise<void> | void;
}) {
  const [scanInput, setScanInput] = useState<string>(products[0]?.barcode ?? "");
  const [items, setItems] = useState<FlowItem[]>([]);
  const [scanNotice, setScanNotice] = useState<string>("");
  const [scanCandidate, setScanCandidate] = useState<Product | null>(null);
  const [qtyDraft, setQtyDraft] = useState<number>(1);

  const total = calculateTotal(items);
  const totalQty = calculateTotalQty(items);
  const latestItem = items[items.length - 1] ?? null;

  const handleScan = () => {
    const found = findProductByQuery(products, scanInput);
    if (!found) {
      setScanNotice(`找不到條碼：${scanInput}`);
      return;
    }
    setScanCandidate(found);
    setQtyDraft(1);
    setScanNotice(`已掃描：${found.name}`);
  };

  const confirmScanItem = () => {
    if (!scanCandidate || qtyDraft === 0) return;
    setItems((prev) => [...prev, buildFlowItem(scanCandidate, qtyDraft)]);
    setScanNotice(`${scanCandidate.name} 已加入本批清單`);
    setScanInput("");
    setScanCandidate(null);
    setQtyDraft(1);
  };

  const tableLines: BatchLine[] = items.map((item) => ({
    barcode: item.barcode,
    product: item.name,
    supplier: item.supplier,
    qty: item.qty,
    price: item.price,
    amount: item.amount,
  }));

  return (
    <div className="w-full min-w-0 pb-20 lg:pb-0">
      <div className="grid w-full gap-5 xl:grid-cols-[380px_minmax(440px,0.82fr)]">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>進貨作業</CardTitle>
            <CardDescription>現場流程改為掃碼後直接彈窗輸入數量，儲存後立即回到掃碼狀態繼續作業。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-medium">掃碼 / 輸入條碼</div>
              <div className="mt-3 flex gap-2">
                <Input value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder="條碼 / 商品名稱" onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }} />
                <Button className="gap-2 rounded-xl" onClick={handleScan}><ScanLine className="h-4 w-4" />掃碼</Button>
              </div>
            </div>
            {scanNotice ? <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">{scanNotice}</div> : null}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-2xl border-2 p-3.5"><div className="text-[12px] leading-5 text-muted-foreground">本批商品數</div><div className="mt-1 text-[16px] font-semibold leading-none">{items.length}</div></div>
              <div className="rounded-2xl border-2 p-3.5"><div className="text-[12px] leading-5 text-muted-foreground">本批總件數</div><div className="mt-1 text-[16px] font-semibold leading-none">{totalQty}</div></div>
              <div className="rounded-2xl border-2 p-3.5"><div className="text-[12px] leading-5 text-muted-foreground">本批總金額</div><div className="mt-1 text-[16px] font-semibold leading-none">NT$ {total}</div></div>
            </div>
            {latestItem ? <div className="rounded-2xl border p-4 text-sm"><div className="font-medium">最新加入</div><div className="mt-2">{latestItem.name}</div><div className="text-xs text-muted-foreground">{latestItem.barcode}</div></div> : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>本批紀錄清單</CardTitle>
            <CardDescription>以表格列出本批商品，現場可快速檢查數量、單價與總額。</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <BatchTable
              lines={tableLines}
              editable={true}
              onQtyChange={(index, value) => setItems((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, qty: value, amount: calculateAmount(value, item.price) } : item))}
              onPriceChange={(index, value) => setItems((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, price: value, amount: calculateAmount(item.qty, value) } : item))}
              onDelete={(index) => setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
            />
            <Button className="w-full rounded-xl" onClick={async () => { await onSaveBatch(items); setItems([]); setScanNotice("本批紀錄已儲存"); }} disabled={items.length === 0}>儲存本批紀錄</Button>
          </CardContent>
        </Card>

        <InboundQtyModal open={scanCandidate !== null} product={scanCandidate} qty={qtyDraft} setQty={setQtyDraft} onClose={() => setScanCandidate(null)} onConfirm={confirmScanItem} />
      </div>
    </div>
  );
}

function StockQuery({ products }: { products: Product[] }) {
  const [queryText, setQueryText] = useState("");
  const filtered = useMemo(() => {
    const q = queryText.trim();
    if (!q) return products;
    return products.filter((product) => product.name.includes(q) || product.barcode.includes(q));
  }, [products, queryText]);
  const [selected, setSelected] = useState<Product>(products[0] ?? initialProducts[0]);

  useEffect(() => {
    if (!selected && products[0]) setSelected(products[0]);
  }, [products, selected]);

  return (
    <div className="grid gap-4 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>庫存查詢</CardTitle><CardDescription>現場快速查價格、庫存與最近異動。</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2"><Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="掃碼或搜尋商品" /><Button variant="outline" className="gap-2 rounded-xl"><ScanLine className="h-4 w-4" />掃碼</Button></div>
          {filtered.map((item) => <ProductRow key={item.barcode} item={item} onSelect={setSelected} />)}
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>庫存詳情</CardTitle><CardDescription>查價與查庫存合在同一個商品詳情視圖。</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div><div className="text-lg font-semibold">{selected?.name}</div><div className="text-xs text-muted-foreground">{selected?.barcode}</div></div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">販售價</div><div>NT$ {selected?.price}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">進貨價</div><div>NT$ {selected?.cost}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">庫存</div><div>{selected?.stock}</div></div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="font-medium">最近異動紀錄</div>
            {(selected?.history ?? []).map((h, i) => (
              <div key={`${h.date}-${i}`} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div><div>{h.type}｜{h.date}</div><div className="text-xs text-muted-foreground">數量 {h.qty} ・ 單價 NT$ {h.price}</div></div>
                <div>NT$ {h.amount}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReceiptLabelPreview({
  storeName,
  product,
  showSpec,
  showCategory,
  showUpdatedDate,
  priceClassName,
}: {
  storeName: string;
  product: Product;
  showSpec: boolean;
  showCategory: boolean;
  showUpdatedDate: boolean;
  priceClassName: string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-[8px] border bg-white shadow-sm">
      <div className="flex min-h-[156px] flex-col px-4 pb-1 pt-0 text-black">
        <div className="text-left text-[8px] font-medium tracking-[0.02em] text-black/65">
          {normalizeStoreName(storeName)}
        </div>
        <div className="mt-0 text-left text-[18px] font-bold leading-[1.0]">
          {product.name}
        </div>
        <div className="mt-0 space-y-0 leading-[1.0]">
          {showSpec ? <div className="text-[13px] font-semibold leading-none">規格：600ml</div> : null}
          {showCategory ? <div className="text-[14px] font-medium">分類：{product.category}</div> : null}
          {showUpdatedDate ? <div className="text-[11px] text-black/70">更新：2026-06-12</div> : null}
        </div>
        <div className="mt-auto space-y-0">
          <div className="flex items-end justify-end gap-1 text-right">
            <div className={`${priceClassName} font-black leading-[0.72] tracking-tight`}>
              {product.price}
            </div>
            <div className="pb-0 text-[8px] font-bold leading-none">元</div>
          </div>
          <div className="-mt-1 w-[24%] max-w-[72px]">
            <BarcodeGraphic
              value={product.barcode}
              width={0.28}
              height={6}
              fontSize={2}
              margin={0}
              wrapperClassName="rounded-none border-0 bg-transparent px-0 py-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelPrinter({
  products,
  storeName,
  templates,
  printerDevices,
  settings,
  onPrintLabel,
}: {
  products: Product[];
  storeName: string;
  templates: LabelTemplate[];
  printerDevices: PrinterDevice[];
  settings: SystemSettings;
  onPrintLabel: (payload: {
    product: Product;
    template: LabelTemplate;
    printer: PrinterDevice | null;
  }) => Promise<PrintJobResult>;
}) {
  const [queryText, setQueryText] = useState("");
  const [selected, setSelected] = useState<Product>(products[0] ?? initialProducts[0]);
  const activeTemplate =
    templates.find((template) => template.active) ??
    templates[0] ??
    initialLabelTemplates[0];
  const filtered = useMemo(() => {
    const q = queryText.trim();
    if (!q) return products;
    return products.filter(
      (product) => product.name.includes(q) || product.barcode.includes(q)
    );
  }, [products, queryText]);
  const defaultPrinter =
    printerDevices.find((device) => device.isDefault) ??
    printerDevices[0] ??
    null;
  const [printing, setPrinting] = useState(false);
  const [printNotice, setPrintNotice] = useState("尚未送出列印");
  const missingPrintConfig = !defaultPrinter
    ? "尚未設定預設列印設備"
    : !defaultPrinter.deviceId
      ? "預設列印設備尚未填寫打印機 SN"
      : !defaultPrinter.isDefault
        ? "目前沒有預設設備，已暫用第一台設備"
        : "";
  const printBlockedReason = !settings.feieUser
    ? "尚未填寫飛鵝 user"
    : !settings.feieUkey
      ? "尚未填寫飛鵝 UKEY"
      : missingPrintConfig;
  const priceClassMap: Record<LabelTemplate["priceSize"], string> = {
    sm: "text-[96px]",
    md: "text-[128px]",
    lg: "text-[160px]",
  };

  return (
    <div className="grid gap-4 pb-20 lg:grid-cols-[0.85fr_1.15fr] lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>貨卡列印</CardTitle>
          <CardDescription>從商品搜尋進入，確認名稱與售價後送標籤機。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="搜尋商品 / 掃碼"
            />
            <Button variant="outline" className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" />掃碼
            </Button>
          </div>
          {filtered.map((item) => (
            <ProductRow key={item.barcode} item={item} onSelect={setSelected} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>列印預覽</CardTitle>
          <CardDescription>
            目前使用模板：{activeTemplate?.name ?? "未設定模板"}｜此預覽會盡量貼近飛鵝小票機實際輸出。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div layout>
            <ReceiptLabelPreview
              storeName={storeName}
              product={selected}
              showSpec={activeTemplate?.showSpec ?? false}
              showCategory={activeTemplate?.showCategory ?? true}
              showUpdatedDate={activeTemplate?.showUpdatedDate ?? false}
              priceClassName={priceClassMap[activeTemplate?.priceSize ?? "lg"]}
            />
          </motion.div>

          <div className="rounded-2xl border bg-white p-4 text-sm leading-6 text-slate-800">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              實際小票機輸出參考
            </div>
            <div className="mt-0 text-left text-[8px] font-medium text-slate-500">
              {normalizeStoreName(storeName)}
            </div>
            <div className="mt-0 text-left text-[13px] font-bold leading-[1.0]">
              {selected.name}
            </div>
            <div className="mt-1 text-right text-[96px] font-black leading-[0.68]">
              {selected.price}
              <span className="ml-0.5 text-[8px] font-bold">元</span>
            </div>
            {activeTemplate?.showBarcode ? (
              <div className="mt-0 w-[24%] max-w-[72px]">
                <BarcodeGraphic
                  value={selected.barcode}
                  width={0.28}
                  height={6}
                  fontSize={2}
                  margin={0}
                  wrapperClassName="rounded-none border-0 bg-transparent px-0 py-0"
                />
              </div>
            ) : null}
            <div className="mt-1 border-t border-dashed pt-1 text-center text-xs text-slate-500">
              已退回清楚版：價格在上、條碼在下
            </div>
          </div>

          <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">
            {printNotice}
          </div>

          <Button
            className="w-full gap-2 rounded-xl"
            disabled={Boolean(printBlockedReason) || printing}
            onClick={async () => {
              setPrinting(true);
              setPrintNotice(`正在送出列印：${selected.name}`);
              try {
                const result = await onPrintLabel({
                  product: selected,
                  template: activeTemplate,
                  printer: defaultPrinter,
                });
                setPrintNotice(
                  result.ok
                    ? `已送出列印，訂單號：${result.orderId ?? "-"}`
                    : result.message
                );
              } catch (error) {
                console.error("print label failed", error);
                setPrintNotice("送出列印失敗");
              } finally {
                setPrinting(false);
              }
            }}
          >
            <Printer className="h-4 w-4" />
            {printing ? "送出中..." : "送出列印"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductPickerModal({
  open,
  queryText,
  setQueryText,
  products,
  onClose,
  onPick,
}: {
  open: boolean;
  queryText: string;
  setQueryText: React.Dispatch<React.SetStateAction<string>>;
  products: Product[];
  onClose: () => void;
  onPick: (product: Product) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 lg:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4"><div><div className="font-medium">新增商品到批次</div><div className="text-sm text-muted-foreground">可手動輸入搜尋，也可用掃碼方式帶入商品。</div></div><Button variant="outline" className="rounded-xl" onClick={onClose}>關閉</Button></div>
        <div className="space-y-4 p-4">
          <div className="flex gap-2"><Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="搜尋商品名稱 / 條碼 / 廠商" /><Button variant="outline" className="gap-2 rounded-xl"><ScanLine className="h-4 w-4" />掃碼</Button></div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {products.map((product) => (
              <button key={product.barcode} type="button" onClick={() => onPick(product)} className="w-full rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm">
                <div className="flex items-start justify-between gap-4"><div className="space-y-1"><div className="font-medium">{product.name}</div><div className="text-xs text-muted-foreground">{product.barcode}</div></div><div className="text-right text-sm"><div>進價 NT$ {product.cost}</div><div className="text-xs text-muted-foreground">庫存 {product.stock}</div></div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordQuery({
  batchRecords,
  products,
  onUpdateBatchRecord,
  onDeleteBatchRecord,
  onAddProductToBatch,
}: {
  batchRecords: BatchRecord[];
  products: Product[];
  onUpdateBatchRecord: (record: BatchRecord) => Promise<void> | void;
  onDeleteBatchRecord: (recordId: string, lineIndex: number) => Promise<void> | void;
  onAddProductToBatch: (recordId: string, product: Product) => Promise<void> | void;
}) {
  const [dateQuery, setDateQuery] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [openId, setOpenId] = useState<string>(batchRecords[0]?.id ?? "");
  const [pickerRecordId, setPickerRecordId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [localRecords, setLocalRecords] = useState<BatchRecord[]>(batchRecords);

  useEffect(() => {
    setLocalRecords(batchRecords);
  }, [batchRecords]);

  const filtered = useMemo(() => filterBatchRecords(localRecords, dateQuery, supplierQuery), [localRecords, dateQuery, supplierQuery]);
  const pickerProducts = useMemo(() => {
    const q = pickerQuery.trim();
    if (!q) return products;
    return products.filter((product) => product.name.includes(q) || product.barcode.includes(q) || product.supplier.includes(q));
  }, [pickerQuery, products]);

  const updateBatchLine = (recordId: string, lineIndex: number, patch: Partial<Pick<BatchLine, "qty" | "price">>) => {
    setLocalRecords((prev) => prev.map((record) => {
      if (record.id !== recordId) return record;
      const nextLines = record.lines.map((line, index) => index !== lineIndex ? line : { ...line, qty: patch.qty ?? line.qty, price: patch.price ?? line.price, amount: calculateAmount(patch.qty ?? line.qty, patch.price ?? line.price), edited: true });
      return recalcBatchTotals({ ...record, lines: nextLines });
    }));
  };

  const removeBatchLine = async (recordId: string, lineIndex: number) => {
    setLocalRecords((prev) => prev.map((record) => {
      if (record.id !== recordId) return record;
      return recalcBatchTotals({ ...record, lines: record.lines.filter((_, index) => index !== lineIndex) });
    }).filter((record) => record.lines.length > 0));
    await onDeleteBatchRecord(recordId, lineIndex);
  };

  const saveBatchChanges = async (recordId: string) => {
    const target = localRecords.find((record) => record.id === recordId);
    if (!target) return;
    await onUpdateBatchRecord({ ...target, lines: target.lines.map((line) => ({ ...line, edited: false })) });
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 space-y-4 pb-20 lg:pb-0">
      <Card className="min-w-0 rounded-2xl shadow-sm">
        <CardHeader><CardTitle>批次進退貨紀錄</CardTitle><CardDescription>可查詢、編輯、刪除、補加商品，並同步寫回 Firebase。</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3"><Input type="date" value={dateQuery} onChange={(e) => setDateQuery(e.target.value)} /><Input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder="廠商名稱" /><Button variant="outline" className="rounded-xl">匯出對帳資料</Button></div>
          <div className="space-y-3">
            {filtered.map((record) => {
              const isOpen = openId === record.id;
              return (
                <div key={record.id} className="rounded-2xl border bg-white">
                  <button type="button" onClick={() => setOpenId(isOpen ? "" : record.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                    <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">批次</Badge><span className="font-medium">{record.id}</span></div><div className="text-sm text-muted-foreground">{record.date} ・ {record.supplier}</div></div>
                    <div className="text-right text-sm"><div>{record.itemCount} 項商品</div><div className="font-semibold">NT$ {record.totalAmount}</div></div>
                  </button>
                  {isOpen ? (
                    <div className="min-w-0 border-t px-4 pb-4 pt-3">
                      <BatchTable lines={record.lines} editable={true} onQtyChange={(index, value) => updateBatchLine(record.id, index, { qty: value })} onPriceChange={(index, value) => updateBatchLine(record.id, index, { price: value })} onDelete={(index) => removeBatchLine(record.id, index)} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { setPickerRecordId(record.id); setPickerQuery(""); }}><Plus className="h-4 w-4" />新增商品</Button>
                        <Button className="rounded-xl" onClick={() => saveBatchChanges(record.id)}>儲存修改</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <ProductPickerModal open={pickerRecordId !== null} queryText={pickerQuery} setQueryText={setPickerQuery} products={pickerProducts} onClose={() => setPickerRecordId(null)} onPick={async (product) => { if (!pickerRecordId) return; await onAddProductToBatch(pickerRecordId, product); setPickerRecordId(null); }} />
    </div>
  );
}

function SupplierManager({
  suppliers,
  onCreateSupplier,
  onSaveSupplier,
  onDeleteSupplier,
  onImportSuppliers,
  onDeleteAllSuppliers,
}: {
  suppliers: Supplier[];
  onCreateSupplier: () => Promise<void> | void;
  onSaveSupplier: (supplier: Supplier) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  onImportSuppliers: (suppliers: Supplier[]) => Promise<void> | void;
  onDeleteAllSuppliers: () => Promise<void> | void;
}) {
  const [queryText, setQueryText] = useState("");
  const [draftSuppliers, setDraftSuppliers] = useState<Supplier[]>(suppliers);
  const [supplierNotice, setSupplierNotice] = useState("");
  const [importingSuppliers, setImportingSuppliers] = useState(false);
  const [deletingAllSuppliers, setDeletingAllSuppliers] = useState(false);

  useEffect(() => {
    setDraftSuppliers(suppliers);
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = queryText.trim();
    if (!q) return draftSuppliers;
    return draftSuppliers.filter(
      (supplier) =>
        supplier.code.includes(q) ||
        supplier.name.includes(q) ||
        supplier.contact.includes(q) ||
        supplier.phone.includes(q)
    );
  }, [draftSuppliers, queryText]);

  const exportSuppliers = () => {
    const rows = [
      ["code", "name", "contact", "phone", "note", "active"],
      ...draftSuppliers.map((supplier) => [
        supplier.code,
        supplier.name,
        supplier.contact,
        supplier.phone,
        supplier.note,
        supplier.active ? "TRUE" : "FALSE",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("
");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSuppliers = async (file: File | null) => {
    if (!file) return;

    try {
      setImportingSuppliers(true);
      setSupplierNotice(`正在匯入：${file.name}`);
      const rows = await parseCsvFile(file);
      const payload = rows
        .map((parts, index) => {
          const activeRaw = String(parts[5] || "TRUE").trim().toLowerCase();
          const active = !["false", "0", "no", "n", "否", "停用"].includes(activeRaw);
          return {
            id: `import-${Date.now()}-${index}`,
            code: parts[0] || `V${String(index + 1).padStart(3, "0")}`,
            name: parts[1] || "",
            contact: parts[2] || "",
            phone: parts[3] || "",
            note: parts[4] || "",
            active,
          } as Supplier;
        })
        .filter((item) => item.name.trim());

      if (payload.length === 0) {
        setSupplierNotice("匯入檔案中沒有可用廠商資料");
        return;
      }

      await onImportSuppliers(payload);
      setSupplierNotice(`已匯入 ${payload.length} 筆廠商資料`);
    } catch (error) {
      console.error("import suppliers failed", error);
      setSupplierNotice(error instanceof Error ? `匯入失敗：${error.message}` : "匯入失敗");
    } finally {
      setImportingSuppliers(false);
    }
  };

  return (
    <Card className="rounded-3xl border-none shadow-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>廠商資料</CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">支援查詢、新增、匯入匯出與清空。</div>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{draftSuppliers.length} 家廠商</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="搜尋廠商名稱 / 編號 / 聯絡人 / 電話" className="min-w-[220px] flex-1" />
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportSuppliers}><Download className="h-4 w-4" />匯出</Button>
          <label className="inline-flex">
            <input type="file" accept=".csv" className="hidden" onChange={(e) => { importSuppliers(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium shadow-sm cursor-pointer"><Upload className="h-4 w-4" />{importingSuppliers ? "匯入中..." : "匯入"}</span>
          </label>
          <Button variant="outline" className="gap-2 rounded-xl" disabled={deletingAllSuppliers} onClick={async () => {
            try {
              setDeletingAllSuppliers(true);
              setSupplierNotice("正在清空全部廠商...");
              await onDeleteAllSuppliers();
              setSupplierNotice("已清空全部廠商資料");
            } catch (error) {
              console.error("delete all suppliers failed", error);
              setSupplierNotice(error instanceof Error ? `清空失敗：${error.message}` : "清空失敗");
            } finally {
              setDeletingAllSuppliers(false);
            }
          }}><Trash2 className="h-4 w-4" />{deletingAllSuppliers ? "清空中..." : "清空廠商"}</Button>
          <Button className="gap-2 rounded-xl" onClick={() => onCreateSupplier()}><Plus className="h-4 w-4" />新增廠商</Button>
        </div>
        {supplierNotice ? <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">{supplierNotice}</div> : null}
        <div className="space-y-3">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border p-4">
              <div className="grid gap-3 md:grid-cols-6">
                <div>
                  <div className="text-xs text-muted-foreground">編號</div>
                  <Input value={supplier.code} onChange={(e) => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, code: e.target.value } : item))} className="mt-2" />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-muted-foreground">名稱</div>
                  <Input value={supplier.name} onChange={(e) => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, name: e.target.value } : item))} className="mt-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">聯絡人</div>
                  <Input value={supplier.contact} onChange={(e) => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, contact: e.target.value } : item))} className="mt-2" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">電話</div>
                  <Input value={supplier.phone} onChange={(e) => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, phone: e.target.value } : item))} className="mt-2" />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => onSaveSupplier(supplier)}>儲存</Button>
                  <Button variant="outline" className="rounded-xl" onClick={async () => {
                    try {
                      await onDeleteSupplier(supplier.id);
                      setDraftSuppliers((prev) => prev.filter((item) => item.id !== supplier.id));
                      setSupplierNotice(`已刪除廠商：${supplier.name}`);
                    } catch (error) {
                      console.error("delete supplier failed", error);
                      setSupplierNotice(error instanceof Error ? `刪除失敗：${error.message}` : "刪除失敗");
                    }
                  }}>刪除</Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="text-xs text-muted-foreground">備註</div>
                  <Input value={supplier.note} onChange={(e) => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, note: e.target.value } : item))} className="mt-2" />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={supplier.active} onChange={() => setDraftSuppliers((prev) => prev.map((item) => item.id === supplier.id ? { ...item, active: !item.active } : item))} />啟用
                </label>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LabelTemplateManager({
  templates,
  sampleProduct,
  storeName,
  onCreateTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onSetActiveTemplate,
}: {
  templates: LabelTemplate[];
  sampleProduct: Product;
  storeName: string;
  onCreateTemplate: () => Promise<void> | void;
  onSaveTemplate: (template: LabelTemplate) => Promise<void> | void;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
  onSetActiveTemplate: (templateId: string) => Promise<void> | void;
}) {
  const [openId, setOpenId] = useState<string>(templates[0]?.id ?? "");
  const [draftTemplates, setDraftTemplates] = useState<LabelTemplate[]>(templates);
  useEffect(() => setDraftTemplates(templates), [templates]);
  const priceClassMap: Record<LabelTemplate["priceSize"], string> = { sm: "text-[56px]", md: "text-[72px]", lg: "text-[92px]" };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader><CardTitle>貨卡模板設定</CardTitle><CardDescription>新增 / 修改 / 刪除 / 啟用都已接 Firebase。</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end"><Button className="gap-2 rounded-xl" onClick={() => onCreateTemplate()}><Plus className="h-4 w-4" />新增模板</Button></div>
        <div className="space-y-3">
          {draftTemplates.map((template) => {
            const isOpen = openId === template.id;
            const draft = draftTemplates.find((item) => item.id === template.id) ?? template;
            return (
              <div key={template.id} className="rounded-2xl border bg-white">
                <button type="button" onClick={() => setOpenId(isOpen ? "" : template.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left"><div className="space-y-1"><div className="font-medium">{template.name}</div><div className="text-xs text-muted-foreground">{template.paperSize}</div></div><div className="flex items-center gap-3"><Badge variant={template.active ? "default" : "secondary"}>{template.active ? "使用中" : "未啟用"}</Badge>{isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div></button>
                {isOpen ? (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-3">
                        <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">模板名稱</div><Input value={draft.name} onChange={(e) => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, name: e.target.value } : item))} className="mt-2" /></div>
                        <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">紙張尺寸</div><Input value={draft.paperSize} onChange={(e) => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, paperSize: e.target.value } : item))} className="mt-2" /></div>
                        <div className="rounded-xl border p-3 space-y-3 text-sm">
                          <label className="flex items-center justify-between"><span>顯示中文名</span><input type="checkbox" checked={draft.showNameZh} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showNameZh: !item.showNameZh } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示越南文名</span><input type="checkbox" checked={draft.showNameVi} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showNameVi: !item.showNameVi } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示印尼文名</span><input type="checkbox" checked={draft.showNameId} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showNameId: !item.showNameId } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示分類</span><input type="checkbox" checked={draft.showCategory} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showCategory: !item.showCategory } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示條碼</span><input type="checkbox" checked={draft.showBarcode} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showBarcode: !item.showBarcode } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示規格</span><input type="checkbox" checked={draft.showSpec} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showSpec: !item.showSpec } : item))} /></label>
                          <label className="flex items-center justify-between"><span>顯示更新日期</span><input type="checkbox" checked={draft.showUpdatedDate} onChange={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, showUpdatedDate: !item.showUpdatedDate } : item))} /></label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">{(["sm", "md", "lg"] as const).map((size) => <Button key={size} type="button" variant={draft.priceSize === size ? "default" : "outline"} className="rounded-xl" onClick={() => setDraftTemplates((prev) => prev.map((item) => item.id === template.id ? { ...item, priceSize: size } : item))}>{size.toUpperCase()}</Button>)}</div>
                        <div className="grid grid-cols-3 gap-2"><Button variant="outline" className="rounded-xl" onClick={() => onSetActiveTemplate(template.id)}>設為使用中</Button><Button variant="outline" className="rounded-xl" onClick={() => onSaveTemplate(draft)}>儲存模板</Button><Button variant="outline" className="rounded-xl" onClick={() => onDeleteTemplate(template.id)}>刪除模板</Button></div>
                      </div>
                      <div className="space-y-3"><div className="text-sm font-medium">預覽</div><ReceiptLabelPreview storeName={storeName} product={sampleProduct} showSpec={draft.showSpec} showCategory={draft.showCategory} showUpdatedDate={draft.showUpdatedDate} priceClassName={priceClassMap[draft.priceSize]} /></div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemSettingsPanel({
  settings,
  onSaveSettings,
}: {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<SystemSettings>(settings);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader><CardTitle>系統設定</CardTitle><CardDescription>門店名稱與飛鵝帳號參數已接 Firebase。</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">門店名稱</div><Input value={draft.storeName} onChange={(e) => setDraft((prev) => ({ ...prev, storeName: e.target.value }))} className="mt-2" /></div>
        <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">飛鵝 user</div><Input value={draft.feieUser} onChange={(e) => setDraft((prev) => ({ ...prev, feieUser: e.target.value }))} className="mt-2" /></div>
        <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">飛鵝 UKEY</div><Input type="password" value={draft.feieUkey} onChange={(e) => setDraft((prev) => ({ ...prev, feieUkey: e.target.value }))} className="mt-2" /></div>
        <div className="flex justify-end"><Button className="rounded-xl" onClick={() => onSaveSettings({ ...draft, storeName: normalizeStoreName(draft.storeName) })}>儲存</Button></div>
      </CardContent>
    </Card>
  );
}

function PrinterDeviceManager({
  devices,
  onCreateDevice,
  onSaveDevice,
  onDeleteDevice,
  onSetDefaultDevice,
  onTestDevice,
}: {
  devices: PrinterDevice[];
  onCreateDevice: () => Promise<void> | void;
  onSaveDevice: (device: PrinterDevice) => Promise<void> | void;
  onDeleteDevice: (deviceId: string) => Promise<void> | void;
  onSetDefaultDevice: (deviceId: string) => Promise<void> | void;
  onTestDevice: (deviceId: string) => Promise<void> | void;
}) {
  const [openId, setOpenId] = useState<string>(devices[0]?.id ?? "");
  const [draftDevices, setDraftDevices] = useState<PrinterDevice[]>(devices);
  useEffect(() => setDraftDevices(devices), [devices]);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader><CardTitle>列印設備設定</CardTitle><CardDescription>新增 / 修改 / 刪除 / 預設 / 測試都已接 Firebase。</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end"><Button className="gap-2 rounded-xl" onClick={() => onCreateDevice()}><Plus className="h-4 w-4" />新增設備</Button></div>
        <div className="space-y-3">
          {draftDevices.map((device) => {
            const isOpen = openId === device.id;
            const draft = draftDevices.find((item) => item.id === device.id) ?? device;
            return (
              <div key={device.id} className="rounded-2xl border bg-white">
                <button type="button" onClick={() => setOpenId(isOpen ? "" : device.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left"><div className="space-y-1"><div className="font-medium">{device.name}</div><div className="text-xs text-muted-foreground">{device.brand} ・ {device.model} ・ {device.connectionType}</div></div><div className="flex items-center gap-3"><Badge variant={device.isDefault ? "default" : "secondary"}>{device.isDefault ? "預設設備" : device.status}</Badge>{isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</div></button>
                {isOpen ? (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">設備名稱</div><Input value={draft.name} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, name: e.target.value } : item))} className="mt-2" /></div>
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">品牌</div><Input value={draft.brand} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, brand: e.target.value } : item))} className="mt-2" /></div>
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">型號</div><Input value={draft.model} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, model: e.target.value } : item))} className="mt-2" /></div>
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">用途</div><Input value={draft.usage} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, usage: e.target.value as PrinterDevice["usage"] } : item))} className="mt-2" /></div>
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">連線方式</div><select value={draft.connectionType} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, connectionType: e.target.value as PrinterDevice["connectionType"] } : item))} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="Cloud API">Cloud API</option><option value="Wi-Fi">Wi-Fi</option><option value="Bluetooth">Bluetooth</option></select></div>
                      <div className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">打印機 SN</div><Input value={draft.deviceId} onChange={(e) => setDraftDevices((prev) => prev.map((item) => item.id === device.id ? { ...item, deviceId: e.target.value } : item))} className="mt-2" /></div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2"><Button variant="outline" className="rounded-xl" onClick={() => onSetDefaultDevice(device.id)}>設為預設</Button><Button variant="outline" className="rounded-xl" onClick={() => onTestDevice(device.id)}>測試列印</Button><Button variant="outline" className="rounded-xl" onClick={() => onSaveDevice(draft)}>儲存</Button><Button variant="outline" className="rounded-xl" onClick={() => onDeleteDevice(device.id)}>刪除</Button></div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsWorkspace({
  suppliers,
  templates,
  printerDevices,
  sampleProduct,
  settings,
  onCreateSupplier,
  onSaveSupplier,
  onDeleteSupplier,
  onImportSuppliers,
  onDeleteAllSuppliers,
  onSaveSettings,
  onCreateTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onSetActiveTemplate,
  onCreateDevice,
  onSaveDevice,
  onDeleteDevice,
  onSetDefaultDevice,
  onTestDevice,
}: {
  suppliers: Supplier[];
  templates: LabelTemplate[];
  printerDevices: PrinterDevice[];
  sampleProduct: Product;
  settings: SystemSettings;
  onCreateSupplier: () => Promise<void> | void;
  onSaveSupplier: (supplier: Supplier) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  onImportSuppliers: (suppliers: Supplier[]) => Promise<void> | void;
  onDeleteAllSuppliers: () => Promise<void> | void;
  onSaveSettings: (settings: SystemSettings) => Promise<void> | void;
  onCreateTemplate: () => Promise<void> | void;
  onSaveTemplate: (template: LabelTemplate) => Promise<void> | void;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
  onSetActiveTemplate: (templateId: string) => Promise<void> | void;
  onCreateDevice: () => Promise<void> | void;
  onSaveDevice: (device: PrinterDevice) => Promise<void> | void;
  onDeleteDevice: (deviceId: string) => Promise<void> | void;
  onSetDefaultDevice: (deviceId: string) => Promise<void> | void;
  onTestDevice: (deviceId: string) => Promise<void> | void;
}) {
  const [panel, setPanel] = useState<"hub" | "system" | "suppliers" | "label_templates" | "printer_devices">("hub");

  if (panel === "system") return <div className="space-y-4 pb-20 lg:pb-0"><Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>返回設定</Button><SystemSettingsPanel settings={settings} onSaveSettings={onSaveSettings} /></div>;
  if (panel === "suppliers") return <div className="space-y-4 pb-20 lg:pb-0"><Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>返回設定</Button><SupplierManager suppliers={suppliers} onCreateSupplier={onCreateSupplier} onSaveSupplier={onSaveSupplier} onDeleteSupplier={onDeleteSupplier} onImportSuppliers={onImportSuppliers} onDeleteAllSuppliers={onDeleteAllSuppliers} /></div>;
  if (panel === "label_templates") return <div className="space-y-4 pb-20 lg:pb-0"><Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>返回設定</Button><LabelTemplateManager templates={templates} sampleProduct={sampleProduct} storeName={settings.storeName} onCreateTemplate={onCreateTemplate} onSaveTemplate={onSaveTemplate} onDeleteTemplate={onDeleteTemplate} onSetActiveTemplate={onSetActiveTemplate} /></div>;
  if (panel === "printer_devices") return <div className="space-y-4 pb-20 lg:pb-0"><Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>返回設定</Button><PrinterDeviceManager devices={printerDevices} onCreateDevice={onCreateDevice} onSaveDevice={onSaveDevice} onDeleteDevice={onDeleteDevice} onSetDefaultDevice={onSetDefaultDevice} onTestDevice={onTestDevice} /></div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="grid gap-4 md:grid-cols-4">
        <button type="button" onClick={() => setPanel("suppliers")} className="text-left"><Card className="rounded-2xl shadow-sm transition hover:shadow-md"><CardContent className="space-y-3 p-5"><Truck className="h-5 w-5" /><div className="font-medium">廠商資料</div></CardContent></Card></button>
        <button type="button" onClick={() => setPanel("system")} className="text-left"><Card className="rounded-2xl shadow-sm transition hover:shadow-md"><CardContent className="space-y-3 p-5"><SlidersHorizontal className="h-5 w-5" /><div className="font-medium">系統設定</div></CardContent></Card></button>
        <button type="button" onClick={() => setPanel("label_templates")} className="text-left"><Card className="rounded-2xl shadow-sm transition hover:shadow-md"><CardContent className="space-y-3 p-5"><FileText className="h-5 w-5" /><div className="font-medium">貨卡模板設定</div></CardContent></Card></button>
        <button type="button" onClick={() => setPanel("printer_devices")} className="text-left"><Card className="rounded-2xl shadow-sm transition hover:shadow-md"><CardContent className="space-y-3 p-5"><Printer className="h-5 w-5" /><div className="font-medium">列印設備設定</div></CardContent></Card></button>
      </div>
    </div>
  );
}

function StatCard({ title, value, note }: { title: string; value: string; note: string }) {
  return <Card className="rounded-2xl shadow-sm"><CardContent className="space-y-2 p-4"><div className="text-sm text-muted-foreground">{title}</div><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-muted-foreground">{note}</div></CardContent></Card>;
}

function MobileBottomNav({ active, onChange }: { active: NavKey; onChange: (key: NavKey) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button key={item.key} type="button" onClick={() => onChange(item.key)} className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] transition ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon className="mb-1 h-4 w-4" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SupermarketInventoryFrontendPrototype() {
  const auth = getAuth(app);
  const [active, setActive] = useState<NavKey>("inbound");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [batchRecords, setBatchRecords] = useState<BatchRecord[]>(initialBatchRecords);
  const [templates, setTemplates] = useState<LabelTemplate[]>(initialLabelTemplates);
  const [printerDevices, setPrinterDevices] = useState<PrinterDevice[]>(initialPrinterDevices);
  const [settings, setSettings] = useState<SystemSettings>(initialSystemSettings);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!currentUser) return;

    const loadAll = async () => {
      try {
        const [productSnap, supplierSnap, batchSnap, templateSnap, printerSnap, settingsSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(collection(db, "suppliers")),
          getDocs(collection(db, "batchRecords")),
          getDocs(collection(db, "labelTemplates")),
          getDocs(collection(db, "printerDevices")),
          getDocs(collection(db, "systemSettings")),
        ]);

        const remoteProducts = productSnap.docs.map((snapshot) => {
          const data = snapshot.data();
          return {
            docId: snapshot.id,
            barcode: String(data.barcode ?? ""),
            name: String(data.name ?? ""),
            nameVi: String(data.nameVi ?? ""),
            nameId: String(data.nameId ?? ""),
            translationStatus: {
              vi: (data.translationStatus?.vi ?? "empty") as TranslationStatus["vi"],
              id: (data.translationStatus?.id ?? "empty") as TranslationStatus["id"],
            },
            category: String(data.category ?? ""),
            supplierCode: String(data.supplierCode ?? ""),
            supplier: String(data.supplier ?? ""),
            cost: Number(data.cost ?? 0),
            price: Number(data.price ?? 0),
            untaxed: Number(data.untaxed ?? 0),
            stock: Number(data.stock ?? 0),
            history: Array.isArray(data.history) ? data.history : [],
          } as Product;
        });

        const remoteSuppliers = supplierSnap.docs.map((snapshot) => {
          const data = snapshot.data();
          return {
            id: snapshot.id,
            code: String(data.code ?? ""),
            name: String(data.name ?? ""),
            contact: String(data.contact ?? ""),
            phone: String(data.phone ?? ""),
            note: String(data.note ?? ""),
            active: Boolean(data.active ?? true),
          } as Supplier;
        });

        const remoteBatchRecords = batchSnap.docs.map((snapshot) => {
          const data = snapshot.data();
          return {
            docId: snapshot.id,
            id: String(data.id ?? snapshot.id),
            date: String(data.date ?? ""),
            supplier: String(data.supplier ?? ""),
            totalAmount: Number(data.totalAmount ?? 0),
            itemCount: Number(data.itemCount ?? 0),
            lines: Array.isArray(data.lines) ? data.lines : [],
          } as BatchRecord;
        });

        const remoteTemplates = templateSnap.docs.map((snapshot) => {
          const data = snapshot.data();
          return {
            id: snapshot.id,
            name: String(data.name ?? "新模板"),
            paperSize: String(data.paperSize ?? "4 × 6 cm"),
            showNameZh: Boolean(data.showNameZh ?? true),
            showNameVi: Boolean(data.showNameVi ?? false),
            showNameId: Boolean(data.showNameId ?? false),
            showCategory: Boolean(data.showCategory ?? false),
            showBarcode: Boolean(data.showBarcode ?? true),
            showSpec: Boolean(data.showSpec ?? true),
            showUpdatedDate: Boolean(data.showUpdatedDate ?? false),
            priceSize: (data.priceSize ?? "lg") as LabelTemplate["priceSize"],
            active: Boolean(data.active ?? false),
          } as LabelTemplate;
        });
        const remotePrinters = printerSnap.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as Omit<PrinterDevice, "id">) } as PrinterDevice));
        const remoteSettingsDoc = settingsSnap.docs[0];

        if (remoteProducts.length > 0) setProducts(remoteProducts);
        if (remoteSuppliers.length > 0) setSuppliers(remoteSuppliers);
        if (remoteBatchRecords.length > 0) setBatchRecords(remoteBatchRecords);
        if (remoteTemplates.length > 0) setTemplates(remoteTemplates);
        if (remotePrinters.length > 0) setPrinterDevices(remotePrinters);
        if (remoteSettingsDoc) setSettings({
          storeName: normalizeStoreName(String(remoteSettingsDoc.data().storeName ?? initialSystemSettings.storeName)),
          feieUser: String(remoteSettingsDoc.data().feieUser ?? ""),
          feieUkey: String(remoteSettingsDoc.data().feieUkey ?? ""),
        });
      } catch (error) {
        console.error("load firebase data failed", error);
      }
    };

    loadAll();
  }, [currentUser]);

  const signInWithGoogle = async () => {
    try {
      setAuthError("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("google sign in failed", error);
      setAuthError("Google 登入失敗，請重新再試一次");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("sign out failed", error);
    }
  };

  const lowStockCount = getLowStockCount(products, 10);
  const supplierCount = getActiveSupplierCount(suppliers);

  const saveProductEdit = async (originalBarcode: string, patch: EditableProductFields) => {
    const target = products.find((product) => product.barcode === originalBarcode);
    setProducts((prev) => prev.map((product) => product.barcode === originalBarcode ? { ...product, ...patch } : product));
    if (!target?.docId) return;
    await updateDoc(doc(db, "products", target.docId), patch);
  };

  const createProduct = async (payload: NewProductFields) => {
    const docRef = await addDoc(collection(db, "products"), { ...payload, history: [] });
    setProducts((prev) => [{ ...payload, history: [], docId: docRef.id }, ...prev]);
  };

  const deleteAllProducts = async () => {
    for (const product of products) {
      if (product.docId) {
        await deleteDoc(doc(db, "products", product.docId));
      }
    }
    setProducts([]);
  };

  const importProducts = async (payload: NewProductFields[]) => {
    const created: Product[] = [];
    for (const item of payload) {
      const docRef = await addDoc(collection(db, "products"), { ...item, history: [] });
      created.push({ ...item, history: [], docId: docRef.id });
    }
    if (created.length > 0) setProducts((prev) => [...created, ...prev]);
  };

  const removeDuplicateProducts = async () => {
    const grouped = new Map<string, Product[]>();
    for (const product of products) {
      const key = product.barcode.trim();
      if (!key) continue;
      const list = grouped.get(key) ?? [];
      list.push(product);
      grouped.set(key, list);
    }

    const toDelete: Product[] = [];

    for (const [, list] of grouped) {
      if (list.length <= 1) continue;
      const sorted = [...list].sort((a, b) => {
        const aScore = (a.history?.length ?? 0) + (a.nameVi ? 1 : 0) + (a.nameId ? 1 : 0);
        const bScore = (b.history?.length ?? 0) + (b.nameVi ? 1 : 0) + (b.nameId ? 1 : 0);
        return bScore - aScore;
      });
      toDelete.push(...sorted.slice(1));
    }

    for (const product of toDelete) {
      if (product.docId) {
        await deleteDoc(doc(db, "products", product.docId));
      }
    }

    if (toDelete.length > 0) {
      const deleteIds = new Set(toDelete.map((item) => item.docId).filter(Boolean));
      setProducts((prev) => prev.filter((item) => !item.docId || !deleteIds.has(item.docId)));
    }
  };

  const saveInboundBatch = async (items: FlowItem[]) => {
    if (items.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const batchId = `BATCH-${date.replace(/-/g, "")}-${String(batchRecords.length + 1).padStart(3, "0")}`;
    const nextRecord: BatchRecord = {
      id: batchId,
      date,
      supplier: items[0]?.supplier ?? "未指定廠商",
      totalAmount: calculateTotal(items),
      itemCount: items.length,
      lines: items.map((item) => ({ barcode: item.barcode, product: item.name, supplier: item.supplier, qty: item.qty, price: item.price, amount: item.amount })),
    };
    const batchDocRef = await addDoc(collection(db, "batchRecords"), nextRecord);
    setBatchRecords((prev) => [{ ...nextRecord, docId: batchDocRef.id }, ...prev]);
    for (const item of items) {
      const target = products.find((product) => product.barcode === item.barcode);
      if (!target?.docId) continue;
      const historyEntry: HistoryRecord = { date, type: item.qty >= 0 ? "進貨" : "退貨", qty: item.qty, price: item.price, amount: item.amount };
      await updateDoc(doc(db, "products", target.docId), { stock: target.stock + item.qty, history: [historyEntry, ...(target.history ?? [])] });
    }
    setProducts((prev) => prev.map((product) => {
      const matched = items.find((item) => item.barcode === product.barcode);
      if (!matched) return product;
      const historyEntry: HistoryRecord = { date, type: matched.qty >= 0 ? "進貨" : "退貨", qty: matched.qty, price: matched.price, amount: matched.amount };
      return { ...product, stock: product.stock + matched.qty, history: [historyEntry, ...product.history] };
    }));
  };

  const updateBatchRecord = async (record: BatchRecord) => {
    if (!record.docId) return;
    const payload = { id: record.id, date: record.date, supplier: record.supplier, totalAmount: record.totalAmount, itemCount: record.itemCount, lines: record.lines.map((line) => ({ ...line, edited: false })) };
    await updateDoc(doc(db, "batchRecords", record.docId), payload);
    setBatchRecords((prev) => prev.map((item) => item.id === record.id ? { ...record, lines: payload.lines } : item));
  };

  const deleteBatchLine = async (recordId: string, lineIndex: number) => {
    const target = batchRecords.find((record) => record.id === recordId);
    if (!target?.docId) return;
    const nextLines = target.lines.filter((_, index) => index !== lineIndex);
    if (nextLines.length === 0) {
      await deleteDoc(doc(db, "batchRecords", target.docId));
      setBatchRecords((prev) => prev.filter((item) => item.id !== recordId));
      return;
    }
    const nextRecord = recalcBatchTotals({ ...target, lines: nextLines });
    await updateDoc(doc(db, "batchRecords", target.docId), { lines: nextRecord.lines, totalAmount: nextRecord.totalAmount, itemCount: nextRecord.itemCount });
    setBatchRecords((prev) => prev.map((item) => item.id === recordId ? { ...nextRecord, docId: target.docId } : item));
  };

  const addProductToBatch = async (recordId: string, product: Product) => {
    const target = batchRecords.find((record) => record.id === recordId);
    if (!target?.docId) return;
    const nextRecord = recalcBatchTotals({
      ...target,
      lines: [...target.lines, { barcode: product.barcode, product: product.name, supplier: product.supplier, qty: 1, price: product.cost, amount: calculateAmount(1, product.cost), edited: true }],
    });
    await updateDoc(doc(db, "batchRecords", target.docId), { lines: nextRecord.lines, totalAmount: nextRecord.totalAmount, itemCount: nextRecord.itemCount });
    setBatchRecords((prev) => prev.map((item) => item.id === recordId ? { ...nextRecord, docId: target.docId } : item));
  };

  const createSupplier = async () => {
    const payload = { code: `V${String(suppliers.length + 1).padStart(3, "0")}`, name: "新廠商", contact: "", phone: "", note: "", active: true };
    const docRef = await addDoc(collection(db, "suppliers"), payload);
    setSuppliers((prev) => [{ id: docRef.id, ...payload }, ...prev]);
  };

  const saveSupplier = async (supplier: Supplier) => {
    await setDoc(doc(db, "suppliers", supplier.id), { code: supplier.code, name: supplier.name, contact: supplier.contact, phone: supplier.phone, note: supplier.note, active: supplier.active });
    setSuppliers((prev) => prev.map((item) => item.id === supplier.id ? supplier : item));
  };

  const deleteSupplier = async (supplierId: string) => {
    await deleteDoc(doc(db, "suppliers", supplierId));
    setSuppliers((prev) => prev.filter((item) => item.id !== supplierId));
  };

  const importSuppliers = async (payload: Supplier[]) => {
    const created: Supplier[] = [];
    for (const supplier of payload) {
      const docRef = await addDoc(collection(db, "suppliers"), { code: supplier.code, name: supplier.name, contact: supplier.contact, phone: supplier.phone, note: supplier.note, active: supplier.active });
      created.push({ ...supplier, id: docRef.id });
    }
    if (created.length > 0) setSuppliers((prev) => [...created, ...prev]);
  };

  const deleteAllSuppliers = async () => {
    for (const supplier of suppliers) {
      if (supplier.id) {
        await deleteDoc(doc(db, "suppliers", supplier.id));
      }
    }
    setSuppliers([]);
  };

  const saveSystemSettings = async (nextSettings: SystemSettings) => {
    await setDoc(doc(db, "systemSettings", "main"), nextSettings);
    setSettings(nextSettings);
  };

  const createTemplate = async () => {
    const payload: Omit<LabelTemplate, "id"> = { name: "新模板", paperSize: "4 × 6 cm", showNameZh: true, showNameVi: false, showNameId: false, showCategory: true, showBarcode: true, showSpec: false, showUpdatedDate: false, priceSize: "md", active: false };
    const docRef = await addDoc(collection(db, "labelTemplates"), payload);
    setTemplates((prev) => [{ id: docRef.id, ...payload }, ...prev]);
  };

  const saveTemplate = async (template: LabelTemplate) => {
    await setDoc(doc(db, "labelTemplates", template.id), { name: template.name, paperSize: template.paperSize, showNameZh: template.showNameZh, showNameVi: template.showNameVi, showNameId: template.showNameId, showCategory: template.showCategory, showBarcode: template.showBarcode, showSpec: template.showSpec, showUpdatedDate: template.showUpdatedDate, priceSize: template.priceSize, active: template.active });
    setTemplates((prev) => prev.map((item) => item.id === template.id ? template : item));
  };

  const deleteTemplate = async (templateId: string) => {
    await deleteDoc(doc(db, "labelTemplates", templateId));
    setTemplates((prev) => prev.filter((item) => item.id !== templateId));
  };

  const setActiveTemplate = async (templateId: string) => {
    const nextTemplates = templates.map((item) => ({ ...item, active: item.id === templateId }));
    for (const template of nextTemplates) {
      await setDoc(doc(db, "labelTemplates", template.id), { name: template.name, paperSize: template.paperSize, showNameZh: template.showNameZh, showNameVi: template.showNameVi, showNameId: template.showNameId, showCategory: template.showCategory, showBarcode: template.showBarcode, showSpec: template.showSpec, showUpdatedDate: template.showUpdatedDate, priceSize: template.priceSize, active: template.active });
    }
    setTemplates(nextTemplates);
  };

  const createPrinterDevice = async () => {
    const payload: Omit<PrinterDevice, "id"> = { name: "新設備", brand: "", model: "", usage: "貨卡", connectionType: "Wi-Fi", ipAddress: "", port: "9100", deviceId: "", paperWidth: "57mm", cutterEnabled: true, isDefault: false, status: "未連線" };
    const docRef = await addDoc(collection(db, "printerDevices"), payload);
    setPrinterDevices((prev) => [{ id: docRef.id, ...payload }, ...prev]);
  };

  const savePrinterDevice = async (device: PrinterDevice) => {
    await setDoc(doc(db, "printerDevices", device.id), { name: device.name, brand: device.brand, model: device.model, usage: device.usage, connectionType: device.connectionType, ipAddress: device.ipAddress, port: device.port, deviceId: device.deviceId, paperWidth: device.paperWidth, cutterEnabled: device.cutterEnabled, isDefault: device.isDefault, status: device.status });
    setPrinterDevices((prev) => prev.map((item) => item.id === device.id ? device : item));
  };

  const deletePrinterDevice = async (deviceId: string) => {
    await deleteDoc(doc(db, "printerDevices", deviceId));
    setPrinterDevices((prev) => prev.filter((item) => item.id !== deviceId));
  };

  const setDefaultPrinterDevice = async (deviceId: string) => {
    const nextDevices = printerDevices.map((item) => ({ ...item, isDefault: item.id === deviceId }));
    for (const device of nextDevices) {
      await setDoc(doc(db, "printerDevices", device.id), { name: device.name, brand: device.brand, model: device.model, usage: device.usage, connectionType: device.connectionType, ipAddress: device.ipAddress, port: device.port, deviceId: device.deviceId, paperWidth: device.paperWidth, cutterEnabled: device.cutterEnabled, isDefault: device.isDefault, status: device.status });
    }
    setPrinterDevices(nextDevices);
  };

  const testPrinterDevice = async (deviceId: string) => {
    const target = printerDevices.find((item) => item.id === deviceId);
    if (!target) return;
    const next = { ...target, status: "已連線" as const };
    await savePrinterDevice(next);
  };

  const sendPrintJob = async ({
    product,
    template,
    printer,
  }: {
    product: Product;
    template: LabelTemplate;
    printer: PrinterDevice | null;
  }): Promise<PrintJobResult> => {
    if (!printer?.deviceId) {
      return { ok: false, message: "尚未設定列印機 SN" };
    }

    if (!settings.feieUser || !settings.feieUkey) {
      return { ok: false, message: "請先在系統設定填入飛鵝 user / UKEY" };
    }

    try {
      const response = await fetch("/api/feie/print-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: settings.feieUser,
          ukey: settings.feieUkey,
          sn: printer.deviceId,
          times: 1,
          content: buildFeieReceiptContent({
            storeName: settings.storeName,
            product,
            template,
            printer,
          }),
        }),
      });

      const rawText = await response.text();
      let result: PrintJobResult | null = null;

      if (rawText) {
        try {
          result = JSON.parse(rawText) as PrintJobResult;
        } catch (error) {
          console.error("parse print response failed", error, rawText);
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          message: result?.message ?? rawText ?? `列印請求失敗：${response.status}`,
        };
      }

      return result ?? { ok: false, message: "列印服務沒有回傳內容" };
    } catch (error) {
      console.error("send print job failed", error);
      return { ok: false, message: "列印請求失敗" };
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-semibold">登入檢查中</div>
          <div className="mt-2 text-sm text-muted-foreground">正在確認 Firebase Authentication 狀態。</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">嘉義門市</div>
          <div className="mt-2 text-2xl font-semibold">超市庫存系統</div>
          <div className="mt-2 text-sm text-muted-foreground">請先使用 Google 帳號登入，通過 Firebase 權限驗證後才能操作系統。</div>
          <Button className="mt-6 w-full rounded-xl" onClick={signInWithGoogle}>使用 Google 登入</Button>
          {authError ? <div className="mt-3 rounded-xl border px-3 py-2 text-sm text-red-600">{authError}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-white p-4 lg:block lg:p-5">
          <div className="mb-6 space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{normalizeStoreName(settings.storeName)}</div>
            <div className="text-xl font-semibold">超市庫存系統</div>
            <div className="text-sm text-muted-foreground">Canvas 前端原型</div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <StatCard title="商品" value={String(products.length)} note="主檔筆數" />
            <StatCard title="廠商" value={String(supplierCount)} note="啟用中" />
            <StatCard title="低庫存" value={String(lowStockCount)} note="≤ 10" />
            <StatCard title="批次" value={String(batchRecords.length)} note="批次紀錄" />
          </div>
          <div className="mb-4 rounded-2xl border p-4 text-sm">
            <div className="font-medium">登入帳號</div>
            <div className="mt-2 break-all text-xs text-muted-foreground">{currentUser.email}</div>
            <Button variant="outline" className="mt-3 w-full rounded-xl" onClick={handleSignOut}>登出</Button>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return <button key={item.key} type="button" onClick={() => setActive(item.key)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${isActive ? "bg-slate-900 text-white" : "bg-transparent hover:bg-slate-100"}`}><Icon className="h-4 w-4" /><span>{item.label}</span></button>;
            })}
          </nav>
        </aside>

        <main className="overflow-x-hidden p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{normalizeStoreName(settings.storeName)}</div>
              <div className="text-xl font-semibold">超市庫存系統</div>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={handleSignOut}>登出</Button>
          </div>

          <div className="pb-24 pr-2 lg:pb-4">
            <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-6">
              {active === "products" ? <ProductMaster products={products} suppliers={suppliers} onSaveEdit={saveProductEdit} onCreateProduct={createProduct} onImportProducts={importProducts} onRemoveDuplicateProducts={removeDuplicateProducts} onDeleteAllProducts={deleteAllProducts} /> : null}
              {active === "inbound" ? <InboundWorkbench products={products} onSaveBatch={saveInboundBatch} /> : null}
              {active === "stock" ? <StockQuery products={products} /> : null}
              {active === "labels" ? (
                <LabelPrinter
                  products={products}
                  storeName={settings.storeName}
                  templates={templates}
                  printerDevices={printerDevices}
                  settings={settings}
                  onPrintLabel={sendPrintJob}
                />
              ) : null}
              {active === "records" ? <RecordQuery batchRecords={batchRecords} products={products} onUpdateBatchRecord={updateBatchRecord} onDeleteBatchRecord={deleteBatchLine} onAddProductToBatch={addProductToBatch} /> : null}
              {active === "settings" ? <SettingsWorkspace suppliers={suppliers} templates={templates} printerDevices={printerDevices} sampleProduct={products[0] ?? initialProducts[0]} settings={settings} onCreateSupplier={createSupplier} onSaveSupplier={saveSupplier} onDeleteSupplier={deleteSupplier} onImportSuppliers={importSuppliers} onDeleteAllSuppliers={deleteAllSuppliers} onSaveSettings={saveSystemSettings} onCreateTemplate={createTemplate} onSaveTemplate={saveTemplate} onDeleteTemplate={deleteTemplate} onSetActiveTemplate={setActiveTemplate} onCreateDevice={createPrinterDevice} onSaveDevice={savePrinterDevice} onDeleteDevice={deletePrinterDevice} onSetDefaultDevice={setDefaultPrinterDevice} onTestDevice={testPrinterDevice} /> : null}
            </motion.div>
          </div>
        </main>
      </div>
      <MobileBottomNav active={active} onChange={setActive} />
    </div>
  );
}
