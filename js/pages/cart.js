/**
 * cart.js — Điều khiển logic Trang Giỏ Hàng Chuẩn Mẫu (Shopee Style)
 * 
 * Nghiệp vụ:
 * - Clean Code: Tách biệt hoàn toàn HTML, CSS, JS; 0% inline style; 0% innerHTML với input ngoại vi.
 * - Sắp xếp theo updatedAt giảm dần, hiển thị mốc thời gian cập nhật trên từng món hàng.
 * - Hỗ trợ chọn/bỏ chọn từng món hoặc chọn tất cả.
 * - Cập nhật số lượng trực tiếp qua API PATCH /cart/items/{id}.
 * - Xóa từng món hoặc xóa toàn bộ giỏ hàng có Modal xác nhận.
 * - Chuyển sang trang đặt hàng: Lưu danh sách món đã tích chọn vào sessionStorage ('hmp_cart_checkout_items')
 *   và điều hướng tới order.html?mode=cart.
 * - KHÔNG XÓA giỏ hàng khi người dùng đặt hàng thành công (theo quy định của hệ thống).
 */

import { initCommonLayout } from '../components/component-loader.js';
import { cartApi } from '../api/cart.api.js';
import { getProductDetail } from '../api/product.api.js';
import { authState } from '../auth/auth.state.js';
import { formatVnd, formatDateTime } from '../utils/format.js';
import { toast } from '../components/toast.js';

// Trạng thái cục bộ của trang
let cartData = null;
const selectedItemIds = new Set();
let pendingAction = null; // { type: 'delete-item', itemId } hoặc { type: 'clear-cart' }

const DEFAULT_EMPTY_IMAGE = '../../assets/images/empty-picture.png';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer
  await initCommonLayout();

  // 2. Kiểm tra trạng thái đăng nhập
  if (!authState.isAuthenticated()) {
    showEmptyState(true);
    return;
  }

  // 3. Khởi tạo các sự kiện tĩnh trên thanh điều khiển & modal
  initStaticEvents();

  // 4. Tải dữ liệu giỏ hàng từ máy chủ
  await loadCart();
});

/**
 * Gắn sự kiện cho các phần tử cố định trên trang
 */
function initStaticEvents() {
  const chkSelectAllTop = document.getElementById('checkbox-select-all-top');
  const chkSelectAllBottom = document.getElementById('checkbox-select-all-bottom');
  const btnClearCart = document.getElementById('btn-clear-cart');
  const btnCheckout = document.getElementById('btn-checkout');

  // Modal xác nhận
  const modalEl = document.getElementById('cart-confirm-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const btnModalConfirm = document.getElementById('btn-modal-confirm');

  // Đồng bộ chọn tất cả (Top & Bottom)
  const handleSelectAll = (checked) => {
    if (!cartData || !Array.isArray(cartData.items)) return;

    if (checked) {
      cartData.items.forEach(item => selectedItemIds.add(item.id || item.cartItemId));
    } else {
      selectedItemIds.clear();
    }

    if (chkSelectAllTop) chkSelectAllTop.checked = checked;
    if (chkSelectAllBottom) chkSelectAllBottom.checked = checked;

    // Cập nhật lại trạng thái checkbox của từng món trên DOM
    const itemCheckboxes = document.querySelectorAll('.cart-item__checkbox');
    itemCheckboxes.forEach(cb => {
      cb.checked = checked;
    });

    updateCheckoutSummary();
  };

  if (chkSelectAllTop) {
    chkSelectAllTop.addEventListener('change', (e) => handleSelectAll(e.target.checked));
  }
  if (chkSelectAllBottom) {
    chkSelectAllBottom.addEventListener('change', (e) => handleSelectAll(e.target.checked));
  }

  // Nút xóa toàn bộ giỏ hàng
  if (btnClearCart) {
    btnClearCart.addEventListener('click', () => {
      openConfirmModal('clear-cart', 'Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng?');
    });
  }

  // Nút đặt hàng / mua hàng
  if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
      if (!cartData || !Array.isArray(cartData.items) || selectedItemIds.size === 0) {
        toast.warning('Vui lòng chọn ít nhất một sản phẩm để đặt hàng.');
        return;
      }

      // Lọc ra các sản phẩm được chọn
      const selectedItems = cartData.items.filter(item => selectedItemIds.has(item.id || item.cartItemId));

      try {
        sessionStorage.setItem('hmp_cart_checkout_items', JSON.stringify(selectedItems));
      } catch (err) {
        console.warn('Không thể lưu session checkout:', err);
      }

      window.location.href = './order.html?mode=cart';
    });
  }

  // Điều khiển Modal xác nhận thao tác
  const closeModal = () => {
    if (modalEl) modalEl.classList.remove('confirm-modal-overlay--open');
    pendingAction = null;
  };

  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });
  }

  if (btnModalClose) btnModalClose.addEventListener('click', closeModal);
  if (btnModalCancel) btnModalCancel.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl && modalEl.classList.contains('confirm-modal-overlay--open')) {
      closeModal();
    }
  });

  if (btnModalConfirm) {
    btnModalConfirm.addEventListener('click', async () => {
      if (!pendingAction) return;

      try {
        btnModalConfirm.disabled = true;
        if (pendingAction.type === 'delete-item') {
          await cartApi.removeFromCart(pendingAction.itemId);
          selectedItemIds.delete(pendingAction.itemId);
          toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
        } else if (pendingAction.type === 'clear-cart') {
          await cartApi.clearCart();
          selectedItemIds.clear();
          toast.success('Đã dọn sạch giỏ hàng.');
        }

        closeModal();
        window.dispatchEvent(new CustomEvent('hmp:cart-updated'));
        await loadCart();
      } catch (err) {
        console.error('Lỗi khi thao tác giỏ hàng:', err);
        toast.error(err.message || 'Thao tác không thành công.');
        closeModal();
      } finally {
        btnModalConfirm.disabled = false;
      }
    });
  }
}

