/**
 * header.js — Điều khiển logic và trạng thái của Header
 */

import { authState } from '../auth/auth.state.js';
import { storage } from '../utils/storage.js';
import { client } from '../api/client.js';
import { toast } from './toast.js';

let isHeaderInitialized = false;

export function initHeader() {
  const loginBtn = document.getElementById('header-login-btn');
  const userWrapper = document.getElementById('header-user-wrapper');
  const userProfileBtn = document.getElementById('header-user-profile');
  const userDropdown = document.getElementById('header-user-dropdown');
  const userNameEl = document.getElementById('header-user-name');
  const userAvatarEl = document.getElementById('header-user-avatar');
  const dropdownNameEl = document.getElementById('dropdown-user-fullname');
  const dropdownEmailEl = document.getElementById('dropdown-user-email');
  const dropdownRoleEl = document.getElementById('dropdown-user-role');
  const logoutBtn = document.getElementById('header-logout-btn');

  // Mobile elements
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const mobileProfileBox = document.getElementById('mobile-profile-box');
  const mobileUserAvatar = document.getElementById('mobile-user-avatar');
  const mobileUserName = document.getElementById('mobile-user-name');
  const mobileUserEmail = document.getElementById('mobile-user-email');
  const mobileAuthLinks = document.getElementById('mobile-auth-links');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');

  // Hàm render trạng thái xác thực
  function renderAuthState() {
    const user = authState.getCurrentUser() || storage.getUser();
    const isAuthenticated = authState.isAuthenticated() || (authState.hasSessionIndicator() && Boolean(user));

    if (loginBtn) {
      loginBtn.classList.toggle('hidden', isAuthenticated);
    }
    if (userWrapper) {
      userWrapper.classList.toggle('hidden', !isAuthenticated);
    }

    if (isAuthenticated && user) {
      const displayName = user.fullName || user.email || 'Khách hàng';
      const initial = displayName.charAt(0).toUpperCase();

      if (userNameEl) userNameEl.textContent = displayName;
      if (userAvatarEl) userAvatarEl.textContent = initial;

      if (dropdownNameEl) dropdownNameEl.textContent = displayName;
      if (dropdownEmailEl) dropdownEmailEl.textContent = user.email || '';
      if (dropdownRoleEl) {
        dropdownRoleEl.textContent = user.role === 'ADMIN' ? 'Quản trị viên' 
          : user.role === 'MANAGER' ? 'Quản lý' : 'Khách hàng';
      }

      // Cập nhật Mobile Drawer
      if (mobileLoginLink) mobileLoginLink.classList.add('hidden');
      if (mobileProfileBox) mobileProfileBox.classList.remove('hidden');
      if (mobileAuthLinks) mobileAuthLinks.classList.remove('hidden');
      if (mobileUserName) mobileUserName.textContent = displayName;
      if (mobileUserEmail) mobileUserEmail.textContent = user.email || '';
      if (mobileUserAvatar) mobileUserAvatar.textContent = initial;
    } else {
      if (mobileLoginLink) mobileLoginLink.classList.remove('hidden');
      if (mobileProfileBox) mobileProfileBox.classList.add('hidden');
      if (mobileAuthLinks) mobileAuthLinks.classList.add('hidden');
      if (userDropdown) userDropdown.classList.remove('header__user-dropdown--open');
      if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'false');
    }
  }

  // Khởi tạo hiển thị lần đầu
  renderAuthState();

  // 1. Silent Session Bootstrap nếu có cờ session mà chưa nạp token vào memory
  if (authState.hasSessionIndicator() && !authState.isAuthenticated()) {
    authState.restoreSession().then(token => {
      if (token) {
        renderAuthState();
      }
    }).catch(() => {
      renderAuthState();
    });
  }

  // 2. Lắng nghe các sự kiện xác thực tập trung để đồng bộ tức thì
  if (!isHeaderInitialized) {
    window.addEventListener('hmp:auth-changed', () => renderAuthState());
    window.addEventListener('hmp:session-restored', () => renderAuthState());
    window.addEventListener('hmp:auth-expired', () => {
      renderAuthState();
      toast.warning('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.', 'Hết phiên');
    });

    isHeaderInitialized = true;
  }

  // 3. Đóng mở Dropdown tài khoản trên Desktop
  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.toggle('header__user-dropdown--open');
      userProfileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!userWrapper || !userWrapper.contains(e.target)) {
        userDropdown.classList.remove('header__user-dropdown--open');
        userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 4. Xử lý Đăng xuất
  const onLogout = async () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
      const res = await authState.handleLogout();
      if (res.serverRevoked) {
        toast.success('Đã đăng xuất thành công.');
      } else {
        toast.info('Đã đăng xuất trên thiết bị này.');
      }
      renderAuthState();

      // Nếu đang ở các trang riêng tư của khách hàng, chuyển hướng về trang chủ
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/pages/customer/') || path.includes('/pages/admin/')) {
        const homeUrl = path.includes('/pages/') ? '../../index.html' : './index.html';
        window.location.href = homeUrl;
      }
    }
  };

  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout);
  }
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', onLogout);
  }

  // 5. Xử lý mở Menu trên Mobile
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

  // 6. Nạp động danh mục tôn vào dropdown (nếu có)
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

