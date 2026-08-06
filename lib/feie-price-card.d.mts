export type FeiePriceCardInput = {
  product?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  feedLines?: number;
};

export function escapeFeieText(value: unknown): string;
export function formatPrice(value: unknown): string;
export function buildFeieBarcodeTag(value: unknown): { tag: string; format: string; text: string };
export function buildFeiePriceCard(input?: FeiePriceCardInput): {
  markup: string;
  content: {
    storeName: string;
    nameZh: string;
    nameVi: string;
    nameId: string;
    spec: string;
    price: string;
    barcode: string;
    barcodeFormat: string;
    cut: boolean;
    times: number;
  };
};
export function countCutTags(markup: unknown): number;
