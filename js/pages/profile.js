/**
 * profile.js — Điều khiển logic trang Thông tin cá nhân & Sổ địa chỉ khách hàng
 */

import { requireCustomerAuth } from '../auth/auth.guard.js';
import { loadHeader, loadFooter } from '../components/component-loader.js';
import { userApi } from '../api/user.api.js';
import { deliveryApi } from '../api/delivery.api.js';
import { provincesApi } from '../api/provinces.api.js';
import { MapPicker } from '../components/map-picker.js';
import { toast } from '../components/toast.js';
import { storage } from '../utils/storage.js';
import { authState } from '../auth/auth.state.js';
import { showLogoutConfirm, showConfirmModal } from '../components/confirm-modal.js';

// Trạng thái trang
let currentProfile = null;
let savedAddresses = [];
let editingAddressId = null;
let storeInfoData = null;
let mapPickerInstance = null;
let modalCoordinates = { lat: null, lng: null };

// Trạng thái OTP
let otpPhoneTarget = '';
let otpCountdownTimer = null;
let otpSecondsLeft = 60;

// Trạng thái danh mục địa giới
let isProvincesLoaded = false;
let geocodeDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Kiểm tra xác thực khách hàng
  const hasAuth = await requireCustomerAuth();
  if (!hasAuth) return;

  // 2. Nạp Header và Footer dùng chung
  await Promise.all([loadHeader(), loadFooter()]);

  // 3. Khởi tạo các sự kiện giao diện
  initSidebarEvents();
  initProfileFormEvents();
  initOtpModalEvents();
  initAddressModalEvents();

  // 4. Tải dữ liệu ban đầu
  await Promise.all([
    loadUserProfile(),
    loadAddresses(),
    loadStoreInfo()
  ]);
});

/* ==========================================================================
   1. KHỞI TẠO DỮ LIỆU & SIDEBAR
   ========================================================================== */

async function loadStoreInfo() {
  try {
    storeInfoData = await deliveryApi.getStoreInfo();
  } catch (err) {
    console.warn('[Profile] Không thể lấy thông tin xưởng HMP:', err);
  }
}

async function loadUserProfile() {
  try {
    currentProfile = await userApi.getProfile();
    renderProfileData(currentProfile);
  } catch (err) {
    console.error('[Profile] Lỗi nạp thông tin hồ sơ:', err);
    toast.error('Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.');
  }
}

function renderProfileData(user) {
  if (!user) return;

  const displayName = user.fullName || user.email || 'Khách hàng';
  const displayPhone = user.phone || '';
  const initial = (user.fullName || user.email || 'K').charAt(0).toUpperCase();

  // Cập nhật Sidebar
  const sidebarAvatar = document.getElementById('profile-sidebar-avatar');
  const sidebarName = document.getElementById('profile-sidebar-name');
  const sidebarPhone = document.getElementById('profile-sidebar-phone');

  if (sidebarAvatar) sidebarAvatar.textContent = initial;
  if (sidebarName) sidebarName.textContent = displayName;
  if (sidebarPhone) sidebarPhone.textContent = displayPhone || 'Chưa liên kết SĐT';

  // Cập nhật Form
  const inputFullName = document.getElementById('profile-fullname');
  const inputEmail = document.getElementById('profile-email');
  const phoneDisplay = document.getElementById('profile-phone-display');
  const phoneBadge = document.getElementById('profile-phone-badge');
  const btnChangePhone = document.getElementById('btn-open-phone-modal');

  if (inputFullName) inputFullName.value = user.fullName || '';
  if (inputEmail) inputEmail.value = user.email || '';

  if (phoneDisplay) {
    phoneDisplay.textContent = displayPhone ? displayPhone : 'Chưa liên kết số điện thoại';
  }

  if (phoneBadge) {
    if (displayPhone) {
      phoneBadge.textContent = '✓ Đã xác thực OTP';
      phoneBadge.className = 'badge-verified';
    } else {
      phoneBadge.textContent = 'Chưa liên kết';
      phoneBadge.className = 'badge-unverified';
    }
  }

  if (btnChangePhone) {
    btnChangePhone.textContent = displayPhone ? 'Đổi số điện thoại' : 'Liên kết số điện thoại';
  }

  // Đồng bộ storage user
  const currentUser = storage.getUser() || {};
  storage.setUser({
    ...currentUser,
    fullName: user.fullName,
    phone: user.phone,
    phoneNumber: user.phone,
    role: user.role
  });
}