/**
 * Mở modal xác nhận
 */
function openConfirmModal(actionType, message, itemId = null) {
  pendingAction = { type: actionType, itemId };
  const modalEl = document.getElementById('cart-confirm-modal');
  const msgEl = document.getElementById('cart-modal-message');
  const confirmBtn = document.getElementById('btn-modal-confirm');

  if (msgEl) msgEl.textContent = message;
  if (modalEl) {
    modalEl.classList.add('confirm-modal-overlay--open');
    if (confirmBtn) confirmBtn.focus();
  }
}

/**
 * Tải dữ liệu giỏ hàng từ Backend API
 */
async function loadCart() {
  const loadingEl = document.getElementById('cart-loading-state');
  const emptyEl = document.getElementById('cart-empty-state');
  const contentEl = document.getElementById('cart-content-section');
  const listEl = document.getElementById('cart-items-list');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (contentEl) contentEl.classList.add('hidden');

  try {
    const res = await cartApi.getCart();
    cartData = res;

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!cartData || !Array.isArray(cartData.items) || cartData.items.length === 0) {
      showEmptyState(false);
      return;
    }

    // Hiển thị khung giỏ hàng
    if (contentEl) contentEl.classList.remove('hidden');

    // Sắp xếp updatedAt giảm dần (đề phòng API chưa sort)
    cartData.items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    // Chuẩn hóa item ID và ảnh
    cartData.items.forEach(item => {
      item.id = item.id || item.cartItemId;
      item.productImageUrl = item.productImageUrl || item.primaryImageUrl || item.imageUrl;
    });

    // Làm giàu dữ liệu giá và ảnh từ Backend nếu cần
    await enrichCartItemsPricing();

    // Mặc định chọn tất cả các món khi vừa vào trang
    selectedItemIds.clear();
    cartData.items.forEach(item => selectedItemIds.add(item.id));

    // Render danh sách món hàng
    renderCartItems(cartData.items, listEl);

    // Cập nhật tổng kết thanh toán
    updateCheckoutSummary();

  } catch (err) {
    console.error('Lỗi khi nạp giỏ hàng:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    showEmptyState(false);
    toast.error('Không thể tải giỏ hàng. Vui lòng thử lại sau.');
  }
}

/**
 * Hiển thị trạng thái giỏ hàng trống hoặc chưa đăng nhập
 */
