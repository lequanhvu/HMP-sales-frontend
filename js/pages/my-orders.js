/**
 * my-orders.js — Điều khiển logic trang Đơn hàng của tôi (Khách hàng)
 */

import { requireCustomerAuth } from '../auth/auth.guard.js';
import { loadHeader, loadFooter } from '../components/component-loader.js';
import { orderApi } from '../api/order.api.js';
import { userApi } from '../api/user.api.js';
import { formatVnd, formatDateTime } from '../utils/format.js';
import { translateOrderStatus } from '../utils/i18n.js';
import { toast } from '../components/toast.js';
import { storage } from '../utils/storage.js';
import { authState } from '../auth/auth.state.js';
import { showLogoutConfirm, showConfirmModal } from '../components/confirm-modal.js';

// Trạng thái tìm kiếm & phân trang
let filterState = {
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
  page: 0,
  size: 10
};

let currentOrders = [];
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực khách hàng
  const hasAuth = await requireCustomerAuth();
  if (!hasAuth) return;

  // 2. Nạp Header và Footer
  await Promise.all([loadHeader(), loadFooter()]);

  // 3. Khởi tạo Sidebar và các sự kiện
  initSidebar();
  initTabEvents();
  initFilterEvents();
  initDetailModalEvents();
  initCancelModalEvents();

  // 4. Nạp danh sách đơn hàng ban đầu
  await loadOrders();
});

/* ==========================================================================
   1. SIDEBAR KHÁCH HÀNG & USER DATA
   ========================================================================== */

async function initSidebar() {
  const sidebarAvatar = document.getElementById('orders-sidebar-avatar');
  const sidebarName = document.getElementById('orders-sidebar-name');
  const sidebarPhone = document.getElementById('orders-sidebar-phone');
  const logoutBtn = document.getElementById('sidebar-logout-btn');

  const user = storage.getUser();
  if (user) {
    const displayName = user.fullName || user.email || 'Khách hàng';
    const initial = (user.fullName || user.email || 'K').charAt(0).toUpperCase();

    if (sidebarAvatar) sidebarAvatar.textContent = initial;
    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarPhone) sidebarPhone.textContent = user.phone || user.phoneNumber || 'Chưa liên kết SĐT';
  } else {
    try {
      const profile = await userApi.getProfile();
      if (profile) {
        const displayName = profile.fullName || profile.email || 'Khách hàng';
        const initial = (profile.fullName || profile.email || 'K').charAt(0).toUpperCase();

        if (sidebarAvatar) sidebarAvatar.textContent = initial;
        if (sidebarName) sidebarName.textContent = displayName;
        if (sidebarPhone) sidebarPhone.textContent = profile.phone || 'Chưa liên kết SĐT';
      }
    } catch {
      // Bỏ qua lỗi nạp profile
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLogoutConfirm({
        onConfirm: async () => {
          try {
            await authState.logout();
          } catch {
            storage.clear();
          }
          window.location.href = '../../index.html';
        }
      });
    });
  }
}

/* ==========================================================================
   2. BỘ LỌC TABS TRẠNG THÁI & KHOẢNG NGÀY
   ========================================================================== */

function initTabEvents() {
  const tabButtons = document.querySelectorAll('.orders-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabButtons.forEach(b => b.classList.remove('orders-tab-btn--active'));
      btn.classList.add('orders-tab-btn--active');

      filterState.status = btn.dataset.status || 'ALL';
      filterState.page = 0; // Quay về trang đầu tiên
      await loadOrders();
    });
  });
}

function initFilterEvents() {
  const btnApply = document.getElementById('btn-apply-filter');
  const btnReset = document.getElementById('btn-reset-filter');
  const inputDateFrom = document.getElementById('filter-date-from');
  const inputDateTo = document.getElementById('filter-date-to');

  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      filterState.dateFrom = inputDateFrom?.value || '';
      filterState.dateTo = inputDateTo?.value || '';
      filterState.page = 0;
      await loadOrders();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (inputDateFrom) inputDateFrom.value = '';
      if (inputDateTo) inputDateTo.value = '';
      filterState.dateFrom = '';
      filterState.dateTo = '';
      filterState.page = 0;
      await loadOrders();
    });
  }
}

