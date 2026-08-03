const fs = require('node:fs');

function patchIndex() {
  const file = 'index.html';
  if (!fs.existsSync(file)) return;

  let text = fs.readFileSync(file, 'utf8');
  text = text
    .split('<script src="/label-template.js?v=label-20260802a"></script>')
    .join('')
    .split('<script src="/label-template-legacy.js?v=label-legacy-20260802a"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260802a"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260802b"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260802c"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260803a"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260803b"></script>')
    .join('')
    .split('<script src="/apple-ui-improve.js?v=improve-20260803c"></script>')
    .join('')
    .split('<script src="/search-watchdog.js?v=search-20260802a"></script>')
    .join('');

  text = text.replace(
    '$("app-title").textContent=state.settings.storeName?`${state.settings.storeName}｜商品資料與貨卡列印`:"商品資料與貨卡列印"',
    'if($("app-title"))$("app-title").textContent=state.settings.storeName?`${state.settings.storeName}｜商品資料與貨卡列印`:"商品資料與貨卡列印"'
  );

  text = text.replace(
    '</body>',
    '<script src="/label-template.js?v=label-20260802a"></script><script src="/label-template-legacy.js?v=label-legacy-20260802a"></script><script src="/apple-ui-improve.js?v=improve-20260803c"></script><script src="/search-watchdog.js?v=search-20260802a"></script></body>'
  );
  fs.writeFileSync(file, text);
}

function patchAppleUi() {
  const file = 'public/apple-ui.js';
  if (!fs.existsSync(file)) return;

  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    '<strong>超市商品中心</strong>',
    '<strong id="app-title">超市商品中心</strong>'
  );
  fs.writeFileSync(file, text);
}

patchIndex();
patchAppleUi();
