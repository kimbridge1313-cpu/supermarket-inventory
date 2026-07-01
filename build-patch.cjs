const fs = require('node:fs');

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/,"咖啡"/g, '');
  text = text.replace(/, "咖啡"/g, '');
  if (file === 'index.html') {
    text = text.split('<script src="/modal-ui-patch.js"></script>').join('');
    text = text.split('<script src="/barcode-scan-fix.js"></script>').join('');
    text = text.split('<script src="/mobile-ui-force.js"></script>').join('');
    text = text.replace(
      'function filteredProducts(){const kw=$("search-input").value.trim().toLowerCase();if(!kw)return state.products;return state.products.filter(p=>[p.barcode,p.name,p.labelName,p.nameVi,p.nameId].some(v=>String(v||"").toLowerCase().includes(kw)))}',
      'function filteredProducts(){const raw=$("search-input").value.trim().toLowerCase();if(!raw)return state.products;const terms=raw.split(/[\\s,，、]+/).map(x=>x.trim()).filter(Boolean);return state.products.filter(p=>{const hay=[p.barcode,p.name,p.labelName,p.nameVi,p.nameId,p.category,p.supplier,p.spec].map(v=>String(v||"").toLowerCase()).join(" ");return terms.every(term=>hay.includes(term))})}'
    );
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js?v=stable-20260701a"></script><script src="/modal-ui-patch.js?v=stable-20260701a"></script></body>');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
