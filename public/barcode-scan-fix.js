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
  const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 720;
  const normalizeCode = (value) => String(value || '').replace(/[^0-9A-Z]/gi, '').trim();

  const applySearch = (searchInput, code) => {
    const finalCode = normalizeCode(code);
    if (!finalCode) return;
    searchInput.value = finalCode;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const scanImageFile = async (file) => {
    await loadScript('https://unpkg.com/@ericblade/quagga2/dist/quagga.min.js');
    if (!window.Quagga) throw new Error('Quagga unavailable');
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await new Promise((resolve, reject) => {
        window.Quagga.decodeSingle({
          src: imageUrl,
          numOfWorkers: 0,
          inputStream: { size: 1280 },
          locator: { patchSize: 'large', halfSample: false },
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'upc_reader',
              'upc_e_reader',
              'code_128_reader',
              'code_39_reader',
              'i2of5_reader'
            ],
            multiple: false
          },
          locate: true
        }, (res) => res?.codeResult?.code ? resolve(res.codeResult.code) : reject(new Error('barcode not found')));
      });
      return normalizeCode(result);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const startMobilePhotoScan = async (searchInput) => {
    let input = document.getElementById('mobile-barcode-photo-input');
    if (!input) {
      input = document.createElement('input');
      input.id = 'mobile-barcode-photo-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment');
      input.style.display = 'none';
      document.body.appendChild(input);
    }
    input.value = '';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const code = await scanImageFile(file);
        if (code) applySearch(searchInput, code);
      } catch (error) {
        const code = prompt('照片中沒有辨識到條碼。請重新拍清楚，或手動輸入條碼。');
        if (code) applySearch(searchInput, code);
      }
    };
    input.click();
  };

  const ensureScanControls = (scanModal) => {
    let controls = document.getElementById('barcode-confirm-controls');
    if (controls) return controls;
    controls = document.createElement('div');
    controls.id = 'barcode-confirm-controls';
    controls.style.cssText = 'display:none;margin-top:10px;padding:10px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb';
    controls.innerHTML = '<div style="font-size:12px;color:#667085;margin-bottom:4px">候選條碼</div><div id="barcode-candidate-text" style="font-size:22px;font-weight:800;letter-spacing:.04em;margin-bottom:10px"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="use-barcode-btn" class="primary">使用此條碼</button><button type="button" id="reset-barcode-btn" class="secondary">重新掃描</button></div>';
    scanModal.querySelector('.scan-box')?.appendChild(controls);
    return controls;
  };

  document.addEventListener('click', async (event) => {
    const btn = event.target?.closest?.('#scan-product-barcode-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const searchInput = $('search-input');
    if (!searchInput) return;

    if (isMobile()) {
      await startMobilePhotoScan(searchInput);
      return;
    }

    const scanModal = $('barcode-scan-modal');
    const reader = $('html5-qrcode-reader');
    const video = $('barcode-scan-video');
    if (!scanModal || !reader) return;

    if (video) video.style.display = 'none';
    reader.style.display = 'block';
    reader.innerHTML = '';
    scanModal.classList.add('open');

    const hint = scanModal.querySelector('.muted');
    const controls = ensureScanControls(scanModal);
    const candidateText = $('barcode-candidate-text');
    const useBtn = $('use-barcode-btn');
    const resetBtn = $('reset-barcode-btn');
    controls.style.display = 'none';
    if (hint) hint.textContent = '準備掃描：請先把條碼水平放進畫面中央，1.5 秒後開始辨識。';

    let closed = false;
    let accepting = false;
    let lockedCandidate = '';
    const candidates = new Map();
    const REQUIRED_HITS = 3;
    const MIN_LENGTH = 6;
    const WARMUP_MS = 1500;
    const isLikelyBarcode = (value) => value.length >= MIN_LENGTH && value.length <= 32;
    const stopCamera = () => {
      closed = true;
      try { window.Quagga?.offDetected?.(); } catch (_) {}
      try { window.Quagga?.stop?.(); } catch (_) {}
      scanModal.classList.remove('open');
      reader.innerHTML = '';
      controls.style.display = 'none';
    };
    const useCode = (code) => {
      stopCamera();
      if (code) applySearch(searchInput, code);
    };
    const showCandidate = (code) => {
      lockedCandidate = code;
      accepting = false;
      if (candidateText) candidateText.textContent = code;
      controls.style.display = 'block';
      if (hint) hint.textContent = '已抓到候選條碼，請核對數字；正確再按「使用此條碼」。';
      if (navigator.vibrate) navigator.vibrate(80);
    };
    const resetScan = () => {
      lockedCandidate = '';
      candidates.clear();
      controls.style.display = 'none';
      accepting = true;
      if (hint) hint.textContent = '重新辨識：請保持條碼水平且完整，不要快速晃過。';
    };

    const closeBtn = $('close-scan-btn');
    if (closeBtn) closeBtn.onclick = () => stopCamera();
    if (useBtn) useBtn.onclick = () => useCode(lockedCandidate);
    if (resetBtn) resetBtn.onclick = () => resetScan();
    scanModal.onclick = (e) => { if (e.target === scanModal) stopCamera(); };

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
            area: { top: '30%', right: '10%', left: '10%', bottom: '30%' }
          },
          locator: { patchSize: 'medium', halfSample: false },
          numOfWorkers: 1,
          frequency: 6,
          decoder: {
            readers: ['ean_reader','ean_8_reader','upc_reader','upc_e_reader','code_128_reader','code_39_reader','i2of5_reader'],
            multiple: false
          },
          locate: true
        }, (error) => error ? reject(error) : resolve());
      });

      window.Quagga.onDetected((result) => {
        if (!accepting || closed || lockedCandidate) return;
        const code = normalizeCode(result?.codeResult?.code);
        if (!code || !isLikelyBarcode(code)) return;
        const count = (candidates.get(code) || 0) + 1;
        candidates.set(code, count);
        if (hint) hint.textContent = `確認中：${code}（${count}/${REQUIRED_HITS}）請保持條碼穩定`;
        if (count >= REQUIRED_HITS) showCandidate(code);
      });
      window.Quagga.start();
      setTimeout(() => {
        if (closed) return;
        accepting = true;
        candidates.clear();
        if (hint) hint.textContent = '開始辨識：請保持條碼水平且完整，不要快速晃過。';
      }, WARMUP_MS);
    } catch (error) {
      stopCamera();
      const code = prompt('目前相機掃碼仍無法辨識，請手動輸入條碼，或使用藍牙 / USB 掃碼器。');
      if (code) applySearch(searchInput, code);
    }
  }, true);
});
