(() => {
  const style = document.createElement('style');
  style.id = 'kf-pwa-ui-fix';
  style.textContent = `
    .apple-login-slot #login-btn{
      height:40px!important;
      min-width:96px!important;
      padding:0 15px!important;
      border-radius:999px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:7px!important;
      white-space:nowrap!important;
      line-height:1!important;
      overflow:hidden!important;
      background:#17181b!important;
      color:#fff!important;
    }
    .apple-login-slot #login-btn svg{
      display:block!important;
      flex:0 0 18px!important;
      width:18px!important;
      height:18px!important;
      margin:0!important;
    }
    .apple-login-slot #login-btn span{
      display:inline-block!important;
      position:static!important;
      margin:0!important;
      padding:0!important;
      line-height:1!important;
      white-space:nowrap!important;
    }
    @media(max-width:430px){
      .apple-login-slot #login-btn{
        min-width:88px!important;
        padding:0 13px!important;
      }
    }
  `;
  document.head.appendChild(style);
})();
