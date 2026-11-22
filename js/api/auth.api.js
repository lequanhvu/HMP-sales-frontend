/**
 * auth.api.js — Dịch vụ gọi API xác thực và hồ sơ người dùng
 * 
 * Tích hợp các endpoint:
 * - POST /api/v1/auth/google
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 * - GET  /api/v1/me
 */

import { client, API_BASE_URL } from './client.js';

// Cấu hình Google Client ID (mặc định cho localhost / dev, hỗ trợ ghi đè qua localStorage)
const STORAGE_CLIENT_ID_KEY = 'hmp_google_client_id';
export const DEFAULT_GOOGLE_CLIENT_ID = '985474667822-placeholder.apps.googleusercontent.com';

export const authApi = {
  /**
   * Lấy Google Client ID đã được cấu hình (ưu tiên từ localStorage cho dev testing).
   * @returns {string}
   */
  getGoogleClientId() {
    try {
      const customId = localStorage.getItem(STORAGE_CLIENT_ID_KEY);
      if (customId && customId.trim()) {
        return customId.trim();
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
    return DEFAULT_GOOGLE_CLIENT_ID;
  },

  /**
   * Lưu tùy chỉnh Google Client ID cho môi trường phát triển.
   * @param {string} clientId
   */
  setGoogleClientId(clientId) {
    if (clientId && clientId.trim()) {
      localStorage.setItem(STORAGE_CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(STORAGE_CLIENT_ID_KEY);
    }
  },

  /**
   * Đăng nhập bằng Google ID Token (credential).
   * @param {string} credential - Chuỗi JWT Google ID Token từ GIS SDK
   * @returns {Promise<{ accessToken: string, tokenType: string }>}
   */
  async loginWithGoogle(credential) {
    return client.post('/auth/google', { credential });
  },

  /**
   * Làm mới Access Token sử dụng HttpOnly Cookie (refresh_token).
   * Gọi fetch trực tiếp với credentials: 'include' để tránh vòng lặp interceptor.
   * @returns {Promise<{ accessToken: string, tokenType: string }>}
   */
  async refreshToken() {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(json.message || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      error.statusCode = response.status;
      throw error;
    }

    return json.data;
  },

  /**
   * Đăng xuất: thu hồi Access Token (Redis) và Refresh Token (DB), xóa cookie.
   * @returns {Promise<void>}
   */
  async logout() {
    return client.post('/auth/logout');
  },

  /**
   * Lấy thông tin hồ sơ của người dùng hiện tại đang đăng nhập.
   * @returns {Promise<{ userId: number, fullName: string, email: string, phone: string, status: string, role: string }>}
   */
  async getMe() {
    return client.get('/me');
  }
};
