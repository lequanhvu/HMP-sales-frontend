/**
 * auth.state.js — Quản lý trạng thái xác thực và vòng đời Token tập trung (Centralized Auth State)
 */

import { storage } from '../utils/storage.js';
import { authApi } from '../api/auth.api.js';

let refreshPromise = null;

export const authState = {
  getAccessToken() {
    return storage.getAccessToken();
  },

  setAccessToken(token) {
    storage.setAccessToken(token);
  },

  getCurrentUser() {
    return storage.getUser();
  },

  setCurrentUser(user) {
    storage.setUser(user);
  },

  isAuthenticated() {
    return storage.isAuthenticated();
  },

  hasSessionIndicator() {
    return storage.hasSessionIndicator();
  },

  setSessionIndicator(hasSession) {
    storage.setSessionIndicator(hasSession);
  },

  /**
   * Khôi phục phiên làm việc (Single-Flight Refresh Promise)
   */
  async restoreSession() {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        // 1. Nếu là phiên thử nghiệm giả lập (Dev Mock), tự khôi phục token trong RAM
        const cachedUser = storage.getUser();
        if (cachedUser && cachedUser.isMock) {
          const mockToken = `mock-jwt-${(cachedUser.role || 'customer').toLowerCase()}-token`;
          storage.setAccessToken(mockToken);
          window.dispatchEvent(new CustomEvent('hmp:session-restored', {
            detail: { user: cachedUser }
          }));
          window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
            detail: { isAuthenticated: true, user: cachedUser }
          }));
          return mockToken;
        }

        // 2. Phiên chính thức: Gọi ngầm refresh token bằng HttpOnly Cookie
        const authData = await authApi.refreshToken();
        if (authData && authData.accessToken) {
          storage.setAccessToken(authData.accessToken);

          // Lấy lại hồ sơ người dùng
          try {
            const profile = await authApi.getMe();
            storage.setUser(profile);
          } catch (profileErr) {
            console.warn('[AuthState] Không thể lấy hồ sơ sau khi refresh:', profileErr);
          }

          window.dispatchEvent(new CustomEvent('hmp:session-restored', {
            detail: { user: storage.getUser() }
          }));
          window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
            detail: { isAuthenticated: true, user: storage.getUser() }
          }));

          return authData.accessToken;
        }
        throw new Error('Không nhận được token từ máy chủ');
      } catch (err) {
        // Chỉ xóa session khi server trả về lỗi xác thực 401/403 (phiên đã hết hạn thực sự)
        if (err.statusCode === 401 || err.statusCode === 403) {
          this.clearAuth();
          window.dispatchEvent(new CustomEvent('hmp:auth-expired', {
            detail: { error: err.message }
          }));
          window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
            detail: { isAuthenticated: false, user: null }
          }));
        } else {
          console.warn('[AuthState] Chưa thể khôi phục token từ server:', err.message);
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  /**
   * Thiết lập trạng thái đăng nhập sau khi xác thực Google thành công
   */
  handleLoginSuccess(accessToken, userProfile) {
    storage.setAccessToken(accessToken);
    storage.setUser(userProfile);

    window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
      detail: { isAuthenticated: true, user: userProfile }
    }));
  },

  /**
   * Đăng xuất người dùng: Thu hồi phiên tại Backend và xóa sạch storage
   */
  async handleLogout() {
    let serverRevoked = false;
    try {
      if (this.isAuthenticated()) {
        await authApi.logout();
        serverRevoked = true;
      }
    } catch (err) {
      console.warn('[AuthState] Gọi logout API thất bại:', err);
    } finally {
      this.clearAuth();
      window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
        detail: { isAuthenticated: false, user: null, serverRevoked }
      }));
    }
    return { serverRevoked };
  },

  clearAuth() {
    storage.clearAuth();
  }
};
