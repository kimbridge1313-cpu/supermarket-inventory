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
    if (!searchInput || !scanModal || !video) return;

    if (reader) reader.style.display = 'none';
    video.style.display = 'block';
    video.muted = true;
    video.playsInline = true;
    scanModal.classList.add('open');

    const hint = scanModal.querySelector('.muted');
    if (hint) hint.textContent = '請把商品條碼橫向放在畫面中央，距離約 15–25 公分，避免反光。';

    let controls = null;
    let codeReader = null;
    const finish = async (code) => {
      try { controls?.stop?.(); } catch (_) {}
      try { codeReader?.reset?.(); } catch (_) {}
      scanModal.classList.remove('open');
      video.srcObject = null;
      if (code) {
        searchInput.value = code;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const closeBtn = $('close-scan-btn');
    if (closeBtn) closeBtn.onclick = () => finish('');
    scanModal.onclick = (e) => { if (e.target === scanModal) finish(''); };

    try {
      await loadScript('https://unpkg.com/@zxing/browser@latest/umd/index.min.js');
      const ZXingBrowser = window.ZXingBrowser || window.ZXing;
      if (!ZXingBrowser?.BrowserMultiFormatReader) throw new Error('ZXing unavailable');

      codeReader = new ZXingBrowser.BrowserMultiFormatReader();
      const devices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();
      const backCamera = devices.find((device) => /back|rear|environment|後|背/i.test(device.label || '')) || devices[devices.length - 1];
      const deviceId = backCamera?.deviceId;

      controls = await codeReader.decodeFromVideoDevice(deviceId, video, (result, error, ctrl) => {
        if (result?.getText) finish(result.getText().trim());
      });
    } catch (error) {
      await finish('');
      const code = prompt('目前無法辨識條碼，請手動輸入條碼。也可以換更亮的位置、拉遠一點，或用外接掃碼器。');
      if (code) {
        searchInput.value = code.trim();
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, true);
});
