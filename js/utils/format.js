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
 * Trả về chuỗi mốc thời gian tương đối thân thiện (ví dụ: "Vừa xong", "15 phút trước", "2 giờ trước", "Hôm qua lúc 14:30")
 *
 * @param {string|Date} dateInput - Chuỗi ISO-8601 hoặc đối tượng Date
 * @returns {string} Chuỗi mốc thời gian tương đối
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return 'Vừa xong';
  }
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  if (diffDays === 1) {
    const timeStr = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
    return `Hôm qua lúc ${timeStr}`;
  }
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  return formatDateTime(date);
}

/**
 * Trả về nhãn nhóm mốc thời gian (Milestone Group) để phân loại hiển thị
 *
 * @param {string|Date} dateInput
 * @returns {'Hôm nay' | 'Hôm qua' | 'Tuần này' | 'Tháng này' | 'Trước đó'}
 */
export function getMilestoneGroup(dateInput) {
  if (!dateInput) return 'Trước đó';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Trước đó';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) {
    return 'Hôm nay';
  }
  if (date >= startOfYesterday) {
    return 'Hôm qua';
  }
  if (date >= startOfWeek) {
    return 'Tuần này';
  }
  if (date >= startOfMonth) {
    return 'Tháng này';
  }
  return 'Trước đó';
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

