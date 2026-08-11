const fs = require('node:fs');

const file = 'index.html';
if (!fs.existsSync(file)) throw new Error('Missing index.html');

let text = fs.readFileSync(file, 'utf8');

const headMarker = '<!-- KF_PWA_HEAD -->';
if (!text.includes(headMarker)) {
  const pwaHead = `
  ${headMarker}
  <link rel="manifest" href="/manifest.webmanifest?v=20260811b" />
  <link rel="icon" href="/favicon.ico?v=20260811a" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260811a" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260811a" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=20260811a" />
  <link rel="shortcut icon" href="/favicon.ico?v=20260811a" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260811a" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="來來庫存" />
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
