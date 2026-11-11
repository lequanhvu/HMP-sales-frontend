/**
 * home.js — Script điều khiển Trang Chủ (Tuân thủ nghiêm ngặt chuẩn <template>)
 */

import { initHeader } from '../components/header.js';
import { client } from '../api/client.js';
import { formatVnd } from '../utils/format.js';

let currentCategoryId = null;
let currentPage = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Khởi tạo thanh điều hướng Header & Menu
  initHeader();

  // 2. Nạp các tab danh mục tôn và danh sách sản phẩm
  await Promise.all([
    loadCategoryTabs(),
    loadProducts()
  ]);
});

/**
 * Nạp danh mục từ backend để tạo các tab lọc nhanh
 */
async function loadCategoryTabs() {
  const tabBar = document.getElementById('category-tab-bar');
  if (!tabBar) return;

  try {
    const categories = await client.get('/categories/tree');
    if (Array.isArray(categories) && categories.length > 0) {
      // Giữ tab "Tất cả sản phẩm" đầu tiên
      tabBar.innerHTML = `<button class="category-tab category-tab--active" data-cat-id="">Tất cả sản phẩm</button>`;

      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-tab';
        btn.textContent = cat.categoryName;
        btn.dataset.catId = cat.categoryId;
        btn.addEventListener('click', () => {
          // Đổi trạng thái active
          tabBar.querySelectorAll('.category-tab').forEach(t => t.classList.remove('category-tab--active'));
          btn.classList.add('category-tab--active');

          currentCategoryId = cat.categoryId;
          currentPage = 0;
          loadProducts();
        });
        tabBar.appendChild(btn);
      });

      // Bắt sự kiện cho nút "Tất cả"
      tabBar.firstElementChild.addEventListener('click', (e) => {
        tabBar.querySelectorAll('.category-tab').forEach(t => t.classList.remove('category-tab--active'));
        e.target.classList.add('category-tab--active');
        currentCategoryId = null;
        currentPage = 0;
        loadProducts();
      });
    }
  } catch (error) {
    console.warn('Không thể nạp danh mục tôn:', error);
  }
}

/**
 * Nạp danh sách sản phẩm tôn sóng từ API backend và render qua <template>
 */
async function loadProducts() {
  const productListEl = document.getElementById('product-list');
  const template = document.getElementById('product-card-template');
  if (!productListEl || !template) return;

  // Hiển thị trạng thái đang tải
  productListEl.innerHTML = `
    <div class="state-box">
      <div class="state-box__spinner"></div>
      <h4 class="state-box__title">Đang tải sản phẩm tôn lợp mái...</h4>
      <p class="state-box__desc">Hệ thống đang kết nối dữ liệu</p>
    </div>
  `;

  try {
    const params = { page: currentPage, size: 8 };
    if (currentCategoryId) {
      params.categoryId = currentCategoryId;
    }

    const response = await client.get('/products', params);
    const products = response.result || [];

    if (products.length === 0) {
      productListEl.innerHTML = `
        <div class="state-box">
          <h4 class="state-box__title">Chưa có sản phẩm nào trong danh mục này</h4>
          <p class="state-box__desc">Vui lòng chọn danh mục khác hoặc quay lại sau</p>
        </div>
      `;
      return;
    }

    // Xóa trạng thái loading
    productListEl.innerHTML = '';

    // Render từng sản phẩm bằng cách clone template (KHÔNG nhúng chuỗi HTML thô)
    products.forEach(product => {
      const clone = template.content.cloneNode(true);

      // 1. Gán thương hiệu
      const brandEl = clone.querySelector('.product-card__brand');
      if (brandEl) brandEl.textContent = product.brandName || 'Chính hãng';

      // 2. Gán tên sản phẩm & đường link
      const titleLink = clone.querySelector('.product-card__link');
      if (titleLink) {
        titleLink.textContent = product.productName;
        titleLink.href = `./pages/product/detail.html?id=${product.productId}`;
      }

      // 3. Gán ảnh sản phẩm (hoặc placeholder nếu chưa có ảnh)
      const imageEl = clone.querySelector('.product-card__image');
      const noImageEl = clone.querySelector('.product-card__no-image');
      if (product.primaryImageUrl && imageEl) {
        imageEl.src = product.primaryImageUrl;
        imageEl.alt = product.productName;
        if (noImageEl) noImageEl.style.display = 'none';
      } else {
        if (imageEl) imageEl.style.display = 'none';
        if (noImageEl) noImageEl.style.display = 'flex';
      }

      // 4. Gán giá niêm yết (Kiểm tra quyền PRODUCT_PRICE_VIEW)
      const priceEl = clone.querySelector('.product-card__price');
      const priceLabelEl = clone.querySelector('.product-card__price-label');
      if (priceEl) {
        if (product.price === null || product.price === undefined) {
          priceEl.textContent = 'Liên hệ báo giá';
          priceEl.className = 'badge badge--contact';
          if (priceLabelEl) priceLabelEl.style.display = 'none';
        } else {
          priceEl.textContent = formatVnd(product.price);
        }
      }

      // 5. Gán đường dẫn nút hành động "Đặt tôn"
      const actionBtn = clone.querySelector('.product-card__action-btn');
      if (actionBtn) {
        actionBtn.href = `./pages/product/detail.html?id=${product.productId}`;
      }

      // Đưa card hoàn chỉnh vào danh sách
      productListEl.appendChild(clone);
    });

  } catch (error) {
    productListEl.innerHTML = `
      <div class="state-box">
        <h4 class="state-box__title" style="color: var(--color-danger);">Không thể kết nối đến máy chủ</h4>
        <p class="state-box__desc">${error.message}</p>
        <p class="state-box__desc" style="margin-top: 0.5rem;">Hãy chắc chắn backend Spring Boot đang chạy tại http://localhost:8080</p>
      </div>
    `;
  }
}
