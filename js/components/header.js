/**
 * header.js — Điều khiển logic và trạng thái của Header
 */

import { storage } from '../utils/storage.js';
import { client } from '../api/client.js';

export function initHeader() {
  const loginBtn = document.getElementById('header-login-btn');
  const userProfile = document.getElementById('header-user-profile');
  const userNameEl = document.getElementById('header-user-name');
  const userAvatarEl = document.getElementById('header-user-avatar');

  // 1. Kiểm tra trạng thái đăng nhập
  const user = storage.getUser();
  const isAuthenticated = Boolean(user && storage.isAuthenticated());

  if (loginBtn) {
    loginBtn.classList.toggle('hidden', isAuthenticated);
  }
  if (userProfile) {
    userProfile.classList.toggle('header__user-profile--visible', isAuthenticated);
    if (isAuthenticated) {
      if (userNameEl) userNameEl.textContent = user.fullName || user.email || 'Tài khoản';
      if (userAvatarEl) {
        const initial = (user.fullName || user.email || 'U').charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
      }
    }
  }

  // 2. Xử lý mở Menu trên Mobile
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav-drawer');

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('mobile-nav--open');
    });

    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) {
        mobileNav.classList.remove('mobile-nav--open');
      }
    });
  }

  // 4. Nạp động danh mục tôn vào dropdown (nếu có)
  loadCategoryDropdown();
}

/**
 * Tính toán đường dẫn tương đối tới trang danh mục sản phẩm (catalog.html)
 * tùy theo cấp thư mục hiện tại của trang đang mở.
 */
function getCatalogPageUrl(categoryId) {
  const path = window.location.pathname;
  let base = './pages/product/catalog.html';
  if (path.includes('/pages/product/')) {
    base = './catalog.html';
  } else if (path.includes('/pages/')) {
    base = '../product/catalog.html';
  }
  return categoryId ? `${base}?categoryId=${categoryId}` : base;
}

async function loadCategoryDropdown() {
  const dropdownEl = document.getElementById('nav-category-dropdown');
  if (!dropdownEl) return;

  try {
    const categories = await client.get('/categories/tree');
    if (Array.isArray(categories) && categories.length > 0) {
      const fragment = document.createDocumentFragment();

      categories.forEach(cat => {
        const catId = cat.id || cat.categoryId;
        const targetUrl = getCatalogPageUrl(catId);

        const link = document.createElement('a');
        link.href = targetUrl;
        link.className = 'nav__dropdown-link';
        link.dataset.categoryId = String(catId);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = cat.categoryName;
        link.appendChild(nameSpan);

        // SVG mũi tên điều hướng
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '9 18 15 12 9 6');
        svg.appendChild(polyline);

        link.appendChild(svg);
        fragment.appendChild(link);
      });

      dropdownEl.replaceChildren(fragment);
    }
  } catch (err) {
    // Nếu chưa có kết nối, giữ menu mặc định
  }
}

