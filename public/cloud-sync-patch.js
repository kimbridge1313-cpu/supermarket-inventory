window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const readJsonResponse = async (response) => {
    const raw = await response.text();
    try {
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return { ok: false, message: raw.slice(0, 800) || 'API 回傳非 JSON 內容' };
    }
  };

  const decodePosFile = async (file) => {
    const buffer = await file.arrayBuffer();
    let big5 = '';
    let utf8 = '';
    try { big5 = new TextDecoder('big5').decode(buffer); } catch (_) {}
    try { utf8 = new TextDecoder('utf-8').decode(buffer); } catch (_) {}
    return big5.includes('GSNO') || big5.includes('GSNAME') ? big5 : utf8;
  };

  const emptySummary = (mode) => ({
    mode,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    reviewCount: 0,
    errorCount: 0,
    queuedCount: 0,
    suppliersCreated: 0,
    suppliersUpdated: 0
  });

  const mergeSummary = (summary, data) => {
    ['createdCount','updatedCount','skippedCount','reviewCount','errorCount','queuedCount','suppliersCreated','suppliersUpdated'].forEach((key) => {
      summary[key] += Number(data[key] || 0);
    });
  };

  const runDailyDriveSync = async () => {
    const resultEl = $('sync-result');
    const syncBtn = $('sync-btn');
    const uploadBtn = $('initial-upload-btn');
    const reloadBtn = $('reload-btn');
    const folderId = $('s-drive-folder')?.value?.trim() || undefined;
    const batchSize = 150;
    let cursor = 0;
    let totalRows = 0;
    const summary = emptySummary('daily');

    try {
      if (syncBtn) syncBtn.disabled = true;
      if (uploadBtn) uploadBtn.disabled = true;
      if (resultEl) resultEl.textContent = '日常雲端同步中...';

      while (true) {
        const response = await fetch('/api/sync-products-from-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'daily', cursor, batchSize, folderId })
        });
        const data = await readJsonResponse(response);
        if (!response.ok || !data.ok) throw new Error(data.message || '同步失敗');
        if (data.status === 'skipped') {
          if (resultEl) resultEl.textContent = JSON.stringify(data, null, 2);
          break;
        }
        totalRows = data.totalRows || totalRows;
        mergeSummary(summary, data);
        const done = Math.min(data.nextCursor || totalRows, totalRows || data.nextCursor || 0);
        if (resultEl) resultEl.textContent = JSON.stringify({ ok: true, mode: 'daily', progress: totalRows ? `${done}/${totalRows}` : `${done}`, currentBatch: data, summary }, null, 2);
        if (!data.hasMore) break;
        cursor = data.nextCursor || cursor + batchSize;
      }

      if (resultEl) resultEl.textContent = JSON.stringify({ ok: true, mode: 'daily', status: 'complete', totalRows, summary }, null, 2);
      if (reloadBtn) reloadBtn.click();
      await loadSuppliers();
    } catch (error) {
      if (resultEl) resultEl.textContent = `同步失敗：${error?.message || error}`;
    } finally {
      if (syncBtn) syncBtn.disabled = false;
      if (uploadBtn) uploadBtn.disabled = false;
    }
  };

  const runUploadedInitialImport = async () => {
    const input = $('initial-upload-file');
    const file = input?.files?.[0];
    const resultEl = $('sync-result');
    const syncBtn = $('sync-btn');
    const uploadBtn = $('initial-upload-btn');
    const reloadBtn = $('reload-btn');
    if (!file) {
      if (resultEl) resultEl.textContent = '請先選擇 POS 匯出的 .HTM / .HTML 檔案';
      return;
    }

    const batchSize = 200;
    let cursor = 0;
    let totalRows = 0;
    const summary = emptySummary('initial_upload');

    try {
      if (syncBtn) syncBtn.disabled = true;
      if (uploadBtn) uploadBtn.disabled = true;
      if (resultEl) resultEl.textContent = `讀取檔案中：${file.name}`;
      const html = await decodePosFile(file);
      if (!html || (!html.includes('GSNO') && !html.includes('GSNAME'))) throw new Error('檔案內容不像 POS 商品 HTM，找不到 GSNO / GSNAME 欄位');

      while (true) {
        const response = await fetch('/api/import-products-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, cursor, batchSize, fileName: file.name })
        });
        const data = await readJsonResponse(response);
        if (!response.ok || !data.ok) throw new Error(data.message || '初始匯入失敗');
        totalRows = data.totalRows || totalRows;
        mergeSummary(summary, data);
        const done = Math.min(data.nextCursor || totalRows, totalRows || data.nextCursor || 0);
        if (resultEl) resultEl.textContent = JSON.stringify({ ok: true, mode: 'initial_upload', fileName: file.name, progress: totalRows ? `${done}/${totalRows}` : `${done}`, currentBatch: data, summary }, null, 2);
        if (!data.hasMore) break;
        cursor = data.nextCursor || cursor + batchSize;
      }

      if (resultEl) resultEl.textContent = JSON.stringify({ ok: true, mode: 'initial_upload', status: 'complete', fileName: file.name, totalRows, summary }, null, 2);
      if (reloadBtn) reloadBtn.click();
      await loadSuppliers();
    } catch (error) {
      if (resultEl) resultEl.textContent = `初始匯入失敗：${error?.message || error}`;
    } finally {
      if (syncBtn) syncBtn.disabled = false;
      if (uploadBtn) uploadBtn.disabled = false;
    }
  };

  const loadSuppliers = async () => {
    const body = $('suppliers-body');
    const count = $('suppliers-count');
    if (!body) return;
    try {
      body.innerHTML = '<tr><td colspan="3" class="muted">讀取廠商資料中...</td></tr>';
      const response = await fetch('/api/list-suppliers');
      const data = await readJsonResponse(response);
      if (!response.ok || !data.ok) throw new Error(data.message || '讀取廠商失敗');
      if (count) count.textContent = `${data.count || 0} 筆`;
      body.innerHTML = (data.suppliers || []).map((supplier) => `
        <tr>
          <td>${supplier.code || ''}</td>
          <td>${supplier.name || ''}</td>
          <td>${Number(supplier.productCount || 0).toLocaleString('zh-TW')}</td>
        </tr>
      `).join('') || '<tr><td colspan="3" class="muted">尚無廠商資料</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="3" class="muted">讀取廠商失敗：${error?.message || error}</td></tr>`;
    }
  };

  const setup = () => {
    const panel = $('panel-sync');
    const syncBtn = $('sync-btn');
    if (!panel || !syncBtn || document.getElementById('initial-upload-file')) return;

    syncBtn.textContent = '同步最新商品檔';

    const uploadBlock = document.createElement('div');
    uploadBlock.className = 'status';
    uploadBlock.style.marginTop = '12px';
    uploadBlock.innerHTML = `
      <strong>初始資料匯入</strong>
      <p class="muted" style="margin:6px 0 10px">第一次建檔請上傳 POS 匯出的 .HTM / .HTML 商品檔。此流程會建立商品與廠商，不會大量建立重印貨卡。</p>
      <input id="initial-upload-file" type="file" accept=".htm,.html,text/html" />
      <div class="row" style="margin-top:10px"><button type="button" class="primary" id="initial-upload-btn">上傳並初始匯入</button></div>
    `;
    syncBtn.closest('.card')?.insertBefore(uploadBlock, syncBtn.closest('.row'));

    const supplierCard = document.createElement('div');
    supplierCard.className = 'card';
    supplierCard.innerHTML = `
      <div class="row" style="justify-content:space-between"><h2>廠商資料</h2><span class="pill" id="suppliers-count">0 筆</span></div>
      <p class="muted">由初始匯入或日常同步自動建立。</p>
      <div class="table-wrap"><table><thead><tr><th>廠商代號</th><th>廠商名稱</th><th>商品數</th></tr></thead><tbody id="suppliers-body"><tr><td colspan="3" class="muted">尚未讀取</td></tr></tbody></table></div>
      <div class="row" style="margin-top:10px"><button type="button" class="secondary" id="reload-suppliers-btn">重新整理廠商</button></div>
    `;
    panel.appendChild(supplierCard);

    $('initial-upload-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      runUploadedInitialImport();
    }, true);

    syncBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      runDailyDriveSync();
    }, true);

    $('reload-suppliers-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      loadSuppliers();
    });

    loadSuppliers();
  };

  setup();
  setTimeout(setup, 500);
});