function showEmptyState(isNotLoggedIn = false) {
  const loadingEl = document.getElementById('cart-loading-state');
  const emptyEl = document.getElementById('cart-empty-state');
  const contentEl = document.getElementById('cart-content-section');

  if (loadingEl) loadingEl.classList.add('hidden');
  if (contentEl) contentEl.classList.add('hidden');

  if (emptyEl) {
    emptyEl.classList.remove('hidden');
    const titleEl = emptyEl.querySelector('.cart-state-box__title');
    const descEl = emptyEl.querySelector('.cart-state-box__desc');
    const btnEl = emptyEl.querySelector('.cart-state-box__btn');

    if (isNotLoggedIn) {
      if (titleEl) titleEl.textContent = 'Bạn chưa đăng nhập';
      if (descEl) descEl.textContent = 'Vui lòng đăng nhập để xem các sản phẩm trong giỏ hàng của bạn.';
      if (btnEl) {
        btnEl.textContent = 'Đăng nhập ngay';
        btnEl.href = '../auth/login.html?returnUrl=' + encodeURIComponent(window.location.href);
      }
    } else {
      if (titleEl) titleEl.textContent = 'Giỏ hàng của bạn đang trống';
      if (descEl) descEl.textContent = 'Hãy khám phá các sản phẩm tôn lợp mái, máng xối và phụ kiện chất lượng cao của HMP.';
      if (btnEl) {
        btnEl.textContent = 'Mua sắm ngay';
        btnEl.href = '../product/catalog.html';
      }
    }
  }
}

/**
 * Làm giàu dữ liệu giá và ảnh của cartData.items từ Backend (GET /api/v1/products/{id}).
 * Đảm bảo:
 * - Ảnh sản phẩm luôn hiển thị đúng
 * - Nếu caller có quyền xem giá (product.priceVisible === true): tính đúng đơn giá và thành tiền
 * - Nếu caller thiếu quyền (product.priceVisible === false): gán null để hiển thị 'Liên hệ báo giá'
 */
