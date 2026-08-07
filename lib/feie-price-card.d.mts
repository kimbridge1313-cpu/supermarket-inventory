export type FeiePriceCardInput = {
  product?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  feedLines?: number;
};

export function escapeFeieText(value: unknown): string;
export function formatPrice(value: unknown): string;
export function buildFeieBarcodeTag(value: unknown): { tag: string; format: string; text: string };
export function buildFeieCompactBarcodeCommand(
  value: unknown,
  options?: { heightDots?: number; width?: number; hri?: number }
): string;
export function truncatePrinterLine(value: unknown, maxColumns?: number): string;
export function buildFeiePriceCard(input?: FeiePriceCardInput): {
  markup: string;
  content: {
    nameZh: string;
    nameVi: string;
    nameId: string;
    spec: string;
    price: string;
    barcode: string;
    barcodeFormat: string;
    barcodeSpacingMode: string;
    barcodeHeightDots: number | null;
    barcodePosition: string;
    translationMaxColumns: number;
    cut: boolean;
    cutMode: string;
    times: number;
  };
};
export function countCutTags(markup: unknown): number;
