/**
 * sidebar.js — Điều khiển logic và tương tác của Sidebar (Customer & Admin)
 */

import { storage } from '../utils/storage.js';

/**
 * Khởi tạo Sidebar Khách hàng
 */
export function initCustomerSidebar() {
  const sidebarEl = document.querySelector('.customer-sidebar');
  if (!sidebarEl) return;

  const user = storage.getUser();
  if (user) {
    const nameEl = document.getElementById('customer-sidebar-name');
    const phoneEl = document.getElementById('customer-sidebar-phone');
    const avatarEl = document.getElementById('customer-sidebar-avatar');

    if (nameEl) nameEl.textContent = user.fullName || user.email || 'Khách hàng';
    if (phoneEl) phoneEl.textContent = user.phoneNumber || 'Chưa liên kết SĐT';
    if (avatarEl) {
      const initial = (user.fullName || user.email || 'U').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
  }

  // Đánh dấu active theo URL
  const path = window.location.pathname.toLowerCase();
  sidebarEl.querySelectorAll('.customer-sidebar__link').forEach(link => {
    link.classList.remove('customer-sidebar__link--active');
    const href = link.getAttribute('href') || '';
    if (path.includes(href.replace('./', ''))) {
      link.classList.add('customer-sidebar__link--active');
    }
  });

  // Nút đăng xuất
  const logoutBtn = document.getElementById('customer-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      storage.clear();
      window.location.href = '../../index.html';
    });
  }
}

