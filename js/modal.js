function openModal(title, bodyHTML, footerHTML) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  const modal = document.createElement('div');
  modal.className = 'modal';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <h2>${title}</h2>
    <button class="modal-close" type="button">&times;</button>
  `;

  header.querySelector('.modal-close').addEventListener('click', closeModal);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.innerHTML = bodyHTML;

  modal.appendChild(header);
  modal.appendChild(body);

  if (footerHTML) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.innerHTML = footerHTML;
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.addEventListener('keydown', handleEscape);

  return modal;
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.remove();
  }
  document.removeEventListener('keydown', handleEscape);
}

function handleEscape(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}
