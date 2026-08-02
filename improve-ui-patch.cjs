const fs = require('node:fs');

const file = 'index.html';
if (!fs.existsSync(file)) process.exit(0);

let text = fs.readFileSync(file, 'utf8');
text = text
  .split('<script src="/apple-ui-improve.js?v=improve-20260802a"></script>')
  .join('');
text = text.replace(
  '</body>',
  '<script src="/apple-ui-improve.js?v=improve-20260802a"></script></body>'
);
fs.writeFileSync(file, text);
