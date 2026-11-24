/**
 * redirect-validator.js — Tiện ích chuẩn hóa và kiểm tra an toàn URL điều hướng (Chống Open Redirect - CWE-601)
 * 
 * Quy tắc bảo vệ:
 * 1. Chỉ chấp nhận các đường dẫn nội bộ bắt đầu bằng "/" đơn.
 * 2. Từ chối tuyệt đối:
 *    - URLs có chứa protocol (http:, https:, ftp:, data:, ...)
 *    - URLs protocol-relative (bắt đầu bằng "//")
 *    - Pseudo-protocols (javascript:, vbscript:, ...)
 *    - Ký tự điều khiển xuống dòng (CRLF injection: \r, \n)
 *    - Các biến thể bypass mã hóa (%2f%2f, /\evil.com, ...)
 * 3. Whitelist so khớp với các trang nội bộ hợp lệ của dự án HMP.
 * 4. Không cho phép redirect về chính trang đăng nhập (tránh lặp vô tận)
 *    hoặc trang Admin đối với vai trò khách hàng.
 */

// Danh sách đường dẫn nội bộ hợp lệ được phép điều hướng
export const ALLOWED_REDIRECT_PATHS = [
  '/',
  '/index.html',
  '/pages/product/catalog.html',
  '/pages/product/detail.html',
  '/pages/customer/order.html',
  '/pages/customer/my-orders.html',
  '/pages/customer/profile.html',
  '/pages/introduction/introduction.html',
  '/pages/contact/contact.html',
  '/pages/admin/dashboard.html',
  '/pages/manager/dashboard.html'
];

export const FORBIDDEN_CUSTOMER_REDIRECTS = [
  '/pages/auth/login.html',
  '/pages/admin/dashboard.html',
  '/pages/admin/orders.html',
  '/pages/admin/products.html',
  '/pages/admin/master-data.html',
  '/pages/manager/dashboard.html',
  '/pages/manager/orders.html'
];

/**
 * Chuẩn hóa và kiểm tra tính an toàn của URL điều hướng.
 * 
 * @param {string|null|undefined} rawUrl - Chuỗi URL cần kiểm tra (từ query param hoặc state)
 * @param {string} [fallback='/index.html'] - Đường dẫn mặc định nếu URL không an toàn
 * @returns {string} Đường dẫn nội bộ đã được xác thực an toàn
 */
export function getSafeRedirectUrl(rawUrl, fallback = '/index.html') {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return fallback;
  }

  // 1. Chống CRLF Injection (loại bỏ ký tự newline, carriage return, null byte)
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // 2. Chống Pseudo-protocols (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript|about|blob):/i.test(trimmed)) {
    return fallback;
  }

  // 3. Chống URLs có giao thức rõ ràng (http://, https://, ftp://, ...)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // 4. Chống Protocol-relative URLs ("//evil.com" hoặc "/\evil.com")
  if (/^[/\\]{2,}/.test(trimmed) || trimmed.startsWith('/\\') || trimmed.startsWith('\\/')) {
    return fallback;
  }

  // 5. Kiểm tra ký tự bắt đầu phải là '/'
  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  // 6. Tách phần pathname (bỏ query string & hash để so khớp whitelist)
  let pathname = trimmed;
  let queryString = '';
  const queryIndex = trimmed.indexOf('?');
  const hashIndex = trimmed.indexOf('#');

  let cutIndex = -1;
  if (queryIndex !== -1 && hashIndex !== -1) {
    cutIndex = Math.min(queryIndex, hashIndex);
  } else if (queryIndex !== -1) {
    cutIndex = queryIndex;
  } else if (hashIndex !== -1) {
    cutIndex = hashIndex;
  }

  if (cutIndex !== -1) {
    pathname = trimmed.slice(0, cutIndex);
    queryString = trimmed.slice(cutIndex);
  }

  // Chuẩn hóa dấu gạch chéo kép nội bộ (ví dụ: "/pages//product/" -> "/pages/product/")
  pathname = pathname.replace(/\/+/g, '/').toLowerCase();

  // 7. Chống các đường dẫn bị cấm (như trang login tránh lặp vòng, trang admin/manager đối với customer)
  const isForbidden = FORBIDDEN_CUSTOMER_REDIRECTS.some(forbidden => 
    pathname === forbidden.toLowerCase() || 
    pathname.startsWith('/pages/admin/') || 
    pathname.startsWith('/pages/manager/')
  );
  if (isForbidden) {
    return fallback;
  }

  // 8. So khớp với Whitelist các đường dẫn hợp lệ
  const isAllowed = ALLOWED_REDIRECT_PATHS.some(allowed => 
    pathname === allowed.toLowerCase()
  );

  if (!isAllowed) {
    return fallback;
  }

  // Trả về pathname chuẩn kèm query hợp lệ (nếu có)
  return pathname + queryString;
}
