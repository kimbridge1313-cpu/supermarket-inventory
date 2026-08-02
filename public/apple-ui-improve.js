window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.id = 'apple-inventory-improve-style';
  style.textContent = `
    .apple-print-toast{
      position:fixed;left:50%;bottom:24px;z-index:25000;max-width:min(420px,calc(100vw - 28px));
      transform:translate(-50%,18px);opacity:0;pointer-events:none;
      padding:12px 16px;border-radius:16px;background:rgba(28,28,30,.9);color:#fff;
      border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 54px rgba(0,0,0,.22);
      backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);
      font-size:14px;font-weight:650;line-height:1.45;text-align:center;transition:.22s ease
    }
    .apple-print-toast.visible{opacity:1;transform:translate(-50%,0)}
    .apple-print-toast.error{background:rgba(145,28,28,.92)}
    .apple-result-card [data-print]{white-space:nowrap}
    @media(max-width:820px){
      .apple-result-card tbody{gap:12px!important}
      .apple-result-card tr{
        display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-auto-flow:row!important;
        gap:0!important;padding:18px!important;border-radius:22px!important;align-items:stretch!important
      }
      .apple-result-card td{
        grid-column:1!important;width:100%!important;min-width:0!important;max-width:100%!important;
        white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;
        text-align:left!important
      }
      #panel-products .apple-result-card td::before{display:none!important;content:none!important}
      .apple-result-card td:nth-child(2){
        grid-row:1!important;font-size:17px!important;line-height:1.45!important;margin:0 0 9px!important
      }
      .apple-result-card td:nth-child(2) strong{display:block;font-size:17px;line-height:1.45;letter-spacing:-.015em}
      .apple-result-card td:nth-child(2) .muted{display:inline-block;margin-top:4px;font-size:12px;line-height:1.45}
      .apple-result-card td:nth-child(4){
        grid-row:2!important;font-size:28px!important;line-height:1.1!important;font-weight:780!important;
        margin:0 0 14px!important;color:#1d1d1f!important
      }
      .apple-result-card td:nth-child(1){
        grid-row:3!important;padding:11px 0 0!important;border-top:1px solid rgba(17,24,39,.07)!important;
        color:#6e6e73!important;font-size:12px!important;letter-spacing:.02em
      }
      .apple-result-card td:nth-child(1)::before{
        display:inline-block!important;content:'條碼'!important;margin-right:8px;padding:3px 7px;border-radius:999px;
        background:#f0f2f5;color:#77787d;font-size:10px;font-weight:700;letter-spacing:.04em
      }
      .apple-result-card td:nth-child(5){
        grid-row:4!important;margin-top:9px!important;color:#6e6e73!important;font-size:12px!important;line-height:1.5!important
      }
      .apple-result-card td:nth-child(5)::before{
        display:inline-block!important;content:'規格'!important;margin-right:8px;color:#8b8b90;font-size:11px;font-weight:700
      }
      .apple-result-card td:nth-child(3){
        grid-row:5!important;margin-top:9px!important;padding:10px 12px!important;border-radius:14px!important;
        background:rgba(245,246,248,.82)!important;color:#6e6e73!important;font-size:12px!important;line-height:1.55!important
      }
      .apple-result-card td:nth-child(3)::before{
        display:block!important;content:'多語名稱'!important;margin-bottom:4px;color:#8b8b90;font-size:10px;font-weight:750;letter-spacing:.05em
      }
      .apple-result-card td.row{
        grid-row:6!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:9px!important;margin-top:14px!important;white-space:normal!important
      }
      .apple-result-card td.row button{
        width:100%!important;min-width:0!important;min-height:44px!important;margin:0!important;padding:10px 12px!important;
        border-radius:14px!important;font-size:13px!important;white-space:nowrap!important
      }
      .apple-result-card td.row [data-print]{background:#0071e3!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,113,227,.2)!important}
    }
    @media(max-width:390px){
      .apple-result-card tr{padding:16px!important}
      .apple-result-card td:nth-child(4){font-size:25px!important}
      .apple-result-card td.row{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.className = 'apple-print-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);

  let toastTimer = null;
  let printFeedbackUntil = 0;
  const showToast = (message, isError = false, duration = 3600) => {
    if (!message) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), duration);
  };

  const enhanceResultButtons = () => {
    document.querySelectorAll('[data-print]').forEach((button) => {
      if (button.textContent !== '預覽列印') button.textContent = '預覽列印';
      if (button.getAttribute('aria-label') !== '開啟此商品的貨卡預覽與列印') {
        button.setAttribute('aria-label', '開啟此商品的貨卡預覽與列印');
      }
    });
  };

  const productsBody = document.getElementById('products-body');
  if (productsBody) {
    let enhanceScheduled = false;
    const scheduleEnhance = () => {
      if (enhanceScheduled) return;
      enhanceScheduled = true;
      requestAnimationFrame(() => {
        enhanceScheduled = false;
        enhanceResultButtons();
      });
    };
    new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((mutation) => mutation.addedNodes.length > 0);
      if (hasAddedNodes) scheduleEnhance();
    }).observe(productsBody, { childList: true, subtree: true });
    enhanceResultButtons();
  }

  document.addEventListener('click', (event) => {
    const previewButton = event.target?.closest?.('[data-print]');
    if (previewButton) {
      setTimeout(() => {
        document.querySelector('.tabs .tab[data-tab="labels"]')?.click();
        showToast('已開啟貨卡預覽，確認後即可送出列印。');
      }, 0);
      return;
    }

    const actualPrintButton = event.target?.closest?.('#print-selected-btn, #test-print-btn, [data-queue-print]');
    if (actualPrintButton) {
      printFeedbackUntil = Date.now() + 20000;
      showToast('正在送出列印…', false, 20000);
    }
  }, true);

  const globalStatus = document.getElementById('global-status');
  if (globalStatus) {
    const relayPrintStatus = () => {
      if (Date.now() > printFeedbackUntil) return;
      const message = globalStatus.textContent?.trim() || '';
      if (!message || !message.includes('列印')) return;
      const isError = globalStatus.classList.contains('error') || message.includes('失敗');
      showToast(message, isError, isError ? 6500 : 3800);
      if (!message.includes('正在')) printFeedbackUntil = 0;
    };
    new MutationObserver(relayPrintStatus).observe(globalStatus, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
});
