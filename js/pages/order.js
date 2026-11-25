/**
 * order.js — Điều khiển logic Trang Xác Nhận & Đặt Hàng (Checkout Order Page)
 * 
 * Nghiệp vụ:
 * - Hỗ trợ 2 luồng: "Mua ngay" (mode=buy-now) và "Giỏ hàng" (mode=cart).
 * - Sổ địa chỉ nhận hàng: tải danh sách từ API GET /me/addresses, cho phép thêm nhanh địa chỉ mới.
 * - Gửi yêu cầu đặt hàng tới Backend API POST /api/v1/orders.
 * - QUY TẮC CỐT LÕI: Sau khi đặt hàng thành công, TUYỆT ĐỐI KHÔNG XÓA GIỎ HÀNG (để khách có thể đặt lại).
 * - 0% inline style; 0% innerHTML với dữ liệu người dùng (dùng DOM API & Template).
 */

import { initCommonLayout } from '../components/component-loader.js';
import { orderApi } from '../api/order.api.js';
import { getProductDetail } from '../api/product.api.js';
import { authState } from '../auth/auth.state.js';
import { formatVnd } from '../utils/format.js';
import { toast } from '../components/toast.js';

// Trạng thái trang
let orderMode = 'cart';
let orderItems = [];
let addressList = [];
let selectedAddressId = null;

