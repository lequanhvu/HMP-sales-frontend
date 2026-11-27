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
  showConfirmModal({
    modalId: 'hmp-confirm-logout-modal',
    title,
    message,
    confirmText,
    cancelText,
    type: 'danger',
    iconSvg: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    `,
    onConfirm
  });
}

/**
 * Hiển thị popup xác nhận thao tác đa năng chuẩn HMP (Xóa địa chỉ, Hoàn tác hủy đơn, v.v.)
 * 
 * @param {Object} options
 * @param {string} [options.modalId='hmp-generic-confirm-modal']
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmText='Xác nhận']
 * @param {string} [options.cancelText='Bỏ qua']
 * @param {'danger' | 'primary'} [options.type='danger']
 * @param {string} [options.iconSvg]
 * @param {Function} [options.onConfirm]
 */
export function showConfirmModal({
  modalId = 'hmp-generic-confirm-modal',
  title = 'Xác nhận thao tác',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này không?',
  confirmText = 'Xác nhận',
  cancelText = 'Bỏ qua',
  type = 'danger',
  iconSvg = null,
  onConfirm = () => {}
} = {}) {
  ensureConfirmModalStyles();

  const isPrimary = type === 'primary';
  const iconWrapClass = isPrimary ? 'confirm-modal__icon-wrap confirm-modal__icon-wrap--primary' : 'confirm-modal__icon-wrap';
  const confirmBtnClass = isPrimary ? 'confirm-modal__btn confirm-modal__btn--primary' : 'confirm-modal__btn confirm-modal__btn--confirm';

  let defaultIcon = '';
  if (isPrimary) {
    defaultIcon = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    `;
  } else {
    defaultIcon = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
  }

  const finalIcon = iconSvg || defaultIcon;

  let overlay = document.getElementById(modalId);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'confirm-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="confirm-modal-box">
        <div class="${iconWrapClass}" id="${modalId}-icon-wrap">
          ${finalIcon}
        </div>
        <h3 class="confirm-modal__title" id="${modalId}-title">${title}</h3>
        <p class="confirm-modal__message" id="${modalId}-desc">${message}</p>
        <div class="confirm-modal__actions">
          <button type="button" class="confirm-modal__btn confirm-modal__btn--cancel" id="${modalId}-cancel-btn">
            ${cancelText}
          </button>
          <button type="button" class="${confirmBtnClass}" id="${modalId}-confirm-btn">
            ${confirmText}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    const iconWrap = overlay.querySelector(`[id$="-icon-wrap"]`);
    const titleEl = overlay.querySelector(`[id$="-title"]`);
    const descEl = overlay.querySelector(`[id$="-desc"]`);
    const confirmBtn = overlay.querySelector(`[id$="-confirm-btn"]`);
    const cancelBtn = overlay.querySelector(`[id$="-cancel-btn"]`);

    if (iconWrap) {
      iconWrap.className = iconWrapClass;
      iconWrap.innerHTML = finalIcon;
    }
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;
    if (confirmBtn) {
      confirmBtn.className = confirmBtnClass;
      confirmBtn.textContent = confirmText;
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;
  }

  const cancelBtn = overlay.querySelector(`[id$="-cancel-btn"]`);
  const confirmBtn = overlay.querySelector(`[id$="-confirm-btn"]`);

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
    if (e.key === 'Escape') closeModal();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  if (cancelBtn) cancelBtn.onclick = closeModal;

  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        await onConfirm();
      }
    };
  }

  openModal();
}
