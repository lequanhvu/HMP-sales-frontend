/**
 * notifications.js — Điều khiển logic trang Danh sách thông báo khách hàng
 * Hỗ trợ: Phân cụm mốc thời gian (Milestones), phân trang chuẩn, đánh dấu đã đọc
 */

import { requireCustomerAuth } from '../auth/auth.guard.js';
import { loadHeader, loadFooter } from '../components/component-loader.js';
import { notificationApi } from '../api/notification.api.js';
import { formatDateTime, formatRelativeTime, getMilestoneGroup, escapeHtml } from '../utils/format.js';
import { toast } from '../components/toast.js';
import { storage } from '../utils/storage.js';
import { showLogoutConfirm } from '../components/confirm-modal.js';

// Trạng thái trang
let currentPage = 0; // 0-indexed backend
const pageSize = 10;
let currentFilter = 'ALL'; // ALL, UNREAD, ORDER
let notificationsList = [];
let paginationMeta = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực đăng nhập
  const hasAuth = await requireCustomerAuth();
  if (!hasAuth) return;

  // 2. Nạp Header và Footer
  await Promise.all([loadHeader(), loadFooter()]);

  // 3. Khởi tạo Sidebar Khách hàng
  initSidebar();

  // 4. Khởi tạo bộ lọc và các nút hành động
  initFilterTabs();
  initHeaderActions();

  // 5. Tải danh sách thông báo lần đầu
  await loadNotifications();
});

/**
 * Khởi tạo dữ liệu hiển thị trên Sidebar
 */
function initSidebar() {
  const user = storage.getUser();
  const avatarEl = document.getElementById('notif-sidebar-avatar');
  const nameEl = document.getElementById('notif-sidebar-name');
  const phoneEl = document.getElementById('notif-sidebar-phone');
  const logoutBtn = document.getElementById('sidebar-logout-btn');

  if (user) {
    const fullName = user.fullName || user.email || 'Khách hàng';
    if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = fullName;
    if (phoneEl) phoneEl.textContent = user.phoneNumber || 'Chưa liên kết SĐT';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLogoutConfirm({
        onConfirm: () => {
          storage.clear();
          window.location.href = '../../index.html';
        }
      });
    });
  }
}

/**
 * Khởi tạo các Tabs lọc thông báo (Tất cả, Chưa đọc, Đơn hàng)
 */
function initFilterTabs() {
  const tabBtns = document.querySelectorAll('.notifications-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabBtns.forEach(b => b.classList.remove('notifications-tab-btn--active'));
      btn.classList.add('notifications-tab-btn--active');
      currentFilter = btn.dataset.filter || 'ALL';
      currentPage = 0;
      await loadNotifications();
    });
  });
}

/**
 * Khởi tạo các nút Hành động (Đã đọc tất cả, Làm mới)
 */
function initHeaderActions() {
  const btnMarkAll = document.getElementById('btn-mark-all-read');
  const btnRefresh = document.getElementById('btn-refresh-notifications');

  btnMarkAll?.addEventListener('click', async () => {
    try {
      if (btnMarkAll) btnMarkAll.disabled = true;
      await notificationApi.markAllAsRead();
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
      window.dispatchEvent(new CustomEvent('hmp:notifications-updated'));
      await loadNotifications();
    } catch (err) {
      console.error('[Notifications] Lỗi đánh dấu tất cả đã đọc:', err);
      toast.error('Không thể cập nhật trạng thái thông báo.');
    } finally {
      if (btnMarkAll) btnMarkAll.disabled = false;
    }
  });

  btnRefresh?.addEventListener('click', async () => {
    toast.info('Đang làm mới danh sách thông báo...');
    await loadNotifications();
  });
}

/**
 * Tải danh sách thông báo từ API và phân trang
 */
