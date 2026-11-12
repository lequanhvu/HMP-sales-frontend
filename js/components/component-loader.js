/**
 * component-loader.js — Trình nạp và nhúng linh hoạt các thành phần dùng chung (Header, Footer, Sidebar)
 * 
 * Tính năng:
 * - Tự động tính toán tiền tố đường dẫn tương đối (rootPrefix) theo cấp thư mục của trang hiện tại.
 * - Tự động tải file HTML component từ /pages/components/ và nhúng vào DOM.
 * - Tự động hiệu chỉnh toàn bộ đường link (href, src) sao cho hoạt động chính xác từ bất kỳ thư mục nào.
 * - Tự động nhận diện và kích hoạt trạng thái điều hướng (.nav__link--active) theo trang đang xem.
 * - Tự động khởi tạo logic điều khiển tương ứng (initHeader cho menu, đăng nhập, dropdown danh mục).
 */

import { initHeader } from './header.js';
import { initFooter } from './footer.js';
import { initCustomerSidebar } from './sidebar.js';

/**
 * Đảm bảo file CSS của component đã được liên kết trong thẻ <head>
 * Nếu trang chưa nhúng file CSS tương ứng, hàm sẽ tự động chèn thêm vào <head>
 * 
 * @param {string} href - Đường dẫn tương đối của file CSS
 */