function initSidebarEvents() {
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLogoutConfirm({
        onConfirm: async () => {
          try {
            await authState.logout();
          } catch {
            // Vẫn xóa storage nếu có lỗi mạng
            storage.clear();
          }
          window.location.href = '../../index.html';
        }
      });
    });
  }
}

/* ==========================================================================
   2. FORM HỒ SƠ CÁ NHÂN (FULLNAME UPDATE)
   ========================================================================== */

function initProfileFormEvents() {
  const form = document.getElementById('profile-form');
  const btnSave = document.getElementById('btn-save-profile');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputFullName = document.getElementById('profile-fullname');
      const fullName = (inputFullName ? inputFullName.value : '').trim();

      if (!fullName) {
        toast.warning('Vui lòng nhập họ và tên của bạn.');
        return;
      }

      try {
        if (btnSave) {
          btnSave.disabled = true;
          btnSave.textContent = 'Đang lưu...';
        }

        const updated = await userApi.updateProfile({ fullName });
        currentProfile = updated;
        renderProfileData(updated);
        toast.success('Cập nhật họ và tên thành công!');
      } catch (err) {
        console.error('[Profile] Lỗi cập nhật hồ sơ:', err);
        toast.error(err.message || 'Cập nhật thất bại. Vui lòng thử lại.');
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = 'Lưu Thay Đổi';
        }
      }
    });
  }
}

/* ==========================================================================
   3. XÁC THỰC SỐ ĐIỆN THOẠI (PHONE OTP FLOW)
   ========================================================================== */