async function loadNotifications() {
  const loadingEl = document.getElementById('notifications-loading');
  const emptyEl = document.getElementById('notifications-empty');
  const listEl = document.getElementById('notifications-list');
  const paginationEl = document.getElementById('notifications-pagination');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (listEl) listEl.replaceChildren();
  if (paginationEl) paginationEl.classList.add('hidden');

  try {
    // Tải song song danh sách thông báo và số lượng chưa đọc từ API
    const [pageRes, unreadRes] = await Promise.all([
      notificationApi.getNotifications({ page: currentPage, size: pageSize }),
      notificationApi.getUnreadCount().catch(() => ({ unreadCount: 0 }))
    ]);

    const unreadCount = (unreadRes && typeof unreadRes.unreadCount === 'number')
      ? unreadRes.unreadCount
      : (unreadRes && unreadRes.data && typeof unreadRes.data.unreadCount === 'number')
        ? unreadRes.data.unreadCount
        : 0;
    updateUnreadBadges(unreadCount);

    // Hỗ trợ cả PageResponse { result, meta } chuẩn Spring Boot backend của HMP
    const items = pageRes?.result || pageRes?.items || pageRes?.content || (Array.isArray(pageRes) ? pageRes : []);
    const meta = pageRes?.meta || {};
    const totalPages = meta.totalPages ?? pageRes?.totalPages ?? (items.length > 0 ? 1 : 0);
    const totalElements = meta.totalElements ?? pageRes?.totalElements ?? items.length;
    const pageNumber = meta.page ?? pageRes?.pageNumber ?? currentPage;

    paginationMeta = {
      totalPages,
      totalElements,
      pageNumber,
      hasNext: pageNumber < totalPages - 1,
      hasPrevious: pageNumber > 0
    };

    // Áp dụng bộ lọc hiện tại
    let filteredItems = [...items];
    if (currentFilter === 'UNREAD') {
      filteredItems = filteredItems.filter(item => !(item.isRead === true || item.read === true));
    } else if (currentFilter === 'ORDER') {
      filteredItems = filteredItems.filter(item => 
        item.relatedEntityType === 'ORDER' || (item.type && item.type.startsWith('ORDER_'))
      );
    }

    notificationsList = filteredItems;

    if (filteredItems.length === 0) {
      if (emptyEl) {
        emptyEl.classList.remove('hidden');
        const emptyDesc = document.getElementById('notif-empty-desc');
        if (emptyDesc) {
          emptyDesc.textContent = currentFilter === 'UNREAD'
            ? 'Bạn không có thông báo chưa đọc nào.'
            : currentFilter === 'ORDER'
              ? 'Chưa có thông báo cập nhật về đơn hàng.'
              : 'Bạn đã xem hết tất cả thông báo gần đây.';
        }
      }
    } else {
      renderMilestoneGroupedList(filteredItems);
      renderPagination(paginationMeta);
    }
  } catch (err) {
    console.error('[Notifications] Lỗi nạp thông báo:', err);
    toast.error('Không thể tải danh sách thông báo. Vui lòng thử lại.');
    if (emptyEl) emptyEl.classList.remove('hidden');
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

/**
 * Cập nhật số lượng thông báo chưa đọc trên huy hiệu
 */
function updateUnreadBadges(count) {
  const pillEl = document.getElementById('notif-unread-count-pill');
  const sidebarBadge = document.getElementById('sidebar-notif-badge');

  if (pillEl) {
    if (count > 0) {
      pillEl.textContent = `${count} chưa đọc`;
      pillEl.classList.remove('hidden');
    } else {
      pillEl.classList.add('hidden');
    }
  }

  if (sidebarBadge) {
    if (count > 0) {
      sidebarBadge.textContent = count > 99 ? '99+' : String(count);
      sidebarBadge.classList.remove('hidden');
    } else {
      sidebarBadge.classList.add('hidden');
    }
  }
}

/**
 * Hiển thị danh sách thông báo phân cụm theo Mốc thời gian (Milestones)
 * Cụm: Hôm nay, Hôm qua, Tuần này, Tháng này, Trước đó
 */
function renderMilestoneGroupedList(items) {
  const container = document.getElementById('notifications-list');
  if (!container) return;

  container.replaceChildren();

  // Nhóm các thông báo theo nhãn mốc thời gian
  const milestoneOrder = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tháng này', 'Trước đó'];
  const groups = new Map();

  items.forEach(item => {
    const groupName = getMilestoneGroup(item.createdAt);
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName).push(item);
  });

  // Render tuần tự theo thứ tự mốc thời gian
  milestoneOrder.forEach(groupName => {
    if (!groups.has(groupName)) return;

    const groupItems = groups.get(groupName);
    if (groupItems.length === 0) return;

    const groupEl = document.createElement('div');
    groupEl.className = 'milestone-group';

    // Header của Mốc thời gian
    const headerEl = document.createElement('div');
    headerEl.className = 'milestone-header';
    headerEl.innerHTML = `
      <span class="milestone-badge">${escapeHtml(groupName)}</span>
      <div class="milestone-line"></div>
    `;
    groupEl.appendChild(headerEl);

    // Danh sách thẻ thông báo trong mốc
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'milestone-items';

    groupItems.forEach(item => {
      const cardEl = createNotificationCard(item);
      itemsContainer.appendChild(cardEl);
    });

    groupEl.appendChild(itemsContainer);
    container.appendChild(groupEl);
  });
}

/**
 * Tạo thẻ thông báo (Notification Card) với icon đại diện và hành động
 */
function createNotificationCard(item) {
  const card = document.createElement('article');
  const isUnread = !(item.isRead === true || item.read === true);
  card.className = `notification-card ${isUnread ? 'notification-card--unread' : ''}`;
  card.id = `notif-card-${item.notificationId}`;

  const typeConfig = getNotificationTypeConfig(item.type);
  const formattedFullTime = formatDateTime(item.createdAt);
  const relativeTimeStr = formatRelativeTime(item.createdAt);

  card.innerHTML = `
    <div class="notif-icon-wrap ${typeConfig.wrapClass}" title="${typeConfig.label}">
      ${typeConfig.iconSvg}
    </div>
    <div class="notif-body">
      <div class="notif-header-line">
        <div class="notif-title-group">
          <h4 class="notif-title">${escapeHtml(item.title || 'Thông báo hệ thống')}</h4>
          ${isUnread ? '<span class="notif-badge-new">Mới</span>' : ''}
        </div>
        <time class="notif-time" datetime="${item.createdAt || ''}" title="${formattedFullTime}">
          ${relativeTimeStr}
        </time>
      </div>

      <p class="notif-message">${escapeHtml(item.message || '')}</p>

      <div class="notif-footer-line">
        <div class="notif-footer-actions">
          ${item.relatedEntityType === 'ORDER' && item.relatedEntityId ? `
            <a href="./order-detail.html?id=${item.relatedEntityId}" class="notif-action-link" data-notif-id="${item.notificationId}">
              <span>Xem chi tiết đơn hàng #${item.relatedEntityId}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          ` : '<span></span>'}
        </div>

        ${isUnread ? `
          <button type="button" class="notif-btn-read" data-id="${item.notificationId}">
            Đánh dấu đã đọc
          </button>
        ` : ''}
      </div>
    </div>
  `;

  // Sự kiện bấm nút "Đánh dấu đã đọc"
  const btnRead = card.querySelector('.notif-btn-read');
  if (btnRead) {
    btnRead.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleMarkAsRead(item.notificationId, card);
    });
  }

  // Sự kiện bấm vào link "Xem chi tiết đơn hàng"
  const linkOrder = card.querySelector('.notif-action-link');
  if (linkOrder) {
    linkOrder.addEventListener('click', async () => {
      if (isUnread) {
        // Âm thầm đánh dấu đã đọc trước khi chuyển trang
        notificationApi.markAsRead(item.notificationId).catch(() => {});
        window.dispatchEvent(new CustomEvent('hmp:notifications-updated'));
      }
    });
  }

  return card;
}

/**
 * Xử lý đánh dấu một thông báo đã đọc
 */
async function handleMarkAsRead(notificationId, cardEl) {
  try {
    await notificationApi.markAsRead(notificationId);
    cardEl.classList.remove('notification-card--unread');
    const badgeNew = cardEl.querySelector('.notif-badge-new');
    if (badgeNew) badgeNew.remove();
    const btnRead = cardEl.querySelector('.notif-btn-read');
    if (btnRead) btnRead.remove();

    // Cập nhật số lượng chưa đọc
    const unreadRes = await notificationApi.getUnreadCount().catch(() => ({ unreadCount: 0 }));
    updateUnreadBadges(unreadRes?.unreadCount || 0);
    window.dispatchEvent(new CustomEvent('hmp:notifications-updated'));
  } catch (err) {
    console.error('[Notifications] Lỗi đánh dấu đã đọc:', err);
    toast.error('Không thể cập nhật trạng thái thông báo.');
  }
}

/**
 * Cung cấp Icon SVG và nhãn cho từng loại thông báo
 */
function getNotificationTypeConfig(type) {
  switch (type) {
    case 'ORDER_CREATED':
      return {
        wrapClass: 'notif-icon-wrap--created',
        label: 'Đơn hàng mới tạo',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        `
      };
    case 'ORDER_CONFIRMED':
      return {
        wrapClass: 'notif-icon-wrap--confirmed',
        label: 'Đơn hàng đã duyệt',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        `
      };
    case 'ORDER_PROCESSING':
      return {
        wrapClass: 'notif-icon-wrap--processing',
        label: 'Đang gia công sản xuất',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        `
      };
    case 'ORDER_SHIPPING':
      return {
        wrapClass: 'notif-icon-wrap--shipping',
        label: 'Đang vận chuyển giao hàng',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        `
      };
    case 'ORDER_COMPLETED':
      return {
        wrapClass: 'notif-icon-wrap--completed',
        label: 'Đơn hàng hoàn tất',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        `
      };
    case 'ORDER_CANCELLED':
      return {
        wrapClass: 'notif-icon-wrap--cancelled',
        label: 'Đơn hàng đã hủy',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `
      };
    case 'ORDER_RESTORED':
      return {
        wrapClass: 'notif-icon-wrap--restored',
        label: 'Đơn hàng đã khôi phục',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        `
      };
    default:
      return {
        wrapClass: 'notif-icon-wrap--default',
        label: 'Thông báo hệ thống',
        iconSvg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        `
      };
  }
}

/**
 * Hiển thị khối phân trang (Pagination)
 */
function renderPagination(meta) {
  const container = document.getElementById('notifications-pagination');
  if (!container || !meta || meta.totalPages <= 1) {
    if (container) container.classList.add('hidden');
    return;
  }

  container.replaceChildren();
  container.classList.remove('hidden');

  const { totalPages, pageNumber, hasPrevious, hasNext } = meta;

  // Nút Trang trước (Previous)
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'pagination-btn';
  prevBtn.disabled = !hasPrevious;
  prevBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  prevBtn.title = 'Trang trước';
  prevBtn.addEventListener('click', async () => {
    if (currentPage > 0) {
      currentPage--;
      await loadNotifications();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  container.appendChild(prevBtn);

  // Danh sách các số trang
  for (let i = 0; i < totalPages; i++) {
    // Chỉ hiển thị tối đa 5 trang xung quanh trang hiện tại
    if (totalPages > 7) {
      if (i > 1 && i < pageNumber - 1) {
        if (i === 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-btn';
          ellipsis.textContent = '...';
          container.appendChild(ellipsis);
        }
        continue;
      }
      if (i > pageNumber + 1 && i < totalPages - 2) {
        if (i === pageNumber + 2) {
          const ellipsis = document.createElement('span');
          ellipsis.className = 'pagination-btn';
          ellipsis.textContent = '...';
          container.appendChild(ellipsis);
        }
        continue;
      }
    }

    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = `pagination-btn ${i === pageNumber ? 'pagination-btn--active' : ''}`;
    pageBtn.textContent = String(i + 1);
    pageBtn.addEventListener('click', async () => {
      if (currentPage !== i) {
        currentPage = i;
        await loadNotifications();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    container.appendChild(pageBtn);
  }

  // Nút Trang sau (Next)
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'pagination-btn';
  nextBtn.disabled = !hasNext;
  nextBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  nextBtn.title = 'Trang tiếp';
  nextBtn.addEventListener('click', async () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      await loadNotifications();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  container.appendChild(nextBtn);
}