async function enrichCartItemsPricing() {
  if (!cartData || !Array.isArray(cartData.items) || cartData.items.length === 0) return;

  const fetchPromises = cartData.items.map(async (item) => {
    item.id = item.id || item.cartItemId;
    item.productImageUrl = item.productImageUrl || item.primaryImageUrl || item.imageUrl;

    if (item.productId && (item.unitPrice === null || item.unitPrice === undefined || item.totalPrice === null || item.totalPrice === undefined || !item.productImageUrl)) {
      try {
        const prod = await getProductDetail(item.productId);
        if (prod) {
          item.priceVisible = Boolean(prod.priceVisible);

          if (!item.productImageUrl) {
            item.productImageUrl = prod.primaryImageUrl || (prod.images && prod.images.length > 0 ? prod.images[0].imageUrl : null);
          }

          if (item.priceVisible && Array.isArray(prod.variants) && prod.variants.length > 0) {
            const matchedVariant = prod.variants.find(v => v.id === item.variantId) || prod.variants[0];
            if (matchedVariant && matchedVariant.prices) {
              const entries = Object.entries(matchedVariant.prices).filter(([, p]) => p !== null && p !== undefined);
              if (entries.length > 0) {
                const sizeVal = parseFloat(item.size);
                let preferred = null;
                if (!isNaN(sizeVal) && sizeVal > 0) {
                  preferred = entries.find(([u]) => /^m(é|e)t$|^m$/i.test(u.trim())) || entries[0];
                } else {
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
            item.unitPrice = null;
            item.totalPrice = null;
          }
        }
      } catch (err) {
        console.warn(`[Cart] Không thể nạp giá cho sản phẩm ${item.productId}:`, err);
      }
    }
  });

  await Promise.all(fetchPromises);
}

/**
 * Render toàn bộ danh sách món hàng bằng DOM API và Template
 */
function renderCartItems(items, containerEl) {
  if (!containerEl) return;
  containerEl.replaceChildren();

  const template = document.getElementById('cart-item-template');
  if (!template) return;

  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const clone = template.content.cloneNode(true);
    const cardEl = clone.querySelector('.cart-item-card');
    const itemId = item.id || item.cartItemId;
    cardEl.dataset.itemId = String(itemId);

    // Checkbox
    const chkItem = clone.querySelector('.cart-item__checkbox');
    chkItem.checked = selectedItemIds.has(itemId);
    chkItem.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedItemIds.add(itemId);
      } else {
        selectedItemIds.delete(itemId);
      }
      syncSelectAllCheckboxes();
      updateCheckoutSummary();
    });

    // Ảnh đại diện
    const imgEl = clone.querySelector('.cart-item-card__thumb');
    const imageSrc = item.productImageUrl || item.primaryImageUrl || item.imageUrl || DEFAULT_EMPTY_IMAGE;
    imgEl.src = imageSrc;
    imgEl.alt = item.productName || 'Sản phẩm HMP';
    imgEl.onerror = () => {
      imgEl.src = DEFAULT_EMPTY_IMAGE;
    };

    // Tên sản phẩm và liên kết
    const nameLinkEl = clone.querySelector('.cart-item-card__name-link');
    nameLinkEl.textContent = item.productName || 'Sản phẩm tôn thép HMP';
    nameLinkEl.href = `../product/detail.html?id=${item.productId}`;

    // Biến thể & Màu sắc
    const variantEl = clone.querySelector('.cart-item-card__variant');
    const colorEl = clone.querySelector('.cart-item-card__color');

    if (item.variantName) {
      variantEl.textContent = item.variantName;
      variantEl.classList.remove('hidden');
    }
    if (item.color) {
      colorEl.textContent = `Màu: ${item.color}`;
      colorEl.classList.remove('hidden');
    }

    // Thông số kỹ thuật (Kích thước & Quy cách bẻ chấn)
    const specSizeEl = clone.querySelector('.cart-item-card__spec-size');
    const specDimensionsEl = clone.querySelector('.cart-item-card__spec-dimensions');

    if (item.size !== null && item.size !== undefined) {
      const valEl = specSizeEl.querySelector('.spec-value');
      if (valEl) valEl.textContent = `${item.size}m`;
      specSizeEl.classList.remove('hidden');
    }

    if (item.dimensions) {
      const valEl = specDimensionsEl.querySelector('.spec-value');
      if (valEl) valEl.textContent = item.dimensions;
      specDimensionsEl.classList.remove('hidden');
    }

    // Mốc thời gian cập nhật gần nhất
    const timeTextEl = clone.querySelector('.cart-item-card__time-text');
    if (timeTextEl) {
      timeTextEl.textContent = `Cập nhật: ${formatDateTime(item.updatedAt)}`;
    }

    // Đơn giá
    const unitPriceEl = clone.querySelector('.cart-item-card__unit-price');
    if (item.unitPrice !== null && item.unitPrice !== undefined) {
      unitPriceEl.textContent = formatVnd(item.unitPrice);
    } else {
      unitPriceEl.textContent = 'Liên hệ báo giá';
    }

    // Thành tiền dòng
    const lineTotalEl = clone.querySelector('.cart-item-card__line-total');
    if (item.totalPrice !== null && item.totalPrice !== undefined) {
      lineTotalEl.textContent = formatVnd(item.totalPrice);
    } else {
      lineTotalEl.textContent = 'Liên hệ báo giá';
    }

    // Stepper số lượng
    const btnMinus = clone.querySelector('.cart-stepper__btn--minus');
    const btnPlus = clone.querySelector('.cart-stepper__btn--plus');
    const inputQty = clone.querySelector('.cart-stepper__input');
    inputQty.value = item.quantity;

    const handleUpdateQuantity = async (newQty) => {
      if (newQty < 1 || newQty === item.quantity) return;
      if (newQty > 10000) {
        toast.warning('Số lượng tối đa cho mỗi sản phẩm là 10.000');
        inputQty.value = item.quantity;
        return;
      }
      try {
        inputQty.value = newQty;
        const updated = await cartApi.updateCartItem(itemId, { quantity: newQty });
        item.quantity = updated.quantity;
        if (updated.totalPrice !== null && updated.totalPrice !== undefined) {
          item.totalPrice = updated.totalPrice;
        } else if (item.unitPrice !== null && item.unitPrice !== undefined) {
          const sizeVal = parseFloat(item.size);
          const mult = (!isNaN(sizeVal) && sizeVal > 0) ? sizeVal : 1;
          item.totalPrice = Math.round(item.unitPrice * mult * item.quantity);
        }
        item.updatedAt = updated.updatedAt || new Date().toISOString();

        lineTotalEl.textContent = formatVnd(item.totalPrice);
        if (timeTextEl) {
          timeTextEl.textContent = `Cập nhật: ${formatDateTime(item.updatedAt)}`;
        }

        updateCheckoutSummary();
        window.dispatchEvent(new CustomEvent('hmp:cart-updated'));
      } catch (err) {
        console.error('Lỗi cập nhật số lượng:', err);
        inputQty.value = item.quantity;
        toast.error('Không thể cập nhật số lượng: ' + (err.message || 'Lỗi mạng'));
      }
    };

    btnMinus.addEventListener('click', () => {
      const current = parseInt(inputQty.value, 10) || 1;
      if (current > 1) {
        handleUpdateQuantity(current - 1);
      }
    });

    btnPlus.addEventListener('click', () => {
      const current = parseInt(inputQty.value, 10) || 1;
      if (current < 10000) {
        handleUpdateQuantity(current + 1);
      } else {
        toast.warning('Số lượng tối đa cho mỗi sản phẩm là 10.000');
      }
    });

    inputQty.addEventListener('change', () => {
      let val = parseInt(inputQty.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 10000) {
        val = 10000;
        toast.warning('Số lượng tối đa cho mỗi sản phẩm là 10.000');
      }
      inputQty.value = val;
      handleUpdateQuantity(val);
    });

    // Nút Xóa món
    const btnDelete = clone.querySelector('.cart-item-card__btn-delete');
    btnDelete.addEventListener('click', () => {
      openConfirmModal('delete-item', `Bạn có chắc muốn xóa "${item.productName}" khỏi giỏ hàng?`, itemId);
    });

    fragment.appendChild(clone);
  });

  containerEl.appendChild(fragment);
  syncSelectAllCheckboxes();
}

