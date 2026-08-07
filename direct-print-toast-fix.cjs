const fs = require('node:fs');

const file = 'public/feie-price-card.js';
if (!fs.existsSync(file)) throw new Error('Missing public/feie-price-card.js');

let text = fs.readFileSync(file, 'utf8');
text = text
  .split('\\\\n    .feie-direct-toast')
  .join('\n    .feie-direct-toast');

if (text.includes('\\\\n    .feie-direct-toast')) {
  throw new Error('Direct print toast CSS still contains escaped newline text');
}

fs.writeFileSync(file, text);
console.log('direct print toast style fix applied');
