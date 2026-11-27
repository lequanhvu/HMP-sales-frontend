/**
 * notification.api.js — Quản lý API Thông báo (Notification API client)
 */

import { client } from './client.js';

export const notificationApi = {
  /**
   * Lấy danh sách thông báo phân trang của người dùng hiện tại
   * @param {Object} [params] - { page: 0, size: 10 }
   * @returns {Promise<{ items: Array, totalElements: number, totalPages: number, pageNumber: number, pageSize: number, hasPrevious: boolean, hasNext: boolean }>}
   */
  getNotifications(params = {}) {
    return client.get('/notifications', params);
  },

  /**
   * Lấy số lượng thông báo chưa đọc (dùng cho badge hiển thị)
   * @returns {Promise<{ unreadCount: number }>}
   */
  getUnreadCount() {
    return client.get('/notifications/unread-count');
  },

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc
   * @param {number|string} notificationId
   * @returns {Promise<Object>}
   */
  markAsRead(notificationId) {
    return client.post(`/notifications/${notificationId}/read`);
  },

  /**
   * Đánh dấu toàn bộ thông báo chưa đọc là đã đọc
   * @returns {Promise<{ updatedCount: number }>}
   */
  markAllAsRead() {
    return client.post('/notifications/read-all');
  }
};
