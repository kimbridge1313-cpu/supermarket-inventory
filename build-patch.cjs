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
      'import { getFirestore, collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";'
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
      'async function reloadAll(){try{setStatus("設定載入中...");await loadSettings();state.products=[];state.queue=[];renderProducts();renderProductSelect();$("product-count").textContent="尚未查詢";$("products-body").innerHTML=`<tr><td colspan="6" class="muted">為避免 Firestore 讀取數暴增，系統不會自動載入全部商品。請輸入條碼或品名前幾個字查詢。</td></tr>`;setStatus("系統已初始化；請用條碼或品名前綴查詢商品")}catch(e){setStatus(`資料載入失敗：${errorMessage(e)}`,"error");console.error(e)}}'
    );
    text = text.replace(
      'async function loadProducts(){const snap=await getDocs(query(collection(state.db,"products"),orderBy("name")));state.products=snap.docs.map(d=>({docId:d.id,...d.data()}));renderProducts();renderProductSelect()}',
      'async function loadProducts(){state.products=[];renderProducts();renderProductSelect()}let productSearchTimer=null;function docIdFromValue(value){return encodeURIComponent(String(value||"").trim()).replace(/\\./g,"%2E").slice(0,900)}function scheduleProductSearch(){clearTimeout(productSearchTimer);productSearchTimer=setTimeout(searchProducts,450)}async function searchProducts(){const raw=$("search-input").value.trim();if(!raw){state.products=[];renderProducts();renderProductSelect();$("product-count").textContent="尚未查詢";$("products-body").innerHTML=`<tr><td colspan="6" class="muted">請輸入條碼或品名前幾個字查詢。</td></tr>`;return}try{$("product-count").textContent="查詢中...";const found=new Map();const addSnap=(snap)=>snap.docs.forEach(d=>found.set(d.id,{docId:d.id,...d.data()}));try{const exact=await getDoc(doc(state.db,"products",docIdFromValue(raw)));if(exact.exists())found.set(exact.id,{docId:exact.id,...exact.data()})}catch(e){console.warn("exact doc search failed",e)}const queries=[query(collection(state.db,"products"),where("barcode","==",raw),limit(20)),query(collection(state.db,"products"),where("name",">=",raw),where("name","<=",raw+"\\uf8ff"),orderBy("name"),limit(20)),query(collection(state.db,"products"),where("labelName",">=",raw),where("labelName","<=",raw+"\\uf8ff"),orderBy("labelName"),limit(20))];for(const q of queries){try{addSnap(await getDocs(q))}catch(e){console.warn("product query failed",e)}}state.products=[...found.values()].slice(0,50);renderProducts();renderProductSelect();setStatus(`商品查詢完成：${state.products.length} 筆`)}catch(e){setStatus(`商品查詢失敗：${errorMessage(e)}`,"error");$("products-body").innerHTML=`<tr><td colspan="6" class="muted">查詢失敗：${safe(errorMessage(e))}</td></tr>`}}'
    );
    text = text.replace(
      'async function syncProducts(){try{await saveSettings();$("sync-result").textContent="同步中...";const r=await fetch("/api/sync-products-from-drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folderId:state.settings.driveFolderId||undefined})});const d=await r.json();$("sync-result").textContent=JSON.stringify(d,null,2);if(!r.ok||!d.ok)throw new Error(d.message||"同步失敗");await reloadAll()}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}',
      'async function syncProducts(){try{$("sync-result").textContent="請使用初始匯入或同步最新商品檔按鈕"}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}'
    );
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js?v=stable-20260701h"></script><script src="/modal-ui-patch.js?v=stable-20260701h"></script><script src="/cloud-sync-patch.js?v=stable-20260701h"></script></body>');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
