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
  if (user && storage.isAuthenticated()) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfile) {
      userProfile.style.display = 'inline-flex';
      if (userNameEl) userNameEl.textContent = user.fullName || user.email || 'Tài khoản';
      if (userAvatarEl) {
        const initial = (user.fullName || user.email || 'U').charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
      }
    }
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userProfile) userProfile.style.display = 'none';
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

async function loadCategoryDropdown() {
  const dropdownEl = document.getElementById('nav-category-dropdown');
  if (!dropdownEl) return;

  try {
    const categories = await client.get('/categories/tree');
    if (Array.isArray(categories) && categories.length > 0) {
      dropdownEl.innerHTML = categories.map(cat => `
        <a href="#product-section" class="nav__dropdown-link" data-category-id="${cat.categoryId}">
          <span>${cat.categoryName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </a>
      `).join('');
    }
  } catch (err) {
    // Nếu chưa có kết nối, giữ menu mặc định
  }
}

