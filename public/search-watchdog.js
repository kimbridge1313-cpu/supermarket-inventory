window.addEventListener('DOMContentLoaded', () => {
  const count = document.getElementById('product-count');
  const body = document.getElementById('products-body');
  const button = document.getElementById('product-search-btn');
  const status = document.getElementById('global-status');
  const input = document.getElementById('search-input');
  if (!count || !body || !button || !input) return;

  let timer = null;
  const clearWatchdog = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const startWatchdog = () => {
    clearWatchdog();
    timer = setTimeout(() => {
      if (!String(count.textContent || '').includes('查詢中')) return;
      count.textContent = '查詢失敗';
      body.innerHTML = '<tr><td colspan="6" class="muted">查詢未完成，請重新登入後再試。</td></tr>';
      button.disabled = false;
      if (status) {
        status.textContent = '商品查詢逾時：前端流程未完成，請登出後重新登入。';
        status.className = 'status error';
      }
    }, 15000);
  };

  const observer = new MutationObserver(() => {
    const value = String(count.textContent || '');
    if (value.includes('查詢中')) startWatchdog();
    else clearWatchdog();
  });
  observer.observe(count, { childList: true, characterData: true, subtree: true });

  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('#product-search-btn')) startWatchdog();
  }, true);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') startWatchdog();
  }, true);
});
