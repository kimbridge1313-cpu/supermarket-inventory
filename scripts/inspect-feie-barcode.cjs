const { execFileSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const url = 'https://newsite-1252495575.file.myqcloud.com/open/download/Barcode-function.zip';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feie-barcode-'));
const zip = path.join(dir, 'Barcode-function.zip');
const out = path.join(dir, 'out');
fs.mkdirSync(out);

console.log('=== FEIE BARCODE FUNCTION INSPECTION ===');
console.log('source:', url);
try {
  execFileSync('curl', ['-fL', '--retry', '2', '--connect-timeout', '15', '-o', zip, url], { stdio: 'inherit' });
  console.log('zip bytes:', fs.statSync(zip).size);
  execFileSync('unzip', ['-q', zip, '-d', out], { stdio: 'inherit' });
  const files = execSync(`find ${JSON.stringify(out)} -type f -maxdepth 8 -print`, { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  console.log('files:');
  for (const file of files) console.log('-', path.relative(out, file));

  const textExt = /\.(?:php|java|js|cjs|mjs|ts|py|txt|md|html|htm|c|h|cs|go|rb)$/i;
  for (const file of files.filter(f => textExt.test(f))) {
    console.log(`\n--- FILE: ${path.relative(out, file)} ---`);
    const buf = fs.readFileSync(file);
    let text;
    for (const enc of ['utf8', 'latin1']) {
      try { text = buf.toString(enc); break; } catch {}
    }
    text = String(text || '');
    console.log(text.slice(0, 16000));
    if (text.length > 16000) console.log(`\n[truncated ${text.length - 16000} chars]`);
  }
} catch (err) {
  console.log('INSPECTION_FAILED:', err && err.message ? err.message : String(err));
}
console.log('=== END FEIE BARCODE FUNCTION INSPECTION ===');
