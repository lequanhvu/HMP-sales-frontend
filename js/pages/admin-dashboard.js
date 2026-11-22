/**
 * admin-dashboard.js — Điều khiển logic hiển thị trang Tổng quan Quản trị viên (HMP)
 */

import { authState } from '../auth/auth.state.js';
import { requireAdminAuth } from '../auth/auth.guard.js';
import { dashboardApi } from '../api/dashboard.api.js';
import { authApi } from '../api/auth.api.js';
import { toast } from '../components/toast.js';
import { showLogoutConfirm } from '../components/confirm-modal.js';

// Khởi tạo ngay lập tức các sự kiện tương tác giao diện người dùng
function setupDashboard() {
  initUserInfo();
  initSidebarMobile();
  initProfileDropdown();

  // Kiểm tra quyền và nạp dữ liệu thống kê ngầm (không chặn sự kiện DOM của giao diện)
  (async () => {
    try {
      const isAuthorized = await requireAdminAuth();
      if (!isAuthorized) return;
      await loadDashboardMetrics();
    } catch (err) {
      console.warn('[AdminDashboard] Lỗi khi nạp quyền/thống kê:', err);
    }
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDashboard);
} else {
  setupDashboard();
}

/**
 * Hiển thị thông tin Admin hiện tại lên giao diện
 */
function initUserInfo() {
  const user = authState.getCurrentUser();
  if (!user) return;

  const displayName = user.fullName || user.email || 'Admin';
  const email = user.email || 'admin@hmp.vn';

  const sidebarUserName = document.getElementById('sidebar-user-name');
  const headerUserName = document.getElementById('header-user-name');
  const dropdownFullName = document.getElementById('dropdown-full-name');
  const dropdownEmail = document.getElementById('dropdown-email');

  if (sidebarUserName) sidebarUserName.textContent = displayName;
  if (headerUserName) headerUserName.textContent = displayName;
  if (dropdownFullName) dropdownFullName.textContent = displayName;
  if (dropdownEmail) dropdownEmail.textContent = email;
}

/**
 * Nạp các chỉ số thống kê từ Backend và cập nhật giao diện
 */
async function loadDashboardMetrics() {
  const productsCountEl = document.getElementById('metric-products-count');
  const ordersCountEl = document.getElementById('metric-orders-count');
  const usersCountEl = document.getElementById('metric-users-count');
  const badgeEl = document.getElementById('admin-notification-badge');
  const donutTotalEl = document.getElementById('donut-total-number');

  try {
    // Gọi song song các API thống kê từ Backend
    const [productsCount, ordersCount, usersCount, unreadCount] = await Promise.all([
      dashboardApi.getProductsTotal(),
      dashboardApi.getOrdersTotal(),
      dashboardApi.getUsersTotal(),
      dashboardApi.getUnreadNotificationsCount()
    ]);

    if (productsCountEl) productsCountEl.textContent = formatNumber(productsCount);
    if (ordersCountEl) {
      ordersCountEl.textContent = formatNumber(ordersCount);
      if (donutTotalEl) donutTotalEl.textContent = formatNumber(ordersCount);
    }
    if (usersCountEl) usersCountEl.textContent = formatNumber(usersCount);

    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }
  } catch (err) {
    console.warn('[AdminDashboard] Không thể tải dữ liệu chỉ số thống kê động:', err);
    toast.info('Đang hiển thị dữ liệu chỉ số tổng quan mặc định.');
  }
}

/**
 * Định dạng số theo chuẩn Việt Nam (phân tách hàng nghìn bằng dấu chấm: 1.250)
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('vi-VN');
}

/**
 * Xử lý mở/đóng Sidebar trên thiết bị di động
 */
function initSidebarMobile() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  if (!sidebar || !overlay) return;

  const openSidebar = () => {
    sidebar.classList.add('admin-sidebar--open');
    overlay.classList.add('admin-sidebar__overlay--visible');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('admin-sidebar--open');
    overlay.classList.remove('admin-sidebar__overlay--visible');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
}

/**
 * Xử lý mở Profile Dropdown và Đăng xuất (Hỗ trợ CẢ 2 vị trí: Top Header và Chân Sidebar)
 */
