import React, { useMemo, useState } from "react";
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

type HistoryRecord = {
  date: string;
  type: "進貨" | "退貨";
  qty: number;
  price: number;
  amount: number;
};

type Product = {
  barcode: string;
  name: string;
  category: string;
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

type EditableProductFields = Pick<
  Product,
  "name" | "barcode" | "category" | "supplier" | "cost" | "price" | "untaxed"
>;

const initialProducts: Product[] = [
  {
    barcode: "4710012345678",
    name: "可口可樂 600ml",
    category: "飲料",
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
    category: "麵包",
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
    category: "冷藏",
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
  {
    id: "sup-004",
    code: "V004",
    name: "聯合食品",
    contact: "蔡小姐",
    phone: "0955-000-321",
    note: "備援供應商",
    active: false,
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
        edited: true,
      },
    ],
  },
  {
    id: "BATCH-20260608-002",
    date: "2026-06-08",
    supplier: "信成冷鏈",
    itemCount: 1,
    totalAmount: 380,
    lines: [
      {
        barcode: "4710001122334",
        product: "義美雞蛋豆腐",
        supplier: "信成冷鏈",
        qty: 20,
        price: 19,
        amount: 380,
      },
    ],
  },
  {
    id: "BATCH-20260604-001",
    date: "2026-06-04",
    supplier: "信成冷鏈",
    itemCount: 1,
    totalAmount: -57,
    lines: [
      {
        barcode: "4710001122334",
        product: "義美雞蛋豆腐",
        supplier: "信成冷鏈",
        qty: -3,
        price: 19,
        amount: -57,
      },
    ],
  },
];

