const CUT_TAG = '<CUT>';

export function escapeFeieText(value) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function cleanProduct(raw = {}) {
  return {
    barcode: escapeFeieText(raw.barcode),
    name: escapeFeieText(raw.name),
    labelName: escapeFeieText(raw.labelName),
    nameVi: escapeFeieText(raw.nameVi ?? raw.nameVietnamese),
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

export function buildFeiePriceCard({ product: rawProduct, settings: rawSettings, feedLines = 0 } = {}) {
  const product = cleanProduct(rawProduct);
  const settings = cleanSettings(rawSettings);
  const nameZh = product.labelName || product.name;
  if (!nameZh) throw new Error('Missing product name');
  const priceText = formatPrice(product.price);
  const barcode = settings.showBarcode ? buildFeieBarcodeTag(product.barcode) : { tag: '', format: 'none', text: '' };
  const lines = [];

  if (settings.storeName) lines.push(`<BOLD>${settings.storeName}</BOLD>`);
  if (settings.showNameZh) lines.push(`<B>${nameZh}</B>`);
  if (settings.showNameVi && product.nameVi) lines.push(product.nameVi);
  if (settings.showNameId && product.nameId) lines.push(product.nameId);
  if (settings.showSpec && product.spec) lines.push(`<C>${product.spec}</C>`);
  lines.push(`<RIGHT><W><B>${priceText}</B></W><BOLD>元</BOLD></RIGHT>`);
  if (barcode.text) {
    lines.push(`<C>${barcode.tag}</C>`);
    lines.push(`<C>${barcode.text}</C>`);
  }

  const normalizedFeedLines = Math.max(0, Math.min(8, Number(feedLines) || 0));
  const markup = `${lines.join('<BR>')}${'<BR>'.repeat(normalizedFeedLines)}${CUT_TAG}`;

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
      times: 1,
    },
  };
}

export function countCutTags(markup) {
  return (String(markup || '').match(/<CUT>/g) || []).length;
}
