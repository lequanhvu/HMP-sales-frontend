/**
 * order.js — Điều khiển logic Trang Xác Nhận & Đặt Hàng (Checkout Order Page)
 * 
 * Nghiệp vụ:
 * - Hỗ trợ 2 luồng đặt hàng: "Mua ngay" (mode=buy-now) và "Giỏ hàng" (mode=cart).
 * - Phương thức nhận hàng:
 *    1. "Giao hàng tận nơi" (SHIPPING): Bắt buộc ghim vị trí công trình, kiểm tra bán kính giao hàng
 *       của xưởng. Nếu vượt bán kính (huyện khác / quá xa) sẽ lịch sự từ chối và hướng dẫn.
 *    2. "Khách tự bốc hàng tại xưởng" (PICKUP): Không giới hạn vị trí, khách tự bố trí xe đến xưởng HMP bốc tôn.
 * - Tích hợp Leaflet Map Picker ghim vị trí và hỗ trợ GPS Geolocation.
 * - QUY TẮC CỐT LÕI: Sau khi đặt hàng thành công, TUYỆT ĐỐI KHÔNG XÓA GIỎ HÀNG (để khách có thể đặt lại).
 * - 0% inline style; 0% innerHTML với dữ liệu người dùng (dùng DOM API & Template).
 */

import { initCommonLayout } from '../components/component-loader.js';
import { orderApi } from '../api/order.api.js';
import { deliveryApi } from '../api/delivery.api.js?v=20261127_02';
import { provincesApi } from '../api/provinces.api.js?v=20261127_02';
import { getProductDetail } from '../api/product.api.js';
import { authState } from '../auth/auth.state.js';
import { formatVnd } from '../utils/format.js';
import { toast } from '../components/toast.js';
import { MapPicker } from '../components/map-picker.js?v=20261127_02';

// Trạng thái trang
let orderMode = 'cart';
let orderItems = [];
let addressList = [];
let selectedAddressId = null;
let currentDeliveryMethod = 'SHIPPING'; // 'SHIPPING' | 'PICKUP'

let storeInfoData = null;
let mapPickerInstance = null;
let newAddressCoordinates = { lat: null, lng: null };
let newAddressDistanceInfo = null;

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
  initDeliveryMethodEvents();
  initAddressEvents();
  initSubmitOrder();
  renderBreadcrumb();
  window.addEventListener('resize', renderBreadcrumb);

  // 5. Tải thông tin xưởng và danh sách địa chỉ song song
  await Promise.all([
    loadStoreInfo(),
    loadAddresses(),
    enrichOrderItemsPricing()
  ]);

  renderSummaryItems();
});

/**
 * Tải thông tin công khai của xưởng HMP (vị trí, bán kính, hotline)
 */
async function loadStoreInfo() {
  try {
    storeInfoData = await deliveryApi.getStoreInfo();
    const nameEl = document.getElementById('pickup-store-name');
    const addressEl = document.getElementById('pickup-store-address');
    const hotlineEl = document.getElementById('pickup-store-hotline');

    if (nameEl && storeInfoData.storeName) {
      nameEl.textContent = storeInfoData.storeName;
    }
    if (addressEl && storeInfoData.storeAddress) {
      addressEl.textContent = `Địa chỉ xưởng: ${storeInfoData.storeAddress}`;
    }
    if (hotlineEl && storeInfoData.storeHotline) {
      hotlineEl.textContent = `Hotline hỗ trợ & điều phối: ${storeInfoData.storeHotline}`;
    }
  } catch (err) {
    console.warn('[Order] Không thể tải thông tin xưởng:', err);
  }
}

/**
 * Khởi tạo sự kiện chuyển đổi Phương thức nhận hàng: Giao tận nơi (SHIPPING) vs Tự bốc hàng (PICKUP)
 */
