(() => {
  const onReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const storeNameFromPage = () => {
    const title = cleanText(document.getElementById('app-title')?.textContent || '');
    if (title.includes('｜')) return title.split('｜')[0].trim();
    return title && title !== '商品資料與貨卡列印' ? title : '門市名稱';
  };

  const productFromLegacyPreview = () => {
    const preview = document.getElementById('label-preview');
    if (!preview) return null;
    const languages = Array.from(preview.querySelectorAll('.lang'))
      .map((node) => cleanText(node.textContent))
      .filter(Boolean);
    const product = {
      storeName: cleanText(preview.querySelector('.store')?.textContent) || storeNameFromPage(),
      barcode: cleanText(preview.querySelector('.barcode')?.textContent).replace(/\s/g, ''),
      name: cleanText(preview.querySelector('.name')?.textContent),
      nameVi: languages[0] || '',
      nameId: languages[1] || '',
      price: cleanText(preview.querySelector('.price')?.textContent).replace(/\s*元\s*$/, '').trim()
    };
    return product.name ? product : null;
  };

  const sampleProduct = () => ({
    storeName: storeNameFromPage(),
    barcode: '06512943780243',
    name: '義美小泡芙(巧克力)',
    nameVi: 'Yimei thơ đỏc',
    nameId: 'Yimei mengepul',
    price: '35'
  });

  onReady(() => {
    const selectedButton = document.getElementById('print-selected-btn');
    const testButton = document.getElementById('test-print-btn');
    if (selectedButton) selectedButton.textContent = 'HTML 預覽列印';
    if (testButton) testButton.textContent = '模板測試';

    document.addEventListener('click', (event) => {
      const selected = event.target?.closest?.('#print-selected-btn');
      const test = event.target?.closest?.('#test-print-btn');
      if (!selected && !test) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const product = test ? sampleProduct() : productFromLegacyPreview();
      if (!product) return;
      window.__kfHtmlLabelTemplate?.openPreview?.(product);
    }, true);
  });
})();
