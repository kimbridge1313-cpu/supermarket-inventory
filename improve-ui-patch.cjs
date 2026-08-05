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

  const bootMarkup = `<style id="kf-ui-boot-style">
    html:not(.apple-ui-ready){background:#f5f5f7}
    html:not(.apple-ui-ready) body{visibility:hidden}
    html:not(.apple-ui-ready)::before{
      content:"";position:fixed;left:50%;top:50%;width:22px;height:22px;
      margin:-11px 0 0 -11px;border:2px solid rgba(29,29,31,.16);
      border-top-color:#1d1d1f;border-radius:50%;z-index:2147483647;
      animation:kfBootSpin .72s linear infinite
    }
    @keyframes kfBootSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){html:not(.apple-ui-ready)::before{animation:none}}
  </style><script id="kf-ui-boot-fallback">window.setTimeout(function(){document.documentElement.classList.add('apple-ui-ready')},5000)</script>`;

  text = text.replace(/<style id="kf-ui-boot-style">[\s\S]*?<\/style><script id="kf-ui-boot-fallback">[\s\S]*?<\/script>/g, '');
  text = text.replace('</head>', `${bootMarkup}</head>`);

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
