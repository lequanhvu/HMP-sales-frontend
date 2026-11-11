/**
 * product.api.js — Dịch vụ gọi API dữ liệu Sản phẩm & Danh mục Tôn sóng
 */

import { client } from './client.js';

/**
 * Lấy chi tiết sản phẩm theo ID (kèm ảnh, biến thể, màu sắc và bảng giá).
 * 
 * @param {number|string} productId - ID sản phẩm cần xem
 * @returns {Promise<Object>} Chi tiết sản phẩm trả về từ backend
 */
export async function getProductDetail(productId) {
  return await client.get(`/products/${productId}`);
}

/**
 * Lấy danh sách sản phẩm phân trang và hỗ trợ lọc theo danh mục, trạng thái.
 * 
 * @param {Object} [params] - Tham số lọc { page, size, categoryId, status }
 * @returns {Promise<Object>} Danh sách sản phẩm { result, meta }
 */
export async function getProducts(params = {}) {
  return await client.get('/products', params);
}

/**
 * Lấy cây danh mục sản phẩm tôn lợp mái (đa cấp cha-con).
 * 
 * @returns {Promise<Array>} Danh sách danh mục dạng cây
 */
export async function getCategoriesTree() {
  return await client.get('/categories/tree');
}

