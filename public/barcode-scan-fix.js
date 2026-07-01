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

    let scanner = null;
    const finish = async (code) => {
      if (scanner) {
        try { await scanner.stop(); } catch (_) {}
        try { await scanner.clear(); } catch (_) {}
      }
      scanModal.classList.remove('open');
      if (code) {
        searchInput.value = code;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const closeBtn = $('close-scan-btn');
    if (closeBtn) closeBtn.onclick = () => finish('');
    scanModal.onclick = (e) => { if (e.target === scanModal) finish(''); };

    try {
      await loadScript('https://unpkg.com/html5-qrcode/html5-qrcode.min.js');
      if (!window.Html5Qrcode || !window.Html5QrcodeSupportedFormats) throw new Error('scanner library unavailable');

      const F = window.Html5QrcodeSupportedFormats;
      scanner = new window.Html5Qrcode('html5-qrcode-reader', {
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF]
      });

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(viewfinderWidth * 0.86);
            const height = Math.max(90, Math.floor(viewfinderHeight * 0.28));
            return { width, height };
          },
          aspectRatio: 1.777
        },
        (decodedText) => finish(String(decodedText || '').trim()),
        () => {}
      );
    } catch (error) {
      await finish('');
      const code = prompt('目前無法辨識條碼，請手動輸入條碼。也可以確認相機權限、光線與條碼距離後再試。');
      if (code) {
        searchInput.value = code.trim();
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, true);
});
