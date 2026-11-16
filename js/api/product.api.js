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
 * Backend trả về sản phẩm của chính danh mục đó và toàn bộ danh mục con cháu của nó.
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

/**
 * Lấy gợi ý tìm kiếm tức thời (type-ahead). Hỗ trợ tiếng Việt không dấu và tự sửa lỗi gõ sai chính tả.
 * 
 * @param {string} keyword - Từ khóa đang gõ (tối đa 50 ký tự)
 * @param {Object} [options] - Tùy chọn { type: 'PRODUCT'|'CATEGORY'|'BRAND', limit }
 * @returns {Promise<Array>} Danh sách gợi ý { id, name, type, imageUrl, extraInfo }
 */
export async function getSearchSuggestions(keyword, options = {}) {
  return await client.get('/search/suggestions', {
    keyword,
    type: options.type,
    limit: options.limit || 8
  });
}

/**
 * Lấy danh sách màu sắc tôn đang hoạt động (kèm ảnh mẫu màu) từ dữ liệu danh mục chung.
 * 
 * @returns {Promise<Array>} Danh sách màu { id, colorName, imageUrl }
 */
export async function getActiveColors() {
  return await client.get('/colors');
}

/**
 * Lấy danh sách sản phẩm nổi bật (Featured Products) đang kích hoạt để hiển thị trang chủ.
 * 
 * @returns {Promise<Array>} Danh sách sản phẩm nổi bật từ bảng featured_products
 */
export async function getFeaturedProducts() {
  return await client.get('/featured-products');
}


