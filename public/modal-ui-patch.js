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
    .scan-box video,#html5-qrcode-reader video{width:100%;border-radius:12px;background:#111;max-height:58vh;object-fit:cover}
    #html5-qrcode-reader{width:100%}
    #html5-qrcode-reader__scan_region{border-radius:12px;overflow:hidden}
    .scan-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}
    @media(max-width:720px){
      header h1{font-size:18px} header p{font-size:12px}
      main{padding:10px;gap:10px}.card{border-radius:14px;padding:12px}
      .tabs{gap:6px}.tab,button{padding:9px 10px;border-radius:10px;font-size:13px}
      #panel-products .card>.row:first-child{align-items:flex-start}
      #add-product-modal-btn{width:100%;margin-left:0;margin-top:8px}
      #product-search-row{flex-direction:column;align-items:stretch}
      #scan-product-barcode-btn{width:100%}
      #panel-products .table-wrap{border:0;overflow:visible;border-radius:0}
      #panel-products table{width:100%;min-width:0!important;border-collapse:separate;border-spacing:0 10px}
      #panel-products thead{display:none}
      #panel-products tbody{display:block;width:100%}
      #panel-products tr{display:block;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:10px;margin-bottom:10px;box-shadow:0 4px 14px rgba(16,24,40,.04)}
      #panel-products td{display:grid!important;grid-template-columns:76px minmax(0,1fr);gap:8px;width:100%!important;border-bottom:1px solid #f2f4f7;padding:8px 0;font-size:14px;white-space:normal!important;align-items:start}
      #panel-products td:last-child{border-bottom:0;text-align:left!important}
      #panel-products td::before{font-size:12px;font-weight:700;color:#667085;line-height:1.6}
      #panel-products td:nth-child(1)::before{content:'條碼'}
      #panel-products td:nth-child(2)::before{content:'品名'}
      #panel-products td:nth-child(3)::before{content:'多語'}
      #panel-products td:nth-child(4)::before{content:'售價'}
      #panel-products td:nth-child(5)::before{content:'規格'}
      #panel-products td:nth-child(6)::before{content:'操作'}
      #panel-products table td.row{display:grid!important;grid-template-columns:76px minmax(0,1fr)!important;white-space:normal!important;vertical-align:top}
      #panel-products table td.row button{margin:0 6px 6px 0;padding:9px 12px;display:inline-flex}
      #product-form-modal{padding:8px;align-items:flex-start}
      #product-form-modal .card{width:100%;max-height:calc(100vh - 16px);border-radius:14px}
      .modal-head{position:sticky;top:0;background:#fff;z-index:1;padding-bottom:8px;border-bottom:1px solid #e5e7eb}
      .form-grid{grid-template-columns:1fr!important}
      #product-form-modal .row button{flex:1 1 calc(50% - 6px)}
      #delete-product-btn{flex-basis:100%!important}
    }
  `;
  document.head.appendChild(style);

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

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
    scanModal.innerHTML = '<div class="scan-box"><div class="scan-head"><strong>掃描商品條碼</strong><button type="button" id="close-scan-btn" class="modal-close">關閉</button></div><video id="barcode-scan-video" playsinline muted></video><div id="html5-qrcode-reader" style="display:none"></div><p class="muted">將條碼置於畫面中央，辨識後會自動帶入搜尋。</p></div>';
    document.body.appendChild(scanModal);

    let stream = null;
    let scanTimer = null;
    let html5Scanner = null;
    const stopScan = async () => {
      scanModal.classList.remove('open');
      if (scanTimer) clearInterval(scanTimer);
      scanTimer = null;
      if (html5Scanner) {
        try { await html5Scanner.stop(); } catch (_) {}
        try { html5Scanner.clear(); } catch (_) {}
        html5Scanner = null;
      }
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const applyBarcode = (code) => {
      if (!code) return;
      searchInput.value = code;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      stopScan();
    };
    const startHtml5QrCode = async () => {
      const video = document.getElementById('barcode-scan-video');
      const reader = document.getElementById('html5-qrcode-reader');
      video.style.display = 'none';
      reader.style.display = 'block';
      scanModal.classList.add('open');
      await loadScript('https://unpkg.com/html5-qrcode/html5-qrcode.min.js');
      if (!window.Html5Qrcode) throw new Error('html5-qrcode unavailable');
      html5Scanner = new Html5Qrcode('html5-qrcode-reader');
      await html5Scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.777 },
        (decodedText) => applyBarcode(decodedText),
        () => {}
      );
    };
    const startNativeBarcodeDetector = async () => {
      const video = document.getElementById('barcode-scan-video');
      const reader = document.getElementById('html5-qrcode-reader');
      reader.style.display = 'none';
      video.style.display = 'block';
      const detector = new BarcodeDetector({ formats: ['code_128','ean_13','ean_8','upc_a','upc_e','code_39','itf'] });
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
    };
    document.getElementById('close-scan-btn').addEventListener('click', stopScan);
    scanModal.addEventListener('click', (event) => { if (event.target === scanModal) stopScan(); });
    scanBtn.addEventListener('click', async () => {
      try {
        if ('BarcodeDetector' in window) await startNativeBarcodeDetector();
        else await startHtml5QrCode();
      } catch (error) {
        try { await stopScan(); } catch (_) {}
        const code = prompt('無法啟動相機掃碼，請手動輸入條碼，或確認相機權限後再試。');
        if (code) applyBarcode(code.trim());
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