const initialLabelTemplates: LabelTemplate[] = [
  {
    id: "tpl-a",
    name: "模板 A｜標準售價卡",
    paperSize: "4 × 6 cm",
    showCategory: true,
    showBarcode: true,
    showSpec: false,
    showUpdatedDate: false,
    priceSize: "lg",
    active: true,
  },
  {
    id: "tpl-b",
    name: "模板 B｜資訊擴充版",
    paperSize: "4 × 6 cm",
    showCategory: true,
    showBarcode: true,
    showSpec: true,
    showUpdatedDate: true,
    priceSize: "md",
    active: false,
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
  {
    id: "printer-002",
    name: "備用標籤機",
    brand: "XPrinter",
    model: "XP-58IINT",
    usage: "備用",
    connectionType: "Bluetooth",
    ipAddress: "",
    port: "",
    deviceId: "XP58-BACKUP",
    paperWidth: "57mm",
    cutterEnabled: true,
    isDefault: false,
    status: "未連線",
  },
];

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

function findProductByQuery(list: Product[], query: string): Product | null {
  const normalized = query.trim();
  if (!normalized) return null;
  return (
    list.find(
      (item) => item.barcode.includes(normalized) || item.name.includes(normalized)
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

function normalizeTemplates(templates: LabelTemplate[]): LabelTemplate[] {
  if (templates.length === 0) return templates;
  if (templates.some((item) => item.active)) return templates;
  return templates.map((item, index) => ({ ...item, active: index === 0 }));
}

function normalizePrinterDevices(devices: PrinterDevice[]): PrinterDevice[] {
  if (devices.length === 0) return devices;
  if (devices.some((item) => item.isDefault)) return devices;
  return devices.map((item, index) => ({ ...item, isDefault: index === 0 }));
}

function normalizeBarcodeValue(value: string): string {
  const cleaned = value.replace(/\s+/g, "").trim();
  return cleaned || "000000000000";
}

function normalizeStoreName(value: string): string {
  return value.trim() || "未設定門店";
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

function runPrototypeTests() {
  return [
    {
      name: "calculateAmount multiplies qty and price",
      pass: calculateAmount(3, 21) === 63,
    },
    {
      name: "calculateAmount supports negative qty for return",
      pass: calculateAmount(-3, 19) === -57,
    },
    {
      name: "calculateTotal sums positive and negative amounts",
      pass: calculateTotal([{ amount: 100 }, { amount: -40 }]) === 60,
    },
    {
      name: "calculateTotalQty sums quantities",
      pass: calculateTotalQty([{ qty: 2 }, { qty: -1 }, { qty: 5 }]) === 6,
    },
    {
      name: "findProductByQuery matches barcode",
      pass:
        findProductByQuery(initialProducts, "4710012345678")?.name ===
        "可口可樂 600ml",
    },
    {
      name: "getActiveSupplierCount counts active suppliers",
      pass: getActiveSupplierCount(initialSuppliers) === 3,
    },
    {
      name: "filterBatchRecords filters by exact day",
      pass: filterBatchRecords(initialBatchRecords, "2026-06-08", "").length === 2,
    },
    {
      name: "recalcBatchTotals recomputes edited totals",
      pass:
        recalcBatchTotals({
          id: "t",
          date: "2026-06-01",
          supplier: "A",
          itemCount: 1,
          totalAmount: 0,
          lines: [
            {
              barcode: "1",
              product: "P",
              supplier: "A",
              qty: 2,
              price: 12,
              amount: 0,
            },
          ],
        }).totalAmount === 24,
    },
    {
      name: "normalizeTemplates enforces one active template when none active",
      pass:
        normalizeTemplates([
          {
            id: "a",
            name: "A",
            paperSize: "4 × 6 cm",
            showCategory: true,
            showBarcode: true,
            showSpec: false,
            showUpdatedDate: false,
            priceSize: "md",
            active: false,
          },
          {
            id: "b",
            name: "B",
            paperSize: "4 × 6 cm",
            showCategory: true,
            showBarcode: true,
            showSpec: false,
            showUpdatedDate: false,
            priceSize: "md",
            active: false,
          },
        ])[0].active === true,
    },
    {
      name: "normalizePrinterDevices enforces one default printer when none default",
      pass:
        normalizePrinterDevices([
          {
            id: "p1",
            name: "A",
            brand: "B",
            model: "M",
            usage: "貨卡",
            connectionType: "Wi-Fi",
            ipAddress: "",
            port: "",
            deviceId: "",
            paperWidth: "57mm",
            cutterEnabled: true,
            isDefault: false,
            status: "未連線",
          },
          {
            id: "p2",
            name: "B",
            brand: "B",
            model: "M",
            usage: "備用",
            connectionType: "Bluetooth",
            ipAddress: "",
            port: "",
            deviceId: "",
            paperWidth: "57mm",
            cutterEnabled: false,
            isDefault: false,
            status: "未連線",
          },
        ])[0].isDefault === true,
    },
    {
      name: "normalizeBarcodeValue removes spaces",
      pass: normalizeBarcodeValue(" 47 10012345678 ") === "4710012345678",
    },
    {
      name: "normalizeStoreName trims whitespace",
      pass: normalizeStoreName("  嘉義門市  ") === "嘉義門市",
    },
    {
      name: "buildFlowItem copies product supplier and amount",
      pass: (() => {
        const item = buildFlowItem(initialProducts[0], 4);
        return item.supplier === "大發商行" && item.amount === 84;
      })(),
    },
    {
      name: "recalcBatchTotals updates itemCount",
      pass:
        recalcBatchTotals({
          id: "t2",
          date: "2026-06-01",
          supplier: "B",
          itemCount: 0,
          totalAmount: 0,
          lines: [
            {
              barcode: "1",
              product: "P1",
              supplier: "B",
              qty: 1,
              price: 10,
              amount: 10,
            },
            {
              barcode: "2",
              product: "P2",
              supplier: "B",
              qty: 2,
              price: 5,
              amount: 10,
            },
          ],
        }).itemCount === 2,
    },
    {
      name: "parseBatchInputValue accepts negative integer",
      pass: parseBatchInputValue("-3", 0) === -3,
    },
    {
      name: "parseBatchInputValue falls back on blank draft",
      pass: parseBatchInputValue("", 19) === 19,
    },
    {
      name: "parseBatchInputValue falls back on invalid draft",
      pass: parseBatchInputValue("abc", 7) === 7,
    },
  ];
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

  React.useEffect(() => {
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
      onFocus={(e) => {
        if (!readOnly) e.currentTarget.select();
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(String(value));
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
                  onChange={
                    editable && onQtyChange
                      ? (value) => onQtyChange(index, value)
                      : undefined
                  }
                />
              </div>
              <div className="pl-1 pr-3 py-2.5">
                <CompactBatchNumberInput
                  value={line.price}
                  readOnly={!editable}
                  onChange={
                    editable && onPriceChange
                      ? (value) => onPriceChange(index, value)
                      : undefined
                  }
                />
              </div>
              <div className="pl-5 pr-1 py-2.5 font-medium whitespace-nowrap">
                NT$ {line.amount}
              </div>
              <div className="flex justify-center px-0 py-2.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-5 w-5 rounded-md"
                  onClick={() => onDelete?.(index)}
                >
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

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
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
  onSaveEdit: (originalBarcode: string, patch: EditableProductFields) => void;
}) {
  const [editForm, setEditForm] = useState<EditableProductFields | null>(null);

  React.useEffect(() => {
    if (!action || action.type !== "edit") {
      setEditForm(null);
      return;
    }
    setEditForm({
      name: action.product.name,
      barcode: action.product.barcode,
      category: action.product.category,
      supplier: action.product.supplier,
      cost: action.product.cost,
      price: action.product.price,
      untaxed: action.product.untaxed,
    });
  }, [action]);

  if (!action) return null;

  const titleMap = {
    edit: "修改商品",
    print: "列印貨卡",
    price: "變更價格",
    disable: "停用商品",
  } as const;

  const descriptionMap = {
    edit: "可直接修改商品名稱、條碼、分類、廠商、主檔進貨價、販售價、未稅價。",
    print: "列印貨卡時只顯示貨卡需要的商品資訊，不顯示進貨價。",
    price: "此原型先確認欲調整價格商品，後續可接價格編輯表單。",
    disable: "此原型先確認停用目標商品，後續可接停用狀態寫入。",
  } as const;

  const isEdit = action.type === "edit" && editForm !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 lg:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b p-4">
          <div className="text-lg font-semibold">{titleMap[action.type]}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {descriptionMap[action.type]}
          </div>
        </div>

        {isEdit ? (
          <div className="space-y-3 p-4 text-sm">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">商品名稱</div>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className="mt-2"
              />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">商品條碼</div>
              <Input
                value={editForm.barcode}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, barcode: e.target.value } : prev))
                }
                className="mt-2"
              />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">分類</div>
              <Input
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, category: e.target.value } : prev))
                }
                className="mt-2"
              />
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">廠商</div>
              <select
                value={editForm.supplier}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, supplier: e.target.value } : prev))
                }
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {suppliers
                  .filter((supplier) => supplier.active)
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">主檔進貨價</div>
                <Input
                  type="number"
                  value={editForm.cost}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, cost: Number(e.target.value) } : prev
                    )
                  }
                  className="mt-2"
                />
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">販售價</div>
                <Input
                  type="number"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, price: Number(e.target.value) } : prev
                    )
                  }
                  className="mt-2"
                />
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">未稅價</div>
                <Input
                  type="number"
                  value={editForm.untaxed}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, untaxed: Number(e.target.value) } : prev
                    )
                  }
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 text-sm">
            <div className="rounded-xl border p-3">
              <div className="font-medium">{action.product.name}</div>
              <div className="text-xs text-muted-foreground">{action.product.barcode}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{action.product.category}</Badge>
                <Badge variant="outline">{action.product.supplier}</Badge>
              </div>
            </div>
            {action.type === "print" ? (
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">販售價</div>
                <div>NT$ {action.product.price}</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">售價</div>
                  <div>NT$ {action.product.price}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">進貨價</div>
                  <div>NT$ {action.product.cost}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            關閉
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => {
              if (isEdit && editForm) onSaveEdit(action.product.barcode, editForm);
              onClose();
            }}
          >
            {isEdit ? "儲存修改" : "確認"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
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
      <button
        type="button"
        onClick={handleClick}
        className="w-full p-4 text-left transition hover:shadow-sm"
      >
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
            {onToggle ? (
              isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )
            ) : null}
          </div>
        </div>
      </button>

      {onToggle ? (
        <div className="border-t px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                onPrint?.(item);
              }}
            >
              <Printer className="h-4 w-4" />列印貨卡
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(item);
              }}
            >
              <Pencil className="h-4 w-4" />修改
            </Button>
          </div>
        </div>
      ) : null}

      {onToggle && isOpen ? (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">分類</div>
              <div>{item.category}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">廠商</div>
              <div>{item.supplier}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">主檔進貨價</div>
              <div>NT$ {item.cost}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">販售價</div>
              <div>NT$ {item.price}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">未稅價</div>
              <div>NT$ {item.untaxed}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">目前庫存</div>
              <div>{item.stock}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => onEdit?.(item)}
            >
              <Pencil className="h-4 w-4" />修改商品
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => onChangePrice?.(item)}
            >
              <FileText className="h-4 w-4" />變更價格
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => onPrint?.(item)}
            >
              <Printer className="h-4 w-4" />列印貨卡
            </Button>
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => onDisable?.(item)}
            >
              <Trash2 className="h-4 w-4" />停用商品
            </Button>
          </div>

          <Separator className="my-3" />
          <div className="space-y-3">
            <div className="font-medium">最近異動</div>
            {item.history.map((h, i) => (
              <div
                key={`${item.barcode}-${h.date}-${h.type}-${i}`}
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
              >
                <div>
                  <div>
                    {h.date}｜{h.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    數量 {h.qty} ・ 單價 NT$ {h.price}
                  </div>
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
}: {
  products: Product[];
  suppliers: Supplier[];
  onSaveEdit: (barcode: string, patch: EditableProductFields) => void;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>(products[0]?.barcode ?? "");
  const [productAction, setProductAction] = useState<ProductAction>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.includes(q) || p.barcode.includes(q) || p.supplier.includes(q)
    );
  }, [products, query]);

  return (
    <div className="pb-20 lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>商品主檔</CardTitle>
          <CardDescription>
            支援搜尋、掃碼查詢、新增商品，以及匯入 / 匯出商品資料。
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品名稱 / 條碼 / 廠商"
              />
            </div>
            <Button variant="outline" className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" />掃碼
            </Button>
            <Button className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />新增
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl">
              <Upload className="h-4 w-4" />匯入
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl">
              <Download className="h-4 w-4" />匯出
            </Button>
          </div>

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

          <ProductActionModal
            action={productAction}
            suppliers={suppliers}
            onClose={() => setProductAction(null)}
            onSaveEdit={onSaveEdit}
          />
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
        <div className="border-b p-4">
          <div className="text-lg font-semibold">輸入數量</div>
          <div className="mt-1 text-sm text-muted-foreground">
            掃碼後直接輸入數量並儲存，正數為進貨、負數為退貨。
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-xl border p-3">
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-muted-foreground">{product.barcode}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              <Badge variant="outline">{product.supplier}</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              主檔進價 NT$ {product.cost}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">數量</div>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="mt-2 text-lg"
              autoFocus
            />
            <div className="mt-2 text-xs text-muted-foreground">
              正數 = 進貨，負數 = 退貨，0 不可儲存。
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            取消
          </Button>
          <Button className="rounded-xl" onClick={onConfirm} disabled={qty === 0}>
            儲存並繼續
          </Button>
        </div>
      </div>
    </div>
  );
}

