/**
 * order-detail.js — Điều khiển logic trang Chi tiết đơn hàng chuyên biệt
 * Thiết kế trung thực theo mẫu đồ họa: Stepper tiến trình, thẻ giao hàng, bảng sản phẩm
 */

import { requireCustomerAuth } from '../auth/auth.guard.js';
import { loadHeader, loadFooter } from '../components/component-loader.js';
import { orderApi } from '../api/order.api.js';
import { formatVnd, formatDateTime } from '../utils/format.js';
import { translateOrderStatus } from '../utils/i18n.js';
import { toast } from '../components/toast.js';
import { showConfirmModal } from '../components/confirm-modal.js';

let currentOrderDetail = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực khách hàng
  const hasAuth = await requireCustomerAuth();
  if (!hasAuth) return;

  // 2. Nạp Header và Footer dùng chung
  await Promise.all([loadHeader(), loadFooter()]);

  // 3. Lấy Order ID từ Query Params (?id=... hoặc ?orderId=...)
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id') || urlParams.get('orderId');

  if (!orderId) {
    toast.error('Không tìm thấy mã đơn hàng cần xem.');
    setTimeout(() => {
      window.location.href = './my-orders.html';
    }, 1200);
    return;
  }

  // 4. Khởi tạo sự kiện in hóa đơn
  initPrintButton();

  // 5. Tải dữ liệu chi tiết đơn hàng
  await loadOrderDetail(orderId);
});

function initPrintButton() {
  const btnPrint = document.getElementById('btn-print-invoice');
  btnPrint?.addEventListener('click', () => {
    window.print();
  });
}

async function loadOrderDetail(orderId) {
  try {
    const order = await orderApi.getOrderById(orderId);
    if (!order) {
      toast.error('Đơn hàng không tồn tại hoặc bạn không có quyền xem.');
      setTimeout(() => {
        window.location.href = './my-orders.html';
      }, 1500);
      return;
    }

    renderOrderData(order);
    initCancelOrderModal(order);
    renderOrderActions(order);
  } catch (err) {
    console.error('[OrderDetail] Lỗi nạp đơn hàng:', err);
    toast.error('Không thể tải thông tin chi tiết đơn hàng.');
  }
}

function renderOrderData(order) {
  // 1. Khối Tóm Tắt 3 Cột (Top Summary)
  const codeEl = document.getElementById('detail-order-code');
  const dateEl = document.getElementById('detail-order-date');
  const statusPill = document.getElementById('detail-status-pill');

  if (codeEl) codeEl.textContent = `#${order.orderId}`;
  if (dateEl) dateEl.textContent = formatDateTime(order.createdAt);

  const status = order.status || 'PENDING';
  if (statusPill) {
    statusPill.textContent = translateOrderStatus(status);
    statusPill.className = `top-summary-val order-status-badge order-status-badge--${status.toLowerCase()}`;
  }

  // 2. Thanh Tiến Trình (Horizontal Stepper Bar)
  renderStepper(status, order.createdAt, order.statusHistory);

  // 3. Thông Tin Giao Hàng & Phương Thức Thanh Toán
  const receiverNameEl = document.getElementById('detail-receiver-name');
  const receiverPhoneEl = document.getElementById('detail-receiver-phone');
  const addressEl = document.getElementById('detail-receiver-address');
  const deliveryPill = document.getElementById('detail-delivery-pill');
  const deliveryDist = document.getElementById('detail-delivery-dist');
  const noteWrap = document.getElementById('detail-note-wrap');
  const noteEl = document.getElementById('detail-order-note');

  if (receiverNameEl) receiverNameEl.textContent = order.receiverName || 'Khách hàng';
  if (receiverPhoneEl) receiverPhoneEl.textContent = order.receiverPhone || '-';
  if (addressEl) addressEl.textContent = order.shippingAddress || 'Nhận tại xưởng sản xuất HMP';

  if (deliveryPill) {
    if (order.deliveryMethod === 'PICKUP') {
      deliveryPill.textContent = 'Khách tự bốc tại xưởng';
      deliveryPill.className = 'delivery-method-pill delivery-method-pill--pickup';
    } else {
      deliveryPill.textContent = 'Giao hàng tận nơi';
      deliveryPill.className = 'delivery-method-pill delivery-method-pill--shipping';
    }
  }

  if (deliveryDist && order.deliveryDistanceKm) {
    deliveryDist.textContent = `(~${Number(order.deliveryDistanceKm).toFixed(1)} km từ xưởng)`;
  }

  if (order.note) {
    if (noteWrap) noteWrap.classList.remove('hidden');
    if (noteEl) noteEl.textContent = order.note;
  }

  // 4. Bảng Danh Sách Sản Phẩm (kèm mô tả yêu cầu khách hàng chữ xám)
  renderProductItems(order.items);

  // 5. Khối Tổng Tiền
  const totalAmountEl = document.getElementById('detail-total-amount');
  const discountInfoEl = document.getElementById('detail-discount-info');

  const isPriced = status !== 'PENDING' && order.totalAmount !== null && order.totalAmount !== undefined && Number(order.totalAmount) > 0;

  if (isPriced) {
    if (totalAmountEl) {
      totalAmountEl.textContent = formatVnd(order.totalAmount);
      totalAmountEl.className = 'total-amount-value';
    }
    if (order.discountAmount && order.discountAmount > 0) {
      if (discountInfoEl) {
        discountInfoEl.textContent = `(Đã áp dụng chiết khấu: -${formatVnd(order.discountAmount)})`;
        discountInfoEl.classList.remove('hidden');
      }
    }
  } else {
    if (totalAmountEl) {
      totalAmountEl.textContent = 'Đang chờ Quản lý tính giá';
      totalAmountEl.className = 'total-amount-pending';
    }
  }

  // 6. Cập nhật nút hành động Hủy / Hoàn tác
  renderOrderActions(order);
}

