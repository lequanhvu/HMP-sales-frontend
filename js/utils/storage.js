/**
 * storage.js — Quản lý Access Token và thông tin người dùng trong trình duyệt
 * 
 * Hỗ trợ cả In-Memory Token (bảo mật chống XSS) và Session Indicator (khôi phục phiên)
 */

const ACCESS_TOKEN_KEY = 'hmp_access_token';
const USER_INFO_KEY = 'hmp_user_info';
const SESSION_INDICATOR_KEY = 'hmp_has_session';

// Biến lưu Access Token trong RAM (In-Memory)
let inMemoryAccessToken = null;

export const storage = {
  /**
   * Lấy Access Token (ưu tiên từ memory, fallback sang localStorage nếu có)
   */
  getAccessToken() {
    return inMemoryAccessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Lưu Access Token (mặc định lưu trong RAM, không lưu JWT dài hạn vào localStorage để chống XSS)
   * Đồng thời bật cờ session indicator
   */
  setAccessToken(token) {
    inMemoryAccessToken = token || null;
    if (token) {
      localStorage.setItem(SESSION_INDICATOR_KEY, 'true');
    }
  },

  /**
   * Lấy thông tin người dùng từ cache
   */
  getUser() {
    try {
      const data = localStorage.getItem(USER_INFO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Lưu thông tin người dùng vào cache hiển thị
   */
  setUser(user) {
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_INFO_KEY);
    }
  },

  /**
   * Kiểm tra xem trình duyệt có cờ phiên làm việc trước đó không
   */
  hasSessionIndicator() {
    return localStorage.getItem(SESSION_INDICATOR_KEY) === 'true';
  },

  /**
   * Đặt cờ phiên làm việc
   */
  setSessionIndicator(hasSession) {
    if (hasSession) {
      localStorage.setItem(SESSION_INDICATOR_KEY, 'true');
    } else {
      localStorage.removeItem(SESSION_INDICATOR_KEY);
    }
  },

  /**
   * Xóa sạch toàn bộ thông tin xác thực (RAM và LocalStorage)
   */
  clearAuth() {
    inMemoryAccessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(SESSION_INDICATOR_KEY);
  },

  /**
   * Kiểm tra người dùng có token xác thực không
   */
  isAuthenticated() {
    return Boolean(this.getAccessToken());
  }
};
