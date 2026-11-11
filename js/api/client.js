/**
 * client.js — Wrapper gọi API tập trung cho toàn bộ ứng dụng Frontend
 * 
 * Tính năng:
 * - Tự động đính kèm Bearer JWT Token vào header.
 * - Luôn gửi kèm credentials: 'include' để chuyển Cookie HttpOnly (chứa Refresh Token).
 * - Bóc tách envelope chuẩn của Spring Boot backend { statusCode, data, message }.
 * - Tự động Silent Refresh Token khi nhận mã lỗi 401 Unauthorized.
 */

import { storage } from '../utils/storage.js';

export const API_BASE_URL = 'http://localhost:8080/api/v1';

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Thực hiện request mạng với xử lý tự động làm mới token.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = options.headers ? { ...options.headers } : {};

  // Nếu body không phải FormData thì mặc định là JSON
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Luôn gửi kèm cookie HttpOnly chứa Refresh Token
  options.credentials = 'include';

  // Đính kèm Access Token nếu có
  const token = storage.getAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  options.headers = headers;

  try {
    const response = await fetch(url, options);

    // Xử lý khi Token hết hạn (401 Unauthorized)
    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/google')) {
      if (isRefreshing) {
        // Đang có một tiến trình refresh chạy, đẩy request này vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newToken => {
          options.headers['Authorization'] = `Bearer ${newToken}`;
          return request(endpoint, options);
        });
      }

      isRefreshing = true;

      try {
        // Gọi endpoint làm mới token
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        if (!refreshResponse.ok) {
          throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
        }

        const refreshResult = await refreshResponse.json();
        const newAccessToken = refreshResult.data.accessToken;

        storage.setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        // Gọi lại request ban đầu với token mới
        options.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return request(endpoint, options);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        storage.clearAuth();
        // Thông báo hoặc điều hướng khi hết phiên làm việc
        window.dispatchEvent(new CustomEvent('hmp:auth-expired'));
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = json.message || `Lỗi yêu cầu: ${response.status}`;
      const error = new Error(errorMessage);
      error.statusCode = response.status;
      error.errors = json.errors || [];
      throw error;
    }

    // Trả về trường `data` thực tế trong envelope của backend
    return json.data;
  } catch (error) {
    throw error;
  }
}

export const client = {
  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const fullPath = queryString ? `${endpoint}?${queryString}` : endpoint;
    return request(fullPath, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  patch(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return request(endpoint, { method: 'DELETE' });
  }
};

