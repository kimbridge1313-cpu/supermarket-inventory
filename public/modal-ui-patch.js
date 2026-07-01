window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel-products');
  const formCard = $('form-title')?.closest('.card');
  const listCard = $('products-body')?.closest('.card');
  if (!panel || !formCard || !listCard) return;

  const style = document.createElement('style');
  style.textContent = `
    #panel-products{grid-template-columns:1fr!important}
    #product-search-row{display:flex;gap:8px;align-items:center;margin-top:8px}
    #product-search-row input{flex:1;min-width:0}
    #scan-product-barcode-btn{white-space:nowrap}
    #panel-products table td.row{display:table-cell!important;white-space:nowrap;vertical-align:middle}
    #panel-products table td.row button{margin-right:6px;margin-bottom:0;padding:8px 10px;display:inline-flex;align-items:center;justify-content:center}
    #panel-products table td.row button:last-child{margin-right:0}
    #panel-products table th:last-child,#panel-products table td:last-child{width:132px;text-align:left}
    #product-form-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:none;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}
    #product-form-modal.open{display:flex}
    #product-form-modal .card{width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto}
    .modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .modal-close{background:#f2f4f7;color:#344054}
    #add-product-modal-btn{margin-left:auto}
    #barcode-scan-modal{position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:10000;display:none;align-items:center;justify-content:center;padding:16px}
    #barcode-scan-modal.open{display:flex}
    .scan-box{background:#fff;border-radius:18px;width:min(520px,100%);padding:14px;box-shadow:0 20px 60px rgba(0,0,0,.24)}
    .scan-box video{width:100%;border-radius:12px;background:#111;max-height:58vh;object-fit:cover}
    .scan-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
    @media(max-width:720px){
      header h1{font-size:18px} header p{font-size:12px}
      main{padding:10px;gap:10px}.card{border-radius:14px;padding:12px}
      .tabs{gap:6px}.tab,button{padding:9px 10px;border-radius:10px;font-size:13px}
      #panel-products .card>.row:first-child{align-items:flex-start}
      #add-product-modal-btn{width:100%;margin-left:0;margin-top:8px}
      #product-search-row{flex-direction:column;align-items:stretch}
      #scan-product-barcode-btn{width:100%}
      .table-wrap{border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch}
      #panel-products table{min-width:760px}
      #product-form-modal{padding:8px;align-items:flex-start}
      #product-form-modal .card{width:100%;max-height:calc(100vh - 16px);border-radius:14px}
      .modal-head{position:sticky;top:0;background:#fff;z-index:1;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
      .form-grid{grid-template-columns:1fr!important}
      #product-form-modal .row button{flex:1 1 calc(50% - 6px)}
      #delete-product-btn{flex-basis:100%!important}
    }
  `;
  document.head.appendChild(style);

  const searchInput = $('search-input');
  if (searchInput && !document.getElementById('product-search-row')) {
    const searchRow = document.createElement('div');
    searchRow.id = 'product-search-row';
    searchInput.parentNode.insertBefore(searchRow, searchInput);
    searchRow.appendChild(searchInput);
    const scanBtn = document.createElement('button');
    scanBtn.id = 'scan-product-barcode-btn';
    scanBtn.type = 'button';
    scanBtn.className = 'secondary';
    scanBtn.textContent = '掃條碼';
    searchRow.appendChild(scanBtn);

    const scanModal = document.createElement('div');
    scanModal.id = 'barcode-scan-modal';
    scanModal.innerHTML = '<div class="scan-box"><div class="scan-head"><strong>掃描商品條碼</strong><button type="button" id="close-scan-btn" class="modal-close">關閉</button></div><video id="barcode-scan-video" playsinline muted></video><p class="muted">將條碼置於畫面中央，辨識後會自動帶入搜尋。</p></div>';
    document.body.appendChild(scanModal);

    let stream = null;
    let scanTimer = null;
    const stopScan = () => {
      scanModal.classList.remove('open');
      if (scanTimer) clearInterval(scanTimer);
      scanTimer = null;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const applyBarcode = (code) => {
      if (!code) return;
      searchInput.value = code;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      stopScan();
    };
    document.getElementById('close-scan-btn').addEventListener('click', stopScan);
    scanModal.addEventListener('click', (event) => { if (event.target === scanModal) stopScan(); });
    scanBtn.addEventListener('click', async () => {
      if (!('BarcodeDetector' in window)) {
        const code = prompt('此瀏覽器不支援相機條碼辨識，請手動輸入或用外接掃碼器掃入條碼');
        if (code) applyBarcode(code.trim());
        return;
      }
      try {
        const detector = new BarcodeDetector({ formats: ['code_128','ean_13','ean_8','upc_a','upc_e','code_39','itf'] });
        const video = document.getElementById('barcode-scan-video');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        video.srcObject = stream;
        await video.play();
        scanModal.classList.add('open');
        scanTimer = setInterval(async () => {
          try {
            const codes = await detector.detect(video);
            if (codes && codes[0]?.rawValue) applyBarcode(codes[0].rawValue);
          } catch (_) {}
        }, 450);
      } catch (error) {
        stopScan();
        alert('無法開啟相機，請確認瀏覽器權限後再試。');
      }
    });
  }

  const addBtn = document.createElement('button');
  addBtn.id = 'add-product-modal-btn';
  addBtn.className = 'primary';
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
