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
        this.clearAuth();
        window.dispatchEvent(new CustomEvent('hmp:auth-expired', {
          detail: { error: err.message }
        }));
        window.dispatchEvent(new CustomEvent('hmp:auth-changed', {
          detail: { isAuthenticated: false, user: null }
        }));
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