function initOtpModalEvents() {
  const modalOverlay = document.getElementById('otp-modal-overlay');
  const btnOpenModal = document.getElementById('btn-open-phone-modal');
  const btnCloseModal = document.getElementById('btn-close-otp-modal');
  const step1Form = document.getElementById('otp-step-phone-form');
  const step2Form = document.getElementById('otp-step-verify-form');
  const inputPhone = document.getElementById('otp-input-phone');
  const btnSendOtp = document.getElementById('btn-send-otp');
  const inputOtpCode = document.getElementById('otp-code-input');
  const btnVerifyOtp = document.getElementById('btn-verify-otp');
  const btnResendOtp = document.getElementById('btn-resend-otp');
  const countdownEl = document.getElementById('otp-countdown');
  const targetPhoneEl = document.getElementById('otp-target-phone');

  function openOtpModal() {
    if (!modalOverlay) return;
    // Reset modal
    if (step1Form) step1Form.classList.remove('hidden');
    if (step2Form) step2Form.classList.add('hidden');
    if (inputPhone) {
      inputPhone.value = currentProfile?.phone || '';
      inputPhone.focus();
    }
    if (inputOtpCode) inputOtpCode.value = '';
    clearInterval(otpCountdownTimer);
    modalOverlay.classList.add('modal-overlay--open');
  }

  function closeOtpModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('modal-overlay--open');
    clearInterval(otpCountdownTimer);
  }

  if (btnOpenModal) btnOpenModal.addEventListener('click', openOtpModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeOtpModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeOtpModal();
  });

  // Bước 1: Gửi mã OTP
  if (step1Form) {
    step1Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phoneVal = (inputPhone ? inputPhone.value : '').trim();

      const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
      if (!phoneRegex.test(phoneVal)) {
        toast.warning('Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09.');
        return;
      }

      try {
        if (btnSendOtp) {
          btnSendOtp.disabled = true;
          btnSendOtp.textContent = 'Đang gửi mã...';
        }

        await userApi.requestPhoneOtp(phoneVal);
        otpPhoneTarget = phoneVal;

        // Chuyển sang bước 2
        if (step1Form) step1Form.classList.add('hidden');
        if (step2Form) step2Form.classList.remove('hidden');
        if (targetPhoneEl) {
          targetPhoneEl.textContent = phoneVal.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2');
        }
        if (inputOtpCode) {
          inputOtpCode.value = '';
          inputOtpCode.focus();
        }

        startOtpCountdown();
        toast.info(`Mã OTP đã được gửi đến số điện thoại ${phoneVal}.`);
      } catch (err) {
        console.error('[Profile] Lỗi gửi OTP:', err);
        toast.error(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.');
      } finally {
        if (btnSendOtp) {
          btnSendOtp.disabled = false;
          btnSendOtp.textContent = 'Gửi Mã Xác Thực OTP';
        }
      }
    });
  }

  function startOtpCountdown() {
    clearInterval(otpCountdownTimer);
    otpSecondsLeft = 60;
    if (btnResendOtp) btnResendOtp.disabled = true;
    if (countdownEl) countdownEl.textContent = `${otpSecondsLeft}s`;

    otpCountdownTimer = setInterval(() => {
      otpSecondsLeft -= 1;
      if (countdownEl) countdownEl.textContent = `${otpSecondsLeft}s`;

      if (otpSecondsLeft <= 0) {
        clearInterval(otpCountdownTimer);
        if (btnResendOtp) btnResendOtp.disabled = false;
        if (countdownEl) countdownEl.textContent = '0s';
      }
    }, 1000);
  }

  // Gửi lại mã OTP
  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', async () => {
      if (!otpPhoneTarget) return;
      try {
        btnResendOtp.disabled = true;
        await userApi.requestPhoneOtp(otpPhoneTarget);
        startOtpCountdown();
        toast.info('Đã gửi lại mã OTP mới.');
      } catch (err) {
        toast.error(err.message || 'Không thể gửi lại mã OTP.');
        btnResendOtp.disabled = false;
      }
    });
  }

  // Bước 2: Xác thực mã OTP
  if (step2Form) {
    step2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otpVal = (inputOtpCode ? inputOtpCode.value : '').trim();

      if (!/^\d{6}$/.test(otpVal)) {
        toast.warning('Vui lòng nhập đúng 6 chữ số mã OTP.');
        return;
      }

      try {
        if (btnVerifyOtp) {
          btnVerifyOtp.disabled = true;
          btnVerifyOtp.textContent = 'Đang xác minh...';
        }

        const res = await userApi.verifyPhoneOtp(otpPhoneTarget, otpVal);
        if (res.verified || res.phone) {
          toast.success('Xác thực và liên kết số điện thoại thành công!');
          closeOtpModal();
          // Cập nhật lại thông tin hồ sơ
          await loadUserProfile();
        }
      } catch (err) {
        console.error('[Profile] Lỗi xác thực OTP:', err);
        toast.error(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      } finally {
        if (btnVerifyOtp) {
          btnVerifyOtp.disabled = false;
          btnVerifyOtp.textContent = 'Xác Nhận & Liên Kết';
        }
      }
    });
  }
}

/* ==========================================================================
   4. SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESS BOOK CRUD)
   ========================================================================== */

async function loadAddresses() {
  const listContainer = document.getElementById('address-list');
  const emptyBox = document.getElementById('address-empty');
  if (!listContainer) return;

  try {
    savedAddresses = await userApi.getAddresses();
    renderAddressList(savedAddresses);
  } catch (err) {
    console.error('[Profile] Lỗi lấy danh sách địa chỉ:', err);
    toast.error('Không thể tải sổ địa chỉ nhận hàng.');
  }
}

