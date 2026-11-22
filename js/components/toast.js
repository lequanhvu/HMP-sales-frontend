/**
 * toast.js — Component thông báo nổi (Toast Notification) chuẩn BEM
 * 
 * Tính năng:
 * - Hỗ trợ các kiểu thông báo: success, error, warning, info
 * - 100% tuân thủ CSS Variables và chống XSS bằng textContent
 * - Hỗ trợ tự động ẩn sau timeout và nút đóng thủ công
 */

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('role', 'region');
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

const ICONS = {
  success: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`,
  error: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>`,
  warning: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,
  info: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`
};

/**
 * Hiển thị một thông báo nổi (Toast).
 * 
 * @param {Object} options
 * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Loại thông báo
 * @param {string} [options.title] - Tiêu đề thông báo
 * @param {string} options.message - Nội dung thông báo
 * @param {number} [options.duration=4000] - Thời gian hiển thị (ms), 0 để giữ nguyên
 */
export function showToast({ type = 'info', title = '', message = '', duration = 4000 }) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');

  // Khối icon
  const iconEl = document.createElement('div');
  iconEl.className = 'toast__icon';
  iconEl.innerHTML = ICONS[type] || ICONS.info;
  toast.appendChild(iconEl);

  // Khối nội dung văn bản (dùng textContent chống XSS)
  const contentEl = document.createElement('div');
  contentEl.className = 'toast__content';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'toast__title';
    titleEl.textContent = title;
    contentEl.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.className = 'toast__message';
  messageEl.textContent = message;
  contentEl.appendChild(messageEl);

  toast.appendChild(contentEl);

  // Nút đóng thủ công
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast__close';
  closeBtn.setAttribute('aria-label', 'Đóng thông báo');
  closeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;

  const removeToast = () => {
    toast.classList.add('toast--leaving');
    toast.addEventListener('animationend', () => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, { once: true });
  };

  closeBtn.addEventListener('click', removeToast);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

export const toast = {
  success(message, title = 'Thành công') {
    showToast({ type: 'success', title, message });
  },
  error(message, title = 'Lỗi') {
    showToast({ type: 'error', title, message });
  },
  warning(message, title = 'Cảnh báo') {
    showToast({ type: 'warning', title, message });
  },
  info(message, title = 'Thông báo') {
    showToast({ type: 'info', title, message });
  }
};
