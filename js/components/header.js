/**
 * header.js — Điều khiển logic và trạng thái của Header
 */

import { authState } from '../auth/auth.state.js';
import { storage } from '../utils/storage.js';
import { client } from '../api/client.js';
import { cartApi } from '../api/cart.api.js';
import { toast } from './toast.js';
import { showLogoutConfirm } from './confirm-modal.js';

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
  const cartBtn = document.getElementById('header-cart-btn');
  const cartBadge = document.getElementById('header-cart-badge');
  const notificationBtn = document.getElementById('header-notification-btn');
  const notificationBadge = document.getElementById('header-notification-badge');
  const navOrdersItem = document.getElementById('header-nav-orders-item');
  const dashboardLinksContainer = document.getElementById('dropdown-dashboard-links');

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

    // Hiển thị chuông thông báo và mục đơn hàng khi đã đăng nhập
    if (notificationBtn) {
      notificationBtn.classList.toggle('hidden', !isAuthenticated);
    }
    if (navOrdersItem) {
      navOrdersItem.classList.toggle('hidden', !isAuthenticated);
    }

    if (isAuthenticated && user) {
      const displayName = user.fullName || user.email || 'Khách hàng';

      if (userNameEl) userNameEl.textContent = displayName;

      if (dropdownNameEl) dropdownNameEl.textContent = displayName;
      if (dropdownEmailEl) dropdownEmailEl.textContent = user.email || '';
      if (dropdownRoleEl) {
        dropdownRoleEl.textContent = user.role === 'ADMIN' ? 'Quản trị viên' 
          : user.role === 'MANAGER' ? 'Quản lý' : 'Khách hàng';
      }

      // Tạo lối tắt vào Dashboard tương ứng với vai trò quản trị/quản lý
      if (dashboardLinksContainer) {
        if (user.role === 'ADMIN') {
          dashboardLinksContainer.innerHTML = `
            <a href="./pages/admin/dashboard.html" class="user-dropdown__item" data-link="admin-dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Trang quản trị (Admin)</span>
            </a>
          `;
        } else if (user.role === 'MANAGER') {
          dashboardLinksContainer.innerHTML = `
            <a href="./pages/manager/dashboard.html" class="user-dropdown__item" data-link="manager-dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Trang điều hành (Quản lý)</span>
            </a>
          `;
        } else {
          dashboardLinksContainer.innerHTML = '';
        }
      }

      // Nạp số lượng thông báo chưa đọc từ backend
      fetchUnreadNotifications(notificationBadge);

      // Lắng nghe sự kiện đồng bộ thông báo từ trang notifications
      window.addEventListener('hmp:notifications-updated', () => {
        fetchUnreadNotifications(notificationBadge);
      });

      // Nạp số lượng món trong giỏ hàng
      fetchCartCount(cartBadge);

      // Cập nhật Mobile Drawer
      if (mobileLoginLink) mobileLoginLink.classList.add('hidden');
      if (mobileProfileBox) mobileProfileBox.classList.remove('hidden');
      if (mobileAuthLinks) mobileAuthLinks.classList.remove('hidden');
      if (mobileUserName) mobileUserName.textContent = displayName;
      if (mobileUserEmail) mobileUserEmail.textContent = user.email || '';
    } else {
      if (mobileLoginLink) mobileLoginLink.classList.remove('hidden');
      if (mobileProfileBox) mobileProfileBox.classList.add('hidden');
      if (mobileAuthLinks) mobileAuthLinks.classList.add('hidden');
      if (userDropdown) {
        userDropdown.classList.add('hidden');
        userDropdown.classList.remove('header__user-dropdown--open');
      }
      if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'false');
      if (dashboardLinksContainer) dashboardLinksContainer.innerHTML = '';
      if (cartBadge) cartBadge.classList.add('hidden');
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
    window.addEventListener('hmp:cart-updated', () => fetchCartCount(cartBadge));
    window.addEventListener('hmp:auth-expired', () => {
      renderAuthState();
      toast.warning('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.', 'Hết phiên');
    });

    isHeaderInitialized = true;
  }

  // 3. Đóng mở Dropdown tài khoản trên Desktop (Đồng bộ 100% cơ chế như Manager Dashboard)
  const toggleUserDropdown = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!userDropdown) {
      console.warn('[Header] Không tìm thấy phần tử #header-user-dropdown!');
      return;
    }
    const isHidden = userDropdown.classList.contains('hidden');

    if (isHidden) {
      userDropdown.classList.remove('hidden');
      userDropdown.classList.add('header__user-dropdown--open');
      if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'true');
    } else {
      userDropdown.classList.add('hidden');
      userDropdown.classList.remove('header__user-dropdown--open');
      if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'false');
    }
  };

  if (userProfileBtn) {
    userProfileBtn.onclick = toggleUserDropdown;
  }

  // Đóng khi click ngoài
  document.addEventListener('click', (e) => {
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      if (!userWrapper || !userWrapper.contains(e.target)) {
        userDropdown.classList.add('hidden');
        userDropdown.classList.remove('header__user-dropdown--open');
        if (userProfileBtn) userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // 4. Xử lý Đăng xuất (Hiển thị Confirm Modal chuẩn HMP)
  const onLogout = () => {
    showLogoutConfirm({
      title: 'Xác nhận đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        const res = await authState.handleLogout();
        if (res.serverRevoked) {
          toast.success('Đã đăng xuất thành công.');
        } else {
          toast.info('Đã đăng xuất trên thiết bị này.');
        }
        renderAuthState();

        // Chuyển hướng hoặc làm mới trang
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/pages/customer/') || path.includes('/pages/admin/') || path.includes('/pages/manager/')) {
          const homeUrl = path.includes('/pages/') ? '../../index.html' : './index.html';
          setTimeout(() => {
            window.location.href = homeUrl;
          }, 300);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 400);
        }
      }
    });
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

async function fetchUnreadNotifications(badgeEl) {
  if (!badgeEl) return;
  try {
    const res = await client.get('/notifications/unread-count');
    const count = (res && typeof res.unreadCount === 'number')
      ? res.unreadCount
      : (res && res.data && typeof res.data.unreadCount === 'number')
        ? res.data.unreadCount
        : 0;

    if (count > 0) {
      badgeEl.textContent = count > 99 ? '99+' : String(count);
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  } catch {
    badgeEl.classList.add('hidden');
  }
}

export async function fetchCartCount(badgeEl) {
  if (!badgeEl) {
    badgeEl = document.getElementById('header-cart-badge');
  }
  if (!badgeEl) return;

  const user = authState.getCurrentUser() || storage.getUser();
  const isAuthenticated = authState.isAuthenticated() || (authState.hasSessionIndicator() && Boolean(user));
  if (!isAuthenticated) {
    badgeEl.classList.add('hidden');
    return;
  }

  try {
    const res = await cartApi.getCartCount();
    const count = (res && typeof res.totalCount === 'number') ? res.totalCount : (res && res.data && res.data.totalCount) || 0;
    if (count > 0) {
      badgeEl.textContent = count > 99 ? '99+' : String(count);
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }
  } catch {
    badgeEl.classList.add('hidden');
  }
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

