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

function boolOrDefault(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function printerColumns(value) {
  let columns = 0;
  for (const char of String(value || '')) {
    const wide = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF01-\uFF60\uFFE0-\uFFE6]/.test(char);
    columns += wide ? 2 : 1;
  }
  return columns;
}

function formatChineseName(name) {
  const tallBold = `<L><BOLD>${name}</BOLD></L>`;
  // V58WHC prints 16 Chinese characters per normal-width line. <W> doubles
  // character width, so only apply it when the name fits within 8 Chinese
  // characters (16 normal printer columns) to avoid unnecessary wrapping.
  return printerColumns(name) <= 16 ? `<W>${tallBold}</W>` : tallBold;
}

function cleanProduct(raw = {}) {
  return {
    barcode: escapeFeieText(raw.barcode),
    name: escapeFeieText(raw.name),
    labelName: escapeFeieText(raw.labelName),
    nameVi: vietnameseToAscii(raw.nameVi ?? raw.nameVietnamese),
    nameId: escapeFeieText(raw.nameId ?? raw.nameIndonesian),
    spec: escapeFeieText(raw.spec),
    price: Number(raw.price),
  };
}

function cleanSettings(raw = {}) {
  return {
    storeName: escapeFeieText(raw.storeName),
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
  const lines = [];

  // Barcode is the first printable block. Code128 already prints its own HRI
  // digits, so do not add a duplicate number line or any blank line around it.
  if (barcode.text) lines.push(`<C>${barcode.tag}</C>`);
  if (settings.storeName) lines.push(`<BOLD>${settings.storeName}</BOLD>`);
  if (settings.showNameZh) lines.push(formatChineseName(nameZh));
  if (settings.showNameVi && product.nameVi) lines.push(product.nameVi);
  if (settings.showNameId && product.nameId) lines.push(product.nameId);
  if (settings.showSpec && product.spec) lines.push(`<C>${product.spec}</C>`);
  lines.push(`<RIGHT><W><B>${priceText}</B></W><BOLD>元</BOLD></RIGHT>`);

  // Do not inject <CUT> or artificial feed lines. V58WHC is an auto-cutter
  // model; this revision tests the device's end-of-order cut after the whole
  // Open_printMsg payload has finished instead of issuing a mid-stream cut.
  const markup = lines.join('<BR>');

  return {
    markup,
    content: {
      storeName: settings.storeName,
      nameZh: settings.showNameZh ? nameZh : '',
      nameVi: settings.showNameVi ? product.nameVi : '',
      nameId: settings.showNameId ? product.nameId : '',
      spec: settings.showSpec ? product.spec : '',
      price: priceText,
      barcode: barcode.text,
      barcodeFormat: barcode.format,
      cut: true,
      cutMode: 'device-auto',
      times: 1,
    },
  };
}

export function countCutTags(markup) {
  return (String(markup || '').match(/<CUT>/g) || []).length;
}
