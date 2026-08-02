window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const create = (tag, className, html = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (html) element.innerHTML = html;
    return element;
  };

  document.documentElement.classList.add('apple-ui-ready');
  document.body.classList.add('apple-inventory');

  const style = document.createElement('style');
  style.id = 'apple-inventory-style';
  style.textContent = `
    :root{
      --bg:#f5f5f7;--surface:rgba(255,255,255,.72);--surface-strong:rgba(255,255,255,.92);
      --ink:#1d1d1f;--muted:#6e6e73;--line:rgba(17,24,39,.08);--blue:#0071e3;
      --blue-hover:#0077ed;--danger:#c9342f;--shadow:0 24px 70px rgba(31,35,48,.10);
    }
    *{box-sizing:border-box}
    html{min-height:100%;background:#f5f5f7}
    body.apple-inventory{min-height:100vh;margin:0;background:
      radial-gradient(circle at 14% 8%,rgba(191,220,255,.38),transparent 28rem),
      radial-gradient(circle at 86% 16%,rgba(232,220,255,.30),transparent 24rem),
      linear-gradient(180deg,#fff 0%,#f7f7f9 52%,#f3f4f7 100%);
      color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","PingFang TC","Noto Sans TC",sans-serif;
      -webkit-font-smoothing:antialiased;overflow-x:hidden
    }
    body.apple-inventory::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;background:linear-gradient(120deg,rgba(255,255,255,.7),rgba(255,255,255,0) 45%)}
    .apple-inventory header{position:sticky;top:0;z-index:100;padding:0;background:rgba(255,255,255,.64);color:var(--ink);border-bottom:1px solid rgba(255,255,255,.72);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px)}
    .apple-topbar{width:min(1120px,100%);height:68px;margin:auto;padding:0 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}
    .apple-brand{display:flex;align-items:center;gap:12px;min-width:0}
    .apple-brand-mark{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#15171a,#41444b);box-shadow:0 8px 22px rgba(0,0,0,.16);color:#fff}
    .apple-brand-copy{min-width:0}.apple-brand-copy strong{display:block;font-size:17px;line-height:1.1;letter-spacing:-.02em}.apple-brand-copy span{display:block;margin-top:3px;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .apple-top-actions{display:flex;align-items:center;gap:8px}.apple-icon-btn,.apple-auth-btn{height:40px;border-radius:999px;border:1px solid rgba(17,24,39,.08);background:rgba(255,255,255,.78);box-shadow:0 7px 20px rgba(31,35,48,.07);display:inline-flex;align-items:center;justify-content:center;gap:7px;color:var(--ink);font-size:13px;font-weight:650;padding:0 13px;cursor:pointer;transition:.2s ease}
    .apple-icon-btn{width:40px;padding:0}.apple-icon-btn:hover,.apple-auth-btn:hover{transform:translateY(-1px);background:#fff}.apple-icon-btn svg,.apple-auth-btn svg{width:18px;height:18px}
    .apple-inventory main{width:min(1120px,100%);margin:0 auto;padding:34px 22px 56px;display:block}
    .apple-inventory main>.card,.apple-inventory main>.tabs{display:none!important}
    .apple-inventory .tab-panel{display:none!important}.apple-inventory .tab-panel.apple-visible-panel{display:grid!important}
    #panel-products.apple-visible-panel{display:block!important}
    .apple-glass{background:var(--surface);border:1px solid rgba(255,255,255,.82);box-shadow:var(--shadow);backdrop-filter:blur(26px) saturate(160%);-webkit-backdrop-filter:blur(26px) saturate(160%)}
    .apple-search-stage{max-width:820px;margin:7vh auto 0;text-align:center;padding:54px 42px 38px;border-radius:38px;position:relative;overflow:hidden}
    .apple-search-stage::before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;top:-160px;right:-80px;background:rgba(0,113,227,.13);filter:blur(4px)}
    .apple-scan-orb{width:94px;height:94px;margin:0 auto 24px;border-radius:30px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(234,241,251,.86));border:1px solid rgba(255,255,255,.98);box-shadow:0 22px 55px rgba(54,94,145,.18),inset 0 1px 0 rgba(255,255,255,1);color:#0b62c4}
    .apple-scan-orb svg{width:43px;height:43px}.apple-search-stage h1{margin:0;font-size:clamp(34px,5vw,54px);line-height:1.04;letter-spacing:-.045em}.apple-search-stage>p{max-width:520px;margin:15px auto 30px;color:var(--muted);font-size:16px;line-height:1.65}
    .apple-search-shell{max-width:700px;margin:0 auto;display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,.88);border:1px solid rgba(255,255,255,.98);border-radius:24px;box-shadow:0 18px 46px rgba(31,52,82,.12),inset 0 0 0 1px rgba(17,24,39,.03);position:relative;z-index:2}
    .apple-search-shell input{height:54px;min-width:0;flex:1;border:0!important;outline:0;background:transparent!important;padding:0 15px!important;font-size:17px;color:var(--ink);box-shadow:none!important}.apple-search-shell input::placeholder{color:#929298}
    .apple-search-action{width:46px;height:46px;flex:0 0 46px;border:0;border-radius:16px;background:transparent;color:#55565b;display:grid;place-items:center;padding:0;cursor:pointer;transition:.18s ease}.apple-search-action:hover{background:#f0f1f4;color:var(--ink)}.apple-search-action svg{width:21px;height:21px}
    .apple-search-action.primary{background:var(--blue);color:#fff;box-shadow:0 9px 22px rgba(0,113,227,.28)}.apple-search-action.primary:hover{background:var(--blue-hover);transform:translateY(-1px)}
    .apple-search-action.listening{background:#ef3340;color:#fff;animation:applePulse 1.25s infinite}.apple-search-action[hidden]{display:none}
    @keyframes applePulse{0%,100%{box-shadow:0 0 0 0 rgba(239,51,64,.28)}50%{box-shadow:0 0 0 12px rgba(239,51,64,0)}}
    .apple-search-hints{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:20px;color:#85858a;font-size:12px}.apple-search-hints span{display:inline-flex;align-items:center;gap:6px}.apple-search-hints svg{width:14px;height:14px}
    .apple-result-area{max-width:1040px;margin:30px auto 0;display:none}.apple-result-area.visible{display:block;animation:appleRise .32s ease both}@keyframes appleRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .apple-result-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 4px 13px}.apple-result-head h2{margin:0;font-size:20px;letter-spacing:-.02em}.apple-result-head .pill{background:rgba(255,255,255,.78);color:var(--muted);border:1px solid rgba(255,255,255,.9);padding:7px 11px}
    .apple-result-card{border-radius:28px;padding:12px 16px 16px;overflow:hidden}
    .apple-result-card .table-wrap{border:0!important;overflow:visible!important}.apple-result-card table{display:block!important;width:100%;min-width:0!important}.apple-result-card thead{display:none!important}.apple-result-card tbody{display:grid!important;gap:10px;width:100%}
    .apple-result-card tr{display:grid!important;grid-template-columns:minmax(140px,1.1fr) minmax(210px,2fr) minmax(120px,1.2fr) 90px minmax(90px,.7fr) auto;gap:12px;align-items:center;padding:15px 16px;margin:0!important;border:1px solid rgba(17,24,39,.06)!important;border-radius:20px!important;background:rgba(255,255,255,.76)!important;box-shadow:0 7px 22px rgba(31,35,48,.045)!important;transition:.18s ease}.apple-result-card tr:hover{background:#fff!important;transform:translateY(-1px);box-shadow:0 12px 28px rgba(31,35,48,.08)!important}
    .apple-result-card td{display:block!important;width:auto!important;border:0!important;padding:0!important;font-size:13px!important;min-width:0;overflow-wrap:anywhere}.apple-result-card td:nth-child(2){font-size:15px!important;font-weight:700;color:var(--ink)}.apple-result-card td:nth-child(4){font-size:19px!important;font-weight:750;color:var(--ink)}.apple-result-card td:nth-child(3),.apple-result-card td:nth-child(5){color:var(--muted)}.apple-result-card td.row{display:flex!important;gap:6px;justify-content:flex-end;white-space:nowrap!important}.apple-result-card td.row button{margin:0!important;border-radius:12px!important;padding:8px 10px!important;background:#edf4ff!important;color:#075fbe!important;font-size:12px!important}
    .apple-result-card tr:only-child td[colspan]{grid-column:1/-1;text-align:center!important;padding:34px 12px!important;color:var(--muted)}
    .apple-sub-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.apple-sub-actions button{border-radius:999px!important;background:rgba(255,255,255,.72)!important;color:var(--ink)!important;border:1px solid rgba(17,24,39,.07)!important;padding:9px 13px!important}
    .apple-inventory .card{background:var(--surface);border:1px solid rgba(255,255,255,.82);border-radius:28px;box-shadow:var(--shadow);backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%)}
    .apple-inventory input,.apple-inventory select{border:1px solid rgba(17,24,39,.09);background:rgba(255,255,255,.82);border-radius:15px;padding:12px 13px}.apple-inventory input:focus,.apple-inventory select:focus{outline:3px solid rgba(0,113,227,.16);border-color:rgba(0,113,227,.42)}
    .apple-inventory button{font-family:inherit}.apple-inventory button.primary{background:var(--blue);color:#fff}.apple-inventory button.secondary{background:rgba(241,244,248,.92);color:#263342}.apple-inventory button.danger{background:#fff0ef;color:var(--danger)}
    #global-status{max-width:820px;margin:18px auto 0;padding:9px 13px;border:0;background:transparent;color:var(--muted);font-size:12px;text-align:center}
    #product-form-modal{background:rgba(214,219,228,.44)!important;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)}#product-form-modal .card{background:rgba(255,255,255,.92)!important;border-radius:30px!important;border:1px solid rgba(255,255,255,.98)!important;box-shadow:0 32px 90px rgba(31,35,48,.22)!important}#product-form-modal .modal-head{background:transparent!important;border-color:rgba(17,24,39,.07)!important}
    .apple-menu-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(210,216,226,.42);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;pointer-events:none;transition:.22s ease}.apple-menu-backdrop.open{opacity:1;pointer-events:auto}
    .apple-menu{position:absolute;right:18px;top:18px;width:min(390px,calc(100vw - 36px));max-height:calc(100vh - 36px);overflow:auto;padding:18px;border-radius:30px;background:rgba(255,255,255,.88);border:1px solid rgba(255,255,255,.98);box-shadow:0 34px 100px rgba(31,35,48,.24);transform:translateY(-8px) scale(.98);transition:.22s ease}.open .apple-menu{transform:none}
    .apple-menu-head{display:flex;justify-content:space-between;align-items:center;padding:2px 2px 16px}.apple-menu-head strong{font-size:20px;letter-spacing:-.025em}.apple-menu-close{width:38px;height:38px;border-radius:50%;padding:0;background:#eceef2;color:#37383d;display:grid;place-items:center}.apple-menu-list{display:grid;gap:8px}.apple-menu-item{width:100%;min-height:58px;border:0;border-radius:18px;padding:0 15px;background:rgba(244,246,249,.78);color:var(--ink);display:flex;align-items:center;justify-content:space-between;text-align:left;font-size:15px;font-weight:680;cursor:pointer}.apple-menu-item:hover{background:#eef4fc}.apple-menu-item.active{background:#e7f2ff;color:#075fbe}.apple-menu-item span{display:flex;align-items:center;gap:11px}.apple-menu-item svg{width:20px;height:20px}.apple-menu-meta{margin-top:14px;padding:14px;border-radius:18px;background:rgba(247,248,250,.86);color:var(--muted);font-size:12px;line-height:1.6}.apple-menu-meta #user-label{display:block;margin-bottom:7px;color:var(--ink);font-size:13px}.apple-menu-meta #project-label{margin:0}.apple-menu-meta #logout-btn{margin-top:10px;width:100%}
    .apple-secondary-panel{animation:appleRise .25s ease}.apple-secondary-panel>.card{margin-bottom:16px}.apple-panel-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.apple-panel-title h1{font-size:30px;letter-spacing:-.035em;margin:0}.apple-back-home{border-radius:999px;background:rgba(255,255,255,.76);color:var(--ink);border:1px solid rgba(17,24,39,.07)}
    .apple-login-slot #login-btn{height:40px;border-radius:999px;padding:0 14px;background:#17181b;color:#fff}.apple-login-slot #user-label,.apple-login-slot #project-label,.apple-login-slot #logout-btn,.apple-login-slot #config-warning{display:none!important}
    @media(max-width:820px){
      .apple-topbar{height:62px;padding:0 14px}.apple-brand-mark{width:34px;height:34px}.apple-brand-copy strong{font-size:15px}.apple-brand-copy span{display:none}.apple-auth-btn span{display:none}
      .apple-inventory main{padding:20px 12px 36px}.apple-search-stage{margin-top:3vh;padding:38px 15px 24px;border-radius:30px}.apple-scan-orb{width:80px;height:80px;border-radius:26px;margin-bottom:20px}.apple-search-stage h1{font-size:38px}.apple-search-stage>p{font-size:14px;margin:12px auto 23px;padding:0 12px}.apple-search-shell{padding:6px;border-radius:20px;gap:4px}.apple-search-shell input{height:50px;padding:0 10px!important;font-size:16px}.apple-search-action{width:43px;height:43px;flex-basis:43px;border-radius:14px}.apple-search-hints{gap:11px;margin-top:16px}.apple-result-area{margin-top:20px}.apple-result-head{margin:0 4px 10px}.apple-result-card{padding:10px;border-radius:24px}.apple-result-card tbody{gap:9px}.apple-result-card tr{grid-template-columns:1fr 96px!important;gap:7px 12px;padding:14px!important;border-radius:18px!important}.apple-result-card td{grid-column:1/-1}.apple-result-card td:nth-child(2){grid-column:1/2;grid-row:1;font-size:16px!important}.apple-result-card td:nth-child(4){grid-column:2/3;grid-row:1;text-align:right;font-size:21px!important}.apple-result-card td:nth-child(1){grid-column:1/-1;grid-row:2;color:var(--muted);font-size:12px!important}.apple-result-card td:nth-child(3),.apple-result-card td:nth-child(5){font-size:12px!important}.apple-result-card td.row{grid-column:1/-1;justify-content:flex-start!important;margin-top:6px}.apple-menu{right:8px;top:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px);border-radius:26px}.apple-secondary-panel .two,.apple-secondary-panel{grid-template-columns:1fr!important}.apple-panel-title h1{font-size:25px}
    }
    @media(max-width:430px){.apple-search-shell{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,43px)}.apple-search-shell input{grid-column:1/2}.apple-search-hints span:nth-child(2){display:none}.apple-brand-copy strong{max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const icon = (name) => {
    const icons = {
      scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>',
      camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h3l1.5-2h5L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.2"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6"/></svg>',
      box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>',
      cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 4.7 4.7 0 0 0 7 18Z"/></svg>',
      printer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2.2-.7-.6-1.4 1-2-2.1-2.1-2 1-1.5-.6L11 2H8l-.7 2.2-1.4.6-2-1L1.8 6l1 2-.6 1.5L0 10v3l2.2.7.6 1.4-1 2 2.1 2.1 2-1 1.5.6L8 21h3l.7-2.2 1.4-.6 2 1 2.1-2.1-1-2 .6-1.5L19 13.5Z" transform="translate(2) scale(.91)"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>'
    };
    return icons[name] || '';
  };

  const header = document.querySelector('header');
  const main = document.querySelector('main');
  const originalTabs = document.querySelector('.tabs');
  const productPanel = $('panel-products');
  const listCard = $('products-body')?.closest('.card');
  const loginCard = $('login-btn')?.closest('.card');
  if (!header || !main || !originalTabs || !productPanel || !listCard) return;

  header.innerHTML = `
    <div class="apple-topbar">
      <div class="apple-brand"><div class="apple-brand-mark">${icon('box')}</div><div class="apple-brand-copy"><strong>超市商品中心</strong><span>掃碼、查價與貨卡管理</span></div></div>
      <div class="apple-top-actions"><div class="apple-login-slot" id="apple-login-slot"></div><button class="apple-icon-btn" id="apple-menu-open" type="button" aria-label="開啟功能選單">${icon('menu')}</button></div>
    </div>`;

  const loginSlot = $('apple-login-slot');
  const loginBtn = $('login-btn');
  if (loginBtn) {
    loginBtn.innerHTML = `${icon('user')}<span>登入</span>`;
    loginSlot.appendChild(loginBtn);
  }

  const searchInput = $('search-input');
  const searchBtn = $('product-search-btn');
  const scanBtn = $('scan-product-barcode-btn');
  const productCount = $('product-count');
  const tableWrap = $('products-body')?.closest('.table-wrap');
  const addBtn = $('add-product-modal-btn');

  const stage = create('section', 'apple-search-stage apple-glass');
  stage.innerHTML = `
    <div class="apple-scan-orb">${icon('scan')}</div>
    <h1>掃描商品</h1>
    <p>使用掃碼器、手機相機，或直接說出商品名稱。</p>
    <div class="apple-search-shell" id="apple-search-shell"></div>
    <div class="apple-search-hints"><span>${icon('scan')}藍牙／USB 掃碼器</span><span>${icon('camera')}手機相機</span><span>${icon('mic')}語音搜尋</span></div>`;

  const shell = stage.querySelector('#apple-search-shell');
  if (searchInput) {
    searchInput.placeholder = '掃描條碼或輸入商品名稱';
    searchInput.setAttribute('aria-label', '掃描條碼或輸入商品名稱');
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute('inputmode', 'search');
    shell.appendChild(searchInput);
  }
  if (scanBtn) {
    scanBtn.className = 'apple-search-action';
    scanBtn.innerHTML = icon('camera');
    scanBtn.title = '使用相機掃描';
    scanBtn.setAttribute('aria-label', '使用相機掃描商品條碼');
    shell.appendChild(scanBtn);
  }
  const voiceBtn = create('button', 'apple-search-action');
  voiceBtn.type = 'button';
  voiceBtn.id = 'voice-search-btn';
  voiceBtn.innerHTML = icon('mic');
  voiceBtn.title = '語音搜尋';
  voiceBtn.setAttribute('aria-label', '使用語音搜尋商品');
  shell.appendChild(voiceBtn);
  if (searchBtn) {
    searchBtn.className = 'apple-search-action primary';
    searchBtn.innerHTML = icon('search');
    searchBtn.title = '查詢商品';
    searchBtn.setAttribute('aria-label', '查詢商品');
    shell.appendChild(searchBtn);
  }

  const resultArea = create('section', 'apple-result-area');
  resultArea.id = 'apple-result-area';
  const resultHead = create('div', 'apple-result-head', '<h2>商品結果</h2>');
  if (productCount) resultHead.appendChild(productCount);
  const resultCard = create('div', 'apple-result-card apple-glass');
  if (tableWrap) resultCard.appendChild(tableWrap);
  const subActions = create('div', 'apple-sub-actions');
  if (addBtn) subActions.appendChild(addBtn);
  resultCard.appendChild(subActions);
  resultArea.append(resultHead, resultCard);

  productPanel.classList.add('apple-visible-panel');
  productPanel.innerHTML = '';
  productPanel.append(stage, resultArea);
  const globalStatus = $('global-status');
  if (globalStatus) productPanel.appendChild(globalStatus);

  const updateResultsVisibility = () => {
    const value = productCount?.textContent || '';
    const untouched = !value || value.includes('尚未查詢') || value === '0 筆';
    resultArea.classList.toggle('visible', !untouched);
    if (value.includes('查詢中')) stage.setAttribute('aria-busy', 'true');
    else stage.removeAttribute('aria-busy');
  };
  if (productCount) new MutationObserver(updateResultsVisibility).observe(productCount, { childList: true, characterData: true, subtree: true });
  updateResultsVisibility();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.hidden = true;
  } else {
    let recognition = null;
    voiceBtn.addEventListener('click', () => {
      if (recognition) {
        recognition.stop();
        return;
      }
      recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW';
      recognition.interimResults = true;
      recognition.continuous = false;
      voiceBtn.classList.add('listening');
      voiceBtn.title = '正在聆聽，點擊停止';
      const originalPlaceholder = searchInput?.placeholder || '';
      if (searchInput) searchInput.placeholder = '正在聆聽…';
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join('').trim();
        if (searchInput && transcript) searchInput.value = transcript;
        const last = event.results[event.results.length - 1];
        if (last?.isFinal && transcript) {
          searchInput?.dispatchEvent(new Event('input', { bubbles: true }));
          setTimeout(() => searchBtn?.click(), 80);
        }
      };
      const finish = () => {
        recognition = null;
        voiceBtn.classList.remove('listening');
        voiceBtn.title = '語音搜尋';
        if (searchInput) searchInput.placeholder = originalPlaceholder;
      };
      recognition.onerror = finish;
      recognition.onend = finish;
      try { recognition.start(); } catch (_) { finish(); }
    });
  }

  const menuBackdrop = create('div', 'apple-menu-backdrop');
  menuBackdrop.id = 'apple-menu-backdrop';
  menuBackdrop.innerHTML = `
    <aside class="apple-menu" role="dialog" aria-modal="true" aria-label="功能選單">
      <div class="apple-menu-head"><strong>功能</strong><button class="apple-menu-close" id="apple-menu-close" type="button" aria-label="關閉選單">${icon('close')}</button></div>
      <div class="apple-menu-list" id="apple-menu-list"></div>
      <div class="apple-menu-meta" id="apple-menu-meta"></div>
    </aside>`;
  document.body.appendChild(menuBackdrop);
  const menuList = $('apple-menu-list');
  const menuMeta = $('apple-menu-meta');

  const tabMeta = {
    products: { label: '掃碼首頁', icon: 'scan' },
    sync: { label: '商品同步', icon: 'cloud' },
    labels: { label: '貨卡列印', icon: 'printer' },
    settings: { label: '系統設定', icon: 'settings' }
  };

  const showPanel = (key) => {
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.remove('apple-visible-panel', 'apple-secondary-panel');
    });
    const panel = $(`panel-${key}`);
    if (panel) {
      panel.classList.add('apple-visible-panel');
      if (key !== 'products') panel.classList.add('apple-secondary-panel');
      if (key !== 'products' && !panel.querySelector('.apple-panel-title')) {
        const title = create('div', 'apple-panel-title');
        title.innerHTML = `<h1>${tabMeta[key]?.label || '功能'}</h1><button type="button" class="apple-back-home">返回掃碼</button>`;
        panel.prepend(title);
        title.querySelector('button').addEventListener('click', () => showPanel('products'));
      }
    }
    menuList?.querySelectorAll('.apple-menu-item').forEach((item) => item.classList.toggle('active', item.dataset.key === key));
    menuBackdrop.classList.remove('open');
    if (key === 'products' && window.matchMedia('(pointer:fine)').matches) setTimeout(() => searchInput?.focus(), 150);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  Object.entries(tabMeta).forEach(([key, meta]) => {
    const button = create('button', `apple-menu-item${key === 'products' ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.key = key;
    button.innerHTML = `<span>${icon(meta.icon)}${meta.label}</span>${icon('arrow')}`;
    button.addEventListener('click', () => {
      const originalTab = originalTabs.querySelector(`[data-tab="${key}"]`);
      if (originalTab) originalTab.click();
      else showPanel(key);
    });
    menuList.appendChild(button);
  });
  if (addBtn) {
    const addMenu = create('button', 'apple-menu-item');
    addMenu.type = 'button';
    addMenu.innerHTML = `<span>${icon('plus')}新增商品</span>${icon('arrow')}`;
    addMenu.addEventListener('click', () => { menuBackdrop.classList.remove('open'); addBtn.click(); });
    menuList.appendChild(addMenu);
  }

  const userLabel = $('user-label');
  const projectLabel = $('project-label');
  const logoutBtn = $('logout-btn');
  const configWarning = $('config-warning');
  if (userLabel) menuMeta.appendChild(userLabel);
  if (projectLabel) menuMeta.appendChild(projectLabel);
  if (configWarning) menuMeta.appendChild(configWarning);
  if (logoutBtn) menuMeta.appendChild(logoutBtn);

  const openMenu = () => menuBackdrop.classList.add('open');
  const closeMenu = () => menuBackdrop.classList.remove('open');
  $('apple-menu-open')?.addEventListener('click', openMenu);
  $('apple-menu-close')?.addEventListener('click', closeMenu);
  menuBackdrop.addEventListener('click', (event) => { if (event.target === menuBackdrop) closeMenu(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  originalTabs.style.display = 'none';
  if (loginCard) loginCard.style.display = 'none';
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showPanel(tab.dataset.tab)));
  showPanel('products');
});
