const fs = require('node:fs');

const file = 'index.html';
if (!fs.existsSync(file)) process.exit(0);

let text = fs.readFileSync(file, 'utf8');
text = text.replace(/<script src="\/apple-ui\.js[^\"]*"><\/script>/g, '');
text = text.replace('<title>商品資料與貨卡列印</title>', '<title>超市商品中心</title>');
text = text.replace('</body>', '<script src="/apple-ui.js?v=glass-20260802a"></script></body>');
fs.writeFileSync(file, text);
