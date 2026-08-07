const fs = require('node:fs');

const APPLE_VERSION = 'improve-20260807h';
const FEIE_VERSION = 'feie-price-card-20260807c';
const MODAL_VERSION = 'flow-20260807a';

function patchIndex() {
  const file = 'index.html';
  if (!fs.existsSync(file)) throw new Error('Missing index.html');
  let text = fs.readFileSync(file, 'utf8');

  const oldPrintPath = 'document.querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>{state.selectedProductId=b.dataset.print;renderProductSelect();switchTab("labels");renderPreview()})';
  const directPrintPath = 'document.querySelectorAll("[data-print]").forEach(b=>b.onclick=()=>{state.selectedProductId=b.dataset.print})';
  if (text.includes(oldPrintPath)) text = text.replace(oldPrintPath, directPrintPath);
  if (text.includes('b.dataset.print;renderProductSelect();switchTab("labels")')) {
    throw new Error('Legacy product-card print navigation is still present');
  }

  text = text
    .replace(/\/modal-ui-patch\.js\?v=[^"']+/g, `/modal-ui-patch.js?v=${MODAL_VERSION}`)
    .replace(/\/apple-ui-improve\.js\?v=[^"']+/g, `/apple-ui-improve.js?v=${APPLE_VERSION}`)
    .replace(/\/feie-price-card\.js\?v=[^"']+/g, `/feie-price-card.js?v=${FEIE_VERSION}`);

  fs.writeFileSync(file, text);
}

function patchAppleImprove() {
  const file = 'public/apple-ui-improve.js';
  if (!fs.existsSync(file)) throw new Error('Missing public/apple-ui-improve.js');
  let text = fs.readFileSync(file, 'utf8');

  const oldPreviewRoute = `    const previewButton = event.target?.closest?.('[data-print]');\n    if (previewButton) {\n      setTimeout(() => {\n        document.querySelector('.tabs .tab[data-tab="labels"]')?.click();\n        showToast('已開啟貨卡預覽，確認後即可送出列印。');\n      }, 0);\n      return;\n    }`;
  const neutralPreviewRoute = `    const previewButton = event.target?.closest?.('[data-print]');\n    if (previewButton) return;`;

  if (text.includes(oldPreviewRoute)) text = text.replace(oldPreviewRoute, neutralPreviewRoute);
  if (text.includes("showToast('已開啟貨卡預覽")) {
    throw new Error('Apple UI still redirects product print to preview');
  }

  fs.writeFileSync(file, text);
}

function patchModalFlow() {
  const file = 'public/modal-ui-patch.js';
  if (!fs.existsSync(file)) throw new Error('Missing public/modal-ui-patch.js');
  let text = fs.readFileSync(file, 'utf8');

  const styleAnchor = '    #add-product-modal-btn{margin-left:auto}';
  const successStyle = `    #add-product-modal-btn{margin-left:auto}\n    #product-save-success{position:fixed;inset:0;z-index:12000;display:none;place-items:center;padding:20px;background:rgba(15,18,24,.24);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}\n    #product-save-success.open{display:grid}\n    #product-save-success .save-success-box{min-width:180px;padding:22px 28px;border-radius:22px;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.98);box-shadow:0 24px 70px rgba(31,35,48,.18);text-align:center;color:#1d1d1f;font-size:18px;font-weight:800}`;
  if (text.includes(styleAnchor)) text = text.replace(styleAnchor, successStyle);

  const flowAnchor = `  const openModal = () => modal.classList.add('open');\n  const closeModal = () => modal.classList.remove('open');`;
  const flowHelpers = `  const openModal = () => modal.classList.add('open');\n  const closeModal = () => modal.classList.remove('open');\n\n  const successModal = document.createElement('div');\n  successModal.id = 'product-save-success';\n  successModal.innerHTML = '<div class="save-success-box" role="status" aria-live="assertive">儲存成功</div>';\n  document.body.appendChild(successModal);\n\n  let editReturnContext = null;\n  let saveInFlight = false;\n  let successHandled = false;\n\n  const restoreSearchResult = (context) => {\n    if (!context) return;\n    const input = $('search-input');\n    if (input) {\n      input.value = context.search || '';\n      if (context.search) input.dispatchEvent(new Event('input', { bubbles: true }));\n    }\n    const delay = context.search ? 650 : 120;\n    setTimeout(() => window.scrollTo({ top: context.scrollY || 0, behavior: 'auto' }), delay);\n  };\n\n  const finishSuccessfulSave = () => {\n    if (successHandled) return;\n    successHandled = true;\n    const waitUntilFinished = () => {\n      const saveBtn = $('save-product-btn');\n      if (saveBtn?.disabled) {\n        setTimeout(waitUntilFinished, 60);\n        return;\n      }\n      const context = editReturnContext;\n      closeModal();\n      successModal.classList.add('open');\n      setTimeout(() => {\n        successModal.classList.remove('open');\n        restoreSearchResult(context);\n        editReturnContext = null;\n        saveInFlight = false;\n        successHandled = false;\n      }, 700);\n    };\n    waitUntilFinished();\n  };`;
  if (!text.includes(flowAnchor)) throw new Error('Unable to locate product modal open/close flow');
  text = text.replace(flowAnchor, flowHelpers);

  const oldEditListener = `  document.addEventListener('click', (event) => {\n    if (event.target?.matches?.('[data-edit]')) {\n      setTimeout(openModal, 0);\n    }\n  }, true);`;
  const newEditListener = `  document.addEventListener('click', (event) => {\n    if (event.target?.matches?.('[data-edit]')) {\n      editReturnContext = {\n        search: $('search-input')?.value || '',\n        scrollY: window.scrollY,\n      };\n      setTimeout(openModal, 0);\n    }\n  }, true);`;
  if (!text.includes(oldEditListener)) throw new Error('Unable to locate edit modal listener');
  text = text.replace(oldEditListener, newEditListener);

  const oldSaveFlow = `  const saveBtn = $('save-product-btn');\n  if (saveBtn) {\n    saveBtn.addEventListener('click', () => {\n      setTimeout(() => {\n        if (!saveBtn.disabled && !$('form-status')?.classList.contains('error')) closeModal();\n      }, 900);\n    });\n  }`;
  const newSaveFlow = `  const saveBtn = $('save-product-btn');\n  const formStatus = $('form-status');\n  if (saveBtn && formStatus) {\n    saveBtn.addEventListener('click', () => {\n      saveInFlight = true;\n      successHandled = false;\n    }, true);\n\n    const inspectSaveStatus = () => {\n      if (!saveInFlight || successHandled) return;\n      const message = formStatus.textContent?.trim() || '';\n      if (message === '修改成功' || message === '商品已新增') finishSuccessfulSave();\n      if (formStatus.classList.contains('error') || message.startsWith('儲存失敗')) {\n        saveInFlight = false;\n        successHandled = false;\n      }\n    };\n    new MutationObserver(inspectSaveStatus).observe(formStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });\n  }`;
  if (!text.includes(oldSaveFlow)) throw new Error('Unable to locate legacy timeout save flow');
  text = text.replace(oldSaveFlow, newSaveFlow);

  if (text.includes('}, 900);')) throw new Error('Legacy 900ms save-close timeout is still present');
  fs.writeFileSync(file, text);
}

function patchFeieDirectPrint() {
  const file = 'public/feie-price-card.js';
  if (!fs.existsSync(file)) throw new Error('Missing public/feie-price-card.js');
  let text = fs.readFileSync(file, 'utf8');

  text = text.replace(
    '    .feie-confirm{background:#0071e3!important;color:#fff!important}',
    '    .feie-confirm{background:#0071e3!important;color:#fff!important}\\n    .feie-direct-toast{position:fixed;left:50%;bottom:24px;z-index:31000;max-width:min(420px,calc(100vw - 28px));transform:translate(-50%,16px);opacity:0;pointer-events:none;padding:12px 16px;border-radius:16px;background:rgba(28,28,30,.92);color:#fff;box-shadow:0 18px 54px rgba(0,0,0,.22);font-size:14px;font-weight:700;text-align:center;transition:.2s ease}\\n    .feie-direct-toast.visible{opacity:1;transform:translate(-50%,0)}\\n    .feie-direct-toast.error{background:rgba(145,28,28,.94)}'
  );

  const modalAppend = `  document.body.appendChild(modal);`;
  const toastAppend = `  document.body.appendChild(modal);\n\n  const directToast = document.createElement('div');\n  directToast.className = 'feie-direct-toast';\n  directToast.setAttribute('role', 'status');\n  directToast.setAttribute('aria-live', 'polite');\n  document.body.appendChild(directToast);\n  let directToastTimer = null;\n  const showDirectToast = (message, type = '') => {\n    clearTimeout(directToastTimer);\n    directToast.textContent = message;\n    directToast.className = 'feie-direct-toast' + (type ? ' ' + type : '');\n    requestAnimationFrame(() => directToast.classList.add('visible'));\n    directToastTimer = setTimeout(() => directToast.classList.remove('visible'), type === 'error' ? 5200 : 2800);\n  };`;
  if (!text.includes(modalAppend)) throw new Error('Unable to locate Feie modal append');
  text = text.replace(modalAppend, toastAppend);

  const listenerStart = text.indexOf("  document.addEventListener('click', (event) => {\n    const button = event.target?.closest?.('[data-print], #print-selected-btn, [data-queue-print], #test-print-btn');");
  const listenerEnd = text.indexOf("\n\n  const updateButtons = () => {", listenerStart);
  if (listenerStart < 0 || listenerEnd < 0) throw new Error('Unable to locate Feie product click listener');

  const directListener = `  const directPrintProduct = async (button, product) => {\n    if (!product || button.dataset.feiePrinting === 'true') return;\n    button.dataset.feiePrinting = 'true';\n    button.disabled = true;\n    button.textContent = '列印中…';\n    showDirectToast('正在送出貨卡…');\n    try {\n      state.selectedProductId = product.docId || state.selectedProductId;\n      const result = await requestCard('print', product, currentSettings());\n      showDirectToast(result.message || '貨卡已送出列印');\n    } catch (error) {\n      showDirectToast(error?.message || String(error), 'error');\n    } finally {\n      delete button.dataset.feiePrinting;\n      button.disabled = false;\n      button.textContent = '列印貨卡';\n    }\n  };\n\n  document.addEventListener('click', (event) => {\n    const button = event.target?.closest?.('[data-print], #print-selected-btn, [data-queue-print], #test-print-btn');\n    if (!button) return;\n    event.preventDefault();\n    event.stopPropagation();\n    event.stopImmediatePropagation();\n    if (button.id === 'test-print-btn') return;\n    const product = productForButton(button);\n    if (!product) return;\n\n    if (button.matches('[data-print]')) {\n      void directPrintProduct(button, product);\n      return;\n    }\n\n    state.selectedProductId = product.docId || state.selectedProductId;\n    void openConfirmation(product);\n  }, true);`;
  text = text.slice(0, listenerStart) + directListener + text.slice(listenerEnd);

  text = text
    .replace(/button\.textContent = '確認貨卡';/g, "button.textContent = '列印貨卡';")
    .replace(/button\.textContent !== '確認貨卡'/g, "button.textContent !== '列印貨卡'")
    .replace(/'確認此商品的飛鵝貨卡內容'/g, "'直接列印此商品的飛鵝貨卡'");

  if (text.includes("button.textContent = '確認貨卡'")) throw new Error('Old Feie product button label remains');
  if (!text.includes("requestCard('print', product, currentSettings())")) throw new Error('Direct Feie print call was not applied');

  fs.writeFileSync(file, text);
}

patchIndex();
patchAppleImprove();
patchModalFlow();
patchFeieDirectPrint();
console.log('product action flow patch applied');
