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
    text = text.replace(
      'function filteredProducts(){const kw=$("search-input").value.trim().toLowerCase();if(!kw)return state.products;return state.products.filter(p=>[p.barcode,p.name,p.labelName,p.nameVi,p.nameId].some(v=>String(v||"").toLowerCase().includes(kw)))}',
      'function filteredProducts(){const raw=$("search-input").value.trim().toLowerCase();if(!raw)return state.products;const terms=raw.split(/[\\s,，、]+/).map(x=>x.trim()).filter(Boolean);return state.products.filter(p=>{const hay=[p.barcode,p.name,p.labelName,p.nameVi,p.nameId,p.category,p.supplier,p.spec].map(v=>String(v||"").toLowerCase()).join(" ");return terms.every(term=>hay.includes(term))})}'
    );
    text = text.replace(
      'async function syncProducts(){try{await saveSettings();$("sync-result").textContent="同步中...";const r=await fetch("/api/sync-products-from-drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folderId:state.settings.driveFolderId||undefined})});const d=await r.json();$("sync-result").textContent=JSON.stringify(d,null,2);if(!r.ok||!d.ok)throw new Error(d.message||"同步失敗");await reloadAll()}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}',
      'async function syncProducts(){try{await saveSettings();$("sync-result").textContent="同步中...";const r=await fetch("/api/sync-products-from-drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({folderId:state.settings.driveFolderId||undefined})});const raw=await r.text();let d;try{d=raw?JSON.parse(raw):{}}catch(_){d={ok:false,message:raw.slice(0,800)||"同步 API 回傳非 JSON 內容"}}$("sync-result").textContent=JSON.stringify(d,null,2);if(!r.ok||!d.ok)throw new Error(d.message||"同步失敗");await reloadAll()}catch(e){$("sync-result").textContent=`同步失敗：${errorMessage(e)}`;setStatus("同步失敗","error")}}'
    );
    text = text.replace('</body>', '<script src="/barcode-scan-fix.js?v=stable-20260701b"></script><script src="/modal-ui-patch.js?v=stable-20260701b"></script></body>');
  }
  if (file === 'api/sync-products-from-drive.ts') {
    if (!text.includes('async function readJsonSafe')) {
      text = text.replace(
        'const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\\\n/g, "\\n");',
        'const signingKey = () => (process.env.DRIVE_SIGNING_KEY || "").replace(/\\\\n/g, "\\n");\n\nasync function readJsonSafe(response: Response, label: string) {\n  const raw = await response.text();\n  if (!raw) return {};\n  try {\n    return JSON.parse(raw);\n  } catch {\n    return { error: { message: `${label} returned non-JSON response: ${raw.slice(0, 500)}` }, rawText: raw.slice(0, 500) };\n  }\n}'
      );
    }
    text = text.replace('const data = await response.json();\n  if (!response.ok || !data.access_token)', 'const data: any = await readJsonSafe(response, "Google OAuth");\n  if (!response.ok || !data.access_token)');
    text = text.replace('const data = await response.json();\n  if (!response.ok) throw new Error(data.error?.message || "Unable to list Drive files");', 'const data: any = await readJsonSafe(response, "Google Drive files list");\n  if (!response.ok) throw new Error(data.error?.message || data.rawText || "Unable to list Drive files");');
    text = text.replace('const data = await response.json();\n  return Object.fromEntries(Object.entries(data.fields || {}).map(([key, val]) => [key, jsValue(val)]));', 'const data: any = await readJsonSafe(response, "Firestore syncState");\n  if (!response.ok) throw new Error(data.error?.message || data.rawText || "Unable to read sync state");\n  return Object.fromEntries(Object.entries(data.fields || {}).map(([key, val]) => [key, jsValue(val)]));');
  }
  fs.writeFileSync(file, text);
}

patchFile('index.html');
patchFile('api/sync-products-from-drive.ts');
