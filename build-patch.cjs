const fs = require('node:fs');

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/,"咖啡"/g, '');
  text = text.replace(/, "咖啡"/g, '');
  if (file === 'index.html' && !text.includes('modal-ui-patch.js')) {
    text = text.replace('</body>', '<script src="/modal-ui-patch.js"></script></body>');
  }
  if (file === 'index.html' && !text.includes('barcode-scan-fix.js')) {
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js"></script></body>');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
