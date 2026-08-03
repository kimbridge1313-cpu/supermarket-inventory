window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.id = 'apple-inventory-improve-style';
  style.textContent = `
    .apple-print-toast{position:fixed;left:50%;bottom:24px;z-index:25000;max-width:min(420px,calc(100vw - 28px));transform:translate(-50%,18px);opacity:0;pointer-events:none;padding:12px 16px;border-radius:16px;background:rgba(28,28,30,.9);color:#fff;border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 54px rgba(0,0,0,.22);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);font-size:14px;font-weight:650;line-height:1.45;text-align:center;transition:.22s ease}
    .apple-print-toast.visible{opacity:1;transform:translate(-50%,0)}
    .apple-print-toast.error{background:rgba(145,28,28,.92)}
    .apple-result-card [data-print]{white-space:nowrap}

    @media(max-width:820px){
      .apple-result-area{margin-top:20px!important}
      .apple-result-card{padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      .apple-result-card tbody{display:grid!important;gap:14px!important}
      .apple-result-card tr{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-areas:'name' 'price' 'meta' 'lang' 'actions'!important;row-gap:0!important;align-items:start!important;padding:20px!important;border:1px solid rgba(17,24,39,.07)!important;border-radius:24px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 12px 34px rgba(31,35,48,.07)!important;transform:none!important}
      .apple-result-card td{display:block!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;text-align:left!important;white-space:normal!important;overflow-wrap:normal!important;word-break:normal!important}
      #panel-products .apple-result-card td::before{display:none!important;content:none!important}

      .apple-result-card td:nth-child(2){grid-area:name!important;width:100%!important}
      .apple-result-card td:nth-child(2) strong{display:-webkit-box!important;width:100%!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;font-size:20px!important;font-weight:800!important;line-height:1.28!important;letter-spacing:-.025em!important;color:#1d1d1f!important;word-break:normal!important;overflow-wrap:anywhere!important}
      .apple-result-card td:nth-child(2) br{display:none!important}
      .apple-result-card td:nth-child(2) .muted{display:none!important}

      .apple-result-card td:nth-child(4){grid-area:price!important;margin-top:8px!important;font-size:29px!important;font-weight:850!important;line-height:1!important;letter-spacing:-.04em!important;color:#111!important;white-space:nowrap!important;text-align:left!important}

      .apple-result-card td:nth-child(1){grid-area:meta!important;margin-top:14px!important;padding-top:12px!important;border-top:1px solid rgba(17,24,39,.07)!important;color:#6f7076!important;font-size:12px!important;line-height:1.4!important;letter-spacing:.02em!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .apple-result-card td:nth-child(1)::before{display:inline!important;content:'條碼  '!important;color:#8f9096!important;font-weight:700!important}

      .apple-result-card td:nth-child(5){grid-area:meta!important;justify-self:end!important;margin-top:14px!important;padding-top:12px!important;color:#6f7076!important;font-size:12px!important;line-height:1.4!important;white-space:nowrap!important;max-width:45%!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:right!important}
      .apple-result-card td:nth-child(5)::before{display:inline!important;content:'規格  '!important;color:#8f9096!important;font-weight:700!important}

      .apple-result-card td:nth-child(3){grid-area:lang!important;margin-top:13px!important;padding:0!important;background:transparent!important;color:#686970!important;font-size:13px!important;line-height:1.45!important}
      .apple-result-card td:nth-child(3) br{display:none!important}
      .apple-result-card td:nth-child(3) .muted{display:block!important;padding:10px 12px!important;border-radius:12px!important;background:#f6f7f9!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .apple-result-card td:nth-child(3) .muted + .muted{margin-top:7px!important}

      .apple-result-card td.row{grid-area:actions!important;display:grid!important;grid-template-columns:92px minmax(0,1fr)!important;gap:10px!important;margin-top:14px!important}
      .apple-result-card td.row button{width:100%!important;min-width:0!important;min-height:46px!important;margin:0!important;padding:0 14px!important;border-radius:15px!important;font-size:14px!important;font-weight:750!important;white-space:nowrap!important;box-shadow:none!important}
      .apple-result-card td.row [data-edit]{background:#eef4ff!important;color:#0866c6!important}
      .apple-result-card td.row [data-print]{background:#0071e3!important;color:#fff!important;box-shadow:0 8px 20px rgba(0,113,227,.18)!important}
    }

    @media(max-width:390px){
      .apple-result-card tr{padding:18px!important;border-radius:22px!important}
      .apple-result-card td:nth-child(2) strong{font-size:18px!important}
      .apple-result-card td:nth-child(4){font-size:27px!important}
      .apple-result-card td.row{grid-template-columns:82px minmax(0,1fr)!important}
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
      if (button.getAttribute('aria-label') !== '開啟此商品的貨卡預覽與列印') button.setAttribute('aria-label', '開啟此商品的貨卡預覽與列印');
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
      if (mutations.some((mutation) => mutation.addedNodes.length > 0)) scheduleEnhance();
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
    new MutationObserver(relayPrintStatus).observe(globalStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
});
