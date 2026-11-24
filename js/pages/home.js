/**
 * home.js — Script điều khiển Trang Chủ (Tuân thủ nghiêm ngặt chuẩn <template>)
 */

import { initCommonLayout } from '../components/component-loader.js';
import { getFeaturedProducts } from '../api/product.api.js';
import { formatVnd } from '../utils/format.js';
import { authState } from '../auth/auth.state.js';
import { storage } from '../utils/storage.js';
import { redirectByRoleIfSpecial, getDashboardUrlByRole } from '../auth/auth.guard.js';

// 1. Kiểm tra chuyển hướng ngay lập tức nếu phiên là ADMIN / MANAGER (giảm tối đa hiện tượng nháy trang)
const immediateUser = authState.getCurrentUser() || storage.getUser();
if (immediateUser && authState.hasSessionIndicator()) {
  const normRole = (immediateUser.role || '').toUpperCase();
  if (normRole === 'ADMIN' || normRole === 'MANAGER') {
    window.location.replace(getDashboardUrlByRole(normRole));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 2. Kiểm tra nếu phiên là Admin/Manager cần bootstrap qua API
  const redirected = await redirectByRoleIfSpecial();
  if (redirected) return;

  // 3. Nhúng đồng bộ Header & Footer từ Component dùng chung
  await initCommonLayout();

  // 4. Nạp danh sách sản phẩm nổi bật từ bảng FeaturedProduct
  await loadFeaturedProducts();
});

/**
 * Nạp danh sách sản phẩm nổi bật từ API backend (/api/v1/featured-products)
 * và khởi tạo thanh trượt (slider) có 2 nút điều hướng <>
 */
async function loadFeaturedProducts() {
  const trackEl = document.getElementById('product-list');
  const prevBtn = document.getElementById('featured-prev-btn');
  const nextBtn = document.getElementById('featured-next-btn');
  const cardTemplate = document.getElementById('product-card-template');
  const loadingTemplate = document.getElementById('home-loading-template');
  const emptyTemplate = document.getElementById('home-empty-template');
  const errorTemplate = document.getElementById('home-error-template');

  if (!trackEl || !cardTemplate) return;

  // Hiển thị trạng thái đang tải qua <template>
  if (loadingTemplate) {
    trackEl.replaceChildren(loadingTemplate.content.cloneNode(true));
  }

  try {
    const products = await getFeaturedProducts();

    if (!Array.isArray(products) || products.length === 0) {
      if (emptyTemplate) {
        trackEl.replaceChildren(emptyTemplate.content.cloneNode(true));
      }
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const fragment = document.createDocumentFragment();

    // Render từng sản phẩm bằng cách clone template
    products.forEach(item => {
      const clone = cardTemplate.content.cloneNode(true);
      const productId = item.productId || item.id;

      // 1. Gán thương hiệu / danh mục
      const brandEl = clone.querySelector('.product-card__brand');
      if (brandEl) {
        brandEl.textContent = item.brandName || item.categoryName || 'Chính hãng';
      }

      // 2. Gán tên sản phẩm & đường link
      const titleLink = clone.querySelector('.product-card__link');
      if (titleLink) {
        titleLink.textContent = item.productName;
        titleLink.href = `./pages/product/detail.html?id=${productId}`;
      }

      // 3. Gán ảnh sản phẩm (hoặc empty-picture.png nếu chưa có ảnh)
      const imageEl = clone.querySelector('.product-card__image');
      const noImageEl = clone.querySelector('.product-card__no-image');
      const defaultEmptyImage = './assets/images/empty-picture.png';

      if (imageEl) {
        imageEl.src = item.primaryImageUrl || defaultEmptyImage;
        imageEl.alt = item.productName;
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
        if (!item.priceVisible || item.price === null || item.price === undefined) {
          priceEl.textContent = 'Liên hệ báo giá';
          priceEl.className = 'badge badge--contact';
          if (priceLabelEl) priceLabelEl.classList.add('hidden');
        } else {
          priceEl.textContent = formatVnd(item.price);
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

    trackEl.replaceChildren(fragment);

    // Khởi tạo các sự kiện trượt cho 2 nút <>
    initSliderNavigation(trackEl, prevBtn, nextBtn);

  } catch (error) {
    if (errorTemplate) {
      const errorClone = errorTemplate.content.cloneNode(true);
      const msgEl = errorClone.querySelector('.home-error-msg');
      if (msgEl) {
        msgEl.textContent = error.message || 'Lỗi mạng khi tải dữ liệu sản phẩm nổi bật';
      }
      trackEl.replaceChildren(errorClone);
    }
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }
}

/**
 * Khởi tạo tính năng trượt ngang mượt mà với 2 nút điều hướng <>
 *
 * @param {HTMLElement} trackEl Khung chứa danh sách thẻ sản phẩm
 * @param {HTMLButtonElement|null} prevBtn Nút trượt sang trái
 * @param {HTMLButtonElement|null} nextBtn Nút trượt sang phải
 */
function initSliderNavigation(trackEl, prevBtn, nextBtn) {
  if (!trackEl) return;

  function updateButtons() {
    if (!prevBtn || !nextBtn) return;
    const maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
    if (maxScroll <= 5) {
      // Dữ liệu ít, vừa vặn khung hình -> ẩn hoặc disable cả 2 nút
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    prevBtn.disabled = trackEl.scrollLeft <= 10;
    nextBtn.disabled = trackEl.scrollLeft >= maxScroll - 10;
  }

  function getScrollStep() {
    // Trượt theo kích thước 1 card + khoảng cách gap, hoặc 75% chiều rộng khung
    const firstCard = trackEl.querySelector('.product-card');
    if (firstCard) {
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = 20; // 1.25rem = 20px
      return (cardWidth + gap) * 2; // trượt 2 sản phẩm mỗi lần bấm
    }
    return trackEl.clientWidth * 0.75;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const step = getScrollStep();
      trackEl.scrollBy({ left: -step, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const step = getScrollStep();
      trackEl.scrollBy({ left: step, behavior: 'smooth' });
    });
  }

  // Cập nhật trạng thái nút khi người dùng cuộn
  trackEl.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons, { passive: true });

  // Kiểm tra ban đầu sau khi render
  setTimeout(updateButtons, 100);

  // Hỗ trợ kéo rê chuột mượt mà trên Desktop (Drag-to-scroll)
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  trackEl.addEventListener('mousedown', (e) => {
    // Chỉ kích hoạt khi click chuột trái và không click vào nút hành động / link
    if (e.button !== 0 || e.target.closest('a') || e.target.closest('button')) return;
    isDown = true;
    trackEl.style.cursor = 'grabbing';
    startX = e.pageX - trackEl.offsetLeft;
    scrollLeft = trackEl.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    trackEl.style.cursor = '';
  });

  trackEl.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - trackEl.offsetLeft;
    const walk = (x - startX) * 1.5;
    trackEl.scrollLeft = scrollLeft - walk;
  });
}
