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

  const normalizeCode = (value) => String(value || '').replace(/[^0-9A-Z]/gi, '').trim();
  const applySearch = (searchInput, code) => {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;
    searchInput.value = finalCode;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  document.addEventListener('click', async (event) => {
    const btn = event.target?.closest?.('#scan-product-barcode-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const searchInput = $('search-input');
    const scanModal = $('barcode-scan-modal');
    const reader = $('html5-qrcode-reader');
    const video = $('barcode-scan-video');
    if (!searchInput || !scanModal || !reader) return;

    if (video) video.style.display = 'none';
    reader.style.display = 'block';
    reader.innerHTML = '';
    scanModal.classList.add('open');

    const hint = scanModal.querySelector('.muted');
    if (hint) hint.textContent = '準備掃描：請先把條碼水平放進畫面中央，1 秒後開始辨識。';

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
      scanModal.classList.remove('open');
      reader.innerHTML = '';
    };

    const finish = (code) => {
      stopCamera();
      if (code) applySearch(searchInput, code);
    };

    const closeBtn = $('close-scan-btn');
    if (closeBtn) closeBtn.onclick = () => finish('');
    scanModal.onclick = (e) => { if (e.target === scanModal) finish(''); };

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
            area: { top: '26%', right: '6%', left: '6%', bottom: '26%' }
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
        if (hint) hint.textContent = '開始辨識：掃到後會自動帶入搜尋。';
      }, WARMUP_MS);
    } catch (error) {
      stopCamera();
      const code = prompt('目前相機掃碼無法啟動，請手動輸入條碼，或使用藍牙 / USB 掃碼器。');
      if (code) applySearch(searchInput, code);
    }
  }, true);
});
