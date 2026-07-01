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
    if (hint) hint.textContent = '請讓商品條碼水平、完整進入畫面中間；距離約 15–30 公分，光線要足、不要反光。';

    let detected = false;
    const stopCamera = () => {
      try { window.Quagga?.offDetected?.(); } catch (_) {}
      try { window.Quagga?.stop?.(); } catch (_) {}
      scanModal.classList.remove('open');
      reader.innerHTML = '';
    };
    const finish = (code) => {
      stopCamera();
      if (code) {
        searchInput.value = code;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
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
            area: {
              top: '25%',
              right: '5%',
              left: '5%',
              bottom: '25%'
            }
          },
          locator: {
            patchSize: 'large',
            halfSample: false
          },
          numOfWorkers: navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 2,
          frequency: 12,
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
        }, (error) => error ? reject(error) : resolve());
      });

      window.Quagga.onDetected((result) => {
        const code = result?.codeResult?.code;
        if (!code || detected) return;
        detected = true;
        finish(String(code).trim());
      });
      window.Quagga.start();
    } catch (error) {
      stopCamera();
      const code = prompt('目前相機掃碼仍無法辨識，請手動輸入條碼，或使用藍牙 / USB 掃碼器。');
      if (code) {
        searchInput.value = code.trim();
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, true);
});