function renderAddressList(addresses) {
  const listContainer = document.getElementById('address-list');
  const emptyBox = document.getElementById('address-empty');
  const template = document.getElementById('address-card-template');

  if (!listContainer || !template) return;
  listContainer.replaceChildren();

  if (!addresses || addresses.length === 0) {
    if (emptyBox) emptyBox.classList.remove('hidden');
    return;
  }

  if (emptyBox) emptyBox.classList.add('hidden');

  addresses.forEach(addr => {
    const clone = template.content.cloneNode(true);
    const cardEl = clone.querySelector('.address-item-card');
    const badgeDefault = clone.querySelector('.address-item__badge-default');
    const textEl = clone.querySelector('.address-item__text');
    const divisionEl = clone.querySelector('.address-item__division');
    const coordsEl = clone.querySelector('.address-item__coords');
    const coordsText = clone.querySelector('.coords-text');

    const btnEdit = clone.querySelector('.address-action-btn--edit');
    const btnDelete = clone.querySelector('.address-action-btn--delete');
    const btnSetDefault = clone.querySelector('.address-action-btn--default');

    if (addr.isDefault) {
      cardEl.classList.add('address-item-card--default');
      badgeDefault.classList.remove('hidden');
      if (btnSetDefault) btnSetDefault.classList.add('hidden'); // Đã là mặc định thì ẩn nút
    } else {
      if (btnSetDefault) btnSetDefault.classList.remove('hidden');
    }

    if (textEl) textEl.textContent = addr.address || '';

    // Địa giới hành chính
    const divisionParts = [addr.ward, addr.district, addr.province].filter(Boolean);
    if (divisionEl) {
      divisionEl.textContent = divisionParts.length > 0 ? divisionParts.join(', ') : 'Chưa phân cấp địa giới';
    }

    // Tọa độ GPS
    if (addr.latitude && addr.longitude) {
      if (coordsEl) coordsEl.classList.remove('hidden');
      if (coordsText) coordsText.textContent = `Tọa độ: ${addr.latitude.toFixed(5)}, ${addr.longitude.toFixed(5)}`;
    }

    // Sự kiện nút Sửa
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        openEditAddressModal(addr);
      });
    }

    // Sự kiện nút Xóa
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        handleDeleteAddress(addr);
      });
    }

    // Sự kiện nút Thiết lập mặc định
    if (btnSetDefault) {
      btnSetDefault.addEventListener('click', () => {
        handleSetDefaultAddress(addr);
      });
    }

    listContainer.appendChild(clone);
  });
}

/* ==========================================================================
   5. MODAL THÊM / CHỈNH SỬA ĐỊA CHỈ & BẢN ĐỒ MAP-PICKER
   ========================================================================== */

