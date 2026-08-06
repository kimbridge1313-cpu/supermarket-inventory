window.addEventListener('DOMContentLoaded', () => {
  const state = window.__KF_APP_STATE;
  if (!state) return;

  document.documentElement.classList.add('feie-price-card-active');
  const style = document.createElement('style');
  style.textContent = `
    .feie-price-card-active #label-preview{display:none!important}
    .feie-price-card-active #test-print-btn{display:none!important}
    .feie-content-note{margin:12px 0;padding:12px 14px;border-radius:14px;background:#f5f5f7;color:#606168;font-size:13px;line-height:1.55}
    .feie-modal[hidden]{display:none!important}
    .feie-modal{position:fixed;inset:0;z-index:30000;display:grid;place-items:center;padding:18px;background:rgba(15,18,24,.42);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .feie-dialog{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid rgba(17,24,39,.1);border-radius:26px;background:#fff;box-shadow:0 28px 90px rgba(0,0,0,.24);padding:22px;color:#1d1d1f}
    .feie-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
    .feie-dialog h2{margin:0;font-size:22px;line-height:1.25;letter-spacing:-.02em}
    .feie-close{flex:0 0 auto;width:34px;height:34px;padding:0!important;border-radius:50%!important;background:#f1f2f4!important;color:#3a3b40!important;font-size:20px!important;line-height:1!important}
    .feie-warning{margin:14px 0;padding:11px 13px;border-radius:13px;background:#f5f5f7;color:#686970;font-size:12px;line-height:1.5}
    .feie-summary{display:grid;grid-template-columns:110px minmax(0,1fr);gap:0;border:1px solid #e8e9ed;border-radius:16px;overflow:hidden}
    .feie-summary dt,.feie-summary dd{margin:0;padding:10px 12px;border-bottom:1px solid #eceef1;font-size:13px;line-height:1.45}
    .feie-summary dt{background:#f8f8fa;color:#77787e;font-weight:700}
    .feie-summary dd{color:#24252a;overflow-wrap:anywhere}
    .feie-summary dt:last-of-type,.feie-summary dd:last-of-type{border-bottom:0}
    .feie-markup{margin:14px 0 0}
    .feie-markup summary{cursor:pointer;color:#4e5057;font-size:13px;font-weight:700}
    .feie-markup pre{margin:10px 0 0;padding:13px;border-radius:14px;background:#16171a;color:#f4f4f5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5}
    .feie-status{margin-top:14px;min-height:20px;color:#606168;font-size:13px;line-height:1.45}
    .feie-status.error{color:#b42318}
    .feie-status.success{color:#08783e;font-weight:700}
    .feie-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
    .feie-actions button{min-height:44px;padding:0 18px!important;border-radius:14px!important}
    .feie-cancel{background:#eef0f3!important;color:#32343a!important}
    .feie-confirm{background:#0071e3!important;color:#fff!important}
    @media(max-width:560px){.feie-dialog{padding:18px;border-radius:22px}.feie-summary{grid-template-columns:88px minmax(0,1fr)}.feie-actions{display:grid;grid-template-columns:1fr 1fr}.feie-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  const note = document.createElement('div');
  note.className = 'feie-content-note';
  note.textContent = '實際字型、間距與條碼尺寸由飛鵝印表機控制；此畫面只確認列印內容、規格與順序。';
  const labelPreview = document.getElementById('label-preview');
  labelPreview?.insertAdjacentElement('afterend', note);
  const labelHeading = document.querySelector('#panel-labels .card h2');
  if (labelHeading) labelHeading.textContent = '貨卡內容確認';
  const selectedButton = document.getElementById('print-selected-btn');
  if (selectedButton) selectedButton.textContent = '確認選定商品';

  const modal = document.createElement('div');
  modal.className = 'feie-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <section class="feie-dialog" role="dialog" aria-modal="true" aria-labelledby="feie-dialog-title">
      <div class="feie-dialog-head">
        <div><h2 id="feie-dialog-title">貨卡內容確認</h2></div>
        <button type="button" class="feie-close" aria-label="關閉">×</button>
      </div>
      <div class="feie-warning">實際字型、間距與條碼尺寸由飛鵝印表機控制；此畫面只確認列印內容與順序。</div>
      <dl class="feie-summary"></dl>
      <details class="feie-markup"><summary>查看飛鵝 API 指令</summary><pre></pre></details>
      <div class="feie-status" role="status" aria-live="polite"></div>
      <div class="feie-actions">
        <button type="button" class="feie-cancel">取消</button>
        <button type="button" class="feie-confirm" disabled>確認列印</button>
      </div>
    </section>`;
  document.body.appendChild(modal);

  const summary = modal.querySelector('.feie-summary');
  const markupPre = modal.querySelector('.feie-markup pre');
  const status = modal.querySelector('.feie-status');
  const confirmButton = modal.querySelector('.feie-confirm');
  const closeButton = modal.querySelector('.feie-close');
  const cancelButton = modal.querySelector('.feie-cancel');
  let activeProduct = null;
  let activeSettings = null;
  let busy = false;
  let activeController = null;

  const setStatus = (message = '', type = '') => {
    status.textContent = message;
    status.className = `feie-status${type ? ` ${type}` : ''}`;
  };

  const closeModal = () => {
    if (busy) return;
    activeController?.abort();
    activeController = null;
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  closeButton.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  const currentSettings = () => ({
    storeName: state.settings?.storeName || '',
    showNameZh: state.settings?.showNameZh !== false,
    showNameVi: state.settings?.showNameVi !== false,
    showNameId: state.settings?.showNameId !== false,
    showBarcode: state.settings?.showBarcode !== false,
    showSpec: state.settings?.showSpec !== false,
  });

  const productPayload = (product) => ({
    barcode: product?.barcode || '',
    name: product?.name || '',
    labelName: product?.labelName || '',
    nameVi: product?.nameVi || product?.nameVietnamese || '',
    nameId: product?.nameId || product?.nameIndonesian || '',
    price: product?.price,
    spec: product?.spec || '',
  });

  const requestCard = async (action, product, settings) => {
    if (!state.user) throw new Error('請先登入後再操作貨卡');
    const token = await state.user.getIdToken(true);
    const controller = new AbortController();
    activeController = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/feie/print-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          sn: state.settings?.printerSn || undefined,
          product: productPayload(product),
          settings,
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || `貨卡 API 回應 ${response.status}`);
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('貨卡請求逾時，請稍後再試');
      throw error;
    } finally {
      clearTimeout(timer);
      if (activeController === controller) activeController = null;
    }
  };

  const renderSummary = (content) => {
    const rows = [
      ['門店', content.storeName || '未設定'],
      ['中文', content.nameZh || '不顯示'],
      ['越南文', content.nameVi || '不顯示'],
      ['印尼文', content.nameId || '不顯示'],
      ['規格', content.spec || '不顯示'],
      ['價格', `${content.price} 元`],
      ['條碼', content.barcode || '不顯示'],
      ['條碼格式', content.barcodeFormat || '無'],
      ['印表機', content.printerSn || '使用預設設定'],
      ['切紙', content.cut ? '是' : '否'],
      ['列印份數', String(content.times || 1)],
    ];
    summary.replaceChildren();
    rows.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      summary.append(dt, dd);
    });
  };

  const productForButton = (button) => {
    if (button.dataset.print) return state.products?.find((product) => product.docId === button.dataset.print) || null;
    if (button.dataset.queuePrint) {
      const item = state.queue?.find((entry) => entry.docId === button.dataset.queuePrint);
      return state.products?.find((product) => product.barcode === item?.barcode) || null;
    }
    return state.products?.find((product) => product.docId === state.selectedProductId) || state.products?.[0] || null;
  };

  const openConfirmation = async (product) => {
    activeProduct = product;
    activeSettings = currentSettings();
    summary.replaceChildren();
    markupPre.textContent = '';
    confirmButton.disabled = true;
    confirmButton.textContent = '確認列印';
    setStatus('正在產生貨卡內容…');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeButton.focus();
    try {
      const preview = await requestCard('preview', activeProduct, activeSettings);
      renderSummary(preview.content);
      markupPre.textContent = preview.markup || '';
      setStatus('內容確認完成。按下「確認列印」後才會送出。');
      confirmButton.disabled = false;
    } catch (error) {
      setStatus(error?.message || String(error), 'error');
    }
  };

  confirmButton.addEventListener('click', async () => {
    if (busy || !activeProduct || !activeSettings) return;
    busy = true;
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    closeButton.disabled = true;
    confirmButton.textContent = '列印中…';
    setStatus('正在送出飛鵝列印…');
    try {
      const result = await requestCard('print', activeProduct, activeSettings);
      setStatus(result.message || '貨卡已送出列印', 'success');
      confirmButton.textContent = '已送出';
    } catch (error) {
      setStatus(error?.message || String(error), 'error');
      confirmButton.textContent = '重新列印';
      confirmButton.disabled = false;
    } finally {
      busy = false;
      cancelButton.disabled = false;
      closeButton.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-print], #print-selected-btn, [data-queue-print], #test-print-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (button.id === 'test-print-btn') return;
    const product = productForButton(button);
    if (!product) return;
    state.selectedProductId = product.docId || state.selectedProductId;
    void openConfirmation(product);
  }, true);

  const updateButtons = () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll('[data-print]').forEach((button) => {
        button.textContent = '確認貨卡';
        button.setAttribute('aria-label', '確認此商品的飛鵝貨卡內容');
      });
    }));
  };
  const productsBody = document.getElementById('products-body');
  if (productsBody) new MutationObserver(updateButtons).observe(productsBody, { childList: true, subtree: true });
  updateButtons();
});
