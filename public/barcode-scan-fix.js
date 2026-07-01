window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  loadScript('/mobile-ui-force.js').catch(() => {});

  const normalizeCode = (value) => String(value || '').replace(/[^0-9A-Z]/gi, '').trim();
  const applySearch = (searchInput, code) => {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;
    searchInput.value = finalCode;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const ensureScannerOverlay = () => {
    let overlay = document.getElementById('live-barcode-overlay');
    if (overlay) return overlay;
    const style = document.createElement('style');
    style.textContent = `
      #live-barcode-overlay{position:fixed;inset:0;z-index:20000;background:#000;display:none;color:#fff;overflow:hidden}
      #live-barcode-overlay.open{display:block}
      #live-barcode-reader{position:absolute;inset:0;background:#000}
      #live-barcode-reader video{width:100vw!important;height:100vh!important;object-fit:cover!important}
      #live-barcode-top{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px;background:linear-gradient(rgba(0,0,0,.72),rgba(0,0,0,0))}
      #live-barcode-top strong{font-size:16px}
      #live-barcode-close{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 12px}
      #live-barcode-frame{position:absolute;left:6vw;right:6vw;top:38vh;height:24vh;border:2px solid rgba(255,255,255,.9);border-radius:14px;box-shadow:0 0 0 999px rgba(0,0,0,.32);z-index:2;pointer-events:none}
      #live-barcode-hint{position:absolute;left:12px;right:12px;bottom:22px;z-index:2;text-align:center;font-size:14px;line-height:1.5;background:rgba(0,0,0,.55);border-radius:14px;padding:10px 12px}
    `;
    document.head.appendChild(style);
    overlay = document.createElement('div');
    overlay.id = 'live-barcode-overlay';
    overlay.innerHTML = '<div id="live-barcode-reader"></div><div id="live-barcode-top"><strong>掃描商品條碼</strong><button type="button" id="live-barcode-close">關閉</button></div><div id="live-barcode-frame"></div><div id="live-barcode-hint">準備掃描：請把條碼水平放入框內</div>';
    document.body.appendChild(overlay);
    return overlay;
  };

  document.addEventListener('click', async (event) => {
    const btn = event.target?.closest?.('#scan-product-barcode-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const searchInput = $('search-input');
    if (!searchInput) return;

    const overlay = ensureScannerOverlay();
    const reader = $('live-barcode-reader');
    const hint = $('live-barcode-hint');
    const closeBtn = $('live-barcode-close');

    reader.innerHTML = '';
    overlay.classList.add('open');
    if (hint) hint.textContent = '準備掃描：請把條碼水平放入框內，1 秒後開始辨識';

    let closed = false;
    let accepting = false;
    const candidates = new Map();
    const REQUIRED_HITS = 2;
    const MIN_LENGTH = 6;
    const WARMUP_MS = 1000;
    const isLikelyBarcode = (value) => value.length >= MIN_LENGTH && value.length <= 32;

    const stopCamera = () => {
      closed = true;
      try { window.Quagga?.offDetected?.(); } catch (_) {}
      try { window.Quagga?.stop?.(); } catch (_) {}
      overlay.classList.remove('open');
      reader.innerHTML = '';
    };

    const finish = (code) => {
      stopCamera();
      if (code) applySearch(searchInput, code);
    };

    if (closeBtn) closeBtn.onclick = () => finish('');

    try {
      await loadScript('https://unpkg.com/@ericblade/quagga2/dist/quagga.min.js');
      if (!window.Quagga) throw new Error('Quagga unavailable');

      await new Promise((resolve, reject) => {
        window.Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: reader,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            area: { top: '34%', right: '6%', left: '6%', bottom: '34%' }
          },
          locator: { patchSize: 'medium', halfSample: false },
          numOfWorkers: 1,
          frequency: 8,
          decoder: {
            readers: ['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader','code_39_reader','i2of5_reader'],
            multiple: false
          },
          locate: true
        }, (error) => error ? reject(error) : resolve());
      });

      window.Quagga.onDetected((result) => {
        if (!accepting || closed) return;
        const code = normalizeCode(result?.codeResult?.code);
        if (!code || !isLikelyBarcode(code)) return;
        const count = (candidates.get(code) || 0) + 1;
        candidates.set(code, count);
        if (hint) hint.textContent = `確認中：${code}（${count}/${REQUIRED_HITS}）`;
        if (count >= REQUIRED_HITS) {
          if (navigator.vibrate) navigator.vibrate(80);
          finish(code);
        }
      });

      window.Quagga.start();
      setTimeout(() => {
        if (closed) return;
        accepting = true;
        candidates.clear();
        if (hint) hint.textContent = '開始辨識：掃到後會自動帶入搜尋';
      }, WARMUP_MS);
    } catch (error) {
      stopCamera();
      const code = prompt('目前相機掃碼無法啟動，請手動輸入條碼，或使用藍牙 / USB 掃碼器。');
      if (code) applySearch(searchInput, code);
    }
  }, true);
});
