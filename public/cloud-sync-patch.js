window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const readJsonResponse = async (response) => {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return { ok: false, message: raw.slice(0, 800) || '同步 API 回傳非 JSON 內容' };
    }
  };

  const runBatchedSync = async (mode) => {
    const resultEl = $('sync-result');
    const syncBtn = $('sync-btn');
    const initialBtn = $('initial-import-btn');
    const reloadBtn = $('reload-btn');
    const folderId = $('s-drive-folder')?.value?.trim() || undefined;
    const batchSize = mode === 'initial' ? 200 : 150;
    let cursor = 0;
    let totalRows = 0;
    const summary = {
      mode,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      reviewCount: 0,
      errorCount: 0,
      queuedCount: 0,
      suppliersCreated: 0,
      suppliersUpdated: 0
    };

    try {
      if (syncBtn) syncBtn.disabled = true;
      if (initialBtn) initialBtn.disabled = true;
      if (resultEl) resultEl.textContent = mode === 'initial' ? '初始匯入中...' : '日常同步中...';

      while (true) {
        const response = await fetch('/api/sync-products-from-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, cursor, batchSize, folderId })
        });
        const data = await readJsonResponse(response);
        if (!response.ok || !data.ok) throw new Error(data.message || '同步失敗');
        if (data.status === 'skipped') {
          if (resultEl) resultEl.textContent = JSON.stringify(data, null, 2);
          break;
        }

        totalRows = data.totalRows || totalRows;
        ['createdCount','updatedCount','skippedCount','reviewCount','errorCount','queuedCount','suppliersCreated','suppliersUpdated'].forEach((key) => {
          summary[key] += Number(data[key] || 0);
        });

        const done = Math.min(data.nextCursor || totalRows, totalRows || data.nextCursor || 0);
        if (resultEl) {
          resultEl.textContent = JSON.stringify({
            ok: true,
            mode,
            progress: totalRows ? `${done}/${totalRows}` : `${done}`,
            currentBatch: data,
            summary
          }, null, 2);
        }

        if (!data.hasMore) break;
        cursor = data.nextCursor || cursor + batchSize;
      }

      if (resultEl) {
        resultEl.textContent = JSON.stringify({ ok: true, mode, status: 'complete', totalRows, summary }, null, 2);
      }
      if (reloadBtn) reloadBtn.click();
    } catch (error) {
      if (resultEl) resultEl.textContent = `同步失敗：${error?.message || error}`;
    } finally {
      if (syncBtn) syncBtn.disabled = false;
      if (initialBtn) initialBtn.disabled = false;
    }
  };

  const setup = () => {
    const syncBtn = $('sync-btn');
    if (!syncBtn || document.getElementById('initial-import-btn')) return;

    syncBtn.textContent = '同步最新商品檔';
    const initialBtn = document.createElement('button');
    initialBtn.id = 'initial-import-btn';
    initialBtn.type = 'button';
    initialBtn.className = 'secondary';
    initialBtn.textContent = '初始匯入商品資料';
    syncBtn.insertAdjacentElement('beforebegin', initialBtn);

    initialBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      runBatchedSync('initial');
    }, true);

    syncBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      runBatchedSync('daily');
    }, true);
  };

  setup();
  setTimeout(setup, 500);
});
