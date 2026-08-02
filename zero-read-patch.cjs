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
  const searchEnd = searchStart >= 0 ? text.indexOf('function filteredProducts()', searchStart) : -1;
  if (searchStart < 0 || searchEnd < 0) {
    throw new Error('Unable to locate patched product loading block');
  }

  const onDemandSearch = `let productSearchSequence=0;function clearProductResults(){productSearchSequence+=1;state.products=[];state.selectedProductId="";renderProductSelect();$("product-count").textContent="尚未查詢";$("products-body").innerHTML='<tr><td colspan="6" class="muted">請掃描條碼或輸入商品名稱後查詢</td></tr>';const btn=$("product-search-btn");if(btn)btn.disabled=false}async function loadProducts(){clearProductResults()}function normalizeSearch(text){return String(text||"").toLowerCase().replace(/[\\s\\-－_()（）\\[\\]【】.,，、/\\\\]+/g,"").trim()}async function withProductSearchTimeout(promise,ms=5000,message="登入驗證逾時，請重新登入後再試"){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms)})])}finally{clearTimeout(timer)}}function decodeFirestoreValue(value){if(!value)return null;if(Object.prototype.hasOwnProperty.call(value,"nullValue"))return null;if(Object.prototype.hasOwnProperty.call(value,"stringValue"))return value.stringValue;if(Object.prototype.hasOwnProperty.call(value,"integerValue"))return Number(value.integerValue);if(Object.prototype.hasOwnProperty.call(value,"doubleValue"))return Number(value.doubleValue);if(Object.prototype.hasOwnProperty.call(value,"booleanValue"))return Boolean(value.booleanValue);if(Object.prototype.hasOwnProperty.call(value,"timestampValue"))return value.timestampValue;if(Object.prototype.hasOwnProperty.call(value,"arrayValue"))return (value.arrayValue.values||[]).map(decodeFirestoreValue);if(Object.prototype.hasOwnProperty.call(value,"mapValue"))return decodeFirestoreFields(value.mapValue.fields||{});return null}function decodeFirestoreFields(fields){const result={};Object.entries(fields||{}).forEach(([key,value])=>{result[key]=decodeFirestoreValue(value)});return result}function productFromRestDocument(document){const parts=String(document.name||"").split("/");const rawId=parts[parts.length-1]||"";let docId=rawId;try{docId=decodeURIComponent(rawId)}catch(_){}return{docId,...decodeFirestoreFields(document.fields||{})}}async function queryProductsThroughRest(raw,term){const looksLikeBarcode=/^[0-9A-Za-z]+$/.test(raw)&&raw.length>=5;if(!looksLikeBarcode&&term.length<2)return[];const token=await withProductSearchTimeout(state.user.getIdToken(),5000);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);try{const fieldPath=looksLikeBarcode?"barcode":"searchKeywords";const op=looksLikeBarcode?"EQUAL":"ARRAY_CONTAINS";const value={stringValue:looksLikeBarcode?raw:term};const endpoint=\`https://firestore.googleapis.com/v1/projects/\${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents:runQuery\`;const response=await fetch(endpoint,{method:"POST",headers:{Authorization:\`Bearer \${token}\`,"Content-Type":"application/json"},body:JSON.stringify({structuredQuery:{from:[{collectionId:"products"}],where:{fieldFilter:{field:{fieldPath},op,value}},limit:looksLikeBarcode?1:20}}),signal:controller.signal});let payload=null;try{payload=await response.json()}catch(_){}if(!response.ok){const detail=payload&&payload.error&&payload.error.message?payload.error.message:\`HTTP \${response.status}\`;throw new Error(detail)}return(Array.isArray(payload)?payload:[]).filter(item=>item&&item.document).map(item=>productFromRestDocument(item.document))}catch(e){if(e&&e.name==="AbortError")throw new Error("查詢逾時，請確認網路連線後重試");throw e}finally{clearTimeout(timer)}}async function searchProducts(){const raw=$("search-input").value.trim();const term=normalizeSearch(raw);if(!raw){clearProductResults();setStatus("請先掃描條碼或輸入商品名稱");return}if(!state.user){$("product-count").textContent="尚未登入";$("products-body").innerHTML='<tr><td colspan="6" class="muted">請先登入後再查詢商品</td></tr>';setStatus("請先登入後再查詢商品","error");return}const sequence=++productSearchSequence;const btn=$("product-search-btn");try{if(btn)btn.disabled=true;$("product-count").textContent="查詢中...";$("products-body").innerHTML='<tr><td colspan="6" class="muted">商品查詢中...</td></tr>';setStatus("正在查詢商品...");const products=await queryProductsThroughRest(raw,term);if(sequence!==productSearchSequence)return;state.products=products.slice(0,20);renderProducts();renderProductSelect();$("product-count").textContent=\`查詢結果 \${state.products.length} 筆\`;setStatus(\`商品查詢完成：\${state.products.length} 筆\`)}catch(e){if(sequence!==productSearchSequence)return;state.products=[];renderProductSelect();$("product-count").textContent="查詢失敗";$("products-body").innerHTML=\`<tr><td colspan="6" class="muted">查詢失敗：\${safe(errorMessage(e))}</td></tr>\`;setStatus(\`商品查詢失敗：\${errorMessage(e)}\`,"error")}finally{if(sequence===productSearchSequence&&btn)btn.disabled=false}}`;

  text = text.slice(0, searchStart) + onDemandSearch + text.slice(searchEnd);
  text = text.replace('尚無商品資料</td></tr>`;', '找不到符合條件的商品</td></tr>`;');
  text = text.replace(/stable-20260701j/g, 'stable-20260802c');

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
