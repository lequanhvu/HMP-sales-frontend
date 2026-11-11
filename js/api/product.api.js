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
 * Lấy danh sách sản phẩm phân trang và hỗ trợ lọc theo tên sản phẩm, tên danh mục, trạng thái, sắp xếp.
 * 
 * @param {Object} [params] - Tham số lọc { page, size, productName, categoryName, status, sortBy, sortDirection }
 * @returns {Promise<Object>} Danh sách sản phẩm { result, meta }
 */
export async function getProducts(params = {}) {
  return await client.get('/products', params);
}

/**
 * Lấy danh sách sản phẩm thuộc một danh mục cụ thể có phân trang.
 * 
 * @param {number|string} categoryId - ID danh mục
 * @param {Object} [params] - Tham số phân trang { page, size }
 * @returns {Promise<Object>} Object { categoryId, categoryName, products: { result, meta } }
 */
export async function getProductsByCategory(categoryId, params = {}) {
  return await client.get(`/categories/${categoryId}/products`, params);
}

/**
 * Lấy cây danh mục sản phẩm tôn lợp mái (đa cấp cha-con).
 * 
 * @returns {Promise<Array>} Danh sách danh mục dạng cây
 */
export async function getCategoriesTree() {
  return await client.get('/categories/tree');
}
