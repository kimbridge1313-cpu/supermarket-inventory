(() => {
  const VERSION = '20260802a';

  const onReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const stripPrefix = (value, prefix) => {
    const text = cleanText(value);
    const stripped = text.replace(new RegExp(`^${prefix}\\s*`, 'i'), '').trim();
    return stripped === '-' ? '' : stripped;
  };

  const visualLength = (value) => [...String(value || '')].reduce(
    (total, character) => total + (character.charCodeAt(0) > 255 ? 1 : 0.52),
    0
  );

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const EAN_L = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];
  const EAN_G = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
  ];
  const EAN_R = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
  ];
  const EAN_PARITY = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];

  const CODE128_PATTERNS = [
    '11011001100','11001101100','11001100110','10010011000','10010001100','10001001100',
    '10011001000','10011000100','10001100100','11001001000','11001000100','11000100100',
    '10110011100','10011011100','10011001110','10111001100','10011101100','10011100110',
    '11001110010','11001011100','11001001110','11011100100','11001110100','11101101110',
    '11101001100','11100101100','11100100110','11101100100','11100110100','11100110010',
    '11011011000','11011000110','11000110110','10100011000','10001011000','10001000110',
    '10110001000','10001101000','10001100010','11010001000','11000101000','11000100010',
    '10110111000','10110001110','10001101110','10111011000','10111000110','10001110110',
    '11101110110','11010001110','11000101110','11011101000','11011100010','11011101110',
    '11101011000','11101000110','11100010110','11101101000','11101100010','11100011010',
    '11101111010','11001000010','11110001010','10100110000','10100001100','10010110000',
    '10010000110','10000101100','10000100110','10110010000','10110000100','10011010000',
    '10011000010','10000110100','10000110010','11000010010','11001010000','11110111010',
    '11000010100','10001111010','10100111100','10010111100','10010011110','10111100100',
    '10011110100','10011110010','11110100100','11110010100','11110010010','11011011110',
    '11011110110','11110110110','10101111000','10100011110','10001011110','10111101000',
    '10111100010','11110101000','11110100010','10111011110','10111101110','11101011110',
    '11110101110','11010000100','11010010000','11010011100','1100011101011'
  ];

  const eanCheckDigit = (twelveDigits) => {
    const digits = [...twelveDigits].map(Number);
    const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
    return String((10 - (sum % 10)) % 10);
  };

  const encodeEAN13 = (rawValue) => {
    const digitsOnly = String(rawValue || '').replace(/\D/g, '');
    let value = digitsOnly;
    if (value.length === 12) value += eanCheckDigit(value);
    if (value.length !== 13) return null;

    const parity = EAN_PARITY[Number(value[0])];
    let modules = '101';
    for (let index = 1; index <= 6; index += 1) {
      const digit = Number(value[index]);
      modules += parity[index - 1] === 'L' ? EAN_L[digit] : EAN_G[digit];
    }
    modules += '01010';
    for (let index = 7; index <= 12; index += 1) modules += EAN_R[Number(value[index])];
    modules += '101';
    return { modules, displayValue: value };
  };

  const encodeCode128B = (rawValue) => {
    const value = String(rawValue || '').slice(0, 48);
    if (!value) return null;
    const codeValues = [];
    for (const character of value) {
      const codePoint = character.charCodeAt(0);
      if (codePoint < 32 || codePoint > 126) return null;
      codeValues.push(codePoint - 32);
    }

    const start = 104;
    const checksum = (start + codeValues.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
    const modules = [start, ...codeValues, checksum, 106]
      .map((code) => CODE128_PATTERNS[code])
      .join('');
    return { modules, displayValue: value };
  };

  const barcodeSvg = (value) => {
    const encoded = encodeEAN13(value) || encodeCode128B(value);
    if (!encoded) {
      return `<div class="kf-label-barcode-fallback">${escapeHtml(value)}</div>`;
    }

    const quietZone = 10;
    const totalModules = encoded.modules.length + quietZone * 2;
    const rects = [];
    let start = -1;

    for (let index = 0; index <= encoded.modules.length; index += 1) {
      const bit = encoded.modules[index] || '0';
      if (bit === '1' && start < 0) start = index;
      if (bit === '0' && start >= 0) {
        rects.push(`<rect x="${start + quietZone}" y="0" width="${index - start}" height="50"/>`);
        start = -1;
      }
    }

    return `
      <svg class="kf-label-barcode-svg" viewBox="0 0 ${totalModules} 50" preserveAspectRatio="none" role="img" aria-label="條碼 ${escapeHtml(encoded.displayValue)}">
        ${rects.join('')}
      </svg>
      <div class="kf-label-barcode-text">${escapeHtml(encoded.displayValue)}</div>
    `;
  };

  const extractProductFromButton = (button) => {
    const row = button.closest('tr');
    if (!row) return null;
    const cells = Array.from(row.children).filter((element) => element.tagName === 'TD');
    if (cells.length < 5) return null;

    const translationNodes = Array.from(cells[2]?.querySelectorAll('.muted') || []);
    const translationLines = cleanText(cells[2]?.innerText || cells[2]?.textContent || '')
      .split(/\n+/)
      .map(cleanText)
      .filter(Boolean);

    const viRaw = translationNodes[0]?.textContent || translationLines.find((line) => /^VI\b/i.test(line)) || '';
    const idRaw = translationNodes[1]?.textContent || translationLines.find((line) => /^ID\b/i.test(line)) || '';
    const priceRaw = cleanText(cells[3]?.textContent || '').replace(/\s*元\s*$/, '').trim();
    const appTitle = cleanText(document.getElementById('app-title')?.textContent || '');
    const storeName = appTitle.includes('｜') ? appTitle.split('｜')[0].trim() : appTitle;

    return {
      productId: button.dataset.print || '',
      storeName: storeName && storeName !== '商品資料與貨卡列印' ? storeName : '門市名稱',
      barcode: cleanText(cells[0]?.textContent || '').replace(/\s/g, ''),
      name: cleanText(cells[1]?.querySelector('strong')?.textContent || cells[1]?.textContent || ''),
      nameVi: stripPrefix(viRaw, 'VI'),
      nameId: stripPrefix(idRaw, 'ID'),
      price: priceRaw || '0'
    };
  };

  const nameSizeClass = (name) => {
    const length = visualLength(name);
    if (length <= 10) return 'name-xl';
    if (length <= 14) return 'name-lg';
    if (length <= 18) return 'name-md';
    return 'name-sm';
  };

  const priceSizeClass = (price) => {
    const digits = String(price || '').replace(/[^0-9]/g, '').length;
    if (digits <= 2) return 'price-xl';
    if (digits === 3) return 'price-lg';
    return 'price-md';
  };

  const labelMarkup = (product) => `
    <article class="kf-label-sheet" data-version="${VERSION}">
      <div class="kf-label-border">
        <div class="kf-label-store">${escapeHtml(product.storeName)}</div>
        <div class="kf-label-name ${nameSizeClass(product.name)}">${escapeHtml(product.name)}</div>
        <div class="kf-label-languages">
          ${product.nameVi ? `<div class="kf-label-language">${escapeHtml(product.nameVi)}</div>` : ''}
          ${product.nameId ? `<div class="kf-label-language">${escapeHtml(product.nameId)}</div>` : ''}
        </div>
        <div class="kf-label-bottom">
          <div class="kf-label-barcode">${barcodeSvg(product.barcode)}</div>
          <div class="kf-label-price ${priceSizeClass(product.price)}">
            <span class="kf-label-price-number">${escapeHtml(product.price)}</span>
            <span class="kf-label-price-unit">元</span>
          </div>
        </div>
      </div>
    </article>
  `;

  const createStyles = () => {
    if (document.getElementById('kf-label-template-style')) return;
    const style = document.createElement('style');
    style.id = 'kf-label-template-style';
    style.textContent = `
      #kf-label-modal{
        position:fixed;inset:0;z-index:32000;display:grid;place-items:center;padding:18px;
        background:rgba(218,222,230,.58);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)
      }
      #kf-label-modal[hidden]{display:none!important}
      .kf-label-dialog{
        width:min(660px,100%);max-height:calc(100vh - 36px);overflow:auto;padding:22px;border-radius:28px;
        background:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.98);
        box-shadow:0 30px 90px rgba(30,35,45,.22);color:#1d1d1f
      }
      .kf-label-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
      .kf-label-modal-head h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.025em}
      .kf-label-modal-head p{margin:6px 0 0;color:#6e6e73;font-size:13px;line-height:1.5}
      .kf-label-close{width:38px;height:38px;flex:0 0 38px;padding:0;border:0;border-radius:50%;background:#eceef2;color:#37383d;font-size:24px;line-height:1;cursor:pointer}
      .kf-label-preview-stage{
        display:grid;place-items:center;min-height:260px;padding:36px 16px;border-radius:22px;
        background:linear-gradient(145deg,#eef0f4,#f8f8fa);overflow:auto
      }
      .kf-label-sheet{
        width:58mm;height:40mm;flex:0 0 auto;background:#fff;color:#000;
        font-family:Arial,"Noto Sans TC","PingFang TC",sans-serif;
        -webkit-font-smoothing:antialiased;print-color-adjust:exact;-webkit-print-color-adjust:exact
      }
      .kf-label-border{
        position:relative;width:100%;height:100%;overflow:hidden;border:.35mm solid #000;
        padding:3.1mm 3.5mm 2.7mm
      }
      .kf-label-store{font-size:3.1mm;font-weight:800;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .kf-label-name{
        margin-top:2.2mm;max-width:100%;font-weight:900;line-height:1.03;letter-spacing:-.08mm;
        display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere
      }
      .kf-label-name.name-xl{font-size:6.3mm}
      .kf-label-name.name-lg{font-size:5.3mm}
      .kf-label-name.name-md{font-size:4.45mm;line-height:1.06}
      .kf-label-name.name-sm{font-size:3.7mm;line-height:1.08}
      .kf-label-languages{margin-top:2.2mm;max-width:45mm;display:grid;gap:.45mm}
      .kf-label-language{font-size:3mm;line-height:1.02;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.04mm}
      .kf-label-bottom{position:absolute;left:3.5mm;right:3.5mm;bottom:2.7mm;height:11.7mm;display:flex;align-items:flex-end;justify-content:space-between;gap:1.5mm}
      .kf-label-barcode{width:27mm;min-width:0;align-self:flex-end}
      .kf-label-barcode-svg{display:block;width:100%;height:7.5mm;fill:#000;shape-rendering:crispEdges}
      .kf-label-barcode-text{margin-top:.15mm;text-align:center;font-size:2.35mm;font-weight:700;line-height:1;letter-spacing:.32mm;white-space:nowrap;overflow:hidden}
      .kf-label-barcode-fallback{font-size:2.4mm;font-weight:700;overflow-wrap:anywhere}
      .kf-label-price{display:flex;align-items:flex-end;justify-content:flex-end;gap:.8mm;min-width:17mm;line-height:.78;white-space:nowrap;font-weight:950;letter-spacing:-.45mm}
      .kf-label-price.price-xl .kf-label-price-number{font-size:16.5mm}
      .kf-label-price.price-lg .kf-label-price-number{font-size:14mm}
      .kf-label-price.price-md .kf-label-price-number{font-size:11.5mm}
      .kf-label-price-unit{padding-bottom:.8mm;font-size:5.2mm;font-weight:900;letter-spacing:0}
      .kf-label-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
      .kf-label-actions button{min-height:44px;border:0;border-radius:14px;padding:0 17px;font:inherit;font-size:14px;font-weight:750;cursor:pointer}
      .kf-label-actions .secondary{background:#eceef2;color:#242529}
      .kf-label-actions .primary{background:#0071e3;color:#fff;box-shadow:0 10px 24px rgba(0,113,227,.22)}
      .kf-label-print-note{margin:12px 2px 0;color:#77787d;font-size:12px;line-height:1.5;text-align:right}
      @media(max-width:520px){
        #kf-label-modal{padding:10px}.kf-label-dialog{padding:16px;border-radius:22px}
        .kf-label-preview-stage{min-height:220px;padding:28px 8px}
        .kf-label-actions{display:grid;grid-template-columns:1fr 1fr}.kf-label-actions button{width:100%}
      }
      @media print{
        @page{size:58mm 40mm;margin:0}
        html,body{width:58mm!important;height:40mm!important;margin:0!important;padding:0!important;background:#fff!important;overflow:hidden!important}
        body.kf-label-printing *{visibility:hidden!important}
        body.kf-label-printing #kf-label-modal,
        body.kf-label-printing #kf-label-modal .kf-label-sheet,
        body.kf-label-printing #kf-label-modal .kf-label-sheet *{visibility:visible!important}
        body.kf-label-printing #kf-label-modal{position:absolute!important;inset:0!important;display:block!important;padding:0!important;background:#fff!important;backdrop-filter:none!important}
        body.kf-label-printing .kf-label-dialog{width:58mm!important;height:40mm!important;max-height:none!important;margin:0!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}
        body.kf-label-printing .kf-label-modal-head,
        body.kf-label-printing .kf-label-preview-stage> :not(.kf-label-sheet),
        body.kf-label-printing .kf-label-actions,
        body.kf-label-printing .kf-label-print-note{display:none!important}
        body.kf-label-printing .kf-label-preview-stage{display:block!important;width:58mm!important;height:40mm!important;min-height:0!important;margin:0!important;padding:0!important;border-radius:0!important;background:#fff!important;overflow:hidden!important}
        body.kf-label-printing .kf-label-sheet{position:absolute!important;left:0!important;top:0!important;margin:0!important}
      }
    `;
    document.head.appendChild(style);
  };

  const createModal = () => {
    let modal = document.getElementById('kf-label-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'kf-label-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="kf-label-dialog" role="dialog" aria-modal="true" aria-labelledby="kf-label-title">
        <header class="kf-label-modal-head">
          <div>
            <h2 id="kf-label-title">貨卡預覽</h2>
            <p>實際尺寸 58 × 40 mm｜HTML／CSS 列印模板</p>
          </div>
          <button type="button" class="kf-label-close" aria-label="關閉貨卡預覽">×</button>
        </header>
        <div class="kf-label-preview-stage" id="kf-label-preview-stage"></div>
        <div class="kf-label-actions">
          <button type="button" class="secondary" data-label-close>返回商品</button>
          <button type="button" class="primary" data-label-browser-print>使用電腦列印</button>
        </div>
        <p class="kf-label-print-note">此按鈕使用瀏覽器與電腦印表機驅動，不會送出飛鵝雲端 API。</p>
      </section>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.hidden = true;
      document.body.classList.remove('kf-label-printing');
    };

    modal.querySelector('.kf-label-close')?.addEventListener('click', close);
    modal.querySelector('[data-label-close]')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector('[data-label-browser-print]')?.addEventListener('click', () => {
      document.body.classList.add('kf-label-printing');
      requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('kf-label-printing'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) close();
    });

    return modal;
  };

  const openPreview = (product) => {
    createStyles();
    const modal = createModal();
    const stage = modal.querySelector('#kf-label-preview-stage');
    if (!stage) return;
    stage.innerHTML = labelMarkup(product);
    modal.hidden = false;
    modal.querySelector('[data-label-browser-print]')?.focus();
  };

  onReady(() => {
    createStyles();
    createModal();
    window.__kfHtmlLabelTemplate = { version: VERSION, openPreview };

    document.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-print]');
      if (!button) return;
      const product = extractProductFromButton(button);
      if (!product) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openPreview(product);
    }, true);
  });
})();
