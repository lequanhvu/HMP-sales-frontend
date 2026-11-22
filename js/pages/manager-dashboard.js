/**
 * manager-dashboard.js — Điều khiển logic hiển thị trang Tổng quan Quản lý (HMP)
 */

import { authState } from '../auth/auth.state.js';
import { requireManagerAuth } from '../auth/auth.guard.js';
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
      const isAuthorized = await requireManagerAuth();
      if (!isAuthorized) return;
      await loadManagerMetrics();
    } catch (err) {
      console.warn('[ManagerDashboard] Lỗi khi nạp quyền/thống kê:', err);
    }
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDashboard);
} else {
  setupDashboard();
}

/**
 * Hiển thị thông tin Quản lý hiện tại lên giao diện
 */
function initUserInfo() {
  const user = authState.getCurrentUser();
  if (!user) return;

  const displayName = user.fullName || user.email || 'Quản lý';
  const email = user.email || 'quanly@hmp.vn';

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
 * Nạp các chỉ số trạng thái đơn hàng & danh sách đơn hàng mới nhất từ Backend
 */
async function loadManagerMetrics() {
  const pendingCountEl = document.getElementById('metric-pending-count');
  const processingCountEl = document.getElementById('metric-processing-count');
  const completedCountEl = document.getElementById('metric-completed-count');
  const badgeEl = document.getElementById('manager-notification-badge');
  const ordersContainer = document.getElementById('latest-orders-container');

  try {
    // Gọi song song các API lấy số lượng đơn theo từng trạng thái và đơn mới nhất
    const [pendingCount, processingCount, completedCount, latestOrders, unreadCount] = await Promise.all([
      dashboardApi.getOrdersCountByStatus('PENDING'),
      dashboardApi.getOrdersCountByStatus('PROCESSING'),
      dashboardApi.getOrdersCountByStatus('COMPLETED'),
      dashboardApi.getLatestOrders(4),
      dashboardApi.getUnreadNotificationsCount()
    ]);

    if (pendingCount !== null && pendingCountEl) {
      pendingCountEl.textContent = formatNumber(pendingCount);
    }
    if (processingCount !== null && processingCountEl) {
      processingCountEl.textContent = formatNumber(processingCount);
    }
    if (completedCount !== null && completedCountEl) {
      completedCountEl.textContent = formatNumber(completedCount);
    }

    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    // Render danh sách đơn hàng mới nhất
    if (ordersContainer && Array.isArray(latestOrders) && latestOrders.length > 0) {
      ordersContainer.replaceChildren();
      latestOrders.forEach(order => {
        const row = document.createElement('div');
        row.className = 'manager-order-row';

        const codeDiv = document.createElement('div');
        codeDiv.className = 'manager-order-code';
        const codeSpan = document.createElement('span');
        codeSpan.className = 'manager-order-hash';
        codeSpan.textContent = '#' + (order.orderCode || `DH${order.orderId || ''}`);
        codeDiv.appendChild(codeSpan);

        const dateDiv = document.createElement('div');
        dateDiv.className = 'manager-order-date';
        dateDiv.textContent = formatDate(order.createdAt);

        row.appendChild(codeDiv);
        row.appendChild(dateDiv);
        ordersContainer.appendChild(row);
      });
    }
  } catch (err) {
    console.warn('[ManagerDashboard] Không thể tải dữ liệu chỉ số thống kê động:', err);
    toast.info('Đang hiển thị dữ liệu chỉ số điều hành mặc định.');
  }
}

/**
 * Định dạng số theo chuẩn Việt Nam
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('vi-VN');
}

/**
 * Định dạng ngày theo định dạng DD/MM/YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '19/11/2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '19/11/2026';
  }
}

/**
 * Xử lý mở/đóng Sidebar trên thiết bị di động
 */
function initSidebarMobile() {
  const sidebar = document.getElementById('manager-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  if (!sidebar || !overlay) return;

  const openSidebar = () => {
    sidebar.classList.add('manager-sidebar--open');
    overlay.classList.add('manager-sidebar__overlay--visible');
  };

  const closeSidebar = () => {
    sidebar.classList.remove('manager-sidebar--open');
    overlay.classList.remove('manager-sidebar__overlay--visible');
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
  const headerProfileBtn = document.getElementById('manager-profile-btn');
  const headerDropdownMenu = document.getElementById('manager-dropdown-menu');
  const headerLogoutBtn = document.getElementById('manager-logout-btn');

  // 2. Dropdown / Trigger ở Chân Sidebar
  const sidebarUser = document.getElementById('manager-sidebar-user');
  const sidebarDropdown = document.getElementById('manager-sidebar-dropdown');
  const sidebarQuickLogout = document.getElementById('manager-sidebar-quick-logout');
  const sidebarLogoutBtn = document.getElementById('manager-sidebar-logout-btn');

  const triggerLogoutConfirm = () => {
    showLogoutConfirm({
      title: 'Xác nhận đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Quản lý không?',
      confirmText: 'Đăng xuất',
      cancelText: 'Hủy',
      onConfirm: async () => {
        await authState.handleLogout();
        toast.success('Đã đăng xuất tài khoản quản lý.');
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
        headerDropdownMenu.classList.add('manager-dropdown--open');
        headerProfileBtn.setAttribute('aria-expanded', 'true');
      } else {
        headerDropdownMenu.classList.add('hidden');
        headerDropdownMenu.classList.remove('manager-dropdown--open');
        headerProfileBtn.setAttribute('aria-expanded', 'false');
      }

      // Đóng dropdown sidebar nếu đang mở
      if (sidebarDropdown) {
        sidebarDropdown.classList.add('hidden');
        sidebarDropdown.classList.remove('manager-sidebar-dropdown--open');
      }
    };

    headerProfileBtn.onclick = toggleHeader;
  }

  // Toggle dropdown chân Sidebar khi click vào Avatar hoặc thông tin Quản lý
  if (sidebarUser && sidebarDropdown) {
    const toggleSidebar = (e) => {
      if (e && e.target && e.target.closest('#manager-sidebar-quick-logout')) return;
      if (e) e.stopPropagation();

      const isHidden = sidebarDropdown.classList.contains('hidden');
      if (isHidden) {
        sidebarDropdown.classList.remove('hidden');
        sidebarDropdown.classList.add('manager-sidebar-dropdown--open');
      } else {
        sidebarDropdown.classList.add('hidden');
        sidebarDropdown.classList.remove('manager-sidebar-dropdown--open');
      }

      // Đóng dropdown header nếu đang mở
      if (headerDropdownMenu) {
        headerDropdownMenu.classList.add('hidden');
        headerDropdownMenu.classList.remove('manager-dropdown--open');
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
      headerDropdownMenu.classList.remove('manager-dropdown--open');
    }
    if (sidebarUser && sidebarDropdown && !sidebarUser.contains(e.target) && !sidebarDropdown.contains(e.target)) {
      sidebarDropdown.classList.add('hidden');
      sidebarDropdown.classList.remove('manager-sidebar-dropdown--open');
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