/* ==========================================================================
   3. NẠP VÀ HIỂN THỊ DANH SÁCH ĐƠN HÀNG
   ========================================================================== */

async function loadOrders() {
  const listContainer = document.getElementById('orders-list');
  const emptyBox = document.getElementById('orders-empty');
  const paginationContainer = document.getElementById('orders-pagination');

  if (!listContainer) return;

  try {
    const params = {
      page: filterState.page,
      size: filterState.size
    };

    if (filterState.status && filterState.status !== 'ALL') {
      params.status = filterState.status;
    }
    if (filterState.dateFrom) params.dateFrom = filterState.dateFrom;
    if (filterState.dateTo) params.dateTo = filterState.dateTo;

    const data = await orderApi.getMyOrders(params);

    currentOrders = data.result || [];
    totalPages = data.meta ? data.meta.totalPages : 1;

    renderOrderList(currentOrders);
    renderPagination(data.meta);
  } catch (err) {
    console.error('[MyOrders] Lỗi nạp danh sách đơn hàng:', err);
    toast.error('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
  }
}

function renderOrderList(orders) {
  const listContainer = document.getElementById('orders-list');
  const emptyBox = document.getElementById('orders-empty');
  const template = document.getElementById('order-card-template');

  if (!listContainer || !template) return;
  listContainer.replaceChildren();

  if (!orders || orders.length === 0) {
    if (emptyBox) emptyBox.classList.remove('hidden');
    return;
  }

  if (emptyBox) emptyBox.classList.add('hidden');

  orders.forEach(order => {
    const clone = template.content.cloneNode(true);
    const orderCodeEl = clone.querySelector('.order-code');
    const orderDateEl = clone.querySelector('.order-date');
    const statusBadge = clone.querySelector('.order-status-badge');
    const receiverEl = clone.querySelector('.order-receiver-name');
    const methodPill = clone.querySelector('.delivery-method-pill');
    const distanceText = clone.querySelector('.order-distance-text');
    const priceVal = clone.querySelector('.order-price-val');
    const pricePending = clone.querySelector('.order-price-pending');
    const hintText = clone.querySelector('.order-card__hint-text');

    const btnDetail = clone.querySelector('.btn-order-action--detail');
    const btnCancel = clone.querySelector('.btn-order-action--cancel');
    const btnUndo = clone.querySelector('.btn-order-action--undo');

    // Mã đơn & Ngày đặt
    if (orderCodeEl) orderCodeEl.textContent = `#${order.orderId}`;
    if (orderDateEl) orderDateEl.textContent = `Ngày đặt: ${formatDateTime(order.createdAt)}`;

    // Trạng thái đơn hàng
    if (statusBadge) {
      const statusKey = order.status || 'PENDING';
      statusBadge.textContent = translateOrderStatus(statusKey);
      statusBadge.className = `order-status-badge order-status-badge--${statusKey.toLowerCase()}`;
    }

    // Người nhận
    if (receiverEl) receiverEl.textContent = order.receiverName || 'Khách hàng';

    // Phương thức nhận hàng
    if (methodPill) {
      if (order.deliveryMethod === 'PICKUP') {
        methodPill.textContent = 'Khách tự bốc tại xưởng';
        methodPill.className = 'delivery-method-pill delivery-method-pill--pickup';
      } else {
        methodPill.textContent = 'Giao hàng tận nơi';
        methodPill.className = 'delivery-method-pill delivery-method-pill--shipping';
      }
    }

    if (distanceText && order.deliveryDistanceKm) {
      distanceText.textContent = `(~${Number(order.deliveryDistanceKm).toFixed(1)} km)`;
    }

    // Giá tiền: Nếu đơn đang PENDING hoặc chưa có giá (>0), hiển thị "Đang chờ Quản lý tính giá"
    const isPriced = order.status !== 'PENDING' && order.totalAmount !== null && order.totalAmount !== undefined && Number(order.totalAmount) > 0;
    if (isPriced) {
      if (priceVal) {
        priceVal.textContent = formatVnd(order.totalAmount);
        priceVal.classList.remove('hidden');
      }
      if (pricePending) pricePending.classList.add('hidden');
    } else {
      if (priceVal) priceVal.classList.add('hidden');
      if (pricePending) pricePending.classList.remove('hidden');
    }

    // Nút Xem chi tiết: Chuyển hướng sang trang Chi tiết đơn hàng chuyên biệt
    if (btnDetail) {
      btnDetail.addEventListener('click', () => {
        window.location.href = `./order-detail.html?id=${order.orderId}`;
      });
    }

    // Xử lý Hủy đơn & Hoàn tác hủy
    const status = order.status;
    if (status === 'PENDING' || status === 'CONFIRMED') {
      if (btnCancel) {
        btnCancel.classList.remove('hidden');
        btnCancel.addEventListener('click', () => {
          openCancelOrderModal(order.orderId);
        });
      }
    } else if (status === 'CANCELLED') {
      const cancelledTime = order.cancelledAt ? new Date(order.cancelledAt).getTime() : 0;
      const now = Date.now();
      const diffMinutes = cancelledTime ? Math.floor((now - cancelledTime) / (60 * 1000)) : 0;
      const remainingMinutes = Math.max(0, 60 - diffMinutes);

      if (!cancelledTime || remainingMinutes > 0) {
        if (btnUndo) {
          btnUndo.classList.remove('hidden');
          btnUndo.addEventListener('click', () => {
            handleUndoCancelOrder(order.orderId);
          });
        }
        if (hintText) {
          hintText.textContent = (cancelledTime && remainingMinutes > 0)
            ? `* Có thể hoàn tác trong vòng ${remainingMinutes} phút nữa.`
            : '* Có thể hoàn tác trong vòng 60 phút sau khi hủy.';
        }
      } else {
        if (btnUndo) btnUndo.classList.add('hidden');
        if (hintText) {
          hintText.textContent = '* Đã hết thời hạn 60 phút hoàn tác hủy đơn.';
        }
      }
    }

    listContainer.appendChild(clone);
  });
}

/* ==========================================================================
   4. PHÂN TRANG (PAGINATION)
   ========================================================================== */

function renderPagination(meta) {
  const container = document.getElementById('orders-pagination');
  if (!container) return;

  if (!meta || meta.totalPages <= 1) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.replaceChildren();

  const currentPage = meta.page; // 0-indexed
  const total = meta.totalPages;

  // Nút Trước
  const btnPrev = document.createElement('button');
  btnPrev.type = 'button';
  btnPrev.className = 'pagination-btn';
  btnPrev.disabled = currentPage === 0;
  btnPrev.textContent = '←';
  btnPrev.setAttribute('aria-label', 'Trang trước');
  btnPrev.addEventListener('click', async () => {
    if (filterState.page > 0) {
      filterState.page -= 1;
      await loadOrders();
    }
  });
  container.appendChild(btnPrev);

  // Các số trang
  for (let i = 0; i < total; i++) {
    const btnPage = document.createElement('button');
    btnPage.type = 'button';
    btnPage.className = 'pagination-btn';
    if (i === currentPage) {
      btnPage.classList.add('pagination-btn--active');
    }
    btnPage.textContent = String(i + 1); // 1-indexed UI
    btnPage.addEventListener('click', async () => {
      filterState.page = i;
      await loadOrders();
    });
    container.appendChild(btnPage);
  }

  // Nút Sau
  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'pagination-btn';
  btnNext.disabled = currentPage >= total - 1;
  btnNext.textContent = '→';
  btnNext.setAttribute('aria-label', 'Trang sau');
  btnNext.addEventListener('click', async () => {
    if (filterState.page < total - 1) {
      filterState.page += 1;
      await loadOrders();
    }
  });
  container.appendChild(btnNext);
}

/* ==========================================================================
   5. XEM CHI TIẾT ĐƠN HÀNG (Điều hướng sang order-detail.html)
   ========================================================================== */

function initDetailModalEvents() {
  // Chi tiết đơn hàng được hiển thị qua trang chuyên biệt order-detail.html
}

function openOrderDetailModal(orderId) {
  window.location.href = `./order-detail.html?id=${orderId}`;
}





/* ==========================================================================
   6. MODAL HỦY ĐƠN HÀNG & HOÀN TÁC HỦY ĐƠN
   ========================================================================== */

function initCancelModalEvents() {
  const modalOverlay = document.getElementById('cancel-order-modal-overlay');
  const btnClose = document.getElementById('btn-close-cancel-modal');
  const btnDismiss = document.getElementById('btn-cancel-modal-dismiss');
  const form = document.getElementById('cancel-order-form');
  const selectReason = document.getElementById('cancel-reason-select');
  const customReasonWrap = document.getElementById('cancel-custom-reason-wrap');
  const customReasonInput = document.getElementById('cancel-custom-reason-input');

  function closeModal() {
    modalOverlay?.classList.remove('modal-overlay--open');
  }

  btnClose?.addEventListener('click', closeModal);
  btnDismiss?.addEventListener('click', closeModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  selectReason?.addEventListener('change', () => {
    if (selectReason.value === 'Khác') {
      customReasonWrap?.classList.remove('hidden');
      customReasonInput?.focus();
    } else {
      customReasonWrap?.classList.add('hidden');
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderIdInput = document.getElementById('cancel-target-order-id');
    const orderId = orderIdInput?.value;
    if (!orderId) return;

    let finalReason = selectReason?.value || 'Khách hàng hủy đơn';
    if (finalReason === 'Khác') {
      finalReason = (customReasonInput?.value || '').trim() || 'Lý do khác';
    }

    const btnSubmit = document.getElementById('btn-confirm-cancel-order');

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang xử lý...';
      }

      await orderApi.cancelOrder(orderId, finalReason);
      toast.success(`Đã hủy đơn hàng #${orderId} thành công.`);
      closeModal();
      await loadOrders();
    } catch (err) {
      console.error('[MyOrders] Lỗi hủy đơn hàng:', err);
      toast.error(err.message || 'Không thể hủy đơn hàng lúc này.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Xác Nhận Hủy Đơn';
      }
    }
  });
}

function openCancelOrderModal(orderId) {
  const modalOverlay = document.getElementById('cancel-order-modal-overlay');
  const titleEl = document.getElementById('modal-cancel-title');
  const orderIdInput = document.getElementById('cancel-target-order-id');
  const selectReason = document.getElementById('cancel-reason-select');
  const customReasonWrap = document.getElementById('cancel-custom-reason-wrap');
  const customReasonInput = document.getElementById('cancel-custom-reason-input');

  if (titleEl) titleEl.textContent = `Hủy Đơn Hàng #${orderId}`;
  if (orderIdInput) orderIdInput.value = orderId;
  if (selectReason) selectReason.value = 'Tôi muốn thay đổi quy cách / kích thước tôn';
  if (customReasonWrap) customReasonWrap.classList.add('hidden');
  if (customReasonInput) customReasonInput.value = '';

  modalOverlay?.classList.add('modal-overlay--open');
}

function handleUndoCancelOrder(orderId) {
  showConfirmModal({
    modalId: 'hmp-confirm-undo-cancel-modal',
    title: 'Khôi phục đơn hàng',
    message: `Bạn có chắc chắn muốn hoàn tác và khôi phục lại đơn hàng #${orderId} không? Đơn hàng sẽ quay trở về trạng thái trước khi hủy.`,
    confirmText: 'Xác nhận khôi phục',
    cancelText: 'Bỏ qua',
    type: 'primary',
    onConfirm: async () => {
      try {
        await orderApi.undoCancelOrder(orderId);
        toast.success(`Đã khôi phục đơn hàng #${orderId} thành công!`);
        await loadOrders();
      } catch (err) {
        console.error('[MyOrders] Lỗi hoàn tác hủy đơn:', err);
        toast.error(err.message || 'Không thể hoàn tác hủy đơn hàng. Cửa sổ 60 phút có thể đã hết hạn.');
      }
    }
  });
}
