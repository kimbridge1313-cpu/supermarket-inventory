window.addEventListener('DOMContentLoaded', () => {
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 900;
  if (!isMobileDevice) return;

  document.body.classList.add('mobile-ui');

  const style = document.createElement('style');
  style.textContent = `
    body.mobile-ui{padding-top:52px!important}
    body.mobile-ui header{padding:14px 12px 12px 12px!important}
    body.mobile-ui header h1{font-size:18px!important;line-height:1.25!important;max-width:100%!important}
    body.mobile-ui header p{font-size:12px!important;line-height:1.35!important;max-width:100%!important}
    body.mobile-ui #auth-card{top:8px!important;right:8px!important}
    body.mobile-ui #auth-compact{padding:3px!important;background:rgba(255,255,255,.98)!important}
    body.mobile-ui #auth-avatar{width:32px!important;height:32px!important;font-size:12px!important}
    body.mobile-ui #auth-compact #user-label{display:none!important}
    body.mobile-ui #auth-compact button{padding:0!important;width:32px!important;height:32px!important;border-radius:999px!important;font-size:0!important;overflow:hidden!important;position:relative!important}
    body.mobile-ui #auth-compact #login-btn::after{content:'入';font-size:12px}
    body.mobile-ui #auth-compact #logout-btn::after{content:'出';font-size:12px}
    body.mobile-ui main{padding:10px!important;gap:10px!important}
    body.mobile-ui .card{border-radius:14px!important;padding:12px!important}
    body.mobile-ui .tabs{gap:6px!important}
    body.mobile-ui .tab,body.mobile-ui button{padding:9px 10px;border-radius:10px;font-size:13px}
    body.mobile-ui #panel-products .card>.row:first-child{align-items:center!important;gap:8px!important}
    body.mobile-ui #panel-products .card>.row:first-child h2{font-size:18px!important;margin:0!important}
    body.mobile-ui #add-product-modal-btn{width:auto!important;margin-left:0!important;margin-top:0!important;padding:7px 10px!important;font-size:12px!important;order:3!important}
    body.mobile-ui #product-search-row{grid-template-columns:1fr 1fr!important;align-items:stretch!important}
    body.mobile-ui #product-search-row input{grid-column:1/-1!important;font-size:16px!important}
    body.mobile-ui #scan-product-barcode-btn{width:100%!important;font-size:16px!important;padding:13px 14px!important;box-shadow:0 8px 18px rgba(49,92,72,.18)!important}
    body.mobile-ui #voice-product-search-btn{width:100%!important;font-size:15px!important;padding:13px 14px!important;background:#eef4ef!important;color:var(--accent)!important}
    body.mobile-ui #panel-products .table-wrap{border:0!important;overflow:visible!important;border-radius:0!important}
    body.mobile-ui #panel-products table{width:100%!important;min-width:0!important;border-collapse:separate!important;border-spacing:0 10px!important}
    body.mobile-ui #panel-products thead{display:none!important}
    body.mobile-ui #panel-products tbody{display:block!important;width:100%!important}
    body.mobile-ui #panel-products tr{display:grid!important;background:#fff!important;border:1px solid #e5e7eb!important;border-radius:14px!important;padding:13px!important;margin-bottom:10px!important;box-shadow:0 4px 14px rgba(16,24,40,.04)!important;gap:10px!important}
    body.mobile-ui #panel-products td{display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;gap:8px!important;width:100%!important;border-bottom:0!important;padding:0!important;font-size:14px!important;white-space:normal!important;align-items:start!important}
    body.mobile-ui #panel-products td::before{font-size:12px!important;font-weight:700!important;color:#667085!important;line-height:1.65!important}
    body.mobile-ui #panel-products td:nth-child(1){order:2!important;color:#475467!important;font-size:13px!important}
    body.mobile-ui #panel-products td:nth-child(1)::before{content:'條碼'!important}
    body.mobile-ui #panel-products td:nth-child(2){order:1!important;display:block!important;font-size:15px!important;line-height:1.45!important}
    body.mobile-ui #panel-products td:nth-child(2)::before{content:''!important;display:none!important}
    body.mobile-ui #panel-products td:nth-child(2) strong{display:none!important}
    body.mobile-ui #panel-products td:nth-child(2) br:first-of-type{display:none!important}
    body.mobile-ui #panel-products td:nth-child(2) .muted:first-of-type{display:block!important;color:#101828!important;font-size:16px!important;font-weight:800!important;line-height:1.45!important}
    body.mobile-ui #panel-products td:nth-child(2) .muted:last-of-type{display:none!important}
    body.mobile-ui #panel-products td:nth-child(3),body.mobile-ui #panel-products td:nth-child(5){display:none!important}
    body.mobile-ui #panel-products td:nth-child(4){order:3!important;font-size:18px!important;font-weight:900!important;color:var(--accent)!important}
    body.mobile-ui #panel-products td:nth-child(4)::before{content:'售價'!important}
    body.mobile-ui #panel-products td:nth-child(6){order:4!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;width:100%!important;padding-top:6px!important}
    body.mobile-ui #panel-products td:nth-child(6)::before{display:none!important;content:''!important}
    body.mobile-ui #panel-products table td.row{white-space:normal!important;vertical-align:top!important}
    body.mobile-ui #panel-products table td.row button{margin:0!important;padding:12px 14px!important;display:flex!important;width:100%!important;justify-content:center!important;font-size:15px!important;border-radius:12px!important}
  `;
  document.head.appendChild(style);

  const cleanNames = () => {
    document.querySelectorAll('#panel-products td:nth-child(2) .muted:first-of-type').forEach((el) => {
      el.textContent = el.textContent.replace(/^完整：/, '');
    });
  };
  cleanNames();
  const body = document.getElementById('products-body');
  if (body) new MutationObserver(cleanNames).observe(body, { childList: true, subtree: true });
});
