/**
 * sidebar.js — Điều khiển logic và tương tác của Sidebar (Customer & Admin)
 */

import { storage } from '../utils/storage.js';
import { client } from '../api/client.js';

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

  // Lấy số lượng thông báo chưa đọc động từ DB cho sidebar badge
  const sidebarNotifBadge = document.getElementById('sidebar-notif-badge');
  if (sidebarNotifBadge) {
    const updateSidebarBadge = async () => {
      try {
        const res = await client.get('/notifications/unread-count');
        const count = (res && typeof res.unreadCount === 'number')
          ? res.unreadCount
          : (res && res.data && typeof res.data.unreadCount === 'number')
            ? res.data.unreadCount
            : 0;

        if (count > 0) {
          sidebarNotifBadge.textContent = count > 99 ? '99+' : String(count);
          sidebarNotifBadge.classList.remove('hidden');
        } else {
          sidebarNotifBadge.textContent = '0';
          sidebarNotifBadge.classList.add('hidden');
        }
      } catch {
        sidebarNotifBadge.classList.add('hidden');
      }
    };

    updateSidebarBadge();
    window.addEventListener('hmp:notifications-updated', updateSidebarBadge);
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