function ensureStylesheet(href) {
  const existing = document.querySelector(`link[href="${href}"]`);
  if (!existing) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Tính toán tiền tố đường dẫn quay về thư mục gốc của dự án frontend
 * Ví dụ:
 * - /index.html                         -> ./
 * - /pages/product/catalog.html         -> ../../
 * - /pages/customer/my-orders.html      -> ../../
 * - /pages/about.html                   -> ../
 * 
 * @returns {string} Tiền tố đường dẫn tương đối (ví dụ: './' hoặc '../../')
 */
export function getRootPrefix() {
  const path = window.location.pathname.replace(/\\/g, '/');
  
  if (path.includes('/pages/product/') || path.includes('/pages/customer/') || path.includes('/pages/admin/') || path.includes('/pages/auth/')) {
    return '../../';
  } else if (path.includes('/pages/')) {
    return '../';
  }
  return './';
}

/**
 * Hiệu chỉnh các liên kết tương đối bắt đầu bằng './' trong HTML component theo tiền tố của trang
 * 
 * @param {string} htmlText - Chuỗi HTML của component
 * @param {string} prefix - Tiền tố tương đối (ví dụ: '../../')
 * @returns {string} Chuỗi HTML đã được điều chỉnh liên kết
 */
function adjustComponentUrls(htmlText, prefix) {
  if (prefix === './') {
    return htmlText;
  }
  
  // Thay thế các đường dẫn href="./ và src="./ bằng tiền tố prefix tương ứng
  return htmlText
    .replace(/href="\.\//g, `href="${prefix}`)
    .replace(/src="\.\//g, `src="${prefix}`);
}

/**
 * Đánh dấu trạng thái active cho thanh điều hướng Header dựa theo URL hiện tại
 * 
 * @param {HTMLElement} headerEl - Phần tử header trong DOM
 */
function highlightActiveNav(headerEl) {
  if (!headerEl) return;

  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  // Xóa mọi active cũ
  headerEl.querySelectorAll('.nav__link, .mobile-nav__link').forEach(link => {
    link.classList.remove('nav__link--active', 'mobile-nav__link--active');
  });

  let activeNavKey = 'home';

  if (path.includes('catalog.html') || path.includes('detail.html') || path.includes('/product/')) {
    activeNavKey = 'product';
  } else if (hash === '#about-section') {
    activeNavKey = 'about';
  } else if (hash === '#contact-section') {
    activeNavKey = 'contact';
  } else if (path.endsWith('index.html') || path.endsWith('/') || path.endsWith('/sales-frontend')) {
    activeNavKey = 'home';
  }

  // Gán class active cho mục menu tương ứng
  const targetDesktopLink = headerEl.querySelector(`.nav__link[data-nav="${activeNavKey}"]`);
  if (targetDesktopLink) {
    targetDesktopLink.classList.add('nav__link--active');
  }

  const targetMobileLink = headerEl.querySelector(`.mobile-nav__link[data-nav="${activeNavKey}"]`);
  if (targetMobileLink) {
    targetMobileLink.classList.add('mobile-nav__link--active');
  }
}

/**
 * Nhúng Header vào phần tử mục tiêu (container)
 * 
 * @param {string} targetSelector - Selector phần tử chứa (mặc định '#site-header' hoặc '[data-component="header"]')
 * @param {string} [customComponentPath] - Đường dẫn tùy chỉnh tới file header (mặc định dùng common/header.html)
 */
export async function loadHeader(targetSelector = '#site-header', customComponentPath = null) {
  const container = document.querySelector(targetSelector)
    || document.querySelector('[data-component="header"]')
    || document.querySelector('header.header');
  if (!container) return;

  const prefix = getRootPrefix();
  // 1. Tự động bảo đảm CSS Header được nạp (kèm cache-buster)
  ensureStylesheet(`${prefix}assets/css/components/header.css`);

  const componentUrl = customComponentPath || `${prefix}pages/components/common/header.html`;
  const fetchUrl = `${componentUrl}?_v=${Date.now()}`;

  try {
    const res = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) {
      console.warn(`[ComponentLoader] Không thể tải header từ: ${componentUrl}`);
      return;
    }

    const rawHtml = await res.text();
    const adjustedHtml = adjustComponentUrls(rawHtml, prefix);

    // Chèn HTML vào container
    const parser = new DOMParser();
    const doc = parser.parseFromString(adjustedHtml, 'text/html');
    const headerNode = doc.body.firstElementChild;

    if (headerNode) {
      container.replaceWith(headerNode);
      highlightActiveNav(headerNode);
      
      // Lắng nghe sự kiện hashchange để cập nhật trạng thái khi người dùng click vào #about-section hoặc #contact-section
      window.addEventListener('hashchange', () => {
        const currentHeader = document.querySelector('.header');
        if (currentHeader) highlightActiveNav(currentHeader);
      });

      // Khởi tạo các sự kiện Header: menu mobile, kiểm tra đăng nhập, nạp dropdown danh mục từ BE
      initHeader();
    }
  } catch (err) {
    console.error('[ComponentLoader] Lỗi khi nhúng Header component:', err);
  }
}

/**
 * Nhúng Footer vào phần tử mục tiêu (container)
 * 
 * @param {string} targetSelector - Selector phần tử chứa (mặc định '#site-footer' hoặc '[data-component="footer"]')
 * @param {string} [customComponentPath] - Đường dẫn tùy chỉnh tới file footer (mặc định dùng common/footer.html)
 */
export async function loadFooter(targetSelector = '#site-footer', customComponentPath = null) {
  const container = document.querySelector(targetSelector)
    || document.querySelector('[data-component="footer"]');
  if (!container) {
    if (document.querySelector('footer.footer')) {
      initFooter();
    }
    return;
  }

  const prefix = getRootPrefix();
  // 1. Tự động bảo đảm CSS Footer được nạp
  ensureStylesheet(`${prefix}assets/css/components/footer.css`);

  const componentUrl = customComponentPath || `${prefix}pages/components/common/footer.html`;
  const fetchUrl = `${componentUrl}?_v=${Date.now()}`;

  try {
    const res = await fetch(fetchUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) {
      console.warn(`[ComponentLoader] Không thể tải footer từ: ${componentUrl}`);
      return;
    }

    const rawHtml = await res.text();
    const adjustedHtml = adjustComponentUrls(rawHtml, prefix);

    const parser = new DOMParser();
    const doc = parser.parseFromString(adjustedHtml, 'text/html');
    const footerNode = doc.body.firstElementChild;

    if (footerNode) {
      container.replaceWith(footerNode);
      // Khởi tạo các sự kiện / cập nhật năm của Footer
      initFooter();
    }
  } catch (err) {
    console.error('[ComponentLoader] Lỗi khi nhúng Footer component:', err);
  }
}

/**
 * Nhúng Sidebar theo vai trò (Customer / Admin) vào phần tử mục tiêu
 * 
 * @param {'customer'|'admin'} [role='customer'] - Vai trò của sidebar cần nạp
 * @param {string} [targetSelector='#site-sidebar'] - Selector phần tử chứa
 */
export async function loadSidebar(role = 'customer', targetSelector = '#site-sidebar') {
  const container = document.querySelector(targetSelector) || document.querySelector('[data-component="sidebar"]');
  if (!container) return;

  const prefix = getRootPrefix();
  // 1. Tự động bảo đảm CSS Sidebar được nạp
  ensureStylesheet(`${prefix}assets/css/components/sidebar.css`);

  const componentUrl = `${prefix}pages/components/${role}/sidebar.html`;

  try {
    const res = await fetch(componentUrl);
    if (!res.ok) {
      console.warn(`[ComponentLoader] Không thể tải sidebar từ: ${componentUrl}`);
      return;
    }

    const rawHtml = await res.text();
    const adjustedHtml = adjustComponentUrls(rawHtml, prefix);

    const parser = new DOMParser();
    const doc = parser.parseFromString(adjustedHtml, 'text/html');
    const sidebarNode = doc.body.firstElementChild;

    if (sidebarNode) {
      container.replaceWith(sidebarNode);

      // Kích hoạt logic sidebar tương ứng
      if (role === 'customer') {
        initCustomerSidebar();
      }
    }
  } catch (err) {
    console.error('[ComponentLoader] Lỗi khi nhúng Sidebar component:', err);
  }
}

/**
 * Khởi tạo toàn bộ layout dùng chung (Header + Footer) trong một lệnh duy nhất
 * 
 * @returns {Promise<void>}
 */
export async function initCommonLayout() {
  await Promise.all([
    loadHeader(),
    loadFooter()
  ]);
}
