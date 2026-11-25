/**
 * cart.api.js — Quản lý các lệnh gọi API giỏ hàng tới Backend Spring Boot
 */

import { client } from './client.js';

export const cartApi = {
  /**
   * Lấy chi tiết toàn bộ giỏ hàng của người dùng hiện tại.
   * @returns {Promise<{ cartId: number, totalItems: number, items: Array }>}
   */
  getCart() {
    return client.get('/cart');
  },

  /**
   * Lấy tổng số lượng món trong giỏ để cập nhật Badge Header.
   * @returns {Promise<{ totalCount: number }>}
   */
  getCartCount() {
    return client.get('/cart/count');
  },

  /**
   * Thêm sản phẩm vào giỏ hàng (tự động cộng dồn nếu trùng quy cách).
   * @param {Object} data - { productId, variantId, colorId, unitId, size, dimensions, quantity }
   * @returns {Promise<Object>}
   */
  addToCart(data) {
    return client.post('/cart/items', data);
  },

  /**
   * Cập nhật số lượng hoặc quy cách kích thước của món trong giỏ.
   * @param {number} cartItemId
   * @param {Object} data - { quantity, size, dimensions }
   * @returns {Promise<Object>}
   */
  updateCartItem(cartItemId, data) {
    return client.patch(`/cart/items/${cartItemId}`, data);
  },

  /**
   * Xóa 1 món khỏi giỏ hàng.
   * @param {number} cartItemId
   * @returns {Promise<void>}
   */
  removeFromCart(cartItemId) {
    return client.delete(`/cart/items/${cartItemId}`);
  },

  /**
   * Xóa sạch toàn bộ sản phẩm trong giỏ hàng.
   * @returns {Promise<void>}
   */
  clearCart() {
    return client.delete('/cart/clear');
  }
};