function initDeliveryMethodEvents() {
  const radioShipping = document.getElementById('radio-delivery-shipping');
  const radioPickup = document.getElementById('radio-delivery-pickup');
  const labelShipping = document.getElementById('label-delivery-shipping');
  const labelPickup = document.getElementById('label-delivery-pickup');
  const shippingAddressGroup = document.getElementById('shipping-address-group');
  const pickupStoreInfoBox = document.getElementById('pickup-store-info-box');

  const updateDeliveryMethodUI = (method) => {
    currentDeliveryMethod = method;

    if (method === 'SHIPPING') {
      if (labelShipping) labelShipping.classList.add('active');
      if (labelPickup) labelPickup.classList.remove('active');
      if (shippingAddressGroup) shippingAddressGroup.classList.remove('hidden');
      if (pickupStoreInfoBox) pickupStoreInfoBox.classList.add('hidden');
    } else {
      if (labelPickup) labelPickup.classList.add('active');
      if (labelShipping) labelShipping.classList.remove('active');
      if (shippingAddressGroup) shippingAddressGroup.classList.add('hidden');
      if (pickupStoreInfoBox) pickupStoreInfoBox.classList.remove('hidden');

      // Ẩn khung thêm địa chỉ mới nếu đang mở
      const newAddressBox = document.getElementById('new-address-box');
      if (newAddressBox) newAddressBox.classList.add('hidden');
    }
  };

  if (radioShipping) {
    radioShipping.addEventListener('change', () => {
      if (radioShipping.checked) updateDeliveryMethodUI('SHIPPING');
    });
  }

  if (radioPickup) {
    radioPickup.addEventListener('change', () => {
      if (radioPickup.checked) updateDeliveryMethodUI('PICKUP');
    });
  }
}

/**
 * Render thanh điều hướng breadcrumb động
 */
function renderBreadcrumb() {
  const breadcrumbEl = document.getElementById('order-breadcrumb');
  if (!breadcrumbEl) return;

  breadcrumbEl.replaceChildren();

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

  const isNarrowScreen = window.innerWidth < 640;
  const fragment = document.createDocumentFragment();

  if (isNarrowScreen) {
    const ellipsisLink = document.createElement('a');
    ellipsisLink.href = '../product/catalog.html';
    ellipsisLink.className = 'breadcrumb__link breadcrumb__link--ellipsis';
    ellipsisLink.textContent = '...';
    ellipsisLink.title = 'Sản phẩm';
    fragment.appendChild(ellipsisLink);
  } else {
    const rootLink = document.createElement('a');
    rootLink.href = '../product/catalog.html';
    rootLink.className = 'breadcrumb__link';
    rootLink.textContent = 'Sản phẩm';
    fragment.appendChild(rootLink);
  }

  const sep1 = document.createElement('span');
  sep1.className = 'breadcrumb__separator';
  sep1.textContent = '/';
  fragment.appendChild(sep1);

  const midLink = document.createElement('a');
  midLink.href = prevLink;
  midLink.className = 'breadcrumb__link';
  midLink.textContent = prevText;
  if (orderItems[0] && orderItems[0].productName) {
    midLink.title = orderItems[0].productName;
  }
  fragment.appendChild(midLink);

  const sep2 = document.createElement('span');
  sep2.className = 'breadcrumb__separator';
  sep2.textContent = '/';
  fragment.appendChild(sep2);

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
 * Tải danh sách địa chỉ nhận hàng từ máy chủ và tính toán khoảng cách
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
      emptyText.textContent = 'Bạn chưa lưu địa chỉ nhận hàng nào. Vui lòng bấm "+ Thêm địa chỉ mới".';
      container.appendChild(emptyText);

      // Tự động mở khung thêm địa chỉ mới nếu đang chọn giao hàng tận nơi
      if (currentDeliveryMethod === 'SHIPPING') {
        openNewAddressBox();
      }
      return;
    }

    const template = document.getElementById('address-radio-template');
    if (!template) return;

    const fragment = document.createDocumentFragment();
    let defaultId = null;

    for (let idx = 0; idx < addressList.length; idx++) {
      const addr = addressList[idx];
      const clone = template.content.cloneNode(true);
      const radioInput = clone.querySelector('.address-radio-input');
      const textSpan = clone.querySelector('.address-text');
      const badgeDefault = clone.querySelector('.address-badge-default');
      const distInfoBox = clone.querySelector('.address-distance-info');
      const distTag = clone.querySelector('.address-distance-tag');
      const distDetail = clone.querySelector('.address-distance-detail');

      const addrId = addr.addressId || addr.id;
      radioInput.value = String(addrId);
      textSpan.textContent = addr.address || addr.addressLine || '';

      if (addr.isDefault) {
        badgeDefault.classList.remove('hidden');
        defaultId = addrId;
      }

      // Kiểm tra khoảng cách đối với địa chỉ đã lưu
      if (addr.latitude !== null && addr.latitude !== undefined &&
          addr.longitude !== null && addr.longitude !== undefined) {
        distInfoBox.classList.remove('hidden');

        try {
          const check = await deliveryApi.checkDeliveryDistance(addr.latitude, addr.longitude);
          addr._distanceCheck = check;

          if (check.withinRadius) {
            distTag.className = 'address-distance-tag address-distance-tag--success';
            distTag.textContent = `✓ Trong phạm vi (${check.distanceKm} km)`;
            distDetail.textContent = `Cách xưởng HMP ${check.distanceKm} km (Bán kính tối đa: ${check.maxRadiusKm} km)`;
          } else {
            distTag.className = 'address-distance-tag address-distance-tag--danger';
            distTag.textContent = `⚠ Vượt bán kính (${check.distanceKm} km)`;
            distDetail.textContent = `Vượt quá bán kính phục vụ ${check.maxRadiusKm} km. Xưởng không thể giao tận nơi.`;
          }
        } catch (err) {
          distTag.className = 'address-distance-tag';
          distTag.textContent = 'Đã ghim vị trí';
          distDetail.textContent = 'Chưa kiểm tra được khoảng cách';
        }
      } else {
        // Địa chỉ cũ chưa có tọa độ
        distInfoBox.classList.remove('hidden');
        distTag.className = 'address-distance-tag';
        distTag.textContent = 'Chưa có tọa độ';
        distDetail.textContent = 'Vui lòng thêm địa chỉ mới có ghim bản đồ để nhận hàng';
      }

      // Chọn mặc định hoặc địa chỉ đầu tiên
      if (addr.isDefault || (!defaultId && idx === 0)) {
        radioInput.checked = true;
        selectedAddressId = addrId;
      }

      radioInput.addEventListener('change', () => {
        if (radioInput.checked) {
          selectedAddressId = addrId;
          validateSelectedAddressDistance();
        }
      });

      fragment.appendChild(clone);
    }

    container.appendChild(fragment);
    validateSelectedAddressDistance();

  } catch (err) {
    console.warn('Lỗi khi tải sổ địa chỉ:', err);
    container.replaceChildren();
    const errorText = document.createElement('p');
    errorText.className = 'address-loading-text';
    errorText.textContent = 'Không thể tải sổ địa chỉ. Bạn có thể nhập địa chỉ mới.';
    container.appendChild(errorText);

    if (currentDeliveryMethod === 'SHIPPING') {
      openNewAddressBox();
    }
  }
}

