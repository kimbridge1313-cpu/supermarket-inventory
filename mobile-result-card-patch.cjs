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
      .apple-result-card tbody{display:grid!important;width:100%!important;gap:14px!important}
      .apple-result-card tr{display:grid!important;width:100%!important;min-width:0!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-areas:'name name' 'price price' 'barcode spec' 'lang lang' 'actions actions'!important;column-gap:12px!important;row-gap:0!important;align-items:start!important;padding:20px!important;border:1px solid rgba(17,24,39,.07)!important;border-radius:24px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 12px 34px rgba(31,35,48,.07)!important;transform:none!important}
      .apple-result-card td{display:block!important;width:auto!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;text-align:left!important;white-space:normal!important;overflow-wrap:normal!important;word-break:normal!important}
      #panel-products .apple-result-card td::before{display:none!important;content:none!important}

      .apple-result-card td:nth-child(2){grid-area:name!important;width:100%!important;min-width:0!important;max-width:none!important}
      .apple-result-card td:nth-child(2) strong{display:block!important;width:100%!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:20px!important;font-weight:800!important;line-height:1.25!important;letter-spacing:-.025em!important;color:#1d1d1f!important}
      .apple-result-card td:nth-child(2) br{display:none!important}
      .apple-result-card td:nth-child(2) .muted{display:none!important}

      .apple-result-card td:nth-child(4){grid-area:price!important;width:100%!important;margin-top:8px!important;font-size:30px!important;font-weight:850!important;line-height:1!important;letter-spacing:-.04em!important;color:#111!important;white-space:nowrap!important;text-align:left!important}

      .apple-result-card td:nth-child(1){grid-area:barcode!important;width:auto!important;min-width:0!important;margin-top:15px!important;padding-top:12px!important;border-top:1px solid rgba(17,24,39,.07)!important;color:#73747a!important;font-size:12px!important;line-height:1.4!important;letter-spacing:.02em!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

      .apple-result-card td:nth-child(5){grid-area:spec!important;width:auto!important;max-width:48vw!important;justify-self:end!important;margin-top:15px!important;padding-top:12px!important;border-top:1px solid rgba(17,24,39,.07)!important;color:#73747a!important;font-size:12px!important;line-height:1.4!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:right!important}
      .apple-result-card td:nth-child(5)::before{display:inline!important;content:'規格：'!important;color:#8f9096!important;font-weight:700!important}
      .apple-result-card td:nth-child(5).apple-empty-spec{display:none!important}

      .apple-result-card td:nth-child(3){grid-area:lang!important;width:100%!important;margin-top:13px!important;padding:0!important;background:transparent!important;color:#686970!important;font-size:13px!important;line-height:1.45!important}
      .apple-result-card td:nth-child(3) br{display:none!important}
      .apple-result-card td:nth-child(3) .muted{display:block!important;width:100%!important;max-width:100%!important;padding:10px 12px!important;border-radius:12px!important;background:#f6f7f9!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .apple-result-card td:nth-child(3) .muted + .muted{margin-top:7px!important}

      .apple-result-card td.row{grid-area:actions!important;display:grid!important;width:100%!important;grid-template-columns:92px minmax(0,1fr)!important;gap:10px!important;margin-top:14px!important}
      .apple-result-card td.row button{width:100%!important;min-width:0!important;min-height:46px!important;margin:0!important;padding:0 14px!important;border-radius:15px!important;font-size:14px!important;font-weight:750!important;white-space:nowrap!important;box-shadow:none!important}
      .apple-result-card td.row [data-edit]{background:#eef4ff!important;color:#0866c6!important}
      .apple-result-card td.row [data-print]{background:#0071e3!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,113,227,.18)!important}
    }

`;

text = text.slice(0, start) + mobile + text.slice(end);

text = text.replace(
  "  const enhanceResultButtons = () => {\n    document.querySelectorAll('[data-print]').forEach((button) => {\n      if (button.textContent !== '預覽列印') button.textContent = '預覽列印';\n      if (button.getAttribute('aria-label') !== '開啟此商品的貨卡預覽與列印') button.setAttribute('aria-label', '開啟此商品的貨卡預覽與列印');\n    });\n  };",
  "  const enhanceResultButtons = () => {\n    document.querySelectorAll('.apple-result-card tr').forEach((row) => {\n      const specCell = row.querySelector('td:nth-child(5)');\n      if (specCell) specCell.classList.toggle('apple-empty-spec', !specCell.textContent?.trim() || specCell.textContent.trim() === '-');\n    });\n    document.querySelectorAll('[data-print]').forEach((button) => {\n      if (button.textContent !== '預覽列印') button.textContent = '預覽列印';\n      if (button.getAttribute('aria-label') !== '開啟此商品的貨卡預覽與列印') button.setAttribute('aria-label', '開啟此商品的貨卡預覽與列印');\n    });\n  };"
);

fs.writeFileSync(file, text);

const indexFile = 'index.html';
if (!fs.existsSync(indexFile)) throw new Error('Missing index.html');
let index = fs.readFileSync(indexFile, 'utf8');
index = index
  .replace(/\/apple-ui-improve\.js\?v=improve-[0-9a-z]+/g, '/apple-ui-improve.js?v=improve-20260807a');
fs.writeFileSync(indexFile, index);

console.log('mobile result card patch applied');
