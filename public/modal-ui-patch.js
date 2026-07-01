window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel-products');
  const formCard = $('form-title')?.closest('.card');
  const listCard = $('products-body')?.closest('.card');
  if (!panel || !formCard || !listCard) return;

  const style = document.createElement('style');
  style.textContent = `
    #panel-products{grid-template-columns:1fr!important}
    #panel-products table td.row{display:table-cell!important;white-space:nowrap;vertical-align:middle}
    #panel-products table td.row button{margin-right:6px;margin-bottom:0;padding:8px 10px;display:inline-flex;align-items:center;justify-content:center}
    #panel-products table td.row button:last-child{margin-right:0}
    #panel-products table th:last-child,#panel-products table td:last-child{width:132px;text-align:left}
    #product-form-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:none;align-items:flex-start;justify-content:center;padding:18px;overflow:auto}
    #product-form-modal.open{display:flex}
    #product-form-modal .card{width:min(760px,100%);max-height:calc(100vh - 36px);overflow:auto}
    .modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
    .modal-close{background:#f2f4f7;color:#344054}
    #add-product-modal-btn{margin-left:auto}
  `;
  document.head.appendChild(style);

  const addBtn = document.createElement('button');
  addBtn.id = 'add-product-modal-btn';
  addBtn.className = 'primary';
  addBtn.textContent = '新增商品';
  listCard.querySelector('.row')?.appendChild(addBtn);

  const modal = document.createElement('div');
  modal.id = 'product-form-modal';
  modal.innerHTML = '<div id="product-form-host"></div>';
  document.body.appendChild(modal);
  $('product-form-host').appendChild(formCard);

  const head = document.createElement('div');
  head.className = 'modal-head';
  head.innerHTML = '<strong>商品資料</strong><button type="button" class="modal-close">關閉</button>';
  formCard.prepend(head);

  const openModal = () => modal.classList.add('open');
  const closeModal = () => modal.classList.remove('open');

  head.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

  addBtn.addEventListener('click', () => {
    $('clear-form-btn')?.click();
    openModal();
  });

  document.addEventListener('click', (event) => {
    if (event.target?.matches?.('[data-edit]')) {
      setTimeout(openModal, 0);
    }
  }, true);

  const saveBtn = $('save-product-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      setTimeout(() => {
        if (!saveBtn.disabled && !$('form-status')?.classList.contains('error')) closeModal();
      }, 900);
    });
  }
});
