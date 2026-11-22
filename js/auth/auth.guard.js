/**
 * auth.guard.js — Bảo vệ chuyển hướng UX cho các trang yêu cầu đăng nhập khách hàng
 * 
 * LƯU Ý BẢO MẬT:
 * Guard này chỉ là tiện ích trải nghiệm người dùng (UX) để điều hướng nhanh.
 * Ranh giới bảo mật tối cao bắt buộc nằm ở Backend: Mọi API gọi từ trang đều phải
 * kiểm tra JWT và trả về 401 Unauthorized / 403 Forbidden nếu không đủ thẩm quyền.
 */

import { authState } from './auth.state.js';
import { getSafeRedirectUrl } from './redirect-validator.js';

/**
 * Kiểm tra xác thực khách hàng trước khi cho phép tương tác trang.
 * Nếu chưa đăng nhập, tự động chuyển hướng về trang đăng nhập kèm tham số ?redirect=.
 * 
 * @param {string} [customRedirectPath] - Đường dẫn mong muốn redirect sau khi đăng nhập (mặc định lấy current URL)
 * @returns {Promise<boolean>} Trả về true nếu đã đăng nhập hợp lệ
 */
export async function requireCustomerAuth(customRedirectPath = null) {
  // 1. Nếu đã có token trong memory
  if (authState.isAuthenticated()) {
    return true;
  }

  // 2. Nếu có cờ phiên làm việc, thử khôi phục session bằng cookie HttpOnly
  if (authState.hasSessionIndicator()) {
    try {
      const newToken = await authState.restoreSession();
      if (newToken) {
        return true;
      }
    } catch {
      // Khôi phục thất bại
    }
  }

  // 3. Chưa đăng nhập: Chuẩn bị đường dẫn redirect an toàn
  const currentPath = customRedirectPath || (window.location.pathname + window.location.search);
  const safePath = getSafeRedirectUrl(currentPath, '/index.html');

  // Tính đường dẫn tới trang login.html tùy cấp thư mục hiện tại
  const isSubPage = window.location.pathname.includes('/pages/');
  const loginUrl = isSubPage ? '../auth/login.html' : './pages/auth/login.html';

  const finalRedirectUrl = `${loginUrl}?redirect=${encodeURIComponent(safePath)}`;
  window.location.href = finalRedirectUrl;
  return false;
}

/**
 * Kiểm tra xác thực quyền Quản trị viên (Admin)
 * @returns {Promise<boolean>}
 */
export async function requireAdminAuth(customRedirectPath = null) {
  const isAuth = await requireCustomerAuth(customRedirectPath);
  if (!isAuth) return false;

  const user = authState.getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    window.location.href = '../../index.html';
    return false;
  }
  return true;
}

/**
 * Kiểm tra xác thực quyền Quản lý hoặc Quản trị viên (Manager / Admin)
 * @returns {Promise<boolean>}
 */
export async function requireManagerAuth(customRedirectPath = null) {
  const isAuth = await requireCustomerAuth(customRedirectPath);
  if (!isAuth) return false;

  const user = authState.getCurrentUser();
  if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
    window.location.href = '../../index.html';
    return false;
  }
  return true;
}
