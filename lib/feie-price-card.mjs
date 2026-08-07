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
  const bodyLines = [];

  if (settings.storeName) bodyLines.push(`<BOLD>${settings.storeName}</BOLD>`);
  if (settings.showNameZh) bodyLines.push(formatChineseName(nameZh));
  if (settings.showNameVi && product.nameVi) bodyLines.push(product.nameVi);
  if (settings.showNameId && product.nameId) bodyLines.push(product.nameId);
  if (settings.showSpec && product.spec) bodyLines.push(`<C>${product.spec}</C>`);
  bodyLines.push(`<RIGHT><W><B>${priceText}</B></W><BOLD>元</BOLD></RIGHT>`);

  const bodyMarkup = bodyLines.join('<BR>');
  // The receipt API exposes no barcode height / vertical-margin parameters.
  // Do not add our own <BR> after the barcode; let the printer's barcode
  // command advance to the following text using its native behavior.
  const barcodeMarkup = barcode.text ? `<C>${barcode.tag}</C>` : '';
  const markup = `${barcodeMarkup}${bodyMarkup}`;

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
      barcodeSpacingMode: 'native-no-br',
      cut: true,
      cutMode: 'device-auto',
      times: 1,
    },
  };
}

export function countCutTags(markup) {
  return (String(markup || '').match(/<CUT>/g) || []).length;
}
