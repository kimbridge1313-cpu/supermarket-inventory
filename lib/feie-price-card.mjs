export function escapeFeieText(value) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function vietnameseToAscii(value) {
  return escapeFeieText(value)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

export function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid product price');
  return price.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

export function buildFeieBarcodeTag(value) {
  const normalized = escapeFeieText(value);
  if (!normalized) return { tag: '', format: 'none', text: '' };
  if (/^\d+$/.test(normalized) && normalized.length <= 22) {
    return { tag: `<BC128_C>${normalized}</BC128_C>`, format: 'Code 128C', text: normalized };
  }
  if (/^[A-Z0-9]+$/.test(normalized) && normalized.length <= 14) {
    return { tag: `<BC128_A>${normalized}</BC128_A>`, format: 'Code 128A', text: normalized };
  }
  if (/^[0-9A-Za-z!@#$%^&*()\-=+_]+$/.test(normalized) && normalized.length <= 14) {
    return { tag: `<BC128_B>${normalized}</BC128_B>`, format: 'Code 128B', text: normalized };
  }
  return { tag: normalized, format: '純文字', text: normalized };
}

// Derived from Feie Cloud's official Barcode-function.zip (JS version, 2020-03-25).
// The official helper sends ESC d 2 before the barcode and uses GS h 0x50
// (80 dots). For shelf cards we intentionally omit the two-line pre-feed and
// lower the height to 0x30 (48 dots) while retaining HRI-below and width=2.
export function buildFeieCompactBarcodeCommand(value, { heightDots = 48, width = 2, hri = 2 } = {}) {
  const normalized = escapeFeieText(value);
  if (!normalized || normalized.length > 14) return '';
  if (!/^[0-9A-Za-z!@#$%^&*()\-=+_]+$/.test(normalized)) return '';

  const height = Math.max(1, Math.min(127, Number(heightDots) || 48));
  const moduleWidth = Math.max(1, Math.min(6, Number(width) || 2));
  const hriMode = [0, 1, 2].includes(Number(hri)) ? Number(hri) : 2;

  return [
    '\x1d', '\x48', String.fromCharCode(0x30 + hriMode),
    '\x1d', '\x68', String.fromCharCode(height),
    '\x1d', '\x77', String.fromCharCode(moduleWidth),
    '\x1d', '\x6b', '\x49', String.fromCharCode(normalized.length + 2),
    '\x7b', '\x42', normalized,
  ].join('');
}

function boolOrDefault(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function isWidePrinterChar(char) {
  return /[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60\uFFE0-\uFFE6]/.test(char);
}

function printerColumns(value) {
  let columns = 0;
  for (const char of String(value || '')) columns += isWidePrinterChar(char) ? 2 : 1;
  return columns;
}

export function truncatePrinterLine(value, maxColumns = 32) {
  const text = String(value || '');
  const max = Math.max(0, Number(maxColumns) || 0);
  if (!max) return '';
  let columns = 0;
  let result = '';
  for (const char of text) {
    const width = isWidePrinterChar(char) ? 2 : 1;
    if (columns + width > max) break;
    result += char;
    columns += width;
  }
  return result.trimEnd();
}

function formatChineseName(name) {
  const tallBold = `<L><BOLD>${name}</BOLD></L>`;
  return printerColumns(name) <= 16 ? `<W>${tallBold}</W>` : tallBold;
}

function cleanProduct(raw = {}) {
  const nameVi = truncatePrinterLine(vietnameseToAscii(raw.nameVi ?? raw.nameVietnamese), 32);
  const nameId = truncatePrinterLine(escapeFeieText(raw.nameId ?? raw.nameIndonesian), 32);
  return {
    barcode: escapeFeieText(raw.barcode),
    name: escapeFeieText(raw.name),
    labelName: escapeFeieText(raw.labelName),
    nameVi,
    nameId,
    spec: escapeFeieText(raw.spec),
    price: Number(raw.price),
  };
}

function cleanSettings(raw = {}) {
  return {
    showNameZh: boolOrDefault(raw.showNameZh, true),
    showNameVi: boolOrDefault(raw.showNameVi, true),
    showNameId: boolOrDefault(raw.showNameId, true),
    showBarcode: boolOrDefault(raw.showBarcode, true),
    showSpec: boolOrDefault(raw.showSpec, true),
  };
}

export function buildFeiePriceCard({ product: rawProduct, settings: rawSettings } = {}) {
  const product = cleanProduct(rawProduct);
  const settings = cleanSettings(rawSettings);
  const nameZh = product.labelName || product.name;
  if (!nameZh) throw new Error('Missing product name');
  const priceText = formatPrice(product.price);
  const barcode = settings.showBarcode ? buildFeieBarcodeTag(product.barcode) : { tag: '', format: 'none', text: '' };
  const compactBarcode = settings.showBarcode ? buildFeieCompactBarcodeCommand(product.barcode) : '';
  const bodyLines = [];

  if (settings.showNameZh) bodyLines.push(formatChineseName(nameZh));
  if (settings.showNameVi && product.nameVi) bodyLines.push(product.nameVi);
  if (settings.showNameId && product.nameId) bodyLines.push(product.nameId);
  if (settings.showSpec && product.spec) bodyLines.push(`<C>${product.spec}</C>`);
  bodyLines.push(`<RIGHT><W><B>${priceText}</B></W><BOLD>元</BOLD></RIGHT>`);

  const bodyMarkup = bodyLines.join('<BR>');
  // For <=14 supported characters use the official ESC/POS barcode helper
  // pattern with compact height and no pre-feed. Longer barcodes keep the
  // existing Feie markup fallback until the official long-Code-C converter is
  // ported and verified separately.
  const barcodeMarkup = compactBarcode
    ? `<C>${compactBarcode}</C>`
    : barcode.text
      ? `<C>${barcode.tag}</C>`
      : '';
  // Barcode sits at the bottom. Exactly one BR moves from the price line to
  // the barcode line; there is no trailing BR after the barcode.
  const markup = barcodeMarkup ? `${bodyMarkup}<BR>${barcodeMarkup}` : bodyMarkup;

  return {
    markup,
    content: {
      nameZh: settings.showNameZh ? nameZh : '',
      nameVi: settings.showNameVi ? product.nameVi : '',
      nameId: settings.showNameId ? product.nameId : '',
      spec: settings.showSpec ? product.spec : '',
      price: priceText,
      barcode: barcode.text,
      barcodeFormat: compactBarcode ? 'Code 128（飛鵝官方函數）' : barcode.format,
      barcodeSpacingMode: compactBarcode ? 'official-function-compact-48dot' : 'native-no-br',
      barcodeHeightDots: compactBarcode ? 48 : null,
      barcodePosition: 'bottom',
      translationMaxColumns: 32,
      cut: true,
      cutMode: 'device-auto',
      times: 1,
    },
  };
}

export function countCutTags(markup) {
  return (String(markup || '').match(/<CUT>/g) || []).length;
}
