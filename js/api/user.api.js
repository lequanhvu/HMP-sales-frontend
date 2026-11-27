/**
 * user.api.js — Các API liên quan đến Hồ sơ người dùng và Sổ địa chỉ (/api/v1/me/**)
 */

import { client } from './client.js';

export const userApi = {
  /**
   * Lấy thông tin hồ sơ cá nhân của người dùng hiện tại
   * @returns {Promise<{ userId: number, fullName: string, email: string, phone: string, status: string, role: string }>}
   */
  getProfile() {
    return client.get('/me');
  },

  /**
   * Cập nhật thông tin hồ sơ cá nhân (họ tên)
   * @param {Object} data - { fullName: string }
   * @returns {Promise<Object>}
   */
  updateProfile(data) {
    return client.patch('/me', data);
  },

  /**
   * Gửi yêu cầu mã OTP đến số điện thoại cần liên kết / đổi mới
   * @param {string} phone
   * @returns {Promise<Object>}
   */
  requestPhoneOtp(phone) {
    return client.post('/me/otp/request', { phone });
  },

  /**
   * Xác minh mã OTP 6 chữ số và tự động liên kết số điện thoại vào hồ sơ người dùng
   * @param {string} phone
   * @param {string} otp
   * @returns {Promise<{ verified: boolean, phone: string }>}
   */
  verifyPhoneOtp(phone, otp) {
    return client.post('/me/otp/verify', { phone, otp });
  },

  /**
   * Lấy danh sách sổ địa chỉ nhận hàng của người dùng
   * @returns {Promise<Array<{ addressId: number, address: string, province: string, district: string, ward: string, isDefault: boolean, status: string, latitude: number, longitude: number }>>}
   */
  getAddresses() {
    return client.get('/me/addresses');
  },

  /**
   * Thêm một địa chỉ mới vào sổ địa chỉ
   * @param {Object} data - { address, province, district, ward, latitude, longitude, isDefault }
   * @returns {Promise<Object>}
   */
  createAddress(data) {
    return client.post('/me/addresses', data);
  },

  /**
   * Cập nhật thông tin địa chỉ đã có trong sổ địa chỉ
   * @param {number|string} addressId
   * @param {Object} data - { address, province, district, ward, latitude, longitude, isDefault }
   * @returns {Promise<Object>}
   */
  updateAddress(addressId, data) {
    return client.patch(`/me/addresses/${addressId}`, data);
  },

  /**
   * Xóa mềm địa chỉ khỏi sổ địa chỉ
   * @param {number|string} addressId
   * @returns {Promise<void>}
   */
  deleteAddress(addressId) {
    return client.delete(`/me/addresses/${addressId}`);
  }
};
