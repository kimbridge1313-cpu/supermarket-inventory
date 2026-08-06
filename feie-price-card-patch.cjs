const fs = require('node:fs');

const SCRIPT_VERSION = 'feie-price-card-20260806a';

function patchIndex() {
  const file = 'index.html';
  if (!fs.existsSync(file)) return;

  let text = fs.readFileSync(file, 'utf8');

  if (!text.includes('window.__KF_APP_STATE=state;')) {
    const statePattern = /const state=\{[\s\S]*?\}\};/;
    if (!statePattern.test(text)) throw new Error('Unable to locate app state declaration');
    text = text.replace(statePattern, (match) => `${match}window.__KF_APP_STATE=state;`);
  }

  text = text.replace(/<script src="\/feie-price-card\.js\?v=[^"]+"><\/script>/g, '');
  const appleScript = '<script src="/apple-ui-improve.js?v=improve-20260803c"></script>';
  const feieScript = `<script src="/feie-price-card.js?v=${SCRIPT_VERSION}"></script>`;
  if (text.includes(appleScript)) {
    text = text.replace(appleScript, `${feieScript}${appleScript}`);
  } else {
    text = text.replace('</body>', `${feieScript}</body>`);
  }

  fs.writeFileSync(file, text);
}

patchIndex();
