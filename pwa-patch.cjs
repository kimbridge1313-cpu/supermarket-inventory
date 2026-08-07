const fs = require('node:fs');

const file = 'index.html';
if (!fs.existsSync(file)) throw new Error('Missing index.html');

let text = fs.readFileSync(file, 'utf8');

const headMarker = '<!-- KF_PWA_HEAD -->';
if (!text.includes(headMarker)) {
  const pwaHead = `
  ${headMarker}
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/app-icon-192-v2.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icons/app-icon-512-v2.png" />
  <link rel="shortcut icon" href="/icons/app-icon-192-v2.png" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="來來庫存" />
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-v2.png" />
`;
  text = text.replace('</head>', `${pwaHead}</head>`);
}

const scriptMarker = '<!-- KF_PWA_REGISTER -->';
if (!text.includes(scriptMarker)) {
  const registration = `
  ${scriptMarker}
  <script src="/pwa-ui-fix.js?v=20260807b" defer></script>
  <script src="/pwa-register.js?v=20260807b" defer></script>
`;
  text = text.replace('</body>', `${registration}</body>`);
}

fs.writeFileSync(file, text);
console.log('pwa patch applied');