function initProfileDropdown() {
  // 1. Dropdown trên Top Header
  const headerProfileBtn = document.getElementById('admin-profile-btn');
  const headerDropdownMenu = document.getElementById('admin-dropdown-menu');
  const headerLogoutBtn = document.getElementById('admin-logout-btn');

  // 2. Dropdown / Trigger ở Chân Sidebar
  const sidebarUser = document.getElementById('admin-sidebar-user');
  const sidebarDropdown = document.getElementById('admin-sidebar-dropdown');
  const sidebarQuickLogout = document.getElementById('admin-sidebar-quick-logout');
  const sidebarLogoutBtn = document.getElementById('admin-sidebar-logout-btn');

  const triggerLogoutConfirm = () => {
    showLogoutConfirm({
      title: 'Xác nhận đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Quản trị viên không?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await authState.handleLogout();
        toast.success('Đã đăng xuất tài khoản quản trị.');
        setTimeout(() => {
          window.location.href = '../auth/login.html';
        }, 400);
      }
    });
  };

  // Toggle dropdown Header (Đảm bảo click vào Avatar, Tên hay Button đều mở ngay lập tức)
  if (headerProfileBtn && headerDropdownMenu) {
    const toggleHeader = (e) => {
      if (e) e.stopPropagation();
      const isHidden = headerDropdownMenu.classList.contains('hidden');
      if (isHidden) {
        headerDropdownMenu.classList.remove('hidden');
        headerDropdownMenu.classList.add('admin-dropdown--open');
        headerProfileBtn.setAttribute('aria-expanded', 'true');
      } else {
        headerDropdownMenu.classList.add('hidden');
        headerDropdownMenu.classList.remove('admin-dropdown--open');
        headerProfileBtn.setAttribute('aria-expanded', 'false');
      }

      // Đóng dropdown sidebar nếu đang mở
      if (sidebarDropdown) {
        sidebarDropdown.classList.add('hidden');
        sidebarDropdown.classList.remove('admin-sidebar-dropdown--open');
      }
    };

    headerProfileBtn.onclick = toggleHeader;
  }

  // Toggle dropdown chân Sidebar khi click vào Avatar hoặc thông tin Admin
  if (sidebarUser && sidebarDropdown) {
    const toggleSidebar = (e) => {
      if (e && e.target && e.target.closest('#admin-sidebar-quick-logout')) return;
      if (e) e.stopPropagation();

      const isHidden = sidebarDropdown.classList.contains('hidden');
      if (isHidden) {
        sidebarDropdown.classList.remove('hidden');
        sidebarDropdown.classList.add('admin-sidebar-dropdown--open');
      } else {
        sidebarDropdown.classList.add('hidden');
        sidebarDropdown.classList.remove('admin-sidebar-dropdown--open');
      }

      // Đóng dropdown header nếu đang mở
      if (headerDropdownMenu) {
        headerDropdownMenu.classList.add('hidden');
        headerDropdownMenu.classList.remove('admin-dropdown--open');
        if (headerProfileBtn) headerProfileBtn.setAttribute('aria-expanded', 'false');
      }
    };

    sidebarUser.onclick = toggleSidebar;
  }

  // Đóng tất cả dropdown khi click ngoài
  document.addEventListener('click', (e) => {
    if (headerProfileBtn && headerDropdownMenu && !headerProfileBtn.contains(e.target) && !headerDropdownMenu.contains(e.target)) {
      headerProfileBtn.setAttribute('aria-expanded', 'false');
      headerDropdownMenu.classList.add('hidden');
      headerDropdownMenu.classList.remove('admin-dropdown--open');
    }
    if (sidebarUser && sidebarDropdown && !sidebarUser.contains(e.target) && !sidebarDropdown.contains(e.target)) {
      sidebarDropdown.classList.add('hidden');
      sidebarDropdown.classList.remove('admin-sidebar-dropdown--open');
    }
  });

  // Gắn sự kiện Đăng xuất
  if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', triggerLogoutConfirm);
  if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', triggerLogoutConfirm);
  if (sidebarQuickLogout) {
    sidebarQuickLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerLogoutConfirm();
    });
  }
}