/**
 * Kiểm tra xem địa chỉ hiện đang chọn có hợp lệ về bán kính không
 */
function validateSelectedAddressDistance() {
  const errorAddress = document.getElementById('error-receiver-address');
  if (!errorAddress) return true;

  if (currentDeliveryMethod === 'PICKUP') {
    errorAddress.textContent = '';
    errorAddress.classList.add('hidden');
    return true;
  }

  const selectedAddr = addressList.find(a => String(a.addressId || a.id) === String(selectedAddressId));
  if (!selectedAddr) return false;

  if (selectedAddr.latitude === null || selectedAddr.latitude === undefined) {
    errorAddress.textContent = 'Địa chỉ đã chọn chưa có vị trí ghim trên bản đồ. Vui lòng bấm "+ Thêm địa chỉ mới" và ghim vị trí.';
    errorAddress.classList.remove('hidden');
    return false;
  }

  if (selectedAddr._distanceCheck && !selectedAddr._distanceCheck.withinRadius) {
    const dist = selectedAddr._distanceCheck.distanceKm;
    const maxR = selectedAddr._distanceCheck.maxRadiusKm;
    const hotline = selectedAddr._distanceCheck.storeHotline || (storeInfoData && storeInfoData.storeHotline) || '0987654321';
    errorAddress.textContent = `Địa chỉ này cách xưởng ${dist} km, vượt quá bán kính giao tận nơi tối đa (${maxR} km). Vui lòng chọn "Khách tự bốc hàng tại xưởng" hoặc liên hệ Hotline ${hotline}.`;
    errorAddress.classList.remove('hidden');
    return false;
  }

  errorAddress.textContent = '';
  errorAddress.classList.add('hidden');
  return true;
}

/**
 * Mở khung thêm địa chỉ mới và khởi tạo bản đồ
 */
function openNewAddressBox() {
  const boxNew = document.getElementById('new-address-box');
  const inputNewAddr = document.getElementById('input-new-address');
  if (!boxNew) return;

  boxNew.classList.remove('hidden');
  initOrRefreshMap();

  // Nạp danh sách 63 tỉnh thành Việt Nam vào dropdown
  if (typeof window._loadProvincesData === 'function') {
    window._loadProvincesData();
  }
}

