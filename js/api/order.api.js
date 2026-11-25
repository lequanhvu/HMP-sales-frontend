/**
 * order.api.js — Các API liên quan đến Đơn hàng và Sổ địa chỉ khách hàng
 */

import { client } from './client.js';

export const orderApi = {
  /**
   * Tạo đơn hàng mới từ khách hàng
   * @param {Object} data - { receiverName, receiverPhone, addressId, note, items }
   * @returns {Promise<Object>}
   */
  createOrder(data) {
    return client.post('/orders', data);
  },

  /**
   * Lấy danh sách đơn hàng của khách hàng
   * @param {Object} params - { page, size, status, dateFrom, dateTo }
   * @returns {Promise<Object>}
   */
  getMyOrders(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return client.get(qs ? `/orders?${qs}` : '/orders');
  },

  /**
   * Lấy chi tiết đơn hàng theo ID
   * @param {number|string} orderId
   * @returns {Promise<Object>}
   */
  getOrderById(orderId) {
    return client.get(`/orders/${orderId}`);
  },

  /**
   * Hủy đơn hàng
   * @param {number|string} orderId
   * @param {string} reason
   * @returns {Promise<Object>}
   */
  cancelOrder(orderId, reason) {
    return client.post(`/orders/${orderId}/cancel`, { reason });
  },

  /**
   * Lấy danh sách sổ địa chỉ nhận hàng của khách hàng
   * @returns {Promise<Array>}
   */
  getMyAddresses() {
    return client.get('/me/addresses');
  },

  /**
   * Thêm địa chỉ mới vào sổ địa chỉ
   * @param {Object} data - { address, isDefault }
   * @returns {Promise<Object>}
   */
  createAddress(data) {
    return client.post('/me/addresses', data);
  }
};
