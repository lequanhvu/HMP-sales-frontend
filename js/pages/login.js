/**
 * login.js — Điều khiển logic trang Đăng nhập Google (HMP)
 */

import { authState } from '../auth/auth.state.js';
import { authApi } from '../api/auth.api.js';
import { getSafeRedirectUrl } from '../auth/redirect-validator.js';
import { toast } from '../components/toast.js';
import { translateMessage } from '../utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Lấy tham số redirect từ URL và chuẩn hóa an toàn
  const urlParams = new URLSearchParams(window.location.search);
  const rawRedirect = urlParams.get('redirect');
  const safeRedirectUrl = getSafeRedirectUrl(rawRedirect, '../../index.html');

  // 2. Khởi tạo ngay công cụ Dev và Google Sign-In (gắn listener ngay, không đợi async)
  initDevConfig(safeRedirectUrl);
  initGoogleAuth(safeRedirectUrl);

  // 3. Nếu người dùng đã đăng nhập từ trước, lập tức chuyển hướng an toàn
  if (authState.isAuthenticated()) {
    toast.info('Bạn đã đăng nhập hệ thống.');
    setTimeout(() => {
      window.location.href = safeRedirectUrl;
    }, 600);
    return;
  }

  // 5. Nếu có cờ session, thử bootstrap trước
  if (authState.hasSessionIndicator()) {
    try {
      const restoredToken = await authState.restoreSession();
      if (restoredToken) {
        toast.success('Đã khôi phục phiên đăng nhập trước đó.');
        setTimeout(() => {
          window.location.href = safeRedirectUrl;
        }, 600);
        return;
      }
    } catch {
      // Tiếp tục luồng đăng nhập bình thường
    }
  }
});

/**
 * Hiển thị thông báo cảnh báo lỗi trên form bằng thẻ template (chống XSS)
 */
function showAlert(message) {
  const container = document.getElementById('auth-alert-container');
  const template = document.getElementById('auth-alert-template');
  if (!container || !template) return;

  const clone = template.content.cloneNode(true);
  const msgEl = clone.querySelector('.auth-alert__message');
  const closeBtn = clone.querySelector('.auth-alert__close');

  if (msgEl) msgEl.textContent = message;
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      container.classList.add('hidden');
      container.replaceChildren();
    });
  }

  container.replaceChildren(clone);
  container.classList.remove('hidden');
}

/**
 * Khởi tạo Google Identity Services SDK
 */
function initGoogleAuth(safeRedirectUrl) {
  const clientId = authApi.getGoogleClientId();
  const isPlaceholder = !clientId || clientId.includes('placeholder');

  if (isPlaceholder) {
    showAlert('Chưa cấu hình Google Client ID chính thức từ Google Cloud Console. Vui lòng mở rộng mục "Thiết lập Client ID" bên dưới để nhập Client ID, hoặc bấm nút "⚡ Đăng nhập Thử nghiệm" để kiểm tra hệ thống ngay!');
    const devPanel = document.getElementById('dev-config-panel');
    if (devPanel) devPanel.classList.remove('hidden');
    return;
  }

  // Đợi GIS SDK tải xong
  const checkGisInterval = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(checkGisInterval);
      setupGis(clientId, safeRedirectUrl);
    }
  }, 100);

  // Timeout sau 6 giây nếu không tải được GIS SDK
  setTimeout(() => {
    clearInterval(checkGisInterval);
    if (!window.google || !window.google.accounts) {
      console.warn('[Login] Không thể tải Google Identity Services SDK.');
      showAlert('Không thể tải Google Identity SDK. Vui lòng kiểm tra kết nối mạng hoặc thử tắt trình chặn quảng cáo.');
    }
  }, 6000);
}

/**
 * Thiết lập cấu hình và render duy nhất 1 nút Google Sign-In chính thức
 */
function setupGis(clientId, safeRedirectUrl) {
  const gisContainer = document.getElementById('g_id_signin_container');
  if (!gisContainer) return;

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => handleCredentialResponse(response, safeRedirectUrl),
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true
    });

    gisContainer.replaceChildren();
    window.google.accounts.id.renderButton(gisContainer, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: 360,
      locale: 'vi'
    });

    // Sau 2.5 giây kiểm tra xem Google iframe có nạp được không (phát hiện lỗi Origin)
    setTimeout(() => {
      const hasIframe = gisContainer.querySelector('iframe');
      if (!hasIframe) {
        console.warn('[Login] Nút Google chính thức không render được iframe.');
        showAlert(`Lưu ý: Nút Google chưa hiển thị được. Hãy đảm bảo bạn đã thêm "${window.location.origin}" vào Authorized JavaScript origins trong Google Cloud Console.`);
      }
    }, 2500);
  } catch (err) {
    console.error('[Login] Lỗi khi khởi tạo Google GIS:', err);
    showAlert('Lỗi khởi tạo đăng nhập Google: ' + err.message);
  }
}

