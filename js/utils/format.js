/**
 * format.js — Các hàm tiện ích định dạng tiền tệ, ngày tháng và xử lý chuỗi
 */

/**
 * Định dạng tiền tệ VND chuẩn Việt Nam.
 * Nếu số tiền là null hoặc undefined (thiếu quyền PRODUCT_PRICE_VIEW), trả về "Liên hệ báo giá".
 *
 * @param {number|null|undefined} amount - Số tiền dạng số nguyên
 * @returns {string} Chuỗi định dạng (ví dụ: "5.000.000 ₫" hoặc "Liên hệ báo giá")
 */
export function formatVnd(amount) {
  if (amount === null || amount === undefined) {
    return 'Liên hệ báo giá';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Định dạng ngày giờ chuẩn Việt Nam (HH:mm dd/MM/yyyy).
 *
 * @param {string|Date} dateInput - Chuỗi ISO-8601 hoặc đối tượng Date
 * @returns {string} Chuỗi ngày giờ thân thiện
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Làm sạch chuỗi HTML chống tấn công XSS khi hiển thị dữ liệu từ người dùng.
 *
 * @param {string} str - Chuỗi cần làm sạch
 * @returns {string} Chuỗi an toàn
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