/**
 * Hiển thị các nút thao tác tương tác (Hủy đơn, Hoàn tác hủy) theo trạng thái
 */
function renderOrderActions(order) {
  const btnCancel = document.getElementById('btn-cancel-detail-order');
  const btnUndo = document.getElementById('btn-undo-cancel-detail');
  const undoHint = document.getElementById('detail-undo-hint');
  const status = order.status || 'PENDING';

  if (!btnCancel || !btnUndo || !undoHint) return;

  // Reset hiển thị
  btnCancel.classList.add('hidden');
  btnUndo.classList.add('hidden');
  undoHint.classList.add('hidden');

  if (status === 'CANCELLED') {
    // Tìm thời điểm đơn bị hủy từ statusHistory hoặc updatedAt
    let cancelledTime = null;
    if (Array.isArray(order.statusHistory)) {
      const cancelEntry = [...order.statusHistory].reverse().find(h => h.toStatus === 'CANCELLED');
      if (cancelEntry && cancelEntry.createdAt) {
        cancelledTime = cancelEntry.createdAt;
      }
    }
    if (!cancelledTime) {
      cancelledTime = order.updatedAt || order.createdAt;
    }

    const elapsedMinutes = cancelledTime
      ? Math.floor((Date.now() - new Date(cancelledTime).getTime()) / 60000)
      : 0;
    const remainingMinutes = Math.max(0, 60 - elapsedMinutes);

    if (!cancelledTime || remainingMinutes > 0) {
      btnUndo.classList.remove('hidden');
      undoHint.classList.remove('hidden');
      undoHint.textContent = (cancelledTime && remainingMinutes > 0)
        ? `* Có thể hoàn tác trong vòng ${remainingMinutes} phút nữa.`
        : '* Có thể hoàn tác trong vòng 60 phút sau khi hủy.';

      btnUndo.onclick = () => {
        handleUndoCancelOrder(order.orderId);
      };
    } else {
      undoHint.classList.remove('hidden');
      undoHint.textContent = '* Đã hết thời hạn 60 phút hoàn tác hủy đơn.';
    }
  } else if (status === 'PENDING' || status === 'CONFIRMED') {
    btnCancel.classList.remove('hidden');
    btnCancel.onclick = () => {
      openCancelModal(order);
    };
  }
}

/**
 * Mở modal hủy đơn hàng
 */
function openCancelModal(order) {
  const modalOverlay = document.getElementById('cancel-detail-modal-overlay');
  const modalTitle = document.getElementById('modal-cancel-title');
  const selectReason = document.getElementById('cancel-reason-select');
  const customReasonWrap = document.getElementById('cancel-custom-reason-wrap');
  const customReasonInput = document.getElementById('cancel-custom-reason-input');

  if (modalTitle) modalTitle.textContent = `Hủy Đơn Hàng #${order.orderId}`;
  if (selectReason) selectReason.value = 'Tôi muốn thay đổi quy cách / kích thước tôn';
  if (customReasonWrap) customReasonWrap.classList.add('hidden');
  if (customReasonInput) customReasonInput.value = '';

  modalOverlay?.classList.add('modal-overlay--open');
}

