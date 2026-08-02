const fs = require('node:fs');

function patchIndex() {
  const file = 'index.html';
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');

  text = text.replace(
    '<input id="search-input" placeholder="搜尋條碼、完整品名、貨卡名、多語名稱" /><div class="table-wrap" style="margin-top:12px">',
    '<div class="row"><input id="search-input" style="flex:1;min-width:220px" placeholder="掃描條碼或輸入商品名稱" /><button class="primary" id="product-search-btn" type="button">查詢商品</button></div><div class="table-wrap" style="margin-top:12px">'
  );

  text = text.replace(
    '$("search-input").oninput=()=>scheduleProductSearch();',
    '$("search-input").oninput=()=>{if(!$("search-input").value.trim())clearProductResults()};$("search-input").onkeydown=(event)=>{if(event.key==="Enter"){event.preventDefault();searchProducts()}};$("product-search-btn").onclick=searchProducts;'
  );

  text = text.replace(
    'async function reloadAll(){try{setStatus("設定與商品摘要載入中...");await loadSettings();await loadProducts();state.queue=[];setStatus("系統已初始化；已載入商品總數與前 10 筆")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}',
    'async function reloadAll(){try{setStatus("系統設定載入中...");await loadSettings();clearProductResults();state.queue=[];setStatus("系統已初始化；請掃描條碼或輸入商品名稱查詢")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}'
  );

  const searchStart = text.indexOf('async function loadProducts(){try{const productCol=collection(state.db,"products");');
  const searchEnd = searchStart >= 0 ? text.indexOf('function keywordsFromText(', searchStart) : -1;
  if (searchStart < 0 || searchEnd < 0) {
    throw new Error('Unable to locate patched product loading block');
  }

  const onDemandSearch = `function clearProductResults(){state.products=[];state.selectedProductId="";renderProductSelect();$("product-count").textContent="尚未查詢";$("products-body").innerHTML='<tr><td colspan="6" class="muted">請掃描條碼或輸入商品名稱後查詢</td></tr>'}async function loadProducts(){clearProductResults()}function docIdFromValue(value){return encodeURIComponent(String(value||"").trim()).replace(/\\./g,"%2E").slice(0,900)}function normalizeSearch(text){return String(text||"").toLowerCase().replace(/[\\s\\-－_()（）\\[\\]【】.,，、/\\\\]+/g,"").trim()}async function searchProducts(){const raw=$("search-input").value.trim();const term=normalizeSearch(raw);if(!raw){clearProductResults();setStatus("請先掃描條碼或輸入商品名稱");return}try{$("product-search-btn").disabled=true;$("product-count").textContent="查詢中...";$("products-body").innerHTML='<tr><td colspan="6" class="muted">商品查詢中...</td></tr>';const found=new Map();const addSnap=(snap)=>snap.docs.forEach(d=>found.set(d.id,{docId:d.id,...d.data()}));try{const exact=await getDoc(doc(state.db,"products",docIdFromValue(raw)));if(exact.exists())found.set(exact.id,{docId:exact.id,...exact.data()})}catch(e){console.warn("exact document search failed",e)}try{addSnap(await getDocs(query(collection(state.db,"products"),where("barcode","==",raw),limit(5))))}catch(e){console.warn("barcode query failed",e)}if(term.length>=2){try{addSnap(await getDocs(query(collection(state.db,"products"),where("searchKeywords","array-contains",term),limit(20))))}catch(e){console.warn("keyword query failed",e)}}state.products=[...found.values()].slice(0,20);renderProducts();renderProductSelect();$("product-count").textContent=\`查詢結果 \${state.products.length} 筆\`;setStatus(\`商品查詢完成：\${state.products.length} 筆\`)}catch(e){state.products=[];renderProductSelect();$("product-count").textContent="查詢失敗";$("products-body").innerHTML=\`<tr><td colspan="6" class="muted">查詢失敗：\${safe(errorMessage(e))}</td></tr>\`;setStatus(\`商品查詢失敗：\${errorMessage(e)}\`,"error")}finally{$("product-search-btn").disabled=false}}`;

  text = text.slice(0, searchStart) + onDemandSearch + text.slice(searchEnd);
  text = text.replace('尚無商品資料</td></tr>`;', '找不到符合條件的商品</td></tr>`;');
  text = text.replace(/stable-20260701j/g, 'stable-20260802a');

  fs.writeFileSync(file, text);
}

function patchScanner() {
  const file = 'public/barcode-scan-fix.js';
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    "    searchInput.dispatchEvent(new Event('input', { bubbles: true }));",
    "    searchInput.dispatchEvent(new Event('input', { bubbles: true }));\n    document.getElementById('product-search-btn')?.click();"
  );
  fs.writeFileSync(file, text);
}

function patchCloudSync() {
  const file = 'public/cloud-sync-patch.js';
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  const autoLoad = '\n    loadSuppliers();\n  };\n\n  setup();';
  if (text.includes(autoLoad)) {
    text = text.replace(autoLoad, '\n  };\n\n  setup();');
  }
  fs.writeFileSync(file, text);
}

patchIndex();
patchScanner();
patchCloudSync();
