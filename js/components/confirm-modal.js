/**
 * confirm-modal.js — Hiển thị hộp thoại xác nhận thao tác (Confirm Dialog / Modal)
 */

function ensureConfirmModalStyles() {
  const existing = document.querySelector('link[data-component="confirm-modal"]');
  if (!existing) {
    const path = window.location.pathname.replace(/\\/g, '/');
    let prefix = './';
    if (path.includes('/pages/product/') || path.includes('/pages/customer/') ||
        path.includes('/pages/admin/') || path.includes('/pages/auth/') ||
        path.includes('/pages/introduction/') || path.includes('/pages/contact/') ||
        path.includes('/pages/manager/')) {
      prefix = '../../';
    } else if (path.includes('/pages/')) {
      prefix = '../';
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${prefix}assets/css/components/confirm-modal.css`;
    link.dataset.component = 'confirm-modal';
    document.head.appendChild(link);
  }
}

/**
 * Hiển thị popup xác nhận đăng xuất chuẩn HMP
 * 
 * @param {Object} options
 * @param {string} [options.title='Xác nhận đăng xuất']
 * @param {string} [options.message='Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?']
 * @param {string} [options.confirmText='Đăng xuất']
 * @param {string} [options.cancelText='Hủy']
 * @param {Function} [options.onConfirm]
 */
export function showLogoutConfirm({
  title = 'Xác nhận đăng xuất',
  message = 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
  confirmText = 'Đăng xuất',
  cancelText = 'Hủy',
  onConfirm = () => {}
} = {}) {
  ensureConfirmModalStyles();

  let overlay = document.getElementById('hmp-confirm-logout-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'hmp-confirm-logout-modal';
    overlay.className = 'confirm-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="confirm-modal-box">
        <div class="confirm-modal__icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>
        <h3 class="confirm-modal__title" id="hmp-modal-title">${title}</h3>
        <p class="confirm-modal__message" id="hmp-modal-desc">${message}</p>
        <div class="confirm-modal__actions">
          <button type="button" class="confirm-modal__btn confirm-modal__btn--cancel" id="hmp-modal-cancel-btn">
            ${cancelText}
          </button>
          <button type="button" class="confirm-modal__btn confirm-modal__btn--confirm" id="hmp-modal-confirm-btn">
            ${confirmText}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    const titleEl = overlay.querySelector('#hmp-modal-title');
    const descEl = overlay.querySelector('#hmp-modal-desc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;
  }

  const cancelBtn = overlay.querySelector('#hmp-modal-cancel-btn');
  const confirmBtn = overlay.querySelector('#hmp-modal-confirm-btn');

  const closeModal = () => {
    overlay.classList.remove('confirm-modal-overlay--open');
    document.removeEventListener('keydown', handleKeydown);
  };

  const openModal = () => {
    overlay.classList.add('confirm-modal-overlay--open');
    if (confirmBtn) confirmBtn.focus();
    document.addEventListener('keydown', handleKeydown);
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  cancelBtn.onclick = () => {
    closeModal();
  };

  confirmBtn.onclick = async () => {
    closeModal();
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  };

  openModal();
}
