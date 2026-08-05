const fs = require('node:fs');

function patchProductSave() {
  const file = 'index.html';
  if (!fs.existsSync(file)) return;

  let text = fs.readFileSync(file, 'utf8');
  const anchor = 'function keywordsFromText(...values){';
  const normalizeFunction = 'function normalizeSearch(text){const blocked="-－_()（）[]【】.,，、/"+String.fromCharCode(92);return[...String(text||"").toLowerCase()].filter(ch=>ch.trim()&&!blocked.includes(ch)).join("")}';
  const updateSuccessMessage = 'setFormStatus("商品已更新")';

  if (!text.includes(anchor)) {
    throw new Error('Unable to locate product keyword builder');
  }

  if (!text.includes('function normalizeSearch(text){')) {
    text = text.replace(anchor, normalizeFunction + anchor);
  }

  if (!text.includes(updateSuccessMessage)) {
    throw new Error('Unable to locate product update success message');
  }

  text = text.replace(updateSuccessMessage, 'setFormStatus("修改成功")');

  fs.writeFileSync(file, text);
}

patchProductSave();
