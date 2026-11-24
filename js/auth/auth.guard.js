/**
 * auth.guard.js — Bảo vệ chuyển hướng UX cho các trang yêu cầu đăng nhập khách hàng
 * 
 * LƯU Ý BẢO MẬT:
 * Guard này chỉ là tiện ích trải nghiệm người dùng (UX) để điều hướng nhanh.
 * Ranh giới bảo mật tối cao bắt buộc nằm ở Backend: Mọi API gọi từ trang đều phải
 * kiểm tra JWT và trả về 401 Unauthorized / 403 Forbidden nếu không đủ thẩm quyền.
 */

import { authState } from './auth.state.js';
import { storage } from '../utils/storage.js';
import { getSafeRedirectUrl } from './redirect-validator.js';

/**
 * Tính toán tiền tố đường dẫn quay về thư mục gốc của frontend
 */
export function getRootPrefix() {
  const path = window.location.pathname.replace(/\\/g, '/');
  if (
    path.includes('/pages/product/') ||
    path.includes('/pages/customer/') ||
    path.includes('/pages/admin/') ||
    path.includes('/pages/manager/') ||
    path.includes('/pages/auth/') ||
    path.includes('/pages/introduction/') ||
    path.includes('/pages/contact/')
  ) {
    return '../../';
  } else if (path.includes('/pages/')) {
    return '../';
  }
  return './';
}

/**
 * Lấy URL Dashboard hoặc Trang chủ mặc định dựa trên vai trò (Role)
 * @param {string} role - ADMIN, MANAGER, CUSTOMER
 * @returns {string} URL điều hướng theo cấp thư mục hiện tại
 */
export function getDashboardUrlByRole(role) {
  const prefix = getRootPrefix();
  const normRole = (role || '').toUpperCase();
  if (normRole === 'ADMIN') {
    return `${prefix}pages/admin/dashboard.html`;
  }
  if (normRole === 'MANAGER') {
    return `${prefix}pages/manager/dashboard.html`;
  }
  return `${prefix}index.html`;
}

/**
 * Tự động chuyển hướng sang Dashboard phù hợp nếu người dùng đăng nhập là ADMIN hoặc MANAGER
 * Dùng ở trang chủ (index.html) hoặc trang đăng nhập (login.html)
 * 
 * @returns {Promise<boolean>} Trả về true nếu đã thực hiện chuyển hướng
 */
export async function redirectByRoleIfSpecial() {
  let user = authState.getCurrentUser() || storage.getUser();

  // Nếu chưa có user trong memory, thử lấy lại từ session
  if (!user && authState.hasSessionIndicator()) {
    try {
      await authState.restoreSession();
      user = authState.getCurrentUser() || storage.getUser();
    } catch {
      // Khôi phục thất bại
    }
  }

  if (user && user.role) {
    const normRole = user.role.toUpperCase();
    if (normRole === 'ADMIN' || normRole === 'MANAGER') {
      const targetUrl = getDashboardUrlByRole(normRole);
      window.location.replace(targetUrl);
      return true;
    }
  }

  return false;
}

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