/**
 * Đồng bộ trạng thái của hai nút Checkbox "Chọn tất cả" trên và dưới
 */
function syncSelectAllCheckboxes() {
  const chkTop = document.getElementById('checkbox-select-all-top');
  const chkBottom = document.getElementById('checkbox-select-all-bottom');
  const badgeTotal = document.getElementById('cart-total-items-badge');

  const totalItems = (cartData && Array.isArray(cartData.items)) ? cartData.items.length : 0;
  if (badgeTotal) badgeTotal.textContent = String(totalItems);

  const isAllSelected = totalItems > 0 && selectedItemIds.size === totalItems;

  if (chkTop) chkTop.checked = isAllSelected;
  if (chkBottom) chkBottom.checked = isAllSelected;
}

/**
 * Cập nhật số tiền và số lượng sản phẩm được chọn trên Sticky Bottom Bar
 */
function updateCheckoutSummary() {
  const selectedCountEl = document.getElementById('selected-count');
  const totalAmountEl = document.getElementById('selected-total-amount');
  const btnCheckout = document.getElementById('btn-checkout');

  if (!cartData || !Array.isArray(cartData.items)) {
    if (selectedCountEl) selectedCountEl.textContent = '0';
    if (totalAmountEl) totalAmountEl.textContent = formatVnd(0);
    if (btnCheckout) btnCheckout.disabled = true;
    return;
  }

  let totalAmount = 0;
  let count = 0;
  let hasMissingPrice = false;

  cartData.items.forEach(item => {
    if (selectedItemIds.has(item.id)) {
      count++;
      if (item.totalPrice !== null && item.totalPrice !== undefined) {
        totalAmount += item.totalPrice;
      } else {
        hasMissingPrice = true;
      }
    }
  });

  if (selectedCountEl) selectedCountEl.textContent = String(count);
  if (totalAmountEl) {
    if (count === 0) {
      totalAmountEl.textContent = formatVnd(0);
    } else if (hasMissingPrice && totalAmount === 0) {
      totalAmountEl.textContent = 'Liên hệ báo giá';
    } else {
      totalAmountEl.textContent = formatVnd(totalAmount);
    }
  }
  if (btnCheckout) btnCheckout.disabled = (count === 0);
}