/**
 * Khởi tạo hoặc cập nhật kích thước bản đồ Leaflet
 */
function initOrRefreshMap() {
  const mapContainer = document.getElementById('order-map-container');
  if (!mapContainer) return;

  if (!mapPickerInstance) {
    mapPickerInstance = new MapPicker({
      container: mapContainer,
      storeInfo: storeInfoData,
      onLocationChange: (loc) => {
        newAddressCoordinates = { lat: loc.lat, lng: loc.lng };
        newAddressDistanceInfo = loc;
        updateDistanceBadge(loc);
      }
    });
  } else {
    setTimeout(() => {
      mapPickerInstance.invalidateSize();
    }, 150);
  }
}

/**
 * Cập nhật hiển thị huy hiệu khoảng cách cho vị trí mới chọn trên bản đồ
 */
function updateDistanceBadge(info) {
  const badgeBox = document.getElementById('map-distance-badge');
  const iconEl = document.getElementById('distance-badge-icon');
  const mainEl = document.getElementById('distance-badge-main');
  const subEl = document.getElementById('distance-badge-sub');

  if (!badgeBox || !iconEl || !mainEl || !subEl) return;

  badgeBox.classList.remove('hidden');

  if (info.withinRadius) {
    badgeBox.className = 'distance-badge-box distance-badge-box--success';
    iconEl.textContent = '✓';
    mainEl.textContent = `Hợp lệ — Khoảng cách: ${info.distanceKm} km`;
    subEl.textContent = `Nằm trong phạm vi giao hàng tận nơi của xưởng (Bán kính tối đa: ${info.maxRadiusKm} km).`;
  } else {
    badgeBox.className = 'distance-badge-box distance-badge-box--danger';
    iconEl.textContent = '⚠';
    mainEl.textContent = `Vượt quá bán kính phục vụ (${info.distanceKm} km / Tối đa ${info.maxRadiusKm} km)`;
    subEl.textContent = `Xưởng HMP chỉ phục vụ giao hàng trong bán kính ${info.maxRadiusKm} km. Bạn có thể chọn "Khách tự bốc hàng tại xưởng" hoặc liên hệ Hotline: ${info.storeHotline}.`;
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
  const selectProvince = document.getElementById('select-address-province');
  const selectDistrict = document.getElementById('select-address-district');
  const selectWard = document.getElementById('select-address-ward');
  const inputNewAddr = document.getElementById('input-new-address');
  const errorNewAddr = document.getElementById('error-new-address');
  const chkDefault = document.getElementById('chk-address-default');
  const btnGps = document.getElementById('btn-gps-locate');
  const btnSearchMap = document.getElementById('btn-search-address-map');
  const suggestionsDropdown = document.getElementById('address-suggestions-dropdown');
  const statusGeocode = document.getElementById('address-geocode-status');

  let geocodeDebounceTimer = null;
  let isProvincesLoaded = false;

  const clearNewAddressError = () => {
    if (inputNewAddr) inputNewAddr.classList.remove('form-control--error');
    if (selectProvince) selectProvince.classList.remove('form-control--error');
    if (selectDistrict) selectDistrict.classList.remove('form-control--error');
    if (selectWard) selectWard.classList.remove('form-control--error');
    if (errorNewAddr) {
      errorNewAddr.textContent = '';
      errorNewAddr.classList.add('hidden');
    }
  };

  const resetAddressForm = () => {
    clearNewAddressError();
    if (inputNewAddr) inputNewAddr.value = '';
    if (selectProvince) selectProvince.value = '';
    if (selectDistrict) {
      selectDistrict.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
      selectDistrict.disabled = true;
    }
    if (selectWard) {
      selectWard.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
      selectWard.disabled = true;
    }
    if (suggestionsDropdown) {
      suggestionsDropdown.replaceChildren();
      suggestionsDropdown.classList.add('hidden');
    }
    if (statusGeocode) {
      statusGeocode.textContent = '';
      statusGeocode.classList.add('hidden');
    }
  };

  /**
   * Nạp danh sách 63 tỉnh thành Việt Nam vào dropdown Tỉnh/TP
   */
  window._loadProvincesData = async () => {
    if (isProvincesLoaded || !selectProvince) return;
    try {
      const provinces = await provincesApi.getProvinces();
      if (!provinces || provinces.length === 0) return;

      selectProvince.replaceChildren();
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '-- Chọn Tỉnh / TP --';
      selectProvince.appendChild(defaultOpt);

      provinces.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.code;
        opt.dataset.name = p.name;
        opt.textContent = p.name;
        selectProvince.appendChild(opt);
      });
      isProvincesLoaded = true;
    } catch (err) {
      console.warn('Lỗi khi nạp danh sách tỉnh thành:', err);
    }
  };

  /**
   * Tự động tìm kiếm tọa độ từ địa chỉ người dùng gõ và ghim lên bản đồ.
   * YÊU CẦU ĐẶC BIỆT: Nếu có nhiều hơn 1 output, luôn mặc định chọn output đầu tiên.
   */
  const performGeocode = async (queryText, isManual = false) => {
    const text = (queryText || '').trim();
    if (!text || text.length < 3) {
      if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');
      if (statusGeocode) statusGeocode.classList.add('hidden');
      return;
    }

    if (btnSearchMap) {
      btnSearchMap.disabled = true;
      btnSearchMap.textContent = 'Đang tìm...';
    }

    try {
      const candidates = await deliveryApi.geocodeAddress(text);
      if (suggestionsDropdown) {
        suggestionsDropdown.replaceChildren();
        suggestionsDropdown.classList.add('hidden');
      }

      if (candidates && candidates.length > 0) {
        // MẶC ĐỊNH CHỌN OUTPUT ĐẦU TIÊN theo đúng yêu cầu
        const best = candidates[0];
        const zoomLevel = best.isGps ? 17 : (best.isFallback ? 15 : 16);
        if (mapPickerInstance) {
          mapPickerInstance.panToLocation(best.lat, best.lng, zoomLevel);
        }

        if (statusGeocode) {
          if (best.isGps) {
            statusGeocode.textContent = `📍 Đã ghim chính xác theo Tọa độ GPS (${best.lat.toFixed(6)}, ${best.lng.toFixed(6)}).`;
          } else if (best.isFallback && best.landmarkHint) {
            statusGeocode.textContent = `📍 Đã định vị theo khu vực: "${best.address}". Do "${best.landmarkHint}" là địa danh cầu đường / thôn xóm dân sinh, bạn chỉ cần kéo thả ghim đỏ trên bản đồ để đặt đúng vị trí công trình nhận tôn.`;
          } else {
            statusGeocode.textContent = `📍 Đã tự động chọn vị trí: "${best.address}". Bạn có thể kéo thả ghim đỏ để tinh chỉnh nếu có xê dịch.`;
          }
          statusGeocode.classList.remove('hidden');
        }

        // Nếu có nhiều hơn 1 output, hiển thị dropdown để người dùng xem hoặc chọn lại
        if (candidates.length > 1 && suggestionsDropdown) {
          candidates.forEach((cand, idx) => {
            const item = document.createElement('div');
            item.className = 'address-suggestion-item' + (idx === 0 ? ' address-suggestion-item--selected' : '');
            
            const icon = document.createElement('span');
            icon.className = 'address-suggestion-icon';
            icon.textContent = idx === 0 ? '✓' : '📍';

            const txt = document.createElement('span');
            txt.className = 'address-suggestion-text';
            txt.textContent = cand.address;

            item.appendChild(icon);
            item.appendChild(txt);

            item.addEventListener('click', () => {
              if (mapPickerInstance) {
                mapPickerInstance.panToLocation(cand.lat, cand.lng, 16);
              }
              if (statusGeocode) {
                statusGeocode.textContent = `📍 Đã ghim vị trí theo: "${cand.address}". Bạn có thể kéo ghim đỏ để tinh chỉnh.`;
                statusGeocode.classList.remove('hidden');
              }
              suggestionsDropdown.classList.add('hidden');
            });

            suggestionsDropdown.appendChild(item);
          });
          suggestionsDropdown.classList.remove('hidden');
        }

        if (isManual) {
          toast.success('Đã tìm thấy và ghim vị trí trên bản đồ.');
        }
      } else if (isManual) {
        toast.info('Chưa tìm thấy tọa độ tự động. Quý khách vui lòng nhấp trực tiếp trên bản đồ để ghim vị trí.');
        if (statusGeocode) {
          statusGeocode.textContent = 'ℹ Không tìm thấy vị trí tự động. Quý khách vui lòng nhấp trực tiếp trên bản đồ để ghim vị trí.';
          statusGeocode.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.warn('Lỗi định vị địa chỉ:', err);
    } finally {
      if (btnSearchMap) {
        btnSearchMap.disabled = false;
        btnSearchMap.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Tìm vị trí</span>
        `;
      }
    }
  };

  /**
   * Ghép chuỗi địa chỉ từ 3 dropdown (Tỉnh, Huyện, Xã) + Địa chỉ cụ thể để tìm kiếm
   */
  const triggerCompositeGeocode = (isManual = false) => {
    const detail = (inputNewAddr ? inputNewAddr.value : '').trim();

    // Nếu người dùng nhập thẳng tọa độ GPS (hoặc dán từ Google Maps)
    const coordMatch = detail.match(/(?:@)?([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
    if (coordMatch) {
      performGeocode(detail, isManual);
      return;
    }

    const wardName = selectWard && selectWard.selectedIndex > 0 ? (selectWard.options[selectWard.selectedIndex]?.dataset.name || selectWard.options[selectWard.selectedIndex]?.text) : '';
    const distName = selectDistrict && selectDistrict.selectedIndex > 0 ? (selectDistrict.options[selectDistrict.selectedIndex]?.dataset.name || selectDistrict.options[selectDistrict.selectedIndex]?.text) : '';
    const provName = selectProvince && selectProvince.selectedIndex > 0 ? (selectProvince.options[selectProvince.selectedIndex]?.dataset.name || selectProvince.options[selectProvince.selectedIndex]?.text) : '';

    const parts = [];
    if (detail) parts.push(detail);
    if (wardName) parts.push(wardName);
    if (distName) parts.push(distName);
    if (provName) parts.push(provName);

    const query = parts.join(', ');
    if (query) {
      performGeocode(query, isManual);
    }
  };

  // --- SỰ KIỆN CASCADING CHO 3 DROPDOWN HÀNH CHÍNH ---

  // Khi chọn Tỉnh/Thành phố
  if (selectProvince) {
    selectProvince.addEventListener('change', async () => {
      clearNewAddressError();
      const provCode = selectProvince.value;

      // Reset Huyện & Xã
      if (selectDistrict) {
        selectDistrict.innerHTML = '<option value="">-- Chọn Quận / Huyện --</option>';
        selectDistrict.disabled = true;
      }
      if (selectWard) {
        selectWard.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
        selectWard.disabled = true;
      }

      if (!provCode) return;

      if (selectDistrict) {
        selectDistrict.disabled = true;
        selectDistrict.innerHTML = '<option value="">-- Đang nạp Quận/Huyện... --</option>';
      }

      try {
        const districts = await provincesApi.getDistricts(provCode);
        if (selectDistrict) {
          selectDistrict.replaceChildren();
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '-- Chọn Quận / Huyện --';
          selectDistrict.appendChild(defaultOpt);

          districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.code;
            opt.dataset.name = d.name;
            opt.textContent = d.name;
            selectDistrict.appendChild(opt);
          });
          selectDistrict.disabled = false;
        }
      } catch (err) {
        console.warn('Lỗi khi nạp quận huyện:', err);
      }

      // Tự động định vị cấp Tỉnh
      triggerCompositeGeocode(false);
    });
  }

  // Khi chọn Quận/Huyện
  if (selectDistrict) {
    selectDistrict.addEventListener('change', async () => {
      clearNewAddressError();
      const distCode = selectDistrict.value;

      // Reset Xã
      if (selectWard) {
        selectWard.innerHTML = '<option value="">-- Chọn Phường / Xã --</option>';
        selectWard.disabled = true;
      }

      if (!distCode) {
        triggerCompositeGeocode(false);
        return;
      }

      if (selectWard) {
        selectWard.disabled = true;
        selectWard.innerHTML = '<option value="">-- Đang nạp Phường/Xã... --</option>';
      }

      try {
        const wards = await provincesApi.getWards(distCode);
        if (selectWard) {
          selectWard.replaceChildren();
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '-- Chọn Phường / Xã --';
          selectWard.appendChild(defaultOpt);

          wards.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.code;
            opt.dataset.name = w.name;
            opt.textContent = w.name;
            selectWard.appendChild(opt);
          });
          selectWard.disabled = false;
        }
      } catch (err) {
        console.warn('Lỗi khi nạp phường xã:', err);
      }

      // Tự động định vị cấp Huyện + Tỉnh
      triggerCompositeGeocode(false);
    });
  }

  // Khi chọn Phường/Xã
  if (selectWard) {
    selectWard.addEventListener('change', () => {
      clearNewAddressError();
      // Tự động định vị cấp Xã + Huyện + Tỉnh
      triggerCompositeGeocode(false);
    });
  }

  // Lắng nghe người dùng gõ địa chỉ chi tiết: Debounce 600ms tự động ghim vị trí
  if (inputNewAddr) {
    inputNewAddr.addEventListener('input', () => {
      clearNewAddressError();

      if (geocodeDebounceTimer) {
        clearTimeout(geocodeDebounceTimer);
      }

      geocodeDebounceTimer = setTimeout(() => {
        triggerCompositeGeocode(false);
      }, 600);
    });

    // Nhấn Enter trong ô nhập địa chỉ: Tìm kiếm ngay lập tức
    inputNewAddr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (geocodeDebounceTimer) clearTimeout(geocodeDebounceTimer);
        triggerCompositeGeocode(true);
      }
    });
  }

  // Nút bấm thủ công "Tìm vị trí"
  if (btnSearchMap) {
    btnSearchMap.addEventListener('click', () => {
      if (geocodeDebounceTimer) clearTimeout(geocodeDebounceTimer);
      triggerCompositeGeocode(true);
    });
  }

  // Đóng dropdown gợi ý khi click ra ngoài
  document.addEventListener('click', (e) => {
    if (suggestionsDropdown && !suggestionsDropdown.contains(e.target) && e.target !== inputNewAddr && e.target !== btnSearchMap) {
      suggestionsDropdown.classList.add('hidden');
    }
  });

  if (btnToggle && boxNew) {
    btnToggle.addEventListener('click', () => {
      const isHidden = boxNew.classList.contains('hidden');
      if (isHidden) {
        openNewAddressBox();
      } else {
        boxNew.classList.add('hidden');
        resetAddressForm();
      }
    });
  }

  // Nút GPS lấy vị trí hiện tại
  if (btnGps) {
    btnGps.addEventListener('click', async () => {
      if (!mapPickerInstance) return;
      try {
        btnGps.disabled = true;
        btnGps.textContent = 'Đang định vị...';
        await mapPickerInstance.locateCurrentPosition();
        toast.info('Đã xác định vị trí GPS hiện tại của bạn.');
        if (statusGeocode) {
          statusGeocode.textContent = '📍 Đã định vị theo GPS thiết bị của bạn. Bạn có thể kéo thả ghim đỏ để tinh chỉnh nếu cần.';
          statusGeocode.classList.remove('hidden');
        }
      } catch (err) {
        toast.warning('Không thể lấy vị trí GPS từ trình duyệt. Vui lòng bấm trực tiếp trên bản đồ.');
      } finally {
        btnGps.disabled = false;
        btnGps.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          Vị trí của tôi
        `;
      }
    });
  }

  if (btnCancel && boxNew) {
    btnCancel.addEventListener('click', () => {
      boxNew.classList.add('hidden');
      resetAddressForm();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      clearNewAddressError();

      const provIndex = selectProvince ? selectProvince.selectedIndex : -1;
      const distIndex = selectDistrict ? selectDistrict.selectedIndex : -1;
      const wardIndex = selectWard ? selectWard.selectedIndex : -1;

      // 1. Kiểm tra Tỉnh / TP
      if (!selectProvince || selectProvince.value === '' || provIndex <= 0) {
        if (selectProvince) selectProvince.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng chọn Tỉnh / Thành phố.';
          errorNewAddr.classList.remove('hidden');
        }
        selectProvince?.focus();
        toast.warning('Vui lòng chọn Tỉnh / Thành phố.');
        return;
      }

      // 2. Kiểm tra Quận / Huyện
      if (!selectDistrict || selectDistrict.value === '' || distIndex <= 0) {
        if (selectDistrict) selectDistrict.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng chọn Quận / Huyện.';
          errorNewAddr.classList.remove('hidden');
        }
        selectDistrict?.focus();
        toast.warning('Vui lòng chọn Quận / Huyện.');
        return;
      }

      // 3. Kiểm tra Phường / Xã
      if (!selectWard || selectWard.value === '' || wardIndex <= 0) {
        if (selectWard) selectWard.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng chọn Phường / Xã.';
          errorNewAddr.classList.remove('hidden');
        }
        selectWard?.focus();
        toast.warning('Vui lòng chọn Phường / Xã.');
        return;
      }

      // 4. Kiểm tra địa chỉ cụ thể
      const detailText = (inputNewAddr ? inputNewAddr.value : '').trim();
      if (!detailText) {
        if (inputNewAddr) inputNewAddr.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng nhập địa chỉ chi tiết (Thôn, xóm, số nhà, ngõ, công trình nhận hàng).';
          errorNewAddr.classList.remove('hidden');
        }
        inputNewAddr?.focus();
        toast.warning('Vui lòng nhập địa chỉ chi tiết.');
        return;
      }

      if (detailText.length > 200) {
        if (inputNewAddr) inputNewAddr.classList.add('form-control--error');
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Địa chỉ chi tiết không được vượt quá 200 ký tự.';
          errorNewAddr.classList.remove('hidden');
        }
        inputNewAddr?.focus();
        toast.warning('Địa chỉ chi tiết quá dài (tối đa 200 ký tự).');
        return;
      }

      // 5. Bắt buộc phải ghim vị trí trên bản đồ
      if (!newAddressCoordinates.lat || !newAddressCoordinates.lng) {
        if (errorNewAddr) {
          errorNewAddr.textContent = 'Vui lòng nhấp trên bản đồ để ghim vị trí nhận hàng.';
          errorNewAddr.classList.remove('hidden');
        }
        toast.warning('Vui lòng ghim vị trí công trình nhận hàng trên bản đồ.');
        return;
      }

      const provinceName = selectProvince.options[provIndex].dataset.name || selectProvince.options[provIndex].text;
      const districtName = selectDistrict.options[distIndex].dataset.name || selectDistrict.options[distIndex].text;
      const wardName = selectWard.options[wardIndex].dataset.name || selectWard.options[wardIndex].text;
      const fullAddress = `${detailText}, ${wardName}, ${districtName}, ${provinceName}`;

      try {
        btnSave.disabled = true;
        const isDefault = chkDefault ? chkDefault.checked : false;

        const payload = {
          address: fullAddress,
          province: provinceName,
          district: districtName,
          ward: wardName,
          isDefault,
          latitude: newAddressCoordinates.lat,
          longitude: newAddressCoordinates.lng
        };

        const createdAddr = await orderApi.createAddress(payload);
        toast.success('Đã lưu địa chỉ nhận hàng mới.');

        resetAddressForm();
        if (boxNew) boxNew.classList.add('hidden');

        // Tải lại danh sách địa chỉ và tự chọn địa chỉ vừa tạo
        await loadAddresses();
        if (createdAddr && (createdAddr.addressId || createdAddr.id)) {
          selectedAddressId = createdAddr.addressId || createdAddr.id;
          validateSelectedAddressDistance();
        }

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
 */
async function enrichOrderItemsPricing() {
  if (!orderItems || orderItems.length === 0) return;

  const fetchPromises = orderItems.map(async (item) => {
    if (!item.productId) return;
    try {
      const prod = await getProductDetail(item.productId);
      if (prod) {
        item.priceVisible = Boolean(prod.priceVisible);

        if (!item.productImageUrl && !item.imageUrl) {
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
      console.warn(`[Order] Không thể nạp thông tin giá sản phẩm ID ${item.productId}:`, err);
    }
  });

  await Promise.all(fetchPromises);

  try {
    if (orderMode === 'buy-now' && orderItems.length > 0) {
      sessionStorage.setItem('hmp_buy_now_item', JSON.stringify(orderItems[0]));
    } else if (orderMode === 'cart') {
      sessionStorage.setItem('hmp_cart_checkout_items', JSON.stringify(orderItems));
    }
  } catch (e) {
    // ignore
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
 * Xử lý xác nhận tạo đơn hàng kèm kiểm tra hợp lệ dữ liệu (Form Validation & Delivery Radius)
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

    // 2. Kiểm tra số điện thoại người nhận
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

    // 3. Kiểm tra địa chỉ và bán kính phục vụ nếu chọn Giao hàng tận nơi (SHIPPING)
    if (currentDeliveryMethod === 'SHIPPING') {
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

      // Xác thực khoảng cách
      const isWithinRadius = validateSelectedAddressDistance();
      if (!isWithinRadius) {
        toast.error('Địa chỉ nhận hàng vượt quá bán kính giao hàng hoặc chưa có tọa độ. Vui lòng kiểm tra lại.');
        const addrContainer = document.getElementById('address-list-container');
        if (addrContainer) addrContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
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
      deliveryMethod: currentDeliveryMethod,
      receiverName,
      receiverPhone,
      addressId: currentDeliveryMethod === 'SHIPPING' ? selectedAddressId : (selectedAddressId || null),
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

      // TUYỆT ĐỐI KHÔNG XÓA GIỎ HÀNG (để khách có thể đặt lại theo nghiệp vụ cốt lõi)

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
