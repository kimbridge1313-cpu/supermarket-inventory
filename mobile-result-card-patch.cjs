const fs = require('node:fs');

const file = 'public/apple-ui-improve.js';
if (!fs.existsSync(file)) throw new Error('Missing public/apple-ui-improve.js');

let text = fs.readFileSync(file, 'utf8');

const start = text.indexOf('    @media(max-width:820px){');
const end = text.indexOf('    @media(max-width:390px){', start);
if (start < 0 || end < 0) throw new Error('Mobile result-card CSS block not found');

const mobile = `    @media(max-width:820px){
      .apple-result-area{margin-top:20px!important}
      .apple-result-head{margin:0 4px 12px!important}
      .apple-result-head h2{font-size:24px!important;line-height:1.1!important;letter-spacing:-.03em!important}
      .apple-result-head .pill{padding:7px 11px!important;font-size:12px!important}
      .apple-result-card{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .apple-result-card .table-wrap{overflow:visible!important}
      .apple-result-card table{display:block!important;width:100%!important;min-width:0!important}
      .apple-result-card thead{display:none!important}
      .apple-result-card tbody{display:grid!important;width:100%!important;gap:14px!important}

      .apple-result-card tr.mobile-product-row{display:flex!important;flex-direction:column!important;width:100%!important;min-width:0!important;gap:0!important;padding:20px!important;border:1px solid rgba(17,24,39,.07)!important;border-radius:24px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 12px 34px rgba(31,35,48,.07)!important;transform:none!important}
      .mobile-product-name{display:block!important;width:100%!important;min-width:0!important;margin:0!important;font-size:20px!important;font-weight:800!important;line-height:1.28!important;letter-spacing:-.025em!important;color:#1d1d1f!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:normal!important}
      .mobile-product-price{display:block!important;width:100%!important;margin-top:10px!important;font-size:30px!important;font-weight:850!important;line-height:1!important;letter-spacing:-.04em!important;color:#111!important;white-space:nowrap!important}
      .mobile-product-meta{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important;width:100%!important;min-width:0!important;margin-top:16px!important;padding-top:12px!important;border-top:1px solid rgba(17,24,39,.07)!important}
      .mobile-product-barcode,.mobile-product-spec{display:block!important;width:100%!important;min-width:0!important;color:#73747a!important;font-size:12px!important;line-height:1.45!important;white-space:nowrap!important;word-break:keep-all!important;overflow-wrap:normal!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .mobile-product-barcode::before{content:'條碼：';color:#8f9096;font-weight:700}
      .mobile-product-spec::before{content:'規格：';color:#8f9096;font-weight:700}
      .mobile-product-langs{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:7px!important;width:100%!important;min-width:0!important;margin-top:13px!important}
      .mobile-product-lang{display:block!important;width:100%!important;min-width:0!important;padding:10px 12px!important;border-radius:12px!important;background:#f6f7f9!important;color:#686970!important;font-size:13px!important;line-height:1.45!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .mobile-product-actions{display:grid!important;width:100%!important;grid-template-columns:92px minmax(0,1fr)!important;gap:10px!important;margin-top:14px!important}
      .mobile-product-actions button{width:100%!important;min-width:0!important;min-height:46px!important;margin:0!important;padding:0 14px!important;border-radius:15px!important;font-size:14px!important;font-weight:750!important;white-space:nowrap!important;box-shadow:none!important}
      .mobile-product-actions [data-edit]{background:#eef4ff!important;color:#0866c6!important}
      .mobile-product-actions [data-print]{background:#0071e3!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,113,227,.18)!important}

      .apple-result-card tr:not(.mobile-product-row){width:100%!important;min-width:0!important;padding:20px!important;border:1px solid rgba(17,24,39,.07)!important;border-radius:24px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 12px 34px rgba(31,35,48,.07)!important}
      .apple-result-card tr:not(.mobile-product-row) td[colspan]{display:block!important;width:100%!important;text-align:center!important;padding:24px 12px!important}
    }

`;

text = text.slice(0, start) + mobile + text.slice(end);

const enhancerStart = text.indexOf('  const enhanceResultButtons = () => {');
const enhancerEnd = text.indexOf('\n\n  const productsBody', enhancerStart);
if (enhancerStart < 0 || enhancerEnd < 0) throw new Error('Result enhancer block not found');

const enhancer = `  const enhanceResultButtons = () => {
    if (!window.matchMedia('(max-width:820px)').matches) return;

    document.querySelectorAll('.apple-result-card tr').forEach((row) => {
      if (row.dataset.mobileCardReady === 'true') return;

      const cells = Array.from(row.querySelectorAll(':scope > td'));
      if (cells.length < 6 || cells[0]?.hasAttribute('colspan')) return;

      const barcode = (cells[0]?.textContent || '').replace(/\\s+/g, '');
      const name = cells[1]?.querySelector('strong')?.textContent?.trim() || cells[1]?.textContent?.trim() || '';
      const languageSpans = Array.from(cells[2]?.querySelectorAll('.muted') || []);
      const vi = languageSpans[0]?.textContent?.trim() || '';
      const id = languageSpans[1]?.textContent?.trim() || '';
      const price = cells[3]?.textContent?.trim() || '';
      const spec = cells[4]?.textContent?.trim() || '';
      const editButton = cells[5]?.querySelector('[data-edit]');
      const printButton = cells[5]?.querySelector('[data-print]');

      const nameEl = document.createElement('div');
      nameEl.className = 'mobile-product-name';
      nameEl.textContent = name;

      const priceEl = document.createElement('div');
      priceEl.className = 'mobile-product-price';
      priceEl.textContent = price;

      const metaEl = document.createElement('div');
      metaEl.className = 'mobile-product-meta';

      const barcodeEl = document.createElement('div');
      barcodeEl.className = 'mobile-product-barcode';
      barcodeEl.textContent = barcode;
      metaEl.appendChild(barcodeEl);

      if (spec && spec !== '-') {
        const specEl = document.createElement('div');
        specEl.className = 'mobile-product-spec';
        specEl.textContent = spec;
        metaEl.appendChild(specEl);
      }

      const langsEl = document.createElement('div');
      langsEl.className = 'mobile-product-langs';
      [vi, id].forEach((value) => {
        if (!value || value === 'VI -' || value === 'ID -') return;
        const langEl = document.createElement('div');
        langEl.className = 'mobile-product-lang';
        langEl.textContent = value;
        langsEl.appendChild(langEl);
      });

      const actionsEl = document.createElement('div');
      actionsEl.className = 'mobile-product-actions';
      if (editButton) actionsEl.appendChild(editButton);
      if (printButton) actionsEl.appendChild(printButton);

      const parts = [nameEl, priceEl, metaEl];
      if (langsEl.childElementCount) parts.push(langsEl);
      if (actionsEl.childElementCount) parts.push(actionsEl);

      row.replaceChildren(...parts);
      row.classList.add('mobile-product-row');
      row.dataset.mobileCardReady = 'true';
    });
  };`;

text = text.slice(0, enhancerStart) + enhancer + text.slice(enhancerEnd);

fs.writeFileSync(file, text);

const indexFile = 'index.html';
if (!fs.existsSync(indexFile)) throw new Error('Missing index.html');
let index = fs.readFileSync(indexFile, 'utf8');
index = index.replace(/\/apple-ui-improve\.js\?v=improve-[0-9a-z]+/g, '/apple-ui-improve.js?v=improve-20260807f');
fs.writeFileSync(indexFile, index);

console.log('mobile result card patch applied');