function InboundWorkbench({ products }: { products: Product[] }) {
  const [scanInput, setScanInput] = useState<string>(products[0].barcode);
  const [items, setItems] = useState<FlowItem[]>([
    buildFlowItem(products[0], 3),
    buildFlowItem(products[2], -2),
  ]);
  const [scanNotice, setScanNotice] = useState<string>("");
  const [scanCandidate, setScanCandidate] = useState<Product | null>(null);
  const [qtyDraft, setQtyDraft] = useState<number>(1);

  const total = calculateTotal(items);
  const totalQty = calculateTotalQty(items);
  const latestItem = items[items.length - 1] ?? null;

  const handleScan = () => {
    const found = findProductByQuery(products, scanInput);
    if (found) {
      setScanCandidate(found);
      setQtyDraft(1);
      setScanNotice(`已掃描：${found.name}`);
    } else {
      setScanNotice(`找不到條碼：${scanInput}`);
    }
  };

  const confirmScanItem = () => {
    if (!scanCandidate || qtyDraft === 0) return;
    setItems((prev) => [...prev, buildFlowItem(scanCandidate, qtyDraft)]);
    setScanNotice(`${scanCandidate.name} 已加入本批清單`);
    setScanInput("");
    setScanCandidate(null);
    setQtyDraft(1);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItem = (
    index: number,
    patch: Partial<Pick<FlowItem, "qty" | "price">>
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextQty = patch.qty ?? item.qty;
        const nextPrice = patch.price ?? item.price;
        return {
          ...item,
          qty: nextQty,
          price: nextPrice,
          amount: calculateAmount(nextQty, nextPrice),
        };
      })
    );
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
            <CardDescription>
              現場流程改為掃碼後直接彈窗輸入數量，儲存後立即回到掃碼狀態繼續作業。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="text-sm font-medium">掃碼 / 輸入條碼</div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="條碼 / 商品名稱"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleScan();
                  }}
                />
                <Button className="gap-2 rounded-xl" onClick={handleScan}>
                  <ScanLine className="h-4 w-4" />掃碼
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                掃碼後會直接跳出數量輸入視窗，適合忙碌現場快速連續進貨。
              </div>
            </div>

            {scanNotice ? (
              <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">
                {scanNotice}
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-2xl border-2 p-3.5">
                <div className="text-[12px] leading-5 text-muted-foreground">本批商品數</div>
                <div className="mt-1 text-[16px] font-semibold leading-none">
                  {items.length}
                </div>
              </div>
              <div className="rounded-2xl border-2 p-3.5">
                <div className="text-[12px] leading-5 text-muted-foreground">本批總件數</div>
                <div className="mt-1 text-[16px] font-semibold leading-none">
                  {totalQty}
                </div>
              </div>
              <div className="rounded-2xl border-2 p-3.5">
                <div className="text-[12px] leading-5 text-muted-foreground">本批總金額</div>
                <div className="mt-1 text-[16px] font-semibold leading-none">
                  NT$ {total}
                </div>
              </div>
            </div>

            {latestItem ? (
              <div className="rounded-2xl border p-4 text-sm">
                <div className="font-medium">最新加入</div>
                <div className="mt-2">{latestItem.name}</div>
                <div className="text-xs text-muted-foreground">{latestItem.barcode}</div>
                <div className="mt-2 text-muted-foreground">
                  數量 {latestItem.qty} ・ 單價 NT$ {latestItem.price} ・ 小計 NT$ {latestItem.amount}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>本批紀錄清單</CardTitle>
            <CardDescription>
              以表格列出本批商品，現場可快速檢查數量、單價與總額。
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <BatchTable
              lines={tableLines}
              editable={true}
              onQtyChange={(index, value) => updateItem(index, { qty: value })}
              onPriceChange={(index, value) => updateItem(index, { price: value })}
              onDelete={removeItem}
            />
            <div className="px-2 pt-2 text-[11px] text-muted-foreground">
              可左右滑動查看完整欄位
            </div>
            <Button className="w-full rounded-xl">儲存本批紀錄</Button>
          </CardContent>
        </Card>

        <InboundQtyModal
          open={scanCandidate !== null}
          product={scanCandidate}
          qty={qtyDraft}
          setQty={setQtyDraft}
          onClose={() => setScanCandidate(null)}
          onConfirm={confirmScanItem}
        />
      </div>
    </div>
  );
}

function StockQuery({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Product>(products[1]);

  return (
    <div className="grid gap-4 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>庫存查詢</CardTitle>
          <CardDescription>現場快速查價格、庫存與最近異動。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="掃碼或搜尋商品" />
            <Button variant="outline" className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" />掃碼
            </Button>
          </div>
          {products.map((item) => (
            <ProductRow key={item.barcode} item={item} onSelect={setSelected} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>庫存詳情</CardTitle>
          <CardDescription>查價與查庫存應合在同一個商品詳情視圖。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-lg font-semibold">{selected.name}</div>
            <div className="text-xs text-muted-foreground">{selected.barcode}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">販售價</div>
              <div>NT$ {selected.price}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">進貨價</div>
              <div>NT$ {selected.cost}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">庫存</div>
              <div>{selected.stock}</div>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="font-medium">最近異動紀錄</div>
            {selected.history.map((h, i) => (
              <div
                key={`${h.date}-${h.type}-${i}`}
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
              >
                <div>
                  <div>
                    {h.type}｜{h.date}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    數量 {h.qty} ・ 單價 NT$ {h.price}
                  </div>
                </div>
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
      <div className="flex min-h-[230px] flex-col px-4 pb-4 pt-4 text-black">
        <div className="text-left text-[11px] font-semibold tracking-[0.08em] text-black/70">
          {normalizeStoreName(storeName)}
        </div>
        <div className="mt-3 text-left text-[30px] font-bold leading-[1.2]">
          {product.name}
        </div>
        <div className="mt-4 space-y-1 leading-tight">
          {showSpec ? <div className="text-[15px] font-semibold">規格：600ml</div> : null}
          {showCategory ? (
            <div className="text-[14px] font-medium">分類：{product.category}</div>
          ) : null}
          {showUpdatedDate ? (
            <div className="text-[11px] text-black/70">更新：2026-06-12</div>
          ) : null}
        </div>
        <div className="mt-auto flex items-end justify-between gap-4">
          <div className="w-[54%] max-w-[220px]">
            <BarcodeGraphic
              value={product.barcode}
              width={0.74}
              height={34}
              fontSize={7}
              margin={0}
              wrapperClassName="rounded-none border-0 bg-transparent px-0 py-0"
            />
          </div>
          <div className="flex items-end justify-end gap-1 text-right">
            <div className={`${priceClassName} font-black leading-[0.82] tracking-tight`}>
              {product.price}
            </div>
            <div className="pb-2 text-[26px] font-bold leading-none">元</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelPrinter({
  products,
  storeName,
}: {
  products: Product[];
  storeName: string;
}) {
  const [selected, setSelected] = useState<Product>(products[0]);

  return (
    <div className="grid gap-4 pb-20 lg:grid-cols-[0.85fr_1.15fr] lg:pb-0">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>貨卡列印</CardTitle>
          <CardDescription>從商品搜尋進入，確認名稱與售價後送標籤機。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="搜尋商品 / 掃碼" />
            <Button variant="outline" className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" />掃碼
            </Button>
          </div>
          {products.map((item) => (
            <ProductRow key={item.barcode} item={item} onSelect={setSelected} />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>4 × 6 cm 貨卡預覽</CardTitle>
          <CardDescription>這裡之後可以接飛鵝雲列印 API 與模板切換。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div layout>
            <ReceiptLabelPreview
              storeName={storeName}
              product={selected}
              showSpec={true}
              showCategory={true}
              showUpdatedDate={false}
              priceClassName="text-[92px]"
            />
          </motion.div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-xl">
              模板 A
            </Button>
            <Button variant="outline" className="rounded-xl">
              模板 B
            </Button>
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">列印前檢查</div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
              <li>商品名稱是否正確</li>
              <li>販售價格是否為最新價格</li>
              <li>條碼內容是否正確</li>
              <li>設備是否已連線</li>
            </ul>
          </div>
          <Button className="w-full gap-2 rounded-xl">
            <Printer className="h-4 w-4" />送出列印
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductPickerModal({
  open,
  query,
  setQuery,
  products,
  onClose,
  onPick,
}: {
  open: boolean;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  products: Product[];
  onClose: () => void;
  onPick: (product: Product) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 lg:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="font-medium">新增商品到批次</div>
            <div className="text-sm text-muted-foreground">
              可手動輸入搜尋，也可用掃碼方式帶入商品。
            </div>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            關閉
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋商品名稱 / 條碼 / 廠商"
            />
            <Button variant="outline" className="gap-2 rounded-xl">
              <ScanLine className="h-4 w-4" />掃碼
            </Button>
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {products.map((product) => (
              <button
                key={product.barcode}
                type="button"
                onClick={() => onPick(product)}
                className="w-full rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.barcode}</div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="secondary">{product.category}</Badge>
                      <Badge variant="outline">{product.supplier}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>進價 NT$ {product.cost}</div>
                    <div className="text-xs text-muted-foreground">庫存 {product.stock}</div>
                  </div>
                </div>
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
  setBatchRecords,
  products,
}: {
  batchRecords: BatchRecord[];
  setBatchRecords: React.Dispatch<React.SetStateAction<BatchRecord[]>>;
  products: Product[];
}) {
  const [dateQuery, setDateQuery] = useState("2026-06-08");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [openId, setOpenId] = useState<string>(batchRecords[0]?.id ?? "");
  const [pickerRecordId, setPickerRecordId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const filtered = useMemo(
    () => filterBatchRecords(batchRecords, dateQuery, supplierQuery),
    [batchRecords, dateQuery, supplierQuery]
  );

  const pickerProducts = useMemo(() => {
    const q = pickerQuery.trim();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.includes(q) ||
        product.barcode.includes(q) ||
        product.supplier.includes(q)
    );
  }, [pickerQuery, products]);

  const updateBatchLine = (
    recordId: string,
    lineIndex: number,
    patch: Partial<Pick<BatchLine, "qty" | "price">>
  ) => {
    setBatchRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        const nextLines = record.lines.map((line, index) => {
          if (index !== lineIndex) return line;
          const nextQty = patch.qty ?? line.qty;
          const nextPrice = patch.price ?? line.price;
          return {
            ...line,
            qty: nextQty,
            price: nextPrice,
            amount: calculateAmount(nextQty, nextPrice),
            edited: true,
          };
        });
        return recalcBatchTotals({ ...record, lines: nextLines });
      })
    );
  };

  const deleteBatchLine = (recordId: string, lineIndex: number) => {
    setBatchRecords((prev) =>
      prev
        .map((record) => {
          if (record.id !== recordId) return record;
          const nextLines = record.lines.filter((_, index) => index !== lineIndex);
          return recalcBatchTotals({ ...record, lines: nextLines });
        })
        .filter((record) => record.lines.length > 0)
    );
  };

  const addBatchLine = (recordId: string, product: Product) => {
    setBatchRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        const nextLine: BatchLine = {
          barcode: product.barcode,
          product: product.name,
          supplier: product.supplier,
          qty: 1,
          price: product.cost,
          amount: calculateAmount(1, product.cost),
          edited: true,
        };
        return recalcBatchTotals({ ...record, lines: [...record.lines, nextLine] });
      })
    );
    setPickerRecordId(null);
    setPickerQuery("");
  };

  const saveBatchChanges = (recordId: string) => {
    setBatchRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        return {
          ...recalcBatchTotals(record),
          lines: record.lines.map((line) => ({ ...line, edited: false })),
        };
      })
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] min-w-0 space-y-4 pb-20 lg:pb-0">
      <Card className="min-w-0 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>批次進退貨紀錄</CardTitle>
          <CardDescription>
            日期查詢改為單日查詢，預設今日；展開後以商品清單表格編輯數量與單價。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              placeholder="選擇日期"
            />
            <Input
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
              placeholder="廠商名稱"
            />
            <Button variant="outline" className="rounded-xl">
              匯出對帳資料
            </Button>
          </div>

          <div className="space-y-3">
            {filtered.map((record) => {
              const isOpen = openId === record.id;
              return (
                <div key={record.id} className="rounded-2xl border bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? "" : record.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">批次</Badge>
                        <span className="font-medium">{record.id}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {record.date} ・ {record.supplier}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div>{record.itemCount} 項商品</div>
                        <div className="font-semibold">NT$ {record.totalAmount}</div>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="min-w-0 border-t px-4 pb-4 pt-3">
                      <BatchTable
                        lines={record.lines}
                        editable={true}
                        onQtyChange={(index, value) =>
                          updateBatchLine(record.id, index, { qty: value })
                        }
                        onPriceChange={(index, value) =>
                          updateBatchLine(record.id, index, { price: value })
                        }
                        onDelete={(index) => deleteBatchLine(record.id, index)}
                      />
                      <div className="px-2 pt-2 text-[11px] text-muted-foreground">
                        可左右滑動查看完整欄位
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-xl border p-3 text-sm">
                        <div className="text-muted-foreground">本批總金額</div>
                        <div className="text-lg font-semibold">NT$ {record.totalAmount}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="gap-2 rounded-xl"
                          onClick={() => {
                            setPickerRecordId(record.id);
                            setPickerQuery("");
                          }}
                        >
                          <Plus className="h-4 w-4" />新增商品
                        </Button>
                        <Button className="rounded-xl" onClick={() => saveBatchChanges(record.id)}>
                          儲存修改
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ProductPickerModal
        open={pickerRecordId !== null}
        query={pickerQuery}
        setQuery={setPickerQuery}
        products={pickerProducts}
        onClose={() => setPickerRecordId(null)}
        onPick={(product) => {
          if (!pickerRecordId) return;
          addBatchLine(pickerRecordId, product);
        }}
      />
    </div>
  );
}

function SupplierManager({
  suppliers,
  setSuppliers,
}: {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string>(suppliers[0]?.id ?? "");
  const [importNotice, setImportNotice] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.includes(q) ||
        s.code.includes(q) ||
        s.contact.includes(q) ||
        s.phone.includes(q)
    );
  }, [suppliers, query]);

  const updateSupplier = (supplierId: string, patch: Partial<Supplier>) =>
    setSuppliers((prev) =>
      prev.map((item) => (item.id === supplierId ? { ...item, ...patch } : item))
    );

  const createSupplier = () => {
    const id = `sup-${Date.now()}`;
    const next: Supplier = {
      id,
      code: `V${String(suppliers.length + 1).padStart(3, "0")}`,
      name: "新廠商",
      contact: "",
      phone: "",
      note: "",
      active: true,
    };
    setSuppliers((prev) => [next, ...prev]);
    setOpenId(id);
  };

  const deleteSupplier = (supplierId: string) => {
    const next = suppliers.filter((item) => item.id !== supplierId);
    setSuppliers(next);
    setOpenId((current) => (current === supplierId ? next[0]?.id ?? "" : current));
  };

  const exportSuppliers = () => {
    const headers = ["code", "name", "contact", "phone", "note", "active"];
    const rows = suppliers.map((supplier) => [
      supplier.code,
      supplier.name,
      supplier.contact,
      supplier.phone,
      supplier.note,
      supplier.active ? "TRUE" : "FALSE",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suppliers-export.csv";
    link.click();
    URL.revokeObjectURL(url);
    setImportNotice("已匯出廠商資料 CSV");
  };

  const importSuppliers = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").trim();
      if (!text) return setImportNotice("匯入失敗：檔案內容為空");
      const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) {
        return setImportNotice("匯入失敗：至少需要標題列與一筆資料");
      }
      const parseCell = (cell: string) =>
        cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
      const rows = lines.slice(1).map((line, index) => {
        const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(parseCell);
        return {
          id: `sup-import-${Date.now()}-${index}`,
          code: parts[0] || `V${String(index + 1).padStart(3, "0")}`,
          name: parts[1] || "未命名廠商",
          contact: parts[2] || "",
          phone: parts[3] || "",
          note: parts[4] || "",
          active: (parts[5] || "TRUE").toUpperCase() !== "FALSE",
        } as Supplier;
      });
      setSuppliers(rows);
      setOpenId(rows[0]?.id ?? "");
      setImportNotice(`已匯入 ${rows.length} 筆廠商資料`);
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>廠商資料</CardTitle>
        <CardDescription>
          廠商清單可直接展開詳細資料，不另外拆成第二張詳情卡。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋廠商名稱 / 編號 / 聯絡人 / 電話"
            className="min-w-[220px] flex-1"
          />
          <Button variant="outline" className="gap-2 rounded-xl" onClick={exportSuppliers}>
            <Download className="h-4 w-4" />匯出
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                importSuppliers(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 text-sm font-medium shadow-sm cursor-pointer">
              <Upload className="h-4 w-4" />匯入
            </span>
          </label>
          <Button className="gap-2 rounded-xl" onClick={createSupplier}>
            <Plus className="h-4 w-4" />新增廠商
          </Button>
        </div>

        {importNotice ? (
          <div className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">
            {importNotice}
          </div>
        ) : null}

        <div className="space-y-3">
          {filtered.map((supplier) => {
            const isOpen = openId === supplier.id;
            return (
              <div key={supplier.id} className="rounded-2xl border bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : supplier.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.code} ・ {supplier.contact || "未填聯絡人"} ・ {supplier.phone || "未填電話"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={supplier.active ? "default" : "secondary"}>
                      {supplier.active ? "啟用中" : "停用"}
                    </Badge>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">廠商編號</div>
                        <Input
                          value={supplier.code}
                          onChange={(e) => updateSupplier(supplier.id, { code: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">廠商名稱</div>
                        <Input
                          value={supplier.name}
                          onChange={(e) => updateSupplier(supplier.id, { name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">聯絡人</div>
                        <Input
                          value={supplier.contact}
                          onChange={(e) => updateSupplier(supplier.id, { contact: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">電話</div>
                        <Input
                          value={supplier.phone}
                          onChange={(e) => updateSupplier(supplier.id, { phone: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="col-span-2 rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">備註</div>
                        <Input
                          value={supplier.note}
                          onChange={(e) => updateSupplier(supplier.id, { note: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => updateSupplier(supplier.id, { active: !supplier.active })}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {supplier.active ? "停用" : "啟用"}
                      </Button>
                      <Button variant="outline" className="gap-2 rounded-xl">
                        <Pencil className="h-4 w-4" />修改完成
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => deleteSupplier(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />刪除
                      </Button>
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

function LabelTemplateManager({
  templates,
  setTemplates,
  sampleProduct,
  storeName,
}: {
  templates: LabelTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<LabelTemplate[]>>;
  sampleProduct: Product;
  storeName: string;
}) {
  const [openId, setOpenId] = useState<string>(templates[0]?.id ?? "");

  const setActiveTemplate = (templateId: string) =>
    setTemplates((prev) =>
      prev.map((item) => ({
        ...item,
        active: item.id === templateId,
      }))
    );

  const updateTemplate = (templateId: string, patch: Partial<LabelTemplate>) =>
    setTemplates((prev) =>
      prev.map((item) => (item.id === templateId ? { ...item, ...patch } : item))
    );

  const createTemplate = () => {
    const id = `tpl-${Date.now()}`;
    const next: LabelTemplate = {
      id,
      name: "新模板",
      paperSize: "4 × 6 cm",
      showCategory: true,
      showBarcode: true,
      showSpec: false,
      showUpdatedDate: false,
      priceSize: "md",
      active: false,
    };
    setTemplates((prev) => [next, ...prev]);
    setOpenId(id);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => {
      const next = prev.filter((item) => item.id !== templateId);
      return normalizeTemplates(next.length === 0 ? prev : next);
    });
    setOpenId((current) => (current === templateId ? "" : current));
  };

  const priceClassMap: Record<LabelTemplate["priceSize"], string> = {
    sm: "text-[56px]",
    md: "text-[72px]",
    lg: "text-[92px]",
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>貨卡模板設定</CardTitle>
        <CardDescription>
          管理 4 × 6 cm 貨卡模板，設定要顯示的欄位與價格字級。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button className="gap-2 rounded-xl" onClick={createTemplate}>
            <Plus className="h-4 w-4" />新增模板
          </Button>
        </div>

        <div className="space-y-3">
          {templates.map((template) => {
            const isOpen = openId === template.id;
            return (
              <div key={template.id} className="rounded-2xl border bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : template.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {normalizeStoreName(storeName)}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {template.paperSize}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={template.active ? "default" : "secondary"}>
                      {template.active ? "使用中" : "未啟用"}
                    </Badge>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-3">
                        <div className="rounded-xl border p-3">
                          <div className="text-xs text-muted-foreground">模板名稱</div>
                          <Input
                            value={template.name}
                            onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
                            className="mt-2"
                          />
                        </div>
                        <div className="rounded-xl border p-3">
                          <div className="text-xs text-muted-foreground">紙張尺寸</div>
                          <Input
                            value={template.paperSize}
                            onChange={(e) =>
                              updateTemplate(template.id, { paperSize: e.target.value })
                            }
                            className="mt-2"
                          />
                        </div>

                        <div className="rounded-xl border p-3 space-y-3 text-sm">
                          <div className="font-medium">顯示欄位</div>
                          <label className="flex items-center justify-between gap-3">
                            <span>顯示分類</span>
                            <input
                              type="checkbox"
                              checked={template.showCategory}
                              onChange={() =>
                                updateTemplate(template.id, {
                                  showCategory: !template.showCategory,
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3">
                            <span>顯示條碼</span>
                            <input
                              type="checkbox"
                              checked={template.showBarcode}
                              onChange={() =>
                                updateTemplate(template.id, {
                                  showBarcode: !template.showBarcode,
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3">
                            <span>顯示規格</span>
                            <input
                              type="checkbox"
                              checked={template.showSpec}
                              onChange={() =>
                                updateTemplate(template.id, {
                                  showSpec: !template.showSpec,
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3">
                            <span>顯示更新日期</span>
                            <input
                              type="checkbox"
                              checked={template.showUpdatedDate}
                              onChange={() =>
                                updateTemplate(template.id, {
                                  showUpdatedDate: !template.showUpdatedDate,
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="rounded-xl border p-3 space-y-2 text-sm">
                          <div className="font-medium">價格字級</div>
                          <div className="grid grid-cols-3 gap-2">
                            {(["sm", "md", "lg"] as const).map((size) => (
                              <Button
                                key={size}
                                type="button"
                                variant={template.priceSize === size ? "default" : "outline"}
                                className="rounded-xl"
                                onClick={() => updateTemplate(template.id, { priceSize: size })}
                              >
                                {size.toUpperCase()}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setActiveTemplate(template.id)}
                          >
                            設為使用中
                          </Button>
                          <Button variant="outline" className="rounded-xl">
                            儲存模板
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            刪除模板
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">預覽</div>
                        <ReceiptLabelPreview
                          storeName={storeName}
                          product={sampleProduct}
                          showSpec={template.showSpec}
                          showCategory={template.showCategory}
                          showUpdatedDate={template.showUpdatedDate}
                          priceClassName={priceClassMap[template.priceSize]}
                        />
                      </div>
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
  storeName,
  setStoreName,
}: {
  storeName: string;
  setStoreName: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [draftStoreName, setDraftStoreName] = useState(storeName);
  React.useEffect(() => setDraftStoreName(storeName), [storeName]);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>系統設定</CardTitle>
        <CardDescription>
          設定門店名稱，會同步顯示在系統名稱上方副標與貨卡預覽。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">門店名稱</div>
          <Input
            value={draftStoreName}
            onChange={(e) => setDraftStoreName(e.target.value)}
            placeholder="例如：嘉義門市"
            className="mt-2"
          />
        </div>
        <div className="flex justify-end">
          <Button
            className="rounded-xl"
            onClick={() => setStoreName(normalizeStoreName(draftStoreName))}
          >
            儲存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrinterDeviceManager({
  devices,
  setDevices,
  feieUser,
  setFeieUser,
  feieUkey,
  setFeieUkey,
}: {
  devices: PrinterDevice[];
  setDevices: React.Dispatch<React.SetStateAction<PrinterDevice[]>>;
  feieUser: string;
  setFeieUser: React.Dispatch<React.SetStateAction<string>>;
  feieUkey: string;
  setFeieUkey: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [openId, setOpenId] = useState<string>(devices[0]?.id ?? "");
  const [draftFeieUser, setDraftFeieUser] = useState(feieUser);
  const [draftFeieUkey, setDraftFeieUkey] = useState(feieUkey);

  React.useEffect(() => setDraftFeieUser(feieUser), [feieUser]);
  React.useEffect(() => setDraftFeieUkey(feieUkey), [feieUkey]);

  const updateDevice = (deviceId: string, patch: Partial<PrinterDevice>) =>
    setDevices((prev) =>
      prev.map((item) => (item.id === deviceId ? { ...item, ...patch } : item))
    );

  const createDevice = () => {
    const id = `printer-${Date.now()}`;
    const next: PrinterDevice = {
      id,
      name: "新設備",
      brand: "",
      model: "",
      usage: "貨卡",
      connectionType: "Wi-Fi",
      ipAddress: "",
      port: "9100",
      deviceId: "",
      paperWidth: "57mm",
      cutterEnabled: true,
      isDefault: false,
      status: "未連線",
    };
    setDevices((prev) => [next, ...prev]);
    setOpenId(id);
  };

  const deleteDevice = (deviceId: string) => {
    setDevices((prev) => {
      const next = prev.filter((item) => item.id !== deviceId);
      return normalizePrinterDevices(next.length === 0 ? prev : next);
    });
    setOpenId((current) => (current === deviceId ? "" : current));
  };

  const setDefaultDevice = (deviceId: string) =>
    setDevices((prev) => prev.map((item) => ({ ...item, isDefault: item.id === deviceId })));

  const testPrintDevice = (deviceId: string) =>
    setDevices((prev) =>
      prev.map((item) => (item.id === deviceId ? { ...item, status: "已連線" } : item))
    );

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>列印設備設定</CardTitle>
        <CardDescription>
          設定飛鵝帳號參數、管理設備 SN、預設設備與測試列印。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">飛鵝 user</div>
            <Input
              value={draftFeieUser}
              onChange={(e) => setDraftFeieUser(e.target.value)}
              placeholder="飛鵝後台註冊用戶名"
              className="mt-2"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">飛鵝 UKEY</div>
            <Input
              type="password"
              value={draftFeieUkey}
              onChange={(e) => setDraftFeieUkey(e.target.value)}
              placeholder="UKEY"
              className="mt-2"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setFeieUser(draftFeieUser.trim());
                setFeieUkey(draftFeieUkey.trim());
              }}
            >
              儲存帳號設定
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="gap-2 rounded-xl" onClick={createDevice}>
            <Plus className="h-4 w-4" />新增設備
          </Button>
        </div>

        <div className="space-y-3">
          {devices.map((device) => {
            const isOpen = openId === device.id;
            return (
              <div key={device.id} className="rounded-2xl border bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : device.id)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{device.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {device.brand || "未填品牌"} ・ {device.model || "未填型號"} ・ {device.connectionType}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={device.isDefault ? "default" : "secondary"}>
                      {device.isDefault ? "預設設備" : device.status}
                    </Badge>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">設備名稱</div>
                        <Input
                          value={device.name}
                          onChange={(e) => updateDevice(device.id, { name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">品牌</div>
                        <Input
                          value={device.brand}
                          onChange={(e) => updateDevice(device.id, { brand: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">型號</div>
                        <Input
                          value={device.model}
                          onChange={(e) => updateDevice(device.id, { model: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">用途</div>
                        <Input
                          value={device.usage}
                          onChange={(e) =>
                            updateDevice(device.id, {
                              usage: e.target.value as PrinterDevice["usage"],
                            })
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">連線方式</div>
                        <select
                          value={device.connectionType}
                          onChange={(e) =>
                            updateDevice(device.id, {
                              connectionType: e.target.value as PrinterDevice["connectionType"],
                            })
                          }
                          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="Cloud API">Cloud API</option>
                          <option value="Wi-Fi">Wi-Fi</option>
                          <option value="Bluetooth">Bluetooth</option>
                        </select>
                      </div>
                      {device.connectionType === "Wi-Fi" ? (
                        <>
                          <div className="rounded-xl border p-3">
                            <div className="text-xs text-muted-foreground">IP 位址</div>
                            <Input
                              value={device.ipAddress}
                              onChange={(e) => updateDevice(device.id, { ipAddress: e.target.value })}
                              className="mt-2"
                              placeholder="例如：192.168.1.88"
                            />
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="text-xs text-muted-foreground">Port</div>
                            <Input
                              value={device.port}
                              onChange={(e) => updateDevice(device.id, { port: e.target.value })}
                              className="mt-2"
                              placeholder="例如：9100"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          {device.connectionType === "Cloud API"
                            ? "Cloud API 模式不需要填寫 IP 位址與 Port。"
                            : "Bluetooth 模式不使用 IP 位址與 Port。"}
                        </div>
                      )}
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">打印機 SN</div>
                        <Input
                          value={device.deviceId}
                          onChange={(e) => updateDevice(device.id, { deviceId: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">紙張寬度</div>
                        <Input
                          value={device.paperWidth}
                          onChange={(e) => updateDevice(device.id, { paperWidth: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border p-3 flex items-center justify-between">
                        <span>切刀設定</span>
                        <input
                          type="checkbox"
                          checked={device.cutterEnabled}
                          onChange={() =>
                            updateDevice(device.id, {
                              cutterEnabled: !device.cutterEnabled,
                            })
                          }
                        />
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">是否為預設設備</div>
                        <div className="mt-1 font-medium">{device.isDefault ? "是" : "否"}</div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-xs text-muted-foreground">連線狀態</div>
                        <div className="mt-1 font-medium">{device.status}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setDefaultDevice(device.id)}
                      >
                        設為預設
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => testPrintDevice(device.id)}
                      >
                        測試列印
                      </Button>
                      <Button variant="outline" className="rounded-xl">
                        儲存
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => deleteDevice(device.id)}
                      >
                        刪除
                      </Button>
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

function SettingsWorkspace({
  suppliers,
  setSuppliers,
  labelTemplates,
  setLabelTemplates,
  printerDevices,
  setPrinterDevices,
  sampleProduct,
  storeName,
  setStoreName,
  feieUser,
  setFeieUser,
  feieUkey,
  setFeieUkey,
}: {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  labelTemplates: LabelTemplate[];
  setLabelTemplates: React.Dispatch<React.SetStateAction<LabelTemplate[]>>;
  printerDevices: PrinterDevice[];
  setPrinterDevices: React.Dispatch<React.SetStateAction<PrinterDevice[]>>;
  sampleProduct: Product;
  storeName: string;
  setStoreName: React.Dispatch<React.SetStateAction<string>>;
  feieUser: string;
  setFeieUser: React.Dispatch<React.SetStateAction<string>>;
  feieUkey: string;
  setFeieUkey: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [panel, setPanel] = useState<
    "hub" | "system" | "suppliers" | "label_templates" | "printer_devices"
  >("hub");

  if (panel === "system") {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>
          返回設定
        </Button>
        <SystemSettingsPanel storeName={storeName} setStoreName={setStoreName} />
      </div>
    );
  }

  if (panel === "suppliers") {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>
          返回設定
        </Button>
        <SupplierManager suppliers={suppliers} setSuppliers={setSuppliers} />
      </div>
    );
  }

  if (panel === "label_templates") {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>
          返回設定
        </Button>
        <LabelTemplateManager
          templates={labelTemplates}
          setTemplates={setLabelTemplates}
          sampleProduct={sampleProduct}
          storeName={storeName}
        />
      </div>
    );
  }

  if (panel === "printer_devices") {
    return (
      <div className="space-y-4 pb-20 lg:pb-0">
        <Button variant="outline" className="rounded-xl" onClick={() => setPanel("hub")}>
          返回設定
        </Button>
        <PrinterDeviceManager
          devices={printerDevices}
          setDevices={setPrinterDevices}
          feieUser={feieUser}
          setFeieUser={setFeieUser}
          feieUkey={feieUkey}
          setFeieUkey={setFeieUkey}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <SectionTitle
        title="設定"
        description="低頻管理功能集中於此，包含廠商資料、系統設定、貨卡模板設定與列印設備設定。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <button type="button" onClick={() => setPanel("suppliers")} className="text-left">
          <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <Truck className="h-5 w-5" />
              <div className="font-medium">廠商資料</div>
              <div className="text-sm text-muted-foreground">
                新增 / 修改 / 刪除廠商資料，管理啟用狀態。
              </div>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => setPanel("system")} className="text-left">
          <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <SlidersHorizontal className="h-5 w-5" />
              <div className="font-medium">系統設定</div>
              <div className="text-sm text-muted-foreground">設定門店名稱與基本系統資訊。</div>
            </CardContent>
          </Card>
        </button>
        <button
          type="button"
          onClick={() => setPanel("label_templates")}
          className="text-left"
        >
          <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <FileText className="h-5 w-5" />
              <div className="font-medium">貨卡模板設定</div>
              <div className="text-sm text-muted-foreground">
                管理 4 × 6 cm 貨卡模板、欄位顯示與價格字級。
              </div>
            </CardContent>
          </Card>
        </button>
        <button
          type="button"
          onClick={() => setPanel("printer_devices")}
          className="text-left"
        >
          <Card className="rounded-2xl shadow-sm transition hover:shadow-md">
            <CardContent className="space-y-3 p-5">
              <Printer className="h-5 w-5" />
              <div className="font-medium">列印設備設定</div>
              <div className="text-sm text-muted-foreground">
                設定飛鵝 user / UKEY、管理設備 SN、預設設備與測試列印。
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Prototype Checks</CardTitle>
          <CardDescription>檢查新流程核心規則是否已被模型化。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {runPrototypeTests().map((test) => (
            <div
              key={test.name}
              className="flex items-center justify-between rounded-xl border p-3 text-sm"
            >
              <span>{test.name}</span>
              <Badge variant={test.pass ? "default" : "destructive"}>
                {test.pass ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MobileBottomNav({
  active,
  onChange,
}: {
  active: NavKey;
  onChange: (key: NavKey) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] transition ${
                isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
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
  const [active, setActive] = useState<NavKey>("inbound");
  const [storeName, setStoreName] = useState<string>("嘉義門市");
  const [feieUser, setFeieUser] = useState<string>("");
  const [feieUkey, setFeieUkey] = useState<string>("");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [batchRecords, setBatchRecords] = useState<BatchRecord[]>(initialBatchRecords);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>(initialLabelTemplates);
  const [printerDevices, setPrinterDevices] = useState<PrinterDevice[]>(initialPrinterDevices);

  const lowStockCount = getLowStockCount(products, 10);
  const supplierCount = getActiveSupplierCount(suppliers);

  const saveProductEdit = (originalBarcode: string, patch: EditableProductFields) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.barcode === originalBarcode ? { ...product, ...patch } : product
      )
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-white p-4 lg:block lg:p-5">
          <div className="mb-6 space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {normalizeStoreName(storeName)}
            </div>
            <div className="text-xl font-semibold">超市庫存系統</div>
            <div className="text-sm text-muted-foreground">Canvas 前端原型</div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <StatCard title="商品" value={String(products.length)} note="主檔筆數" />
            <StatCard title="廠商" value={String(supplierCount)} note="啟用中" />
            <StatCard title="低庫存" value={String(lowStockCount)} note="≤ 10" />
            <StatCard title="批次" value={String(batchRecords.length)} note="示意資料" />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                    isActive ? "bg-slate-900 text-white" : "bg-transparent hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border p-4 text-sm">
            <div className="font-medium">系統邊界</div>
            <p className="mt-2 leading-6 text-muted-foreground">
              POS 處理收銀與發票。
              <br />
              這個系統處理商品、庫存、進退貨、貨卡、批次紀錄與設定。
            </p>
          </div>
        </aside>

        <main className="overflow-x-hidden p-4 lg:p-6">
          <div className="mb-4 space-y-1 lg:hidden">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {normalizeStoreName(storeName)}
            </div>
            <div className="text-xl font-semibold">超市庫存系統</div>
            <div className="text-sm text-muted-foreground">預設進入進貨作業</div>
          </div>

          <div className="pb-24 pr-2 lg:pb-4">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {active === "products" ? (
                <ProductMaster
                  products={products}
                  suppliers={suppliers}
                  onSaveEdit={saveProductEdit}
                />
              ) : null}
              {active === "inbound" ? <InboundWorkbench products={products} /> : null}
              {active === "stock" ? <StockQuery products={products} /> : null}
              {active === "labels" ? (
                <LabelPrinter products={products} storeName={storeName} />
              ) : null}
              {active === "records" ? (
                <RecordQuery
                  batchRecords={batchRecords}
                  setBatchRecords={setBatchRecords}
                  products={products}
                />
              ) : null}
              {active === "settings" ? (
                <SettingsWorkspace
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                  labelTemplates={labelTemplates}
                  setLabelTemplates={setLabelTemplates}
                  printerDevices={printerDevices}
                  setPrinterDevices={setPrinterDevices}
                  sampleProduct={products[0]}
                  storeName={storeName}
                  setStoreName={setStoreName}
                  feieUser={feieUser}
                  setFeieUser={setFeieUser}
                  feieUkey={feieUkey}
                  setFeieUkey={setFeieUkey}
                />
              ) : null}
            </motion.div>
          </div>
        </main>
      </div>

      <MobileBottomNav active={active} onChange={setActive} />
    </div>
  );
}