const DEFAULT_EMPTY_IMAGE = '../../assets/images/empty-picture.png';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer
  await initCommonLayout();

  // 2. Bắt buộc đăng nhập để đặt hàng
  if (!authState.isAuthenticated()) {
    toast.warning('Vui lòng đăng nhập để tiến hành đặt hàng.');
    setTimeout(() => {
      window.location.href = `../auth/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
    }, 1200);
    return;
  }

  // 3. Đọc dữ liệu mặt hàng cần đặt (Mua ngay hoặc Giỏ hàng)
  const isLoaded = initOrderItemsFromSession();
  if (!isLoaded || orderItems.length === 0) {
    showEmptyOrderState();
    return;
  }

  // 4. Khởi tạo form và sự kiện
  initUserInfo();
  initAddressEvents();
  initSubmitOrder();
  renderBreadcrumb();
  window.addEventListener('resize', renderBreadcrumb);

  // 5. Tải danh sách địa chỉ, làm giàu dữ liệu giá từ máy chủ và render tóm tắt mặt hàng
  await loadAddresses();
  await enrichOrderItemsPricing();
  renderSummaryItems();
});

/**
 * Render thanh điều hướng breadcrumb động:
 * Bắt đầu từ: "Sản phẩm / Chi tiết sản phẩm / Đặt hàng" (khi Mua ngay) hoặc "Sản phẩm / Giỏ hàng / Đặt hàng".
 * Nếu đường dẫn quá dài (màn hình hẹp hoặc nhiều ký tự), tự động cắt ngắn đoạn trước bằng "...".
 * Ví dụ: "... / Chi tiết sản phẩm / Đặt hàng"
 */
function renderBreadcrumb() {
  const breadcrumbEl = document.getElementById('order-breadcrumb');
  if (!breadcrumbEl) return;

  breadcrumbEl.replaceChildren();

  // Xác định link và text của bước trước
  let prevText = 'Chi tiết sản phẩm';
  let prevLink = '../product/catalog.html';

  if (orderMode === 'buy-now') {
    prevText = 'Chi tiết sản phẩm';
    if (orderItems[0] && orderItems[0].productId) {
      prevLink = `../product/detail.html?id=${orderItems[0].productId}`;
    }
  } else {
    prevText = 'Giỏ hàng';
    prevLink = './cart.html';
  }

  // Tiêu chí rút gọn khi đường dẫn quá dài (màn hình hẹp dưới 640px)
  const isNarrowScreen = window.innerWidth < 640;

  const fragment = document.createDocumentFragment();

  if (isNarrowScreen) {
    // Rút gọn đoạn đầu bằng "..."
    const ellipsisLink = document.createElement('a');
    ellipsisLink.href = '../product/catalog.html';
    ellipsisLink.className = 'breadcrumb__link breadcrumb__link--ellipsis';
    ellipsisLink.textContent = '...';
    ellipsisLink.title = 'Sản phẩm';
    fragment.appendChild(ellipsisLink);
  } else {
    // Đoạn đầu đầy đủ: "Sản phẩm"
    const rootLink = document.createElement('a');
    rootLink.href = '../product/catalog.html';
    rootLink.className = 'breadcrumb__link';
    rootLink.textContent = 'Sản phẩm';
    fragment.appendChild(rootLink);
  }

  // Dấu phân cách 1
  const sep1 = document.createElement('span');
  sep1.className = 'breadcrumb__separator';
  sep1.textContent = '/';
  fragment.appendChild(sep1);

  // Đoạn giữa: "Chi tiết sản phẩm" (hoặc "Giỏ hàng")
  const midLink = document.createElement('a');
  midLink.href = prevLink;
  midLink.className = 'breadcrumb__link';
  midLink.textContent = prevText;
  if (orderItems[0] && orderItems[0].productName) {
    midLink.title = orderItems[0].productName;
  }
  fragment.appendChild(midLink);

  // Dấu phân cách 2
  const sep2 = document.createElement('span');
  sep2.className = 'breadcrumb__separator';
  sep2.textContent = '/';
  fragment.appendChild(sep2);

  // Đoạn cuối: "Đặt hàng"
  const currentSpan = document.createElement('span');
  currentSpan.className = 'breadcrumb__current';
  currentSpan.textContent = 'Đặt hàng';
  fragment.appendChild(currentSpan);

  breadcrumbEl.appendChild(fragment);
}

/**
 * Đọc dữ liệu đặt hàng từ sessionStorage theo chế độ (mode)
 */
function initOrderItemsFromSession() {
  const urlParams = new URLSearchParams(window.location.search);
  orderMode = urlParams.get('mode') || 'cart';

  try {
    if (orderMode === 'buy-now') {
      const raw = sessionStorage.getItem('hmp_buy_now_item');
      if (raw) {
        const singleItem = JSON.parse(raw);
        orderItems = singleItem ? [singleItem] : [];
      }
    } else {
      const raw = sessionStorage.getItem('hmp_cart_checkout_items');
      if (raw) {
        orderItems = JSON.parse(raw) || [];
      }
    }
  } catch (err) {
    console.error('Lỗi khi đọc session mặt hàng đặt mua:', err);
    orderItems = [];
  }

  return orderItems.length > 0;
}

/**
 * Hiển thị màn hình khi không có sản phẩm nào để đặt
 */
function showEmptyOrderState() {
  const emptyEl = document.getElementById('order-empty-state');
  const layoutEl = document.getElementById('order-form-layout');

  if (layoutEl) layoutEl.classList.add('hidden');
  if (emptyEl) emptyEl.classList.remove('hidden');
}

/**
 * Điền sẵn thông tin khách hàng từ auth state
 */
function initUserInfo() {
  const currentUser = authState.getCurrentUser();
  const inputName = document.getElementById('input-receiver-name');
  const inputPhone = document.getElementById('input-receiver-phone');

  if (currentUser) {
    if (inputName && currentUser.fullName) {
      inputName.value = currentUser.fullName;
    }
    if (inputPhone && currentUser.phone) {
      inputPhone.value = currentUser.phone;
    }
  }
}

/**
 * Tải danh sách địa chỉ nhận hàng từ máy chủ
 */
async function loadAddresses() {
  const container = document.getElementById('address-list-container');
  if (!container) return;

  try {
    const list = await orderApi.getMyAddresses();
    addressList = Array.isArray(list) ? list : [];

    container.replaceChildren();

    if (addressList.length === 0) {
      const emptyText = document.createElement('p');
      emptyText.className = 'address-loading-text';
      emptyText.textContent = 'Bạn chưa lưu địa chỉ nhận hàng nào. Vui lòng thêm địa chỉ mới.';
      container.appendChild(emptyText);

      // Tự động mở khung thêm địa chỉ mới
      const newAddressBox = document.getElementById('new-address-box');
      if (newAddressBox) newAddressBox.classList.remove('hidden');
      return;
    }

    const template = document.getElementById('address-radio-template');
    if (!template) return;

    const fragment = document.createDocumentFragment();
    let defaultId = null;

    addressList.forEach((addr, idx) => {
      const clone = template.content.cloneNode(true);
      const radioInput = clone.querySelector('.address-radio-input');
      const textSpan = clone.querySelector('.address-text');
      const badgeDefault = clone.querySelector('.address-badge-default');

      radioInput.value = String(addr.addressId || addr.id);
      textSpan.textContent = addr.address || addr.addressLine || '';

      if (addr.isDefault) {
        badgeDefault.classList.remove('hidden');
        defaultId = addr.addressId || addr.id;
      }

      // Chọn mặc định hoặc địa chỉ đầu tiên
      if (addr.isDefault || (!defaultId && idx === 0)) {
        radioInput.checked = true;
        selectedAddressId = addr.addressId || addr.id;
      }

      radioInput.addEventListener('change', () => {
        if (radioInput.checked) {
          selectedAddressId = addr.addressId || addr.id;
        }
      });

      fragment.appendChild(clone);
    });

    container.appendChild(fragment);

  } catch (err) {
    console.warn('Lỗi khi tải sổ địa chỉ:', err);
    container.replaceChildren();
    const errorText = document.createElement('p');
    errorText.className = 'address-loading-text';
    errorText.textContent = 'Không thể tải sổ địa chỉ. Bạn có thể nhập địa chỉ mới.';
    container.appendChild(errorText);

    const newAddressBox = document.getElementById('new-address-box');
    if (newAddressBox) newAddressBox.classList.remove('hidden');
  }
}

/**
 * Gắn sự kiện thêm địa chỉ nhận hàng mới
 */
function initAddressEvents() {
  const btnToggle = document.getElementById('btn-toggle-add-address');
  const boxNew = document.getElementById('new-address-box');
  const btnCancel = document.getElementById('btn-cancel-new-address');
  const btnSave = document.getElementById('btn-save-new-address');
  const inputNewAddr = document.getElementById('input-new-address');
  const errorNewAddr = document.getElementById('error-new-address');
  const chkDefault = document.getElementById('chk-address-default');

  const clearNewAddressError = () => {
    if (inputNewAddr) inputNewAddr.classList.remove('form-control--error');
    if (errorNewAddr) {
      errorNewAddr.textContent = '';
      errorNewAddr.classList.add('hidden');
    }
  };

  if (inputNewAddr) {
    inputNewAddr.addEventListener('input', clearNewAddressError);
  }

  if (btnToggle && boxNew) {
    btnToggle.addEventListener('click', () => {
      boxNew.classList.toggle('hidden');
      clearNewAddressError();
      if (!boxNew.classList.contains('hidden') && inputNewAddr) {
        inputNewAddr.focus();
      }
    });
  }

  if (btnCancel && boxNew) {
    btnCancel.addEventListener('click', () => {
      boxNew.classList.add('hidden');
      clearNewAddressError();
      if (inputNewAddr) inputNewAddr.value = '';
    });
  }

  if (btnSave && inputNewAddr) {
    btnSave.addEventListener('click', async () => {
      clearNewAddressError();
      const addressText = inputNewAddr.value.trim();

      if (!addressText) {
        if (inputNewAddr) inputNewAddr.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng nhập địa chỉ nhận hàng chi tiết.';
          errorNewAddr.classList.remove('hidden');
        }
        toast.warning('Vui lòng nhập địa chỉ nhận hàng chi tiết.');
        inputNewAddr.focus();
        return;
      }

      if (addressText.length < 6) {
        if (inputNewAddr) inputNewAddr.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Địa chỉ cần ít nhất 6 ký tự (số nhà, đường, thôn/xã...).';
          errorNewAddr.classList.remove('hidden');
        }
        toast.warning('Địa chỉ nhận hàng quá ngắn (tối thiểu 6 ký tự).');
        inputNewAddr.focus();
        return;
      }

      if (addressText.length > 255) {
        if (inputNewAddr) inputNewAddr.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Địa chỉ nhận hàng không được vượt quá 255 ký tự.';
          errorNewAddr.classList.remove('hidden');
        }
        toast.warning('Địa chỉ nhận hàng quá dài (tối đa 255 ký tự).');
        inputNewAddr.focus();
        return;
      }

      try {
        btnSave.disabled = true;
        const isDefault = chkDefault ? chkDefault.checked : false;
        await orderApi.createAddress({ address: addressText, isDefault });
        toast.success('Đã lưu địa chỉ nhận hàng mới.');

        inputNewAddr.value = '';
        clearNewAddressError();
        if (boxNew) boxNew.classList.add('hidden');

        await loadAddresses();
      } catch (err) {
        console.error('Lỗi khi lưu địa chỉ:', err);
        toast.error(err.message || 'Không thể lưu địa chỉ.');
      } finally {
        btnSave.disabled = false;
      }
    });
  }
}

/**
 * Làm giàu dữ liệu giá của orderItems từ Backend (GET /api/v1/products/{id}).
 * Đảm bảo luôn kiểm tra quyền PRODUCT_PRICE_VIEW thực tế của người dùng:
 * - Nếu caller có quyền (product.priceVisible === true): lấy đơn giá biến thể, tính thành tiền chính xác.
 * - Nếu caller thiếu quyền (product.priceVisible === false): đặt giá null để hiển thị 'Liên hệ báo giá'.
 * - Hoàn toàn không phụ thuộc vào việc session cũ hay mới, khắc phục triệt để lỗi cache/session cũ.
 */
async function enrichOrderItemsPricing() {
  if (!orderItems || orderItems.length === 0) return;

  const fetchPromises = orderItems.map(async (item) => {
    if (!item.productId) return;
    try {
      const prod = await getProductDetail(item.productId);
      if (prod) {
        item.priceVisible = Boolean(prod.priceVisible);

        // Bổ sung ảnh sản phẩm nếu session chưa có
        if (!item.productImageUrl && !item.imageUrl) {
          item.productImageUrl = prod.primaryImageUrl || (prod.images && prod.images.length > 0 ? prod.images[0].imageUrl : null);
        }

        if (item.priceVisible && Array.isArray(prod.variants) && prod.variants.length > 0) {
          // Khớp đúng biến thể theo variantId hoặc lấy biến thể đầu tiên
          const matchedVariant = prod.variants.find(v => v.id === item.variantId) || prod.variants[0];
          if (matchedVariant && matchedVariant.prices) {
            const entries = Object.entries(matchedVariant.prices).filter(([, p]) => p !== null && p !== undefined);
            if (entries.length > 0) {
              const sizeVal = parseFloat(item.size);
              let preferred = null;
              if (!isNaN(sizeVal) && sizeVal > 0) {
                // Ưu tiên đơn giá theo mét dài "m" hoặc "mét"
                preferred = entries.find(([u]) => /^m(é|e)t$|^m$/i.test(u.trim())) || entries[0];
              } else {
                // Ưu tiên đơn vị theo tấm, cái...
                preferred = entries.find(([u]) => !/^m(é|e)t$|^m$/i.test(u.trim())) || entries[0];
              }

              if (preferred) {
                item.unitName = preferred[0];
                item.unitPrice = preferred[1];
                const multiplier = (!isNaN(sizeVal) && sizeVal > 0 && /^m(é|e)t$|^m$/i.test(item.unitName.trim())) ? sizeVal : 1;
                const qty = parseInt(item.quantity, 10) || 1;
                item.totalPrice = Math.round(item.unitPrice * multiplier * qty);
              }
            }
          }
        } else if (!item.priceVisible) {
          // Không có quyền xem giá
          item.unitPrice = null;
          item.totalPrice = null;
        }
      }
    } catch (err) {
      console.warn(`[Order] Không thể nạp thông tin giá sản phẩm ID ${item.productId}:`, err);
    }
  });

  await Promise.all(fetchPromises);

  // Cập nhật lại session storage với dữ liệu đã được làm giàu
  try {
    if (orderMode === 'buy-now' && orderItems.length > 0) {
      sessionStorage.setItem('hmp_buy_now_item', JSON.stringify(orderItems[0]));
    } else if (orderMode === 'cart') {
      sessionStorage.setItem('hmp_cart_checkout_items', JSON.stringify(orderItems));
    }
  } catch (e) {
    // Bỏ qua lỗi hạn mức session
  }
}

/**
 * Hiển thị tóm tắt danh sách sản phẩm đặt mua và tổng tiền
 */
function renderSummaryItems() {
  const listContainer = document.getElementById('order-summary-items-list');
  const countBadge = document.getElementById('summary-items-count');
  const subtotalEl = document.getElementById('summary-subtotal');
  const totalAmountEl = document.getElementById('summary-total-amount');
  const template = document.getElementById('order-summary-item-template');

  if (!listContainer || !template) return;

  listContainer.replaceChildren();

  if (countBadge) countBadge.textContent = String(orderItems.length);

  let totalAmount = 0;
  let hasAnyPrice = false;
  let hasMissingPricePermission = false;
  const fragment = document.createDocumentFragment();

  orderItems.forEach(item => {
    const clone = template.content.cloneNode(true);

    const imgEl = clone.querySelector('.order-summary-item__thumb');
    const nameEl = clone.querySelector('.order-summary-item__name');
    const variantEl = clone.querySelector('.order-summary-item__variant');
    const colorEl = clone.querySelector('.order-summary-item__color');
    const sizeEl = clone.querySelector('.order-summary-item__size');
    const dimensionsEl = clone.querySelector('.order-summary-item__dimensions');
    const qtyEl = clone.querySelector('.order-summary-item__qty');
    const priceEl = clone.querySelector('.order-summary-item__price');

    imgEl.src = item.productImageUrl || item.imageUrl || DEFAULT_EMPTY_IMAGE;
    imgEl.alt = item.productName || 'Sản phẩm HMP';
    imgEl.onerror = () => { imgEl.src = DEFAULT_EMPTY_IMAGE; };

    nameEl.textContent = item.productName || 'Sản phẩm tôn thép HMP';

    if (item.variantName) {
      variantEl.textContent = item.variantName;
      variantEl.classList.remove('hidden');
    }
    if (item.color) {
      colorEl.textContent = `Màu: ${item.color}`;
      colorEl.classList.remove('hidden');
    }
    if (item.size !== null && item.size !== undefined) {
      sizeEl.textContent = `Dài: ${item.size}m`;
      sizeEl.classList.remove('hidden');
    }
    if (item.dimensions) {
      dimensionsEl.textContent = `Quy cách: ${item.dimensions}`;
      dimensionsEl.classList.remove('hidden');
    }

    const qty = parseInt(item.quantity, 10) || 1;
    qtyEl.textContent = `Số lượng: ${qty}`;

    // Kiểm tra quyền xem giá (PRODUCT_PRICE_VIEW):
    // Chỉ hiển thị giá khi item.priceVisible === true (hoặc không bị cấm) và có đơn giá / thành tiền
    const isAllowedPrice = item.priceVisible !== false;
    let linePrice = null;

    if (isAllowedPrice) {
      if (item.totalPrice !== null && item.totalPrice !== undefined) {
        linePrice = item.totalPrice;
      } else if (item.unitPrice !== null && item.unitPrice !== undefined) {
        const sizeNum = parseFloat(item.size);
        const mult = (!isNaN(sizeNum) && sizeNum > 0) ? sizeNum : 1;
        linePrice = Math.round(item.unitPrice * mult * qty);
      }
    }

    if (linePrice !== null && linePrice !== undefined) {
      priceEl.textContent = formatVnd(linePrice);
      totalAmount += linePrice;
      hasAnyPrice = true;
    } else {
      priceEl.textContent = 'Liên hệ báo giá';
      hasMissingPricePermission = true;
    }

    fragment.appendChild(clone);
  });

  listContainer.appendChild(fragment);

  // Hiển thị tổng kết tiền theo quyền xem giá của người dùng
  if (hasMissingPricePermission && !hasAnyPrice) {
    if (subtotalEl) subtotalEl.textContent = 'Liên hệ báo giá';
    if (totalAmountEl) totalAmountEl.textContent = 'Liên hệ báo giá';
  } else if (hasMissingPricePermission && hasAnyPrice) {
    if (subtotalEl) subtotalEl.textContent = `${formatVnd(totalAmount)} (Chưa gồm một số sản phẩm)`;
    if (totalAmountEl) totalAmountEl.textContent = formatVnd(totalAmount);
  } else {
    if (subtotalEl) subtotalEl.textContent = formatVnd(totalAmount);
    if (totalAmountEl) totalAmountEl.textContent = formatVnd(totalAmount);
  }
}

/**
 * Xử lý xác nhận tạo đơn hàng kèm kiểm tra hợp lệ dữ liệu (Form Validation)
 */
function initSubmitOrder() {
  const btnSubmit = document.getElementById('btn-submit-order');
  const inputName = document.getElementById('input-receiver-name');
  const inputPhone = document.getElementById('input-receiver-phone');
  const inputNote = document.getElementById('input-order-note');

  const errorName = document.getElementById('error-receiver-name');
  const errorPhone = document.getElementById('error-receiver-phone');
  const errorAddress = document.getElementById('error-receiver-address');
  const errorNote = document.getElementById('error-order-note');

  const clearFormErrors = () => {
    if (inputName) inputName.classList.remove('form-control--error');
    if (errorName) {
      errorName.textContent = '';
      errorName.classList.add('hidden');
    }

    if (inputPhone) inputPhone.classList.remove('form-control--error');
    if (errorPhone) {
      errorPhone.textContent = '';
      errorPhone.classList.add('hidden');
    }

    if (errorAddress) {
      errorAddress.textContent = '';
      errorAddress.classList.add('hidden');
    }

    if (inputNote) inputNote.classList.remove('form-control--error');
    if (errorNote) {
      errorNote.textContent = '';
      errorNote.classList.add('hidden');
    }
  };

  // Lắng nghe sự kiện gõ phím để xóa lỗi tức thì
  if (inputName) {
    inputName.addEventListener('input', () => {
      inputName.classList.remove('form-control--error');
      if (errorName) {
        errorName.textContent = '';
        errorName.classList.add('hidden');
      }
    });
  }

  if (inputPhone) {
    inputPhone.addEventListener('input', () => {
      inputPhone.classList.remove('form-control--error');
      if (errorPhone) {
        errorPhone.textContent = '';
        errorPhone.classList.add('hidden');
      }
    });
  }

  if (inputNote) {
    inputNote.addEventListener('input', () => {
      inputNote.classList.remove('form-control--error');
      if (errorNote) {
        errorNote.textContent = '';
        errorNote.classList.add('hidden');
      }
    });
  }

  if (!btnSubmit) return;

  btnSubmit.addEventListener('click', async () => {
    clearFormErrors();

    const receiverName = inputName ? inputName.value.trim() : '';
    const receiverPhone = inputPhone ? inputPhone.value.trim() : '';
    const note = inputNote ? inputNote.value.trim() : '';

    // 1. Kiểm tra họ và tên người nhận
    if (!receiverName) {
      if (inputName) inputName.classList.add('form-control--error');
      if (errorName) {
        errorName.textContent = 'Vui lòng nhập họ và tên người nhận hàng.';
        errorName.classList.remove('hidden');
      }
      toast.warning('Vui lòng nhập họ và tên người nhận hàng.');
      if (inputName) inputName.focus();
      return;
    }

    if (receiverName.length < 2) {
      if (inputName) inputName.classList.add('form-control--error');
      if (errorName) {
        errorName.textContent = 'Họ và tên người nhận phải có ít nhất 2 ký tự.';
        errorName.classList.remove('hidden');
      }
      toast.warning('Họ và tên người nhận quá ngắn.');
      if (inputName) inputName.focus();
      return;
    }

    if (receiverName.length > 100) {
      if (inputName) inputName.classList.add('form-control--error');
      if (errorName) {
        errorName.textContent = 'Họ và tên không được vượt quá 100 ký tự.';
        errorName.classList.remove('hidden');
      }
      toast.warning('Họ và tên người nhận quá dài.');
      if (inputName) inputName.focus();
      return;
    }

    // 2. Kiểm tra số điện thoại người nhận (chuẩn 10 số, bắt đầu bằng 0 hoặc +84)
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const generalPhoneRegex = /^(0|\+84)[0-9]{9,10}$/;
    if (!receiverPhone) {
      if (inputPhone) inputPhone.classList.add('form-control--error');
      if (errorPhone) {
        errorPhone.textContent = 'Vui lòng nhập số điện thoại nhận hàng.';
        errorPhone.classList.remove('hidden');
      }
      toast.warning('Vui lòng nhập số điện thoại nhận hàng.');
      if (inputPhone) inputPhone.focus();
      return;
    }

    if (!phoneRegex.test(receiverPhone) && !generalPhoneRegex.test(receiverPhone)) {
      if (inputPhone) inputPhone.classList.add('form-control--error');
      if (errorPhone) {
        errorPhone.textContent = 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 0 hoặc +84).';
        errorPhone.classList.remove('hidden');
      }
      toast.warning('Số điện thoại nhận hàng không hợp lệ (ví dụ: 0912345678).');
      if (inputPhone) inputPhone.focus();
      return;
    }

    // 3. Kiểm tra địa chỉ nhận hàng
    if (!selectedAddressId) {
      if (errorAddress) {
        errorAddress.textContent = 'Vui lòng chọn một địa chỉ nhận hàng hoặc bấm "+ Thêm địa chỉ mới".';
        errorAddress.classList.remove('hidden');
      }
      toast.warning('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      const addrContainer = document.getElementById('address-list-container');
      if (addrContainer) addrContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 4. Kiểm tra ghi chú
    if (note.length > 500) {
      if (inputNote) inputNote.classList.add('form-control--error');
      if (errorNote) {
        errorNote.textContent = 'Ghi chú đơn hàng không được vượt quá 500 ký tự.';
        errorNote.classList.remove('hidden');
      }
      toast.warning('Ghi chú đơn hàng quá dài (tối đa 500 ký tự).');
      if (inputNote) inputNote.focus();
      return;
    }

    // 5. Kiểm tra giỏ hàng/mặt hàng
    if (!orderItems || orderItems.length === 0) {
      toast.error('Không có sản phẩm nào trong đơn hàng.');
      return;
    }

    // Xây dựng payload OrderItemRequest
    const itemsPayload = orderItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId || null,
      colorId: item.colorId || null,
      unitId: item.unitId || null,
      quantity: item.quantity,
      size: item.size !== undefined ? item.size : null,
      dimensions: item.dimensions || null
    }));

    const orderPayload = {
      receiverName,
      receiverPhone,
      addressId: selectedAddressId,
      note,
      items: itemsPayload
    };

    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Đang xử lý đơn hàng...';

      const response = await orderApi.createOrder(orderPayload);
      const createdOrder = response || {};
      const orderId = createdOrder.orderId || createdOrder.id || 'HMP-' + Date.now();

      // Dọn dẹp session sau khi tạo đơn thành công
      if (orderMode === 'buy-now') {
        sessionStorage.removeItem('hmp_buy_now_item');
      } else {
        sessionStorage.removeItem('hmp_cart_checkout_items');
      }

      // LƯU Ý NGHIỆP VỤ CỐT LÕI CỦA USER:
      // "nếu đến từ giỏ hàng thì sẽ đến hiển thị đơn hàng thành công luôn KHÔNG CẦN XÓA các product trong giỏ hàng
      //  phòng trường hợp sau này người dùng muốn đặt lại chính mặt hàng đó."
      // TUYỆT ĐỐI KHÔNG GỌI cartApi.clearCart() ở đây!

      // Hiển thị màn hình thành công
      const layoutEl = document.getElementById('order-form-layout');
      const successEl = document.getElementById('order-success-section');
      const codeBadge = document.getElementById('success-order-code');

      if (layoutEl) layoutEl.classList.add('hidden');
      if (successEl) successEl.classList.remove('hidden');
      if (codeBadge) codeBadge.textContent = `#${orderId}`;

      toast.success('Đặt hàng thành công!');

    } catch (err) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      toast.error(err.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Xác Nhận Đặt Hàng';
    }
  });
}
