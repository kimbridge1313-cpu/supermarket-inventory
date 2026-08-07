const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const url = 'https://newsite-1252495575.file.myqcloud.com/open/download/Barcode-function.zip';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'feie-barcode-'));
const zip = path.join(dir, 'Barcode-function.zip');

console.log('=== FEIE BARCODE FUNCTION INSPECTION ===');
console.log('source:', url);
try {
  execFileSync('curl', ['-fL', '--retry', '2', '--connect-timeout', '15', '-o', zip, url], { stdio: 'inherit' });
  console.log('zip bytes:', fs.statSync(zip).size);
  console.log('\n--- ZIP LIST ---');
  console.log(execFileSync('unzip', ['-l', zip], { encoding: 'utf8' }));

  for (const ext of ['js', 'php', 'py', 'java', 'txt']) {
    console.log(`\n=== *.${ext} ===`);
    try {
      const buf = execFileSync('unzip', ['-p', zip, `*.${ext}`], { maxBuffer: 1024 * 1024 });
      console.log(buf.toString('utf8').slice(0, 30000));
    } catch (err) {
      console.log(`no readable *.${ext}:`, err.status ?? err.message);
    }
  }
} catch (err) {
  console.log('INSPECTION_FAILED:', err && err.message ? err.message : String(err));
}
console.log('=== END FEIE BARCODE FUNCTION INSPECTION ===');
