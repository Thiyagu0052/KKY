// Image preview module: opens a modal when an entry image link is clicked
document.addEventListener('click', e => {
  const link = e.target.closest('a.entry-image');
  if(!link) return;
  e.preventDefault();
  const url = link.href;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal"><div class="modal-head"><h2>Image Preview</h2><button class="icon-btn" data-close>✕</button></div><div style="padding:16px;text-align:center"><img src="${url}" style="max-width:100%;height:auto;max-height:80vh"></div></div>`;
  document.body.append(backdrop);
  backdrop.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>backdrop.remove());
  backdrop.addEventListener('click', evt=>{ if(evt.target===backdrop) backdrop.remove() });
});