/**
 * Xử lý sau khi người dùng chọn tài khoản Google thành công
 */
async function handleCredentialResponse(response, safeRedirectUrl) {
  if (!response || !response.credential) {
    showAlert('Không nhận được thông tin xác thực từ Google. Vui lòng thử lại.');
    return;
  }

  toast.info('Đang xác thực tài khoản Google...', 'Đang xử lý');

  try {
    // 1. Gửi Google ID Token lên backend POST /api/v1/auth/google
    const authResult = await authApi.loginWithGoogle(response.credential);

    if (!authResult || !authResult.accessToken) {
      throw new Error('Máy chủ không trả về mã truy cập hợp lệ.');
    }

    // Tạm thời lưu token vào memory để gọi tiếp /api/v1/me
    authState.setAccessToken(authResult.accessToken);

    // 2. Lấy thông tin hồ sơ người dùng đầy đủ (kèm role) từ GET /api/v1/me
    let userProfile = null;
    try {
      userProfile = await authApi.getMe();
    } catch (profileErr) {
      console.warn('[Login] Không thể lấy hồ sơ người dùng sau khi login:', profileErr);
      userProfile = { fullName: 'Khách hàng', role: 'CUSTOMER' };
    }

    // 3. Đánh dấu đăng nhập thành công vào Auth State
    authState.handleLoginSuccess(authResult.accessToken, userProfile);

    // 4. Thông báo và điều hướng an toàn
    const welcomeName = userProfile.fullName || userProfile.email || 'bạn';
    toast.success(`Chào mừng ${welcomeName} quay trở lại!`, 'Đăng nhập thành công');

    setTimeout(() => {
      window.location.href = safeRedirectUrl;
    }, 700);
  } catch (error) {
    console.error('[Login] Lỗi xác thực với máy chủ:', error);
    const translatedMsg = translateMessage(error.message || 'Đăng nhập thất bại.');
    showAlert(translatedMsg);
    toast.error(translatedMsg, 'Đăng nhập thất bại');

    // Thu hồi trạng thái khi gặp lỗi
    authState.clearAuth();
  }
}

/**
 * Hỗ trợ công cụ thiết lập Client ID và Đăng nhập thử nghiệm cho môi trường Dev/Local
 */
function initDevConfig(safeRedirectUrl) {
  const toggleBtn = document.getElementById('dev-config-toggle');
  const panel = document.getElementById('dev-config-panel');
  const input = document.getElementById('dev-client-id-input');
  const saveBtn = document.getElementById('dev-save-btn');
  const mockBtn = document.getElementById('dev-mock-login-btn');
  const currentOriginEl = document.getElementById('dev-current-origin');

  if (!toggleBtn || !panel || !input || !saveBtn) return;

  // Cập nhật hiển thị domain hiện tại để người dùng copy vào Google Cloud Console
  if (currentOriginEl) {
    currentOriginEl.textContent = window.location.origin;
  }

  const currentClientId = authApi.getGoogleClientId();
  // Nếu không phải placeholder, điền sẵn vào ô input
  if (!currentClientId.includes('placeholder')) {
    input.value = currentClientId;
  }

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    toggleBtn.classList.toggle('auth-card__dev-toggle--open');
  });

  const saveAction = () => {
    const rawVal = input.value.trim().replace(/^['"]|['"]$/g, '');
    if (!rawVal) {
      toast.error('Vui lòng nhập Google Client ID.', 'Chưa nhập ID');
      input.focus();
      return;
    }

    if (!rawVal.endsWith('.apps.googleusercontent.com')) {
      toast.warning('Google Client ID thường có định dạng kết thúc bằng .apps.googleusercontent.com', 'Lưu ý');
    }

    authApi.setGoogleClientId(rawVal);
    toast.success('Đã lưu Google Client ID mới. Đang tải lại trang...', 'Cập nhật thành công');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  saveBtn.addEventListener('click', saveAction);

  // Nhấn Enter trong ô input cũng tự động lưu
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAction();
    }
  });

  // Xử lý nút Đăng nhập Thử nghiệm (Dev Mock Login)
  if (mockBtn) {
    mockBtn.addEventListener('click', () => {
      const mockUser = {
        userId: 1,
        fullName: 'Nguyễn Văn A',
        email: 'khachhang@gmail.com',
        phone: '0987654321',
        role: 'CUSTOMER',
        status: 'ACTIVE'
      };
      const mockToken = 'mock-jwt-token-hmp-dev-environment';

      authState.handleLoginSuccess(mockToken, mockUser);
      toast.success('Đăng nhập thử nghiệm thành công! Chào mừng ' + mockUser.fullName, 'Dev Mode');

      setTimeout(() => {
        window.location.href = safeRedirectUrl || '../../index.html';
      }, 700);
    });
  }
}
