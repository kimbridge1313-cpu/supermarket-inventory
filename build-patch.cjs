const fs = require('node:fs');

function patchFile(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/,"咖啡"/g, '');
  text = text.replace(/, "咖啡"/g, '');
  if (file === 'index.html') {
    text = text.split('<script src="/modal-ui-patch.js"></script>').join('');
    text = text.split('<script src="/barcode-scan-fix.js"></script>').join('');
    text = text.split('<script src="/mobile-ui-force.js"></script>').join('');
    text = text.split('<script src="/cloud-sync-patch.js"></script>').join('');
    text = text.replace(
      'function filteredProducts(){const kw=$("search-input").value.trim().toLowerCase();if(!kw)return state.products;return state.products.filter(p=>[p.barcode,p.name,p.labelName,p.nameVi,p.nameId].some(v=>String(v||"").toLowerCase().includes(kw)))}',
      'function filteredProducts(){const raw=$("search-input").value.trim().toLowerCase();if(!raw)return state.products;const terms=raw.split(/[\\s,，、]+/).map(x=>x.trim()).filter(Boolean);return state.products.filter(p=>{const hay=[p.barcode,p.name,p.labelName,p.nameVi,p.nameId,p.category,p.supplier,p.spec].map(v=>String(v||"").toLowerCase()).join(" ");return terms.every(term=>hay.includes(term))})}'
    );
    text = text.replace(
      'async function reloadAll(){try{setStatus("資料載入中...");await loadSettings();await loadProducts();await loadQueue();setStatus("系統已初始化，商品資料已載入")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}',
      'async function reloadAll(){try{setStatus("設定載入中...");await loadSettings();state.products=[];state.queue=[];renderProducts();renderProductSelect();$("product-count").textContent="尚未載入";$("products-body").innerHTML=`<tr><td colspan="6" class="muted">為避免 Firestore 讀取數暴增，系統不會自動載入全部商品。請用條碼搜尋或手動載入指定資料。</td></tr>`;setStatus("系統已初始化；未自動載入全部商品")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}'
    );
    text = text.replace(
      'async function syncProducts(){try{await saveSettings();$("sync-result").textContent="同步中...";const r=await fetch("/api/sync-products-from-drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folderId:state.settings.driveFolderId||undefined})});const d=await r.json();$("sync-result").textContent=JSON.stringify(d,null,2);if(!r.ok||!d.ok)throw new Error(d.message||"同步失敗");await reloadAll()}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}',
      'async function syncProducts(){try{$("sync-result").textContent="請使用初始匯入或同步最新商品檔按鈕"}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}'
    );
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js?v=stable-20260701g"></script><script src="/modal-ui-patch.js?v=stable-20260701g"></script><script src="/cloud-sync-patch.js?v=stable-20260701g"></script></body>');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