/**
 * Đóng modal hủy đơn hàng
 */
function closeCancelModal() {
  const modalOverlay = document.getElementById('cancel-detail-modal-overlay');
  modalOverlay?.classList.remove('modal-overlay--open');
}

/**
 * Khởi tạo sự kiện cho Modal hủy đơn hàng
 */
function initCancelOrderModal(order) {
  const modalOverlay = document.getElementById('cancel-detail-modal-overlay');
  const btnClose = document.getElementById('btn-close-cancel-modal');
  const btnDismiss = document.getElementById('btn-cancel-modal-dismiss');
  const form = document.getElementById('cancel-detail-order-form');
  const selectReason = document.getElementById('cancel-reason-select');
  const customReasonWrap = document.getElementById('cancel-custom-reason-wrap');
  const customReasonInput = document.getElementById('cancel-custom-reason-input');
  const btnSubmit = document.getElementById('btn-confirm-cancel-order');

  if (btnClose) btnClose.onclick = closeCancelModal;
  if (btnDismiss) btnDismiss.onclick = closeCancelModal;

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeCancelModal();
  });

  if (selectReason) {
    selectReason.onchange = () => {
      if (selectReason.value === 'Khác') {
        customReasonWrap?.classList.remove('hidden');
        customReasonInput?.focus();
      } else {
        customReasonWrap?.classList.add('hidden');
      }
    };
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      let reason = selectReason ? selectReason.value : 'Lý do khác';
      if (reason === 'Khác') {
        const customText = (customReasonInput ? customReasonInput.value : '').trim();
        if (!customText) {
          toast.warning('Vui lòng nhập lý do hủy cụ thể.');
          customReasonInput?.focus();
          return;
        }
        reason = customText;
      }

      try {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Đang xử lý...';
        }

        await orderApi.cancelOrder(order.orderId, { reason });
        toast.success(`Đã hủy đơn hàng #${order.orderId} thành công.`);
        closeCancelModal();

        // Nạp lại chi tiết đơn hàng
        await loadOrderDetail(order.orderId);
      } catch (err) {
        console.error('[OrderDetail] Lỗi hủy đơn:', err);
        toast.error(err.message || 'Không thể hủy đơn hàng vào lúc này.');
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Xác Nhận Hủy Đơn';
        }
      }
    };
  }
}

/**
 * Xử lý hoàn tác hủy đơn hàng với Confirm Modal chuẩn HMP
 */
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
        await loadOrderDetail(orderId);
      } catch (err) {
        console.error('[OrderDetail] Lỗi hoàn tác hủy đơn:', err);
        toast.error(err.message || 'Không thể hoàn tác hủy đơn hàng. Cửa sổ 60 phút có thể đã hết hạn.');
      }
    }
  });
}

/**
 * Hiển thị thanh tiến trình Stepper theo trạng thái và lịch sử
 */
function renderStepper(status, createdAt, history = []) {
  const node1 = document.getElementById('step-node-1');
  const node2 = document.getElementById('step-node-2');
  const node3 = document.getElementById('step-node-3');
  const node4 = document.getElementById('step-node-4');
  const fillBar = document.getElementById('stepper-fill');

  const time1 = document.getElementById('step-time-1');
  const time2 = document.getElementById('step-time-2');
  const time3 = document.getElementById('step-time-3');
  const time4 = document.getElementById('step-time-4');

  // Bước 1 luôn xong
  if (time1) time1.textContent = formatStepTime(createdAt);

  // Tìm các mốc thời gian từ statusHistory
  const findHistoryTime = (targetStatus) => {
    const item = (history || []).find(h => h.toStatus === targetStatus);
    return item ? formatStepTime(item.createdAt) : '';
  };

  const procTime = findHistoryTime('CONFIRMED') || findHistoryTime('PROCESSING');
  const shipTime = findHistoryTime('SHIPPING');
  const compTime = findHistoryTime('COMPLETED');

  if (time2 && procTime) time2.textContent = procTime;
  if (time3 && shipTime) time3.textContent = shipTime;
  if (time4 && compTime) time4.textContent = compTime;

  // Reset classes
  [node1, node2, node3, node4].forEach(n => {
    if (!n) return;
    n.classList.remove('step-node--completed', 'step-node--active');
  });

  if (status === 'PENDING') {
    node1?.classList.add('step-node--completed');
    node2?.classList.add('step-node--active');
    if (fillBar) fillBar.style.width = '16%';
  } else if (status === 'CONFIRMED' || status === 'PROCESSING') {
    node1?.classList.add('step-node--completed');
    node2?.classList.add('step-node--completed');
    node3?.classList.add('step-node--active');
    if (fillBar) fillBar.style.width = '50%';
  } else if (status === 'SHIPPING') {
    node1?.classList.add('step-node--completed');
    node2?.classList.add('step-node--completed');
    node3?.classList.add('step-node--completed');
    node4?.classList.add('step-node--active');
    if (fillBar) fillBar.style.width = '83%';
  } else if (status === 'COMPLETED') {
    node1?.classList.add('step-node--completed');
    node2?.classList.add('step-node--completed');
    node3?.classList.add('step-node--completed');
    node4?.classList.add('step-node--completed');
    if (fillBar) fillBar.style.width = '100%';
  } else if (status === 'CANCELLED') {
    node1?.classList.add('step-node--completed');
    if (node2) {
      node2.querySelector('.step-title').textContent = 'Đã hủy';
      node2.classList.add('step-node--active');
    }
    if (fillBar) fillBar.style.width = '25%';
  }
}

function formatStepTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${mins}`;
}

/**
 * Hiển thị bảng danh sách sản phẩm
 * ĐẶC BIỆT: Hiển thị dòng mô tả yêu cầu khách hàng màu xám bên dưới tên sản phẩm
 */
function renderProductItems(items = []) {
  const tbody = document.getElementById('detail-products-tbody');
  const template = document.getElementById('order-product-row-template');

  if (!tbody || !template) return;
  tbody.replaceChildren();

  if (!items || items.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">Không có thông tin sản phẩm trong đơn hàng.</td>`;
    tbody.appendChild(tr);
    return;
  }

  items.forEach((item, index) => {
    const clone = template.content.cloneNode(true);
    const sttEl = clone.querySelector('.row-stt');
    const thumbEl = clone.querySelector('.row-thumb');
    const nameEl = clone.querySelector('.row-name');
    const specsEl = clone.querySelector('.row-specs');
    const unitPriceEl = clone.querySelector('.row-unit-price');
    const quantityEl = clone.querySelector('.row-quantity');
    const totalPriceEl = clone.querySelector('.row-total-price');

    if (sttEl) sttEl.textContent = String(index + 1);

    // Hình ảnh sản phẩm
    if (thumbEl) {
      thumbEl.src = '../../assets/images/empty-picture.png';
      thumbEl.alt = item.productName || 'Tôn thép HMP';
    }

    // Tên sản phẩm
    if (nameEl) nameEl.textContent = item.productName || 'Sản phẩm tôn lợp';

    // DÒNG CHỮ XÁM MÔ TẢ YÊU CẦU / QUY CÁCH (THEO YÊU CẦU CỦA USER)
    if (specsEl) {
      specsEl.replaceChildren();

      // Thông số cơ bản: Biến thể, Màu sắc, Chiều dài
      const specLine = document.createElement('span');
      const parts = [];
      if (item.variantName) parts.push(`Biến thể: ${item.variantName}`);
      if (item.color) parts.push(`Màu: ${item.color}`);
      if (item.size) parts.push(`Chiều dài: ${item.size}m`);
      specLine.textContent = parts.length > 0 ? parts.join(' | ') : 'Quy cách chuẩn';
      specsEl.appendChild(specLine);

      // YÊU CẦU GIA CÔNG / BẺ CHẤN CHI TIẾT (dành cho mặt hàng phải mô tả yêu cầu như máng xối, diềm, úp nóc...)
      if (item.dimensions && item.dimensions.trim()) {
        const reqLine = document.createElement('div');
        reqLine.className = 'product-specs-gray__req';
        reqLine.textContent = `Yêu cầu gia công / Bẻ chấn: ${item.dimensions.trim()}`;
        specsEl.appendChild(reqLine);
      }
    }

    // Đơn giá & Thành tiền
    if (item.unitPrice !== null && item.unitPrice !== undefined && Number(item.unitPrice) > 0) {
      if (unitPriceEl) unitPriceEl.textContent = formatVnd(item.unitPrice);
      if (totalPriceEl) totalPriceEl.textContent = formatVnd(item.totalPrice || (item.unitPrice * (item.size || 1) * item.quantity));
    } else {
      if (unitPriceEl) unitPriceEl.textContent = 'Chờ giá';
      if (totalPriceEl) totalPriceEl.textContent = 'Chờ giá';
    }

    // Số lượng
    if (quantityEl) {
      quantityEl.textContent = `${item.quantity || 1} ${item.unit || 'tấm'}`;
    }

    tbody.appendChild(clone);
  });
}
