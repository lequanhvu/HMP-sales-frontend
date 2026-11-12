/**
 * footer.js — Điều khiển logic và tương tác của Footer
 */

/**
 * Khởi tạo các tương tác cho Chân trang (Footer)
 */
export function initFooter() {
  const footerEl = document.querySelector('.footer');
  if (!footerEl) return;

  // 1. Tự động cập nhật năm hiện tại trong bản quyền
  const copyrightEl = footerEl.querySelector('.footer__copyright p');
  if (copyrightEl) {
    const currentYear = new Date().getFullYear();
    copyrightEl.textContent = `© ${currentYear} Tôn Thép HMP — Kiến tạo mái nhà Việt. Tất cả các quyền được bảo lưu.`;
  }
}

