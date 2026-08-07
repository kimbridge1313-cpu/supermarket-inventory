const fs = require('node:fs');

function patchAppleImprove() {
  const file = 'public/apple-ui-improve.js';
  if (!fs.existsSync(file)) throw new Error('Missing public/apple-ui-improve.js');
  let text = fs.readFileSync(file, 'utf8');

  const competingWriter = `    document.querySelectorAll('[data-print]').forEach((button) => {\n      if (button.textContent !== '預覽列印') button.textContent = '預覽列印';\n      if (button.getAttribute('aria-label') !== '開啟此商品的貨卡預覽與列印') button.setAttribute('aria-label', '開啟此商品的貨卡預覽與列印');\n    });\n`;
  if (text.includes(competingWriter)) text = text.replace(competingWriter, '');
  if (text.includes("button.textContent !== '預覽列印'")) {
    throw new Error('Competing Apple UI print-button label writer is still present');
  }

  const emptyEnhancer = `  const enhanceResultButtons = () => {\n  };`;
  const oldSpecEnhancer = `  const enhanceResultButtons = () => {\n    document.querySelectorAll('.apple-result-card tr').forEach((row) => {\n      const specCell = row.querySelector('td:nth-child(5)');\n      if (specCell) {\n        const value = specCell.textContent?.trim() || '';\n        specCell.classList.toggle('apple-empty-spec', !value || value === '-');\n      }\n    });\n  };`;
  const specEnhancer = `  const enhanceResultButtons = () => {\n    document.querySelectorAll('.apple-result-card tr').forEach((row) => {\n      const specCell = row.querySelector('td:nth-child(5)');\n      if (specCell) {\n        const value = specCell.textContent?.trim() || '';\n        const empty = !value || value === '-';\n        specCell.classList.toggle('apple-empty-spec', empty);\n        specCell.hidden = empty;\n      }\n    });\n  };`;
  if (text.includes(emptyEnhancer)) text = text.replace(emptyEnhancer, specEnhancer);
  if (text.includes(oldSpecEnhancer)) text = text.replace(oldSpecEnhancer, specEnhancer);

  fs.writeFileSync(file, text);
}

function patchFeieButtonWriter() {
  const file = 'public/feie-price-card.js';
  if (!fs.existsSync(file)) throw new Error('Missing public/feie-price-card.js');
  let text = fs.readFileSync(file, 'utf8');

  const oldWriter = `      document.querySelectorAll('[data-print]').forEach((button) => {\n        button.textContent = '確認貨卡';\n        button.setAttribute('aria-label', '確認此商品的飛鵝貨卡內容');\n      });`;
  const stableWriter = `      document.querySelectorAll('[data-print]').forEach((button) => {\n        if (button.textContent !== '確認貨卡') button.textContent = '確認貨卡';\n        if (button.getAttribute('aria-label') !== '確認此商品的飛鵝貨卡內容') {\n          button.setAttribute('aria-label', '確認此商品的飛鵝貨卡內容');\n        }\n      });`;

  if (text.includes(oldWriter)) text = text.replace(oldWriter, stableWriter);
  if (!text.includes("if (button.textContent !== '確認貨卡')")) {
    throw new Error('Stable Feie print-button writer was not applied');
  }

  fs.writeFileSync(file, text);
}

function bumpAppleVersion() {
  const file = 'index.html';
  if (!fs.existsSync(file)) throw new Error('Missing index.html');
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/\/apple-ui-improve\.js\?v=improve-[0-9a-z]+/g, '/apple-ui-improve.js?v=improve-20260807e');
  fs.writeFileSync(file, text);
}

patchAppleImprove();
patchFeieButtonWriter();
bumpAppleVersion();
console.log('print button stability patch applied');
