/**
 * storage.js — Quản lý Access Token và thông tin người dùng trong trình duyệt
 */

const ACCESS_TOKEN_KEY = 'hmp_access_token';
const USER_INFO_KEY = 'hmp_user_info';

export const storage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token) {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  getUser() {
    try {
      const data = localStorage.getItem(USER_INFO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_INFO_KEY);
    }
  },

  clearAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
  },

  isAuthenticated() {
    return !!this.getAccessToken();
  }
};

