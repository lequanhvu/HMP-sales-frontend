/**
 * home.js — Script điều khiển Trang Chủ (Tuân thủ nghiêm ngặt chuẩn <template>)
 */

import { initCommonLayout } from '../components/component-loader.js';
import { client } from '../api/client.js';
import { formatVnd } from '../utils/format.js';

let currentCategoryId = null;
let currentPage = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer từ Component dùng chung
  await initCommonLayout();

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
      const fragment = document.createDocumentFragment();

      // Nút "Tất cả sản phẩm" đầu tiên
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'category-tab category-tab--active';
      allBtn.dataset.catId = '';
      allBtn.textContent = 'Tất cả sản phẩm';
      allBtn.addEventListener('click', () => {
        tabBar.querySelectorAll('.category-tab').forEach(t => t.classList.remove('category-tab--active'));
        allBtn.classList.add('category-tab--active');
        currentCategoryId = null;
        currentPage = 0;
        loadProducts();
      });
      fragment.appendChild(allBtn);

      categories.forEach(cat => {
        const catId = cat.id || cat.categoryId;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'category-tab';
        btn.textContent = cat.categoryName;
        btn.dataset.catId = String(catId);
        btn.addEventListener('click', () => {
          tabBar.querySelectorAll('.category-tab').forEach(t => t.classList.remove('category-tab--active'));
          btn.classList.add('category-tab--active');

          currentCategoryId = catId;
          currentPage = 0;
          loadProducts();
        });
        fragment.appendChild(btn);
      });

      tabBar.replaceChildren(fragment);
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
  const loadingTemplate = document.getElementById('home-loading-template');
  const emptyTemplate = document.getElementById('home-empty-template');
  const errorTemplate = document.getElementById('home-error-template');

  if (!productListEl || !template) return;

  // Hiển thị trạng thái đang tải qua <template>
  if (loadingTemplate) {
    productListEl.replaceChildren(loadingTemplate.content.cloneNode(true));
  }

  try {
    const params = { page: currentPage, size: 8 };
    if (currentCategoryId) {
      params.categoryId = currentCategoryId;
    }

    const response = await client.get('/products', params);
    const products = response.result || [];

    if (products.length === 0) {
      if (emptyTemplate) {
        productListEl.replaceChildren(emptyTemplate.content.cloneNode(true));
      }
      return;
    }

    const fragment = document.createDocumentFragment();

    // Render từng sản phẩm bằng cách clone template (KHÔNG nhúng chuỗi HTML thô)
    products.forEach(product => {
      const clone = template.content.cloneNode(true);
      const productId = product.id || product.productId;

      // 1. Gán thương hiệu
      const brandEl = clone.querySelector('.product-card__brand');
      if (brandEl) brandEl.textContent = product.brandName || 'Chính hãng';

      // 2. Gán tên sản phẩm & đường link
      const titleLink = clone.querySelector('.product-card__link');
      if (titleLink) {
        titleLink.textContent = product.productName;
        titleLink.href = `./pages/product/detail.html?id=${productId}`;
      }

      // 3. Gán ảnh sản phẩm (hoặc empty-picture.png nếu chưa có ảnh)
      const imageEl = clone.querySelector('.product-card__image');
      const noImageEl = clone.querySelector('.product-card__no-image');
      const defaultEmptyImage = './assets/images/empty-picture.png';

      if (imageEl) {
        imageEl.src = product.primaryImageUrl || defaultEmptyImage;
        imageEl.alt = product.productName;
        imageEl.onerror = () => {
          imageEl.src = defaultEmptyImage;
        };
      }
      if (noImageEl) {
        noImageEl.classList.add('hidden');
      }

      // 4. Gán giá niêm yết (Kiểm tra quyền PRODUCT_PRICE_VIEW)
      const priceEl = clone.querySelector('.product-card__price');
      const priceLabelEl = clone.querySelector('.product-card__price-label');
      if (priceEl) {
        if (product.price === null || product.price === undefined) {
          priceEl.textContent = 'Liên hệ báo giá';
          priceEl.className = 'badge badge--contact';
          if (priceLabelEl) priceLabelEl.classList.add('hidden');
        } else {
          priceEl.textContent = formatVnd(product.price);
        }
      }

      // 5. Gán đường dẫn nút hành động "Đặt tôn"
      const actionBtn = clone.querySelector('.product-card__action-btn');
      if (actionBtn) {
        actionBtn.href = `./pages/product/detail.html?id=${productId}`;
      }

      // Đưa card hoàn chỉnh vào DocumentFragment
      fragment.appendChild(clone);
    });

    productListEl.replaceChildren(fragment);

  } catch (error) {
    if (errorTemplate) {
      const errorClone = errorTemplate.content.cloneNode(true);
      const msgEl = errorClone.querySelector('.home-error-msg');
      if (msgEl) {
        msgEl.textContent = error.message || 'Lỗi mạng khi tải dữ liệu';
      }
      productListEl.replaceChildren(errorClone);
    }
  }
}
