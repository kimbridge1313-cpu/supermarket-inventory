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
      'import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";',
      'import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, getCountFromServer } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";'
    );
    text = text.replace(
      '$("search-input").oninput=renderProducts;',
      '$("search-input").oninput=()=>scheduleProductSearch();'
    );
    text = text.replace(
      'function filteredProducts(){const kw=$("search-input").value.trim().toLowerCase();if(!kw)return state.products;return state.products.filter(p=>[p.barcode,p.name,p.labelName,p.nameVi,p.nameId].some(v=>String(v||"").toLowerCase().includes(kw)))}',
      'function filteredProducts(){return state.products}'
    );
    text = text.replace(
      'async function reloadAll(){try{setStatus("資料載入中...");await loadSettings();await loadProducts();await loadQueue();setStatus("系統已初始化，商品資料已載入")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}',
      'async function reloadAll(){try{setStatus("設定與商品摘要載入中...");await loadSettings();await loadProducts();state.queue=[];setStatus("系統已初始化；已載入商品總數與前 10 筆")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}'
    );
    text = text.replace(
      'async function loadProducts(){const snap=await getDocs(query(collection(state.db,"products"),orderBy("name")));state.products=snap.docs.map(d=>({docId:d.id,...d.data()}));renderProducts();renderProductSelect()}',
      'async function loadProducts(){try{const productCol=collection(state.db,"products");const countSnap=await getCountFromServer(productCol);const total=countSnap.data().count||0;const snap=await getDocs(query(productCol,orderBy("name"),limit(10)));state.products=snap.docs.map(d=>({docId:d.id,...d.data()}));renderProducts();renderProductSelect();$("product-count").textContent=`總數 ${total.toLocaleString("zh-TW")}｜顯示 ${state.products.length} 筆`}catch(e){state.products=[];renderProducts();renderProductSelect();$("product-count").textContent="讀取失敗";throw e}}let productSearchTimer=null;function docIdFromValue(value){return encodeURIComponent(String(value||"").trim()).replace(/\\./g,"%2E").slice(0,900)}function normalizeSearch(text){return String(text||"").toLowerCase().replace(/[\\s\\-－_()（）\\[\\]【】.,，、/\\\\]+/g,"").trim()}function scheduleProductSearch(){clearTimeout(productSearchTimer);productSearchTimer=setTimeout(searchProducts,450)}async function searchProducts(){const raw=$("search-input").value.trim();const term=normalizeSearch(raw);if(!raw){await loadProducts();return}try{$("product-count").textContent="查詢中...";const found=new Map();const addSnap=(snap)=>snap.docs.forEach(d=>found.set(d.id,{docId:d.id,...d.data()}));try{const exact=await getDoc(doc(state.db,"products",docIdFromValue(raw)));if(exact.exists())found.set(exact.id,{docId:exact.id,...exact.data()})}catch(e){console.warn("exact doc search failed",e)}const queries=[query(collection(state.db,"products"),where("barcode","==",raw),limit(10))];if(term)queries.push(query(collection(state.db,"products"),where("searchKeywords","array-contains",term),limit(50)));for(const q of queries){try{addSnap(await getDocs(q))}catch(e){console.warn("product query failed",e)}}state.products=[...found.values()].slice(0,50);renderProducts();renderProductSelect();$("product-count").textContent=`查詢 ${state.products.length} 筆`;setStatus(`商品查詢完成：${state.products.length} 筆`)}catch(e){setStatus(`商品查詢失敗：${errorMessage(e)}`,"error");$("products-body").innerHTML=`<tr><td colspan="6" class="muted">查詢失敗：${safe(errorMessage(e))}</td></tr>`}}'
    );
    text = text.replace(
      'function formProduct(){const generated=generateLabelNameFromName($("f-name").value.trim());return{barcode:$("f-barcode").value.trim(),name:$("f-name").value.trim(),labelName:$("f-label-name").value.trim()||generated.labelName,nameVi:$("f-name-vi").value.trim(),nameId:$("f-name-id").value.trim(),translationStatus:{vi:$("f-name-vi").value.trim()?"reviewed":"empty",id:$("f-name-id").value.trim()?"reviewed":"empty"},category:$("f-category").value.trim(),supplierCode:$("f-supplier-code").value.trim(),supplier:$("f-supplier").value.trim(),cost:Number($("f-cost").value||0),price:Number($("f-price").value||0),untaxed:Number($("f-untaxed").value||$("f-price").value||0),spec:$("f-spec").value.trim()||generated.spec,updatedAt:new Date().toISOString()}}',
      'function keywordsFromText(...values){const set=new Set();for(const value of values){const clean=normalizeSearch(value);if(!clean)continue;set.add(clean);if(/^[a-z0-9]+$/.test(clean)){for(let len=2;len<=Math.min(8,clean.length);len++)set.add(clean.slice(0,len))}const chars=[...clean];for(let n=1;n<=4;n++){for(let i=0;i<=chars.length-n;i++)set.add(chars.slice(i,i+n).join(""))}}return[...set].filter(Boolean).slice(0,180)}function formProduct(){const generated=generateLabelNameFromName($("f-name").value.trim());const labelName=$("f-label-name").value.trim()||generated.labelName;const product={barcode:$("f-barcode").value.trim(),name:$("f-name").value.trim(),labelName,nameVi:$("f-name-vi").value.trim(),nameId:$("f-name-id").value.trim(),translationStatus:{vi:$("f-name-vi").value.trim()?"reviewed":"empty",id:$("f-name-id").value.trim()?"reviewed":"empty"},category:$("f-category").value.trim(),supplierCode:$("f-supplier-code").value.trim(),supplier:$("f-supplier").value.trim(),cost:Number($("f-cost").value||0),price:Number($("f-price").value||0),untaxed:Number($("f-untaxed").value||$("f-price").value||0),spec:$("f-spec").value.trim()||generated.spec,updatedAt:new Date().toISOString()};product.searchKeywords=keywordsFromText(product.barcode,product.name,product.labelName,product.category,product.supplier,product.supplierCode,product.spec);return product}'
    );
    text = text.replace(
      'async function syncProducts(){try{await saveSettings();$("sync-result").textContent="同步中...";const r=await fetch("/api/sync-products-from-drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folderId:state.settings.driveFolderId||undefined})});const d=await r.json();$("sync-result").textContent=JSON.stringify(d,null,2);if(!r.ok||!d.ok)throw new Error(d.message||"同步失敗");await reloadAll()}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}',
      'async function syncProducts(){try{$("sync-result").textContent="請使用初始匯入或同步最新商品檔按鈕"}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}'
    );
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js?v=stable-20260701i"></script><script src="/modal-ui-patch.js?v=stable-20260701i"></script><script src="/cloud-sync-patch.js?v=stable-20260701i"></script></body>');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
