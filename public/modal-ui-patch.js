window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel-products');
  const formCard = $('form-title')?.closest('.card');
  const listCard = $('products-body')?.closest('.card');
  if (!panel || !formCard || !listCard) return;

  const style = document.createElement('style');
  style.textContent = `
    #panel-products{grid-template-columns:1fr!important}
    #auth-card{position:fixed;top:12px;right:12px;z-index:12000;width:auto!important;min-width:0;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
    #auth-card h2,#auth-card #project-label{display:none!important}
    #auth-card #config-warning:not(.hidden){position:fixed;left:12px;right:12px;top:64px;z-index:12001}
    #auth-compact{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.94);border:1px solid rgba(229,231,235,.9);border-radius:999px;padding:5px 6px;box-shadow:0 8px 24px rgba(16,24,40,.12);backdrop-filter:blur(10px)}
    #auth-avatar{width:32px;height:32px;border-radius:999px;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:900;font-size:13px;letter-spacing:.02em;flex:0 0 auto}
    #auth-compact #user-label{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#475467}
    #auth-compact button{padding:7px 10px;border-radius:999px;font-size:12px}
    #product-search-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;margin-top:8px}
    #product-search-row input{min-width:0}
    #scan-product-barcode-btn{white-space:nowrap;background:var(--accent)!important;color:#fff!important}
    #voice-product-search-btn{white-space:nowrap}
    #panel-products table td.row{display:table-cell!important;white-space:nowrap;vertical-align:middle}
    #panel-products table td.row button{margin-right:6px;margin-bottom:0;padding:8px 10px;display:inline-flex;align-items:center;justify-content:center}
    #panel-products table td.row button:last-child{margin-right:0}
    #panel-products table th:last-child,#panel-products table td:last-child{width:132px;text-align:left}
    #product-form-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:none;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}
    #product-form-modal.open{display:flex}
    #product-form-modal .card{width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto}
    .modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .modal-close{background:#f2f4f7;color:#344054}
    #add-product-modal-btn{margin-left:auto;background:#fff!important;color:var(--accent)!important;border:1px solid var(--line)!important}
    @media(max-width:720px){
      body{padding-top:52px}
      header{padding:14px 12px 12px 12px} header h1{font-size:18px;line-height:1.25;max-width:100%} header p{font-size:12px;line-height:1.35;max-width:100%}
      #auth-card{top:8px;right:8px}#auth-compact{padding:3px;background:rgba(255,255,255,.98)}#auth-avatar{width:32px;height:32px;font-size:12px}#auth-compact #user-label{display:none}#auth-compact button{padding:0;width:32px;height:32px;border-radius:999px;font-size:0;overflow:hidden;position:relative}
      #auth-compact #login-btn::after{content:'入';font-size:12px}#auth-compact #logout-btn::after{content:'出';font-size:12px}
      main{padding:10px;gap:10px}.card{border-radius:14px;padding:12px}
      .tabs{gap:6px}.tab,button{padding:9px 10px;border-radius:10px;font-size:13px}
      #panel-products .card>.row:first-child{align-items:center;gap:8px}
      #panel-products .card>.row:first-child h2{font-size:18px;margin:0}
      #add-product-modal-btn{width:auto;margin-left:0;margin-top:0;padding:7px 10px;font-size:12px;order:3}
      #product-search-row{grid-template-columns:1fr 1fr;align-items:stretch}
      #product-search-row input{grid-column:1/-1;font-size:16px}
      #scan-product-barcode-btn{width:100%;font-size:16px;padding:13px 14px;box-shadow:0 8px 18px rgba(49,92,72,.18)}
      #voice-product-search-btn{width:100%;font-size:15px;padding:13px 14px;background:#eef4ef;color:var(--accent)}
      #panel-products .table-wrap{border:0;overflow:visible;border-radius:0}
      #panel-products table{width:100%;min-width:0!important;border-collapse:separate;border-spacing:0 10px}
      #panel-products thead{display:none}
      #panel-products tbody{display:block;width:100%}
      #panel-products tr{display:grid;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:13px;margin-bottom:10px;box-shadow:0 4px 14px rgba(16,24,40,.04);gap:10px}
      #panel-products td{display:grid!important;grid-template-columns:58px minmax(0,1fr);gap:8px;width:100%!important;border-bottom:0!important;padding:0;font-size:14px;white-space:normal!important;align-items:start}
      #panel-products td::before{font-size:12px;font-weight:700;color:#667085;line-height:1.65}
      #panel-products td:nth-child(1){order:2;color:#475467;font-size:13px}
      #panel-products td:nth-child(1)::before{content:'條碼'}
      #panel-products td:nth-child(2){order:1;display:block!important;font-size:15px;line-height:1.45}
      #panel-products td:nth-child(2)::before{content:'';display:none}
      #panel-products td:nth-child(2) strong{display:none}
      #panel-products td:nth-child(2) br:first-of-type{display:none}
      #panel-products td:nth-child(2) .muted:first-of-type{display:block!important;color:#101828!important;font-size:16px;font-weight:800;line-height:1.45}
      #panel-products td:nth-child(2) .muted:first-of-type::before{content:''!important}
      #panel-products td:nth-child(2) .muted:last-of-type{display:none!important}
      #panel-products td:nth-child(3),#panel-products td:nth-child(5){display:none!important}
      #panel-products td:nth-child(4){order:3;font-size:18px;font-weight:900;color:var(--accent)}
      #panel-products td:nth-child(4)::before{content:'售價'}
      #panel-products td:nth-child(6){order:4;display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px;width:100%!important;padding-top:6px}
      #panel-products td:nth-child(6)::before{display:none!important;content:''!important}
      #panel-products table td.row{white-space:normal!important;vertical-align:top}
      #panel-products table td.row button{margin:0;padding:12px 14px;display:flex;width:100%;justify-content:center;font-size:15px;border-radius:12px}
      #product-form-modal{padding:8px;align-items:flex-start}
      #product-form-modal .card{width:100%;max-height:calc(100vh - 16px);border-radius:14px}
      .modal-head{position:sticky;top:0;background:#fff;z-index:1;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
      .form-grid{grid-template-columns:1fr!important}
      #product-form-modal .row button{flex:1 1 calc(50% - 6px)}
      #delete-product-btn{flex-basis:100%!important}
    }
  `;
  document.head.appendChild(style);

  const authCard = $('project-label')?.closest('.card');
  if (authCard && !document.getElementById('auth-compact')) {
    authCard.id = 'auth-card';
    const authRow = authCard.querySelector('.row');
    const compact = document.createElement('div');
    compact.id = 'auth-compact';
    const avatar = document.createElement('div');
    avatar.id = 'auth-avatar';
    avatar.textContent = '未';
    compact.appendChild(avatar);
    if (authRow) {
      compact.appendChild($('user-label'));
      compact.appendChild($('login-btn'));
      compact.appendChild($('logout-btn'));
      authRow.replaceWith(compact);
    }
    const updateAvatar = () => {
      const label = $('user-label')?.textContent || '';
      avatar.textContent = label && label !== '尚未登入' ? label.trim().slice(0,1).toUpperCase() : '未';
    };
    updateAvatar();
    new MutationObserver(updateAvatar).observe($('user-label'), { childList: true, characterData: true, subtree: true });
  }

  const cleanMobileFullLabel = () => {
    if (window.innerWidth > 720) return;
    document.querySelectorAll('#panel-products td:nth-child(2) .muted:first-of-type').forEach((el) => {
      el.textContent = el.textContent.replace(/^完整：/, '');
    });
  };
  const productsBody = $('products-body');
  if (productsBody) new MutationObserver(cleanMobileFullLabel).observe(productsBody, { childList: true, subtree: true });
  cleanMobileFullLabel();

  const searchInput = $('search-input');
  if (searchInput && !document.getElementById('product-search-row')) {
    const searchRow = document.createElement('div');
    searchRow.id = 'product-search-row';
    searchInput.parentNode.insertBefore(searchRow, searchInput);
    searchRow.appendChild(searchInput);
    const scanBtn = document.createElement('button');
    scanBtn.id = 'scan-product-barcode-btn';
    scanBtn.type = 'button';
    scanBtn.className = 'primary';
    scanBtn.textContent = '掃條碼';
    searchRow.appendChild(scanBtn);
    const voiceBtn = document.createElement('button');
    voiceBtn.id = 'voice-product-search-btn';
    voiceBtn.type = 'button';
    voiceBtn.className = 'secondary';
    voiceBtn.textContent = '語音輸入';
    searchRow.appendChild(voiceBtn);

    voiceBtn.addEventListener('click', () => {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        const text = prompt('此瀏覽器不支援語音輸入，請手動輸入商品名稱或條碼。');
        if (text) {
          searchInput.value = text.trim();
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
      }
      const recognition = new Recognition();
      recognition.lang = 'zh-TW';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      voiceBtn.disabled = true;
      voiceBtn.textContent = '聆聽中...';
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript || '';
        if (text) {
          searchInput.value = text.trim().replace(/\s+/g, ' ');
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      recognition.onerror = () => {
        const text = prompt('語音辨識失敗，請手動輸入商品名稱或條碼。');
        if (text) {
          searchInput.value = text.trim();
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      recognition.onend = () => {
        voiceBtn.disabled = false;
        voiceBtn.textContent = '語音輸入';
      };
      recognition.start();
    });
  }

  const addBtn = document.createElement('button');
  addBtn.id = 'add-product-modal-btn';
  addBtn.className = 'secondary';
  addBtn.textContent = '新增商品';
  listCard.querySelector('.row')?.appendChild(addBtn);

  const modal = document.createElement('div');
  modal.id = 'product-form-modal';
  modal.innerHTML = '<div id="product-form-host"></div>';
  document.body.appendChild(modal);
  $('product-form-host').appendChild(formCard);

  const head = document.createElement('div');
  head.className = 'modal-head';
  head.innerHTML = '<strong>商品資料</strong><button type="button" class="modal-close">關閉</button>';
  formCard.prepend(head);

  const openModal = () => modal.classList.add('open');
  const closeModal = () => modal.classList.remove('open');

  head.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

  addBtn.addEventListener('click', () => {
    $('clear-form-btn')?.click();
    openModal();
  });

  document.addEventListener('click', (event) => {
    if (event.target?.matches?.('[data-edit]')) {
      setTimeout(openModal, 0);
    }
  }, true);

  const saveBtn = $('save-product-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (!saveBtn.disabled && !$('form-status')?.classList.contains('error')) closeModal();
      }, 900);
    });
  }
});