function initAddressModalEvents() {
  const modalOverlay = document.getElementById('address-modal-overlay');
  const btnOpenAdd = document.getElementById('btn-open-add-address');
  const btnEmptyAdd = document.getElementById('btn-empty-add-address');
  const btnCloseModal = document.getElementById('btn-close-address-modal');
  const btnCancel = document.getElementById('btn-cancel-address-modal');
  const form = document.getElementById('address-modal-form');
  const btnGps = document.getElementById('modal-btn-gps');
  const inputAddress = document.getElementById('modal-input-address');

  function openModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.add('modal-overlay--open');

    // Nạp tỉnh thành lần đầu
    loadProvincesDropdown();

    // Lazy init Leaflet Map & tự động canh chuẩn kích thước sau khi hiệu ứng mở modal hoàn tất
    initModalMap();
    setTimeout(() => {
      if (mapPickerInstance) {
        mapPickerInstance.invalidateSize();
      }
    }, 250);
  }

  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('modal-overlay--open');
    editingAddressId = null;
  }

  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      resetAddressModalForm();
      openModal();
    });
  }

  if (btnEmptyAdd) {
    btnEmptyAdd.addEventListener('click', () => {
      resetAddressModalForm();
      openModal();
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // GPS Định vị
  if (btnGps) {
    btnGps.addEventListener('click', async () => {
      if (!mapPickerInstance) return;
      try {
        btnGps.disabled = true;
        btnGps.textContent = 'Đang định vị...';
        await mapPickerInstance.locateCurrentPosition();
        toast.info('Đã xác định vị trí GPS hiện tại của bạn.');
      } catch (err) {
        toast.error('Không thể lấy tọa độ GPS từ trình duyệt.');
      } finally {
        btnGps.disabled = false;
        btnGps.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
          </svg>
          <span>Vị trí của tôi</span>
        `;
      }
    });
  }

  // Tự động tìm kiếm tọa độ (Forward Geocoding) khi nhập địa chỉ
  if (inputAddress) {
    inputAddress.addEventListener('input', () => {
      clearTimeout(geocodeDebounceTimer);
      geocodeDebounceTimer = setTimeout(() => {
        handleForwardGeocode();
      }, 500);
    });

    // Khi người dùng bấm Enter trong ô nhập địa chỉ: Tìm kiếm và ghim ngay
    inputAddress.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(geocodeDebounceTimer);
        handleForwardGeocode();
      }
    });

    // Khi rời khỏi ô nhập địa chỉ (blur): Kích hoạt tìm kiếm ngay nếu chưa kịp debounce
    inputAddress.addEventListener('blur', () => {
      clearTimeout(geocodeDebounceTimer);
      handleForwardGeocode();
    });
  }

  // Xử lý gửi Form Thêm / Sửa địa chỉ
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveAddress();
    });
  }
}

function resetAddressModalForm() {
  editingAddressId = null;
  const modalTitle = document.getElementById('address-modal-title');
  const hiddenId = document.getElementById('modal-address-id');
  const inputAddress = document.getElementById('modal-input-address');
  const checkboxDefault = document.getElementById('modal-checkbox-default');
  const selectProvince = document.getElementById('modal-select-province');
  const selectDistrict = document.getElementById('modal-select-district');
  const selectWard = document.getElementById('modal-select-ward');
  const coordsDisplay = document.getElementById('modal-coords-display');
  const geocodeStatus = document.getElementById('modal-geocode-status');

  if (modalTitle) modalTitle.textContent = 'Thêm Địa Chỉ Nhận Hàng Mới';
  if (hiddenId) hiddenId.value = '';
  if (inputAddress) inputAddress.value = '';
  if (checkboxDefault) checkboxDefault.checked = savedAddresses.length === 0; // Mặc định nếu là địa chỉ đầu tiên

  if (selectProvince) selectProvince.value = '';
  if (selectDistrict) {
    selectDistrict.replaceChildren();
    selectDistrict.appendChild(new Option('-- Chọn Quận / Huyện --', ''));
    selectDistrict.disabled = true;
  }
  if (selectWard) {
    selectWard.replaceChildren();
    selectWard.appendChild(new Option('-- Chọn Phường / Xã --', ''));
    selectWard.disabled = true;
  }

  modalCoordinates = { lat: null, lng: null };
  if (coordsDisplay) coordsDisplay.textContent = 'Chưa có tọa độ GPS';
  if (geocodeStatus) geocodeStatus.textContent = 'Kéo thả ghim đỏ để định vị chính xác';
}

function openEditAddressModal(addr) {
  const modalOverlay = document.getElementById('address-modal-overlay');
  const modalTitle = document.getElementById('address-modal-title');
  const hiddenId = document.getElementById('modal-address-id');
  const inputAddress = document.getElementById('modal-input-address');
  const checkboxDefault = document.getElementById('modal-checkbox-default');

  editingAddressId = addr.addressId;
  if (modalTitle) modalTitle.textContent = 'Cập Nhật Địa Chỉ Nhận Hàng';
  if (hiddenId) hiddenId.value = addr.addressId;
  if (inputAddress) inputAddress.value = addr.address || '';
  if (checkboxDefault) checkboxDefault.checked = Boolean(addr.isDefault);

  if (!modalOverlay) return;
  modalOverlay.classList.add('modal-overlay--open');

  // Nạp tỉnh thành và chọn lại đúng giá trị
  loadProvincesDropdown().then(() => {
    preselectAddressDivisions(addr.province, addr.district, addr.ward).then(() => {
      // Nếu địa chỉ lưu trong DB chưa có tọa độ, tự động geocode tìm và ghim vị trí ngay
      if (!modalCoordinates.lat || !modalCoordinates.lng) {
        handleForwardGeocode();
      }
    });
  });

  // Tọa độ
  modalCoordinates = {
    lat: addr.latitude || null,
    lng: addr.longitude || null
  };
  updateCoordsDisplay(modalCoordinates.lat, modalCoordinates.lng);

  // Lazy init map & pan to coordinates
  initModalMap();
  setTimeout(() => {
    if (mapPickerInstance) {
      mapPickerInstance.invalidateSize();
      if (modalCoordinates.lat && modalCoordinates.lng) {
        mapPickerInstance.panToLocation(modalCoordinates.lat, modalCoordinates.lng, 16);
      }
    }
  }, 250);
}

function initModalMap() {
  const container = document.getElementById('modal-map-container');
  if (!container) return;

  if (!mapPickerInstance) {
    mapPickerInstance = new MapPicker({
      container: container,
      storeInfo: storeInfoData,
      onLocationChange: ({ lat, lng }) => {
        modalCoordinates = { lat, lng };
        updateCoordsDisplay(lat, lng);
      }
    });
  }

  setTimeout(() => {
    if (mapPickerInstance) {
      mapPickerInstance.invalidateSize();
    }
  }, 250);
}

function updateCoordsDisplay(lat, lng) {
  const coordsDisplay = document.getElementById('modal-coords-display');
  const geocodeStatus = document.getElementById('modal-geocode-status');

  if (lat && lng) {
    if (coordsDisplay) coordsDisplay.textContent = `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (geocodeStatus) geocodeStatus.textContent = '✓ Đã ghim vị trí';
  } else {
    if (coordsDisplay) coordsDisplay.textContent = 'Chưa có tọa độ GPS';
    if (geocodeStatus) geocodeStatus.textContent = 'Kéo thả ghim đỏ để định vị chính xác';
  }
}

/* ==========================================================================
   6. ĐỊA GIỚI HÀNH CHÍNH & FORWARD GEOCODING
   ========================================================================== */

async function loadProvincesDropdown() {
  if (isProvincesLoaded) return;
  const selectProvince = document.getElementById('modal-select-province');
  if (!selectProvince) return;

  try {
    const provinces = await provincesApi.getProvinces();
    if (!provinces || provinces.length === 0) return;

    selectProvince.replaceChildren();
    selectProvince.appendChild(new Option('-- Chọn Tỉnh / TP --', ''));

    provinces.forEach(p => {
      const opt = new Option(p.name, p.code);
      opt.dataset.name = p.name;
      selectProvince.appendChild(opt);
    });

    isProvincesLoaded = true;

    // Lắng nghe thay đổi Tỉnh -> nạp Huyện
    selectProvince.addEventListener('change', async () => {
      const provCode = selectProvince.value;
      const selectDistrict = document.getElementById('modal-select-district');
      const selectWard = document.getElementById('modal-select-ward');

      if (!selectDistrict || !selectWard) return;

      selectDistrict.replaceChildren();
      selectDistrict.appendChild(new Option('-- Chọn Quận / Huyện --', ''));
      selectDistrict.disabled = true;

      selectWard.replaceChildren();
      selectWard.appendChild(new Option('-- Chọn Phường / Xã --', ''));
      selectWard.disabled = true;

      if (!provCode) return;

      try {
        const districts = await provincesApi.getDistricts(provCode);
        districts.forEach(d => {
          const opt = new Option(d.name, d.code);
          opt.dataset.name = d.name;
          selectDistrict.appendChild(opt);
        });
        selectDistrict.disabled = false;
      } catch (err) {
        console.warn('[Profile] Lỗi nạp quận huyện:', err);
      }

      handleForwardGeocode();
    });

    // Lắng nghe thay đổi Huyện -> nạp Xã
    const selectDistrict = document.getElementById('modal-select-district');
    selectDistrict?.addEventListener('change', async () => {
      const distCode = selectDistrict.value;
      const selectWard = document.getElementById('modal-select-ward');
      if (!selectWard) return;

      selectWard.replaceChildren();
      selectWard.appendChild(new Option('-- Chọn Phường / Xã --', ''));
      selectWard.disabled = true;

      if (!distCode) return;

      try {
        const wards = await provincesApi.getWards(distCode);
        wards.forEach(w => {
          const opt = new Option(w.name, w.code);
          opt.dataset.name = w.name;
          selectWard.appendChild(opt);
        });
        selectWard.disabled = false;
      } catch (err) {
        console.warn('[Profile] Lỗi nạp phường xã:', err);
      }

      handleForwardGeocode();
    });

    // Lắng nghe thay đổi Xã -> Geocode
    const selectWard = document.getElementById('modal-select-ward');
    selectWard?.addEventListener('change', () => {
      handleForwardGeocode();
    });

  } catch (err) {
    console.warn('[Profile] Không thể nạp tỉnh thành:', err);
  }
}

async function preselectAddressDivisions(provName, distName, wardName) {
  const selectProvince = document.getElementById('modal-select-province');
  const selectDistrict = document.getElementById('modal-select-district');
  const selectWard = document.getElementById('modal-select-ward');

  if (!selectProvince || !provName) return;

  // Tìm tỉnh theo tên
  const provOption = Array.from(selectProvince.options).find(opt => opt.dataset.name === provName);
  if (provOption) {
    selectProvince.value = provOption.value;

    const districts = await provincesApi.getDistricts(provOption.value);
    if (selectDistrict) {
      selectDistrict.replaceChildren();
      selectDistrict.appendChild(new Option('-- Chọn Quận / Huyện --', ''));
      districts.forEach(d => {
        const opt = new Option(d.name, d.code);
        opt.dataset.name = d.name;
        selectDistrict.appendChild(opt);
      });
      selectDistrict.disabled = false;

      // Tìm huyện theo tên
      const distOption = Array.from(selectDistrict.options).find(opt => opt.dataset.name === distName);
      if (distOption) {
        selectDistrict.value = distOption.value;

        const wards = await provincesApi.getWards(distOption.value);
        if (selectWard) {
          selectWard.replaceChildren();
          selectWard.appendChild(new Option('-- Chọn Phường / Xã --', ''));
          wards.forEach(w => {
            const opt = new Option(w.name, w.code);
            opt.dataset.name = w.name;
            selectWard.appendChild(opt);
          });
          selectWard.disabled = false;

          // Tìm xã theo tên
          const wardOption = Array.from(selectWard.options).find(opt => opt.dataset.name === wardName);
          if (wardOption) {
            selectWard.value = wardOption.value;
          }
        }
      }
    }
  }
}

async function handleForwardGeocode() {
  const inputAddress = document.getElementById('modal-input-address');
  const selectProvince = document.getElementById('modal-select-province');
  const selectDistrict = document.getElementById('modal-select-district');
  const selectWard = document.getElementById('modal-select-ward');
  const geocodeStatus = document.getElementById('modal-geocode-status');

  const addrVal = (inputAddress ? inputAddress.value : '').trim();

  // 1. Nhận diện trực tiếp nếu người dùng dán hoặc gõ thẳng Tọa độ GPS (ví dụ: 21.34654, 105.47279)
  const coordMatch = addrVal.match(/(?:@)?([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
      modalCoordinates = { lat, lng };
      updateCoordsDisplay(lat, lng);
      if (mapPickerInstance) {
        mapPickerInstance.panToLocation(lat, lng, 17);
      }
      if (geocodeStatus) {
        geocodeStatus.textContent = `✓ Đã ghim theo tọa độ GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
      }
      return;
    }
  }

  // 2. Bóc tách tên địa giới hành chính một cách an toàn
  const getOptionName = (sel) => {
    if (!sel || sel.selectedIndex <= 0) return '';
    const opt = sel.options[sel.selectedIndex];
    const val = opt?.dataset?.name || opt?.text?.trim() || '';
    if (val.startsWith('--') || val.includes('Chọn')) return '';
    return val;
  };

  const provText = getOptionName(selectProvince);
  const distText = getOptionName(selectDistrict);
  const wardText = getOptionName(selectWard);

  const fullQueryParts = [addrVal, wardText, distText, provText].filter(Boolean);
  if (fullQueryParts.length === 0) return;

  const searchQuery = fullQueryParts.join(', ');

  try {
    if (geocodeStatus) geocodeStatus.textContent = 'Đang tìm kiếm vị trí...';
    const candidates = await deliveryApi.geocodeAddress(searchQuery);

    if (candidates && candidates.length > 0) {
      const best = candidates[0];
      modalCoordinates = { lat: best.lat, lng: best.lng };
      updateCoordsDisplay(best.lat, best.lng);

      if (mapPickerInstance) {
        mapPickerInstance.panToLocation(best.lat, best.lng, best.isFallback ? 15 : 16);
      }

      if (geocodeStatus) {
        if (best.isFallback && best.landmarkHint) {
          geocodeStatus.textContent = `📍 Định vị theo: "${best.address}". Kéo thả ghim đỏ để đặt chính xác vị trí nhận tôn.`;
        } else {
          geocodeStatus.textContent = `✓ Đã tự động ghim vị trí: ${best.address}`;
        }
      }
    } else {
      if (geocodeStatus) geocodeStatus.textContent = 'Kéo thả ghim đỏ để định vị chính xác';
    }
  } catch (err) {
    console.warn('[Profile] Geocoding lỗi:', err);
    if (geocodeStatus) geocodeStatus.textContent = 'Kéo thả ghim đỏ để định vị chính xác';
  }
}

/* ==========================================================================
   7. LƯU, XÓA & THIẾT LẬP MẶC ĐỊNH ĐỊA CHỈ
   ========================================================================== */

async function handleSaveAddress() {
  const inputAddress = document.getElementById('modal-input-address');
  const selectProvince = document.getElementById('modal-select-province');
  const selectDistrict = document.getElementById('modal-select-district');
  const selectWard = document.getElementById('modal-select-ward');
  const checkboxDefault = document.getElementById('modal-checkbox-default');
  const btnSave = document.getElementById('btn-save-address-modal');

  const address = (inputAddress ? inputAddress.value : '').trim();
  const province = selectProvince?.selectedOptions[0]?.dataset.name || '';
  const district = selectDistrict?.selectedOptions[0]?.dataset.name || '';
  const ward = selectWard?.selectedOptions[0]?.dataset.name || '';
  const isDefault = Boolean(checkboxDefault?.checked);

  if (!address) {
    toast.warning('Vui lòng nhập địa chỉ nhận hàng cụ thể.');
    return;
  }

  // Tự động tìm kiếm tọa độ nếu người dùng bấm Lưu ngay khi chưa kịp chờ debounce
  if ((!modalCoordinates.lat || !modalCoordinates.lng) && address) {
    await handleForwardGeocode();
  }

  const payload = {
    address,
    province,
    district,
    ward,
    latitude: modalCoordinates.lat,
    longitude: modalCoordinates.lng,
    isDefault
  };

  try {
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Đang lưu...';
    }

    if (editingAddressId) {
      await userApi.updateAddress(editingAddressId, payload);
      toast.success('Cập nhật địa chỉ nhận hàng thành công!');
    } else {
      await userApi.createAddress(payload);
      toast.success('Thêm địa chỉ nhận hàng mới thành công!');
    }

    // Đóng modal & nạp lại danh sách
    const modalOverlay = document.getElementById('address-modal-overlay');
    modalOverlay?.classList.remove('modal-overlay--open');
    await loadAddresses();
  } catch (err) {
    console.error('[Profile] Lỗi lưu địa chỉ:', err);
    toast.error(err.message || 'Không thể lưu địa chỉ nhận hàng. Vui lòng thử lại.');
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = 'Lưu Địa Chỉ';
    }
  }
}

async function handleDeleteAddress(addr) {
  const addressId = addr.addressId || addr.id;
  if (!addressId) {
    toast.error('Không tìm thấy mã định danh của địa chỉ cần xóa.');
    return;
  }

  const addressLabel = addr.address ? `"${addr.address}"` : 'địa chỉ này';

  showConfirmModal({
    modalId: 'hmp-delete-address-modal',
    title: 'Xác Nhận Xóa Địa Chỉ',
    message: `Bạn có chắc chắn muốn xóa ${addressLabel} khỏi sổ địa chỉ không? Thao tác này sẽ xóa địa chỉ và không thể hoàn tác.`,
    confirmText: 'Xóa địa chỉ',
    cancelText: 'Bỏ qua',
    type: 'danger',
    iconSvg: `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `,
    onConfirm: async () => {
      try {
        await userApi.deleteAddress(addressId);
        toast.success('Đã xóa địa chỉ thành công.');
        await loadAddresses();
      } catch (err) {
        console.error('[Profile] Lỗi xóa địa chỉ:', err);
        toast.error(err.message || 'Không thể xóa địa chỉ. Vui lòng thử lại.');
      }
    }
  });
}

async function handleSetDefaultAddress(addr) {
  try {
    const payload = {
      address: addr.address,
      province: addr.province,
      district: addr.district,
      ward: addr.ward,
      latitude: addr.latitude,
      longitude: addr.longitude,
      isDefault: true
    };
    await userApi.updateAddress(addr.addressId, payload);
    toast.success('Đã thiết lập làm địa chỉ mặc định!');
    await loadAddresses();
  } catch (err) {
    console.error('[Profile] Lỗi đặt mặc định:', err);
    toast.error(err.message || 'Không thể thiết lập địa chỉ mặc định.');
  }
}
