/**
 * product-detail.js — Script điều khiển Trang Chi Tiết Sản Phẩm Tôn Sóng
 * 
 * Nghiệp vụ:
 * - Clean Code: Tách biệt hoàn toàn HTML, CSS và JavaScript
 * - Tuyệt đối không dùng inline style="..." hoặc gán .innerHTML chuỗi thô
 * - Sử dụng thẻ <template> và DOM API (replaceChildren, classList, createElement)
 * - Kiểm soát quyền xem giá (PRODUCT_PRICE_VIEW): thiếu quyền thì hiển thị thông báo, không lộ giá
 * - Bảng giá: hàng ngang là đơn vị tính, hàng dọc là biến thể sản phẩm
 * - Bảng màu: tập hợp màu sắc của toàn bộ biến thể
 * - Thông số kỹ thuật: độ dày, khổ rộng, loại sóng, mã biến thể theo biến thể đang chọn
 * - Tự động fallback ảnh hỏng/thiếu về empty-picture.png
 */

import { initCommonLayout } from '../components/component-loader.js';
import { getProductDetail, getActiveColors } from '../api/product.api.js';
import { cartApi } from '../api/cart.api.js';
import { authState } from '../auth/auth.state.js';
import { storage } from '../utils/storage.js';
import { toast } from '../components/toast.js';
import { formatVnd } from '../utils/format.js';

// Trạng thái cục bộ của trang
let productData = null;
let selectedVariant = null;
let selectedColor = null;
// Bản đồ tên màu -> URL ảnh mẫu màu (lấy từ dữ liệu danh mục màu chung)
let colorImageMap = new Map();
let activeColorsList = [];

const DEFAULT_EMPTY_IMAGE = '../../assets/images/empty-picture.png';
const NO_PRICE_PERMISSION_MESSAGE = 'Bạn không có quyền xem giá sản phẩm';
const NO_COLOR_MESSAGE = 'Sản phẩm không có thông tin về màu sắc';
const EMPTY_VALUE = '—';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer từ Component dùng chung
  await initCommonLayout();

  // 2. Khởi tạo xử lý chuyển Tab và nút hành động
  initTabs();
  initActions();

  // 3. Lấy productId từ query param và tải dữ liệu
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError('Không tìm thấy mã sản phẩm trong đường dẫn.');
    return;
  }

  window.addEventListener('resize', () => {
    if (productData) renderBreadcrumb(productData);
  });

  await loadProductDetail(productId);
});

/**
 * Tải chi tiết sản phẩm từ API Backend (song song với danh mục màu để lấy ảnh mẫu màu)
 * 
 * @param {string|number} productId - ID sản phẩm
 */
async function loadProductDetail(productId) {
  const loadingEl = document.getElementById('product-loading-state');
  const errorEl = document.getElementById('product-error-state');
  const detailCardEl = document.getElementById('product-detail-card');

  try {
    const [response, colorMap] = await Promise.all([
      getProductDetail(productId),
      loadColorImageMap()
    ]);
    productData = response;
    colorImageMap = colorMap;

    if (!productData) {
      showError('Không tìm thấy thông tin sản phẩm.');
      return;
    }

    // Ẩn loading, hiển thị khung chi tiết qua class CSS
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (detailCardEl) detailCardEl.classList.remove('hidden');

    // Render toàn bộ giao diện sản phẩm bằng DOM API
    renderProductHeader(productData);
    renderDynamicFormFields(productData.productType);
    renderGallery(productData.images || []);
    renderVariants(productData.variants || []);
    renderDescription(productData);
    renderPriceTable(productData);
    renderColorPalette(productData.variants || []);

  } catch (error) {
    console.error('Lỗi khi tải chi tiết sản phẩm:', error);
    showError(error.message || 'Không thể kết nối đến máy chủ.');
  }
}

/**
 * Nạp danh mục màu chung để ghép ảnh mẫu màu theo tên màu.
 * Lỗi mạng không làm hỏng trang: chỉ thiếu ảnh mẫu màu (hiển thị chấm màu thay thế).
 *
 * @returns {Promise<Map<string, string>>} Bản đồ tên màu (chữ thường) -> URL ảnh mẫu
 */
async function loadColorImageMap() {
  const map = new Map();
  try {
    const colors = await getActiveColors();
    if (Array.isArray(colors)) {
      activeColorsList = colors;
      colors.forEach(color => {
        if (color && color.colorName && color.imageUrl) {
          const key = normalizeColorKey(color.colorName);
          const isDummy = color.imageUrl.includes('example.com');
          // Ưu tiên URL thật, không để dummy URL (cdn.example.com) ghi đè lên URL ảnh thật
          if (!map.has(key) || (map.get(key).includes('example.com') && !isDummy)) {
            map.set(key, color.imageUrl);
          }
        }
      });
    }
  } catch (err) {
    console.warn('Không thể nạp ảnh mẫu màu:', err);
  }
  return map;
}

/**
 * Hiển thị/ẩn các nhóm trường nhập liệu đặt hàng theo loại sản phẩm (ProductType).
 * Quy tắc:
 * - UNKNOWN hoặc không có: Hiển thị TẤT CẢ các trường (chiều dài/kích thước, quy cách chấn bẻ, số lượng).
 * - ROOFING_SHEET: Hiện chiều dài, số lượng; ẩn quy cách bẻ chấn.
 * - GUTTER / GABLE_FLASHING / RIDGE_CAP: Hiện chiều dài, quy cách bẻ chấn, số lượng.
 * - RETAIL: Ẩn chiều dài và quy cách bẻ chấn; chỉ hiện số lượng.
 *
 * @param {object|null} productType - Thông tin loại sản phẩm
 */
function renderDynamicFormFields(productType) {
  const groupSize = document.getElementById('group-product-size');
  const groupDimensions = document.getElementById('group-product-dimensions');
  const groupQuantity = document.getElementById('group-product-quantity');
  const hintDimensions = document.getElementById('hint-product-dimensions');

  if (!groupSize || !groupDimensions || !groupQuantity) return;

  const code = (productType && productType.code) ? productType.code.toUpperCase() : 'UNKNOWN';

  // Thiết lập mặc định
  groupSize.classList.remove('hidden');
  groupDimensions.classList.remove('hidden');
  groupQuantity.classList.remove('hidden');

  // LẤY PLACEHOLDER ĐỘNG TRỰC TIẾP TỪ DB (productType.note)
  const dbNote = (productType && productType.note) ? productType.note : '';

  const inputSize = document.getElementById('input-product-size');
  if (inputSize) {
    inputSize.placeholder = dbNote || 'VD: 5.5 (mét)';
  }

  const inputDimensions = document.getElementById('input-product-dimensions');
  if (inputDimensions) {
    inputDimensions.placeholder = dbNote || 'VD: Chiều cao thành × Đáy × Mép gập';
  }

  if (hintDimensions && dbNote) {
    hintDimensions.textContent = `(Gợi ý: ${dbNote})`;
  }

  if (code === 'ROOFING_SHEET') {
    groupDimensions.classList.add('hidden');
  } else if (code === 'RETAIL') {
    groupSize.classList.add('hidden');
    groupDimensions.classList.add('hidden');
  }
}

/**
 * Chuẩn hóa tên màu thành khóa tra cứu (bỏ khoảng trắng thừa, không phân biệt hoa thường).
 *
 * @param {string} name - Tên màu
 * @returns {string} Khóa tra cứu
 */
function normalizeColorKey(name) {
  return String(name || '').trim().toLowerCase();
}

/**
 * Định dạng số đo (độ dày, khổ rộng) kèm đơn vị mm; trả về dấu gạch ngang nếu thiếu dữ liệu.
 *
 * @param {number|string|null|undefined} value - Giá trị số đo
 * @returns {string} Chuỗi hiển thị, ví dụ "1070 mm"
 */
function formatMillimeter(value) {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  const num = Number(value);
  if (Number.isNaN(num)) return EMPTY_VALUE;
  return `${num} mm`;
}

/**
 * Hiển thị giao diện báo lỗi
 */
function showError(message) {
  const loadingEl = document.getElementById('product-loading-state');
  const errorEl = document.getElementById('product-error-state');
  const detailCardEl = document.getElementById('product-detail-card');
  const msgEl = document.getElementById('product-error-message');

  if (loadingEl) loadingEl.classList.add('hidden');
  if (detailCardEl) detailCardEl.classList.add('hidden');
  if (errorEl) errorEl.classList.remove('hidden');
  if (msgEl) msgEl.textContent = message;
}

/**
 * Render tiêu đề, thương hiệu, danh mục & breadcrumb
 */
function renderProductHeader(product) {
  document.title = `${product.productName} — HMP Tôn Thép`;

  // Render breadcrumb động bắt đầu từ "Sản phẩm / [Danh mục] / [Tên sản phẩm]"
  renderBreadcrumb(product);

  const titleEl = document.getElementById('product-title');
  const brandTagEl = document.getElementById('product-brand-tag');
  const categoryTextEl = document.getElementById('product-category-text');
  const statusTextEl = document.getElementById('product-status-text');

  if (titleEl) titleEl.textContent = product.productName;
  if (brandTagEl) brandTagEl.textContent = product.brandName || 'Chính Hãng';
  if (categoryTextEl) categoryTextEl.textContent = product.categoryName || 'Tôn sóng lợp mái';
  
  if (statusTextEl) {
    statusTextEl.textContent = product.status === 'ACTIVE' ? 'Sẵn hàng sản xuất' : 'Tạm ngừng nhận đơn';
  }
}

/**
 * Render thanh điều hướng breadcrumb: Bắt đầu từ "Sản phẩm / [Danh mục] / [Tên sản phẩm]".
 * Nếu đường dẫn quá dài hoặc màn hình hẹp, tự động cắt ngắn phần trước thành "... / [Danh mục] / [Tên sản phẩm]".
 */
function renderBreadcrumb(product) {
  const breadcrumbEl = document.getElementById('product-breadcrumb');
  if (!breadcrumbEl || !product) return;

  breadcrumbEl.replaceChildren();

  const categoryName = product.categoryName || 'Sản phẩm tôn';
  const productName = product.productName || 'Chi tiết sản phẩm';
  const categoryLink = product.categoryId ? `./catalog.html?category=${product.categoryId}` : './catalog.html';

  // Cắt ngắn đoạn trước nếu màn hình hẹp dưới 640px hoặc text quá dài (> 40 ký tự)
  const isNarrow = window.innerWidth < 640 || (categoryName.length + productName.length > 40);

  const fragment = document.createDocumentFragment();

  if (isNarrow) {
    // Rút gọn phần đầu thành "..."
    const ellipsisLink = document.createElement('a');
    ellipsisLink.href = './catalog.html';
    ellipsisLink.className = 'breadcrumb__link breadcrumb__link--ellipsis';
    ellipsisLink.textContent = '...';
    ellipsisLink.title = 'Sản phẩm';
    fragment.appendChild(ellipsisLink);
  } else {
    // Phần đầu chuẩn: "Sản phẩm"
    const rootLink = document.createElement('a');
    rootLink.href = './catalog.html';
    rootLink.className = 'breadcrumb__link';
    rootLink.textContent = 'Sản phẩm';
    fragment.appendChild(rootLink);
  }

  // Dấu phân cách 1
  const sep1 = document.createElement('span');
  sep1.className = 'breadcrumb__separator';
  sep1.textContent = '/';
  fragment.appendChild(sep1);

  // Danh mục
  const catLink = document.createElement('a');
  catLink.href = categoryLink;
  catLink.className = 'breadcrumb__link';
  catLink.textContent = categoryName;
  fragment.appendChild(catLink);

  // Dấu phân cách 2
  const sep2 = document.createElement('span');
  sep2.className = 'breadcrumb__separator';
  sep2.textContent = '/';
  fragment.appendChild(sep2);

  // Tên sản phẩm hiện tại
  const currentSpan = document.createElement('span');
  currentSpan.className = 'breadcrumb__current';
  currentSpan.textContent = productName;
  fragment.appendChild(currentSpan);

  breadcrumbEl.appendChild(fragment);
}

/**
 * Render thư viện ảnh sản phẩm qua <template>
 */
function renderGallery(images) {
  const mainImgEl = document.getElementById('gallery-main-img');
  const thumbsListEl = document.getElementById('gallery-thumbs-list');
  const thumbTemplate = document.getElementById('gallery-thumb-template');

  if (!thumbsListEl || !thumbTemplate) return;
  thumbsListEl.replaceChildren();

  if (!images || images.length === 0) {
    if (mainImgEl) {
      mainImgEl.src = DEFAULT_EMPTY_IMAGE;
      mainImgEl.alt = (productData && productData.productName) || 'Ảnh mẫu sản phẩm';
      mainImgEl.classList.remove('hidden');
    }
    return;
  }

  // Sắp xếp ảnh: ảnh primary lên đầu, hoặc theo displayOrder
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  // Hiển thị ảnh chính ban đầu
  const primaryImg = sortedImages[0];
  if (mainImgEl) {
    mainImgEl.src = primaryImg.imageUrl || DEFAULT_EMPTY_IMAGE;
    mainImgEl.alt = productData.productName;
    mainImgEl.classList.remove('hidden');
    mainImgEl.onerror = () => {
      mainImgEl.src = DEFAULT_EMPTY_IMAGE;
    };
  }

  // Render các thumbnail phụ qua <template>
  sortedImages.forEach((imgObj, index) => {
    const clone = thumbTemplate.content.cloneNode(true);
    const thumbBtn = clone.querySelector('.product-gallery__thumb-btn');
    const thumbImg = clone.querySelector('.product-gallery__thumb-img');

    thumbImg.src = imgObj.imageUrl || DEFAULT_EMPTY_IMAGE;
    thumbImg.alt = `${productData.productName} ảnh ${index + 1}`;
    thumbImg.onerror = () => {
      thumbImg.src = DEFAULT_EMPTY_IMAGE;
    };

    if (index === 0) {
      thumbBtn.classList.add('product-gallery__thumb-btn--active');
    }

    thumbBtn.addEventListener('click', () => {
      if (mainImgEl) mainImgEl.src = imgObj.imageUrl || DEFAULT_EMPTY_IMAGE;

      thumbsListEl.querySelectorAll('.product-gallery__thumb-btn').forEach(btn => {
        btn.classList.remove('product-gallery__thumb-btn--active');
      });
      thumbBtn.classList.add('product-gallery__thumb-btn--active');
    });

    thumbsListEl.appendChild(clone);
  });
}

/**
 * Render danh sách biến thể (Độ dày, loại sóng) qua <template>
 */
function renderVariants(variants) {
  const variantsListEl = document.getElementById('product-variants-list');
  const variantTemplate = document.getElementById('variant-pill-template');

  if (!variantsListEl || !variantTemplate) return;
  variantsListEl.replaceChildren();

  if (!variants || variants.length === 0) {
    const note = document.createElement('span');
    note.className = 'product-option-group__note';
    note.textContent = 'Quy cách chuẩn mặc định';
    variantsListEl.appendChild(note);
    selectedVariant = null;
    renderVariantSpecs(null);
    renderColors([]);
    updatePriceAndTotal();
    return;
  }

  variants.forEach((variant, index) => {
    const clone = variantTemplate.content.cloneNode(true);
    const btn = clone.querySelector('.variant-btn');
    const titleEl = clone.querySelector('.variant-btn__title');
    const subTitleEl = clone.querySelector('.variant-btn__subtitle');

    titleEl.textContent = variant.thickness ? `${variant.thickness} mm` : (variant.variantName || 'Quy cách');
    subTitleEl.textContent = variant.typeValue || variant.variantCode || 'Tiêu chuẩn';

    if (index === 0) {
      btn.classList.add('variant-btn--active');
      selectedVariant = variant;
    }

    btn.addEventListener('click', () => {
      variantsListEl.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('variant-btn--active'));
      btn.classList.add('variant-btn--active');

      selectedVariant = variant;
      onVariantChanged(variant);
    });

    variantsListEl.appendChild(clone);
  });

  if (selectedVariant) {
    onVariantChanged(selectedVariant);
  }
}

/**
 * Khi người dùng thay đổi biến thể được chọn
 */
function onVariantChanged(variant) {
  renderVariantSpecs(variant);
  renderColors(variant.colors || []);
  updatePriceAndTotal();
}

/**
 * Cập nhật mục "Thông số kỹ thuật" theo biến thể đang chọn (độ dày, khổ rộng, loại sóng, mã biến thể).
 *
 * @param {Object|null} variant - Biến thể đang chọn (null nếu sản phẩm chưa có biến thể)
 */
function renderVariantSpecs(variant) {
  const specThickness = document.getElementById('spec-thickness');
  const specWidth = document.getElementById('spec-width');
  const specTypeValue = document.getElementById('spec-type-value');
  const specVariantCode = document.getElementById('spec-variant-code');

  if (specThickness) specThickness.textContent = variant ? formatMillimeter(variant.thickness) : EMPTY_VALUE;
  if (specWidth) specWidth.textContent = variant ? formatMillimeter(variant.width) : EMPTY_VALUE;
  if (specTypeValue) specTypeValue.textContent = variant && variant.typeValue ? variant.typeValue : EMPTY_VALUE;
  if (specVariantCode) specVariantCode.textContent = variant && variant.variantCode ? variant.variantCode : EMPTY_VALUE;
}

/**
 * Render danh sách màu sắc tôn qua <template>
 */
function renderColors(colors) {
  const colorsListEl = document.getElementById('product-colors-list');
  const colorTemplate = document.getElementById('color-swatch-template');
  const selectedColorNameEl = document.getElementById('selected-color-name');

  if (!colorsListEl || !colorTemplate) return;
  colorsListEl.replaceChildren();

  if (!colors || colors.length === 0) {
    const note = document.createElement('span');
    note.className = 'product-option-group__note';
    note.textContent = 'Màu tôn tự nhiên / Theo đơn hàng';
    colorsListEl.appendChild(note);
    selectedColor = 'Mặc định';
    if (selectedColorNameEl) selectedColorNameEl.textContent = '';
    return;
  }

  colors.forEach((colorItem, index) => {
    const clone = colorTemplate.content.cloneNode(true);
    const btn = clone.querySelector('.color-swatch-btn');
    const nameEl = clone.querySelector('.color-swatch-btn__name');
    const thumbEl = clone.querySelector('.color-swatch-btn__thumb');
    const dotEl = clone.querySelector('.color-swatch-btn__dot');

    const colorName = typeof colorItem === 'string' ? colorItem : colorItem.colorName;
    const imageUrl = resolveColorImage(colorItem);

    nameEl.textContent = colorName;

    // Hiển thị ảnh mẫu màu hoặc chấm tròn màu (tự động fallback nếu ảnh lỗi)
    if (imageUrl) {
      thumbEl.src = imageUrl;
      thumbEl.alt = colorName;
      thumbEl.classList.remove('hidden');
      dotEl.classList.add('hidden');
      thumbEl.onerror = () => {
        thumbEl.classList.add('hidden');
        dotEl.classList.remove('hidden');
      };
    } else {
      dotEl.classList.remove('hidden');
      thumbEl.classList.add('hidden');
    }

    if (index === 0) {
      btn.classList.add('color-swatch-btn--active');
      selectedColor = colorName;
      if (selectedColorNameEl) selectedColorNameEl.textContent = `(Đã chọn: ${colorName})`;
    }

    btn.addEventListener('click', () => {
      colorsListEl.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('color-swatch-btn--active'));
      btn.classList.add('color-swatch-btn--active');

      selectedColor = colorName;
      if (selectedColorNameEl) selectedColorNameEl.textContent = `(Đã chọn: ${colorName})`;
    });

    colorsListEl.appendChild(clone);
  });
}

/**
 * Tra cứu ảnh mẫu của một màu: ưu tiên ảnh đi kèm dữ liệu biến thể, sau đó tới danh mục màu chung.
 *
 * @param {string|{colorName: string, imageUrl?: string}} colorItem - Màu của biến thể
 * @returns {string|null} URL ảnh mẫu màu hoặc null nếu không có
 */
function resolveColorImage(colorItem) {
  if (colorItem && typeof colorItem === 'object' && colorItem.imageUrl) {
    return colorItem.imageUrl;
  }
  const name = typeof colorItem === 'string' ? colorItem : (colorItem && colorItem.colorName);
  return colorImageMap.get(normalizeColorKey(name)) || null;
}

/**
 * Cập nhật khung đơn giá của biến thể đang chọn.
 * Thiếu quyền PRODUCT_PRICE_VIEW (giá null) thì hiển thị "Liên hệ báo giá", không bao giờ lộ 0đ hay NaN.
 */
function updatePriceAndTotal() {
  const priceAmountEl = document.getElementById('product-price-amount');
  const priceUnitEl = document.getElementById('product-price-unit');
  const priceBadgeEl = document.getElementById('product-price-badge');
  const priceBadgeWrapEl = document.getElementById('product-price-badge-wrap');

  let unitPrice = null;
  let unitName = '';

  if (productData && productData.priceVisible && selectedVariant && selectedVariant.prices) {
    const entries = Object.entries(selectedVariant.prices).filter(([, price]) => price !== null && price !== undefined);
    // Ưu tiên đơn vị "mét" (giá theo chiều dài), nếu không có thì lấy đơn vị đầu tiên
    const preferred = entries.find(([unit]) => /^m(é|e)t$|^m$/i.test(unit.trim())) || entries[0];
    if (preferred) {
      unitName = preferred[0];
      unitPrice = preferred[1];
    }
  }

  if (unitPrice !== null && unitPrice !== undefined) {
    if (priceAmountEl) priceAmountEl.textContent = formatVnd(unitPrice);
    if (priceUnitEl) {
      priceUnitEl.textContent = `/ ${unitName.toLowerCase()}`;
      priceUnitEl.classList.remove('hidden');
    }
    // Đã có giá hiển thị nên không cần nhãn bổ sung
    if (priceBadgeWrapEl) priceBadgeWrapEl.classList.add('hidden');
  } else {
    if (priceAmountEl) priceAmountEl.textContent = 'Liên hệ báo giá';
    if (priceUnitEl) priceUnitEl.classList.add('hidden');
    if (priceBadgeWrapEl) priceBadgeWrapEl.classList.remove('hidden');
    if (priceBadgeEl) {
      priceBadgeEl.className = 'product-price-box__badge product-price-box__badge--contact';
      priceBadgeEl.textContent = 'Báo giá khi đặt hàng';
    }
  }
}

/**
 * Hiển thị thông báo trong một tab (ẩn thông báo nếu message rỗng).
 *
 * @param {string} elementId - ID phần tử thông báo
 * @param {string} message - Nội dung thông báo
 */
function setTabMessage(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);
}

/**
 * Render tab "Bảng giá": hàng ngang là đơn vị tính, hàng dọc là biến thể sản phẩm.
 * Kiểm tra quyền xem giá: thiếu quyền thì chỉ hiển thị thông báo và không render bất kỳ giá nào.
 *
 * @param {Object} product - Chi tiết sản phẩm từ backend
 */
function renderPriceTable(product) {
  const wrapEl = document.getElementById('price-table-wrap');
  const headRowEl = document.getElementById('price-table-head');
  const bodyEl = document.getElementById('price-table-body');
  const headCellTemplate = document.getElementById('price-head-cell-template');
  const rowTemplate = document.getElementById('price-row-template');
  const cellTemplate = document.getElementById('price-cell-template');

  if (!wrapEl || !headRowEl || !bodyEl || !headCellTemplate || !rowTemplate || !cellTemplate) return;

  // Xóa tiêu đề đơn vị cũ (giữ lại ô góc "Biến thể") và nội dung bảng cũ
  headRowEl.querySelectorAll('.price-table__unit').forEach(el => el.remove());
  bodyEl.replaceChildren();

  // 1. Kiểm tra quyền xem giá
  if (!product.priceVisible) {
    wrapEl.classList.add('hidden');
    setTabMessage('price-table-message', NO_PRICE_PERMISSION_MESSAGE);
    return;
  }

  const variants = product.variants || [];

  // 2. Tập hợp các đơn vị tính (cột) theo thứ tự xuất hiện
  const units = [];
  variants.forEach(variant => {
    Object.keys(variant.prices || {}).forEach(unit => {
      if (!units.includes(unit)) units.push(unit);
    });
  });

  if (variants.length === 0 || units.length === 0) {
    wrapEl.classList.add('hidden');
    setTabMessage('price-table-message', 'Sản phẩm chưa có bảng giá.');
    return;
  }

  setTabMessage('price-table-message', '');

  // 3. Tiêu đề cột: các đơn vị tính
  const headFragment = document.createDocumentFragment();
  units.forEach(unit => {
    const clone = headCellTemplate.content.cloneNode(true);
    clone.querySelector('.price-table__unit').textContent = unit;
    headFragment.appendChild(clone);
  });
  headRowEl.appendChild(headFragment);

  // 4. Các dòng: mỗi biến thể một dòng
  const bodyFragment = document.createDocumentFragment();
  variants.forEach(variant => {
    const rowClone = rowTemplate.content.cloneNode(true);
    const rowEl = rowClone.querySelector('.price-table__row');
    const variantEl = rowClone.querySelector('.price-table__variant');

    variantEl.textContent = variant.variantName
      || (variant.thickness ? `${variant.thickness} mm` : (variant.variantCode || 'Quy cách tiêu chuẩn'));

    units.forEach(unit => {
      const cellClone = cellTemplate.content.cloneNode(true);
      const cellEl = cellClone.querySelector('.price-table__cell');
      const price = variant.prices ? variant.prices[unit] : null;

      if (price === null || price === undefined) {
        cellEl.textContent = EMPTY_VALUE;
        cellEl.classList.add('price-table__cell--empty');
      } else {
        cellEl.textContent = formatVnd(price);
      }
      rowEl.appendChild(cellClone);
    });

    bodyFragment.appendChild(rowClone);
  });
  bodyEl.appendChild(bodyFragment);

  wrapEl.classList.remove('hidden');
}

/**
 * Render tab "Bảng màu": tập hợp (không trùng lặp) màu sắc của toàn bộ biến thể.
 * Không có dữ liệu màu thì hiển thị thông báo thay thế.
 *
 * @param {Array} variants - Danh sách biến thể của sản phẩm
 */
function renderColorPalette(variants) {
  const listEl = document.getElementById('color-palette-list');
  const itemTemplate = document.getElementById('color-palette-item-template');
  if (!listEl || !itemTemplate) return;

  listEl.replaceChildren();

  // Gom màu không trùng lặp, giữ thứ tự xuất hiện
  const colorsByKey = new Map();
  variants.forEach(variant => {
    (variant.colors || []).forEach(colorItem => {
      const name = typeof colorItem === 'string' ? colorItem : colorItem.colorName;
      const key = normalizeColorKey(name);
      if (key && !colorsByKey.has(key)) {
        colorsByKey.set(key, colorItem);
      }
    });
  });

  if (colorsByKey.size === 0) {
    setTabMessage('color-palette-message', NO_COLOR_MESSAGE);
    return;
  }

  setTabMessage('color-palette-message', '');

  const fragment = document.createDocumentFragment();
  colorsByKey.forEach(colorItem => {
    const clone = itemTemplate.content.cloneNode(true);
    const swatchEl = clone.querySelector('.color-palette__swatch');
    const dotEl = clone.querySelector('.color-palette__dot');
    const nameEl = clone.querySelector('.color-palette__name');

    const name = typeof colorItem === 'string' ? colorItem : colorItem.colorName;
    const imageUrl = resolveColorImage(colorItem);

    nameEl.textContent = name;

    if (imageUrl) {
      swatchEl.src = imageUrl;
      swatchEl.alt = `Mẫu màu ${name}`;
      swatchEl.classList.remove('hidden');
      swatchEl.onerror = () => {
        swatchEl.classList.add('hidden');
        dotEl.classList.remove('hidden');
      };
    } else {
      dotEl.classList.remove('hidden');
    }

    fragment.appendChild(clone);
  });
  listEl.appendChild(fragment);
}

/**
 * Khởi tạo các nút tương tác: Stepper số lượng, nút chọn nhanh chiều dài, Thêm vào giỏ và Mua ngay.
 */
function initActions() {
  const btnQtyMinus = document.getElementById('btn-qty-minus');
  const btnQtyPlus = document.getElementById('btn-qty-plus');
  const inputQty = document.getElementById('input-product-quantity');
  const inputSize = document.getElementById('input-product-size');
  const inputDimensions = document.getElementById('input-product-dimensions');
  const btnAddToCart = document.getElementById('btn-add-to-cart');
  const btnOrderNow = document.getElementById('btn-order-now');

  const errorSizeEl = document.getElementById('error-product-size');
  const errorDimensionsEl = document.getElementById('error-product-dimensions');
  const errorQtyEl = document.getElementById('error-product-quantity');
  const stepperEl = inputQty ? inputQty.closest('.stepper') : null;

  // Xóa toàn bộ trạng thái lỗi
  function clearAllValidationErrors() {
    if (inputSize) inputSize.classList.remove('form-input--error');
    if (errorSizeEl) {
      errorSizeEl.textContent = '';
      errorSizeEl.classList.add('hidden');
    }

    if (inputDimensions) inputDimensions.classList.remove('form-input--error');
    if (errorDimensionsEl) {
      errorDimensionsEl.textContent = '';
      errorDimensionsEl.classList.add('hidden');
    }

    if (stepperEl) stepperEl.classList.remove('stepper--error');
    if (errorQtyEl) {
      errorQtyEl.textContent = '';
      errorQtyEl.classList.add('hidden');
    }
  }

  // Hiển thị lỗi cho từng trường
  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('form-input--error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  // Lắng nghe sự kiện gõ phím để xóa lỗi tức thì (Real-time Input Validation)
  if (inputSize) {
    inputSize.addEventListener('input', () => {
      inputSize.classList.remove('form-input--error');
      if (errorSizeEl) {
        errorSizeEl.textContent = '';
        errorSizeEl.classList.add('hidden');
      }
    });
  }

  if (inputDimensions) {
    inputDimensions.addEventListener('input', () => {
      inputDimensions.classList.remove('form-input--error');
      if (errorDimensionsEl) {
        errorDimensionsEl.textContent = '';
        errorDimensionsEl.classList.add('hidden');
      }
    });
  }

  if (inputQty) {
    inputQty.addEventListener('input', () => {
      if (stepperEl) stepperEl.classList.remove('stepper--error');
      if (errorQtyEl) {
        errorQtyEl.textContent = '';
        errorQtyEl.classList.add('hidden');
      }
    });
  }

  // Stepper số lượng
  if (btnQtyMinus && inputQty) {
    btnQtyMinus.addEventListener('click', () => {
      const current = parseInt(inputQty.value, 10) || 1;
      if (current > 1) {
        inputQty.value = current - 1;
      }
    });
  }

  if (btnQtyPlus && inputQty) {
    btnQtyPlus.addEventListener('click', () => {
      const current = parseInt(inputQty.value, 10) || 1;
      if (current < 10000) {
        inputQty.value = current + 1;
      }
    });
  }

  if (inputQty) {
    inputQty.addEventListener('change', () => {
      let val = parseInt(inputQty.value, 10);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 10000) val = 10000;
      inputQty.value = val;
    });
  }

  /**
   * Kiểm tra tính hợp lệ toàn bộ form thông số đặt mua (Validate Input).
   * @returns {boolean} true nếu hợp lệ, false nếu có lỗi
   */
  function validateOrderInputs() {
    clearAllValidationErrors();

    if (!productData) {
      toast.error('Chưa tải được thông tin sản phẩm. Vui lòng tải lại trang.');
      return false;
    }

    // 1. Kiểm tra biến thể (Độ dày & Loại sóng)
    if (productData.variants && productData.variants.length > 0 && !selectedVariant) {
      toast.warning('Vui lòng chọn độ dày và loại sóng cho sản phẩm.');
      const variantsListEl = document.getElementById('product-variants-list');
      if (variantsListEl) variantsListEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    // 2. Kiểm tra màu sắc tôn (nếu biến thể có danh sách màu)
    if (selectedVariant && selectedVariant.colors && selectedVariant.colors.length > 0 && !selectedColor) {
      toast.warning('Vui lòng chọn màu sắc tôn.');
      const colorsListEl = document.getElementById('product-colors-list');
      if (colorsListEl) colorsListEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    const typeCode = (productData.productType && productData.productType.code)
      ? productData.productType.code.toUpperCase()
      : 'UNKNOWN';

    const groupSize = document.getElementById('group-product-size');
    const isSizeVisible = groupSize && !groupSize.classList.contains('hidden');

    const groupDimensions = document.getElementById('group-product-dimensions');
    const isDimensionsVisible = groupDimensions && !groupDimensions.classList.contains('hidden');

    // 3. Kiểm tra Chiều dài (mét)
    if (isSizeVisible && inputSize) {
      const rawVal = inputSize.value.trim();
      // Bắt buộc nhập chiều dài với tôn lợp mái, máng xối, sườn nóc, hoặc UNKNOWN
      const isSizeRequired = ['ROOFING_SHEET', 'GUTTER', 'FLASHING', 'UNKNOWN'].includes(typeCode);

      if (isSizeRequired && rawVal === '') {
        const msg = 'Vui lòng nhập chiều dài (mét) theo yêu cầu công trình.';
        setFieldError(inputSize, errorSizeEl, msg);
        toast.warning(msg);
        inputSize.focus();
        return false;
      }

      if (rawVal !== '') {
        const num = parseFloat(rawVal);
        if (isNaN(num) || num <= 0) {
          const msg = 'Chiều dài phải là số dương lớn hơn 0 (ví dụ: 5.5).';
          setFieldError(inputSize, errorSizeEl, msg);
          toast.warning(msg);
          inputSize.focus();
          return false;
        }
        if (num < 0.1) {
          const msg = 'Chiều dài tối thiểu có thể cắt theo yêu cầu là 0.1 mét (10 cm).';
          setFieldError(inputSize, errorSizeEl, msg);
          toast.warning(msg);
          inputSize.focus();
          return false;
        }
        if (num > 50) {
          const msg = 'Chiều dài tối đa một tấm tôn là 50 mét để đảm bảo điều kiện vận chuyển.';
          setFieldError(inputSize, errorSizeEl, msg);
          toast.warning(msg);
          inputSize.focus();
          return false;
        }
      }
    }

    // 4. Kiểm tra Quy cách kích thước / Chi tiết bẻ chấn
    if (isDimensionsVisible && inputDimensions) {
      const dimVal = inputDimensions.value.trim();
      // Bắt buộc nhập quy cách với máng xối (GUTTER) và diềm/sườn/nóc (FLASHING)
      const isDimRequired = ['GUTTER', 'FLASHING'].includes(typeCode);

      if (isDimRequired && dimVal === '') {
        const hint = (productData.productType && productData.productType.note) ? productData.productType.note : 'quy cách bẻ chấn';
        const msg = `Vui lòng nhập quy cách chi tiết (Gợi ý: ${hint}).`;
        setFieldError(inputDimensions, errorDimensionsEl, msg);
        toast.warning(msg);
        inputDimensions.focus();
        return false;
      }

      if (dimVal.length > 255) {
        const msg = 'Quy cách kích thước không được vượt quá 255 ký tự.';
        setFieldError(inputDimensions, errorDimensionsEl, msg);
        toast.warning(msg);
        inputDimensions.focus();
        return false;
      }
    }

    // 5. Kiểm tra Số lượng
    if (inputQty) {
      const rawQty = inputQty.value.trim();
      const qtyVal = parseInt(rawQty, 10);
      if (rawQty === '' || isNaN(qtyVal) || qtyVal < 1) {
        const msg = 'Số lượng đặt mua phải là số nguyên từ 1 trở lên.';
        if (stepperEl) stepperEl.classList.add('stepper--error');
        if (errorQtyEl) {
          errorQtyEl.textContent = msg;
          errorQtyEl.classList.remove('hidden');
        }
        toast.warning(msg);
        inputQty.focus();
        return false;
      }
      if (qtyVal > 10000) {
        const msg = 'Số lượng đặt mua tối đa trong một lần là 10.000 sản phẩm.';
        if (stepperEl) stepperEl.classList.add('stepper--error');
        if (errorQtyEl) {
          errorQtyEl.textContent = msg;
          errorQtyEl.classList.remove('hidden');
        }
        toast.warning(msg);
        inputQty.focus();
        return false;
      }
    }

    return true;
  }

  // Thu thập thông số đặt hàng
  function getSelectedOrderPayload() {
    if (!productData) return null;

    const quantity = parseInt(inputQty ? inputQty.value : '1', 10) || 1;
    const groupSize = document.getElementById('group-product-size');
    const isSizeVisible = groupSize && !groupSize.classList.contains('hidden');
    let size = null;
    if (isSizeVisible && inputSize && inputSize.value.trim() !== '') {
      const parsedSize = parseFloat(inputSize.value.trim());
      if (!isNaN(parsedSize) && parsedSize > 0) {
        size = parsedSize;
      }
    }

    const groupDimensions = document.getElementById('group-product-dimensions');
    const isDimensionsVisible = groupDimensions && !groupDimensions.classList.contains('hidden');
    let dimensions = null;
    if (isDimensionsVisible && inputDimensions && inputDimensions.value.trim() !== '') {
      dimensions = inputDimensions.value.trim();
    }

    // Kiểm tra quyền xem giá (PRODUCT_PRICE_VIEW) và tính đơn giá, thành tiền
    let unitPrice = null;
    let unitName = '';
    let totalPrice = null;
    const priceVisible = Boolean(productData.priceVisible);

    if (priceVisible && selectedVariant && selectedVariant.prices) {
      const entries = Object.entries(selectedVariant.prices).filter(([, p]) => p !== null && p !== undefined);
      if (entries.length > 0) {
        let preferred = null;
        if (size && size > 0) {
          // Nếu có kích thước (chiều dài), ưu tiên đơn giá tính theo mét "m"
          preferred = entries.find(([u]) => /^m(é|e)t$|^m$/i.test(u.trim())) || entries[0];
        } else {
          // Không có kích thước, ưu tiên đơn vị theo tấm, cái...
          preferred = entries.find(([u]) => !/^m(é|e)t$|^m$/i.test(u.trim())) || entries[0];
        }

        if (preferred) {
          unitName = preferred[0];
          unitPrice = preferred[1];

          // Công thức tính giá:
          // Nếu tính theo mét và có chiều dài: Thành tiền = Đơn giá/m * Chiều dài * Số lượng
          // Nếu tính theo đơn vị rời: Thành tiền = Đơn giá * Số lượng
          const multiplier = (size && size > 0 && /^m(é|e)t$|^m$/i.test(unitName.trim())) ? size : 1;
          totalPrice = Math.round(unitPrice * multiplier * quantity);
        }
      }
    }

    let colorId = null;
    if (selectedColor && Array.isArray(activeColorsList)) {
      const matched = activeColorsList.find(c => normalizeColorKey(c.colorName) === normalizeColorKey(selectedColor));
      if (matched) colorId = matched.id;
    }

    const firstImage = (productData.images && productData.images.length > 0) ? productData.images[0].imageUrl : '';

    return {
      productId: productData.id,
      productName: productData.productName,
      productCode: productData.productCode,
      productImageUrl: firstImage,
      imageUrl: firstImage,
      variantId: selectedVariant ? selectedVariant.id : null,
      variantName: selectedVariant ? (selectedVariant.variantName || `${selectedVariant.thickness}mm`) : '',
      colorId,
      color: selectedColor || null,
      size,
      dimensions,
      quantity,
      unitName,
      unitPrice,
      totalPrice,
      priceVisible
    };
  }

  // Thêm vào giỏ hàng
  if (btnAddToCart) {
    btnAddToCart.addEventListener('click', async () => {
      if (!validateOrderInputs()) return;

      if (!authState.isAuthenticated()) {
        toast.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
        setTimeout(() => {
          window.location.href = `../auth/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        }, 1200);
        return;
      }

      const payload = getSelectedOrderPayload();
      if (!payload) return;

      try {
        btnAddToCart.disabled = true;
        await cartApi.addToCart({
          productId: payload.productId,
          variantId: payload.variantId,
          colorId: payload.colorId,
          size: payload.size,
          dimensions: payload.dimensions,
          quantity: payload.quantity
        });

        toast.success('Đã thêm sản phẩm vào giỏ hàng!');
        // Bắn sự kiện cập nhật số lượng trên header badge
        window.dispatchEvent(new CustomEvent('hmp:cart-updated'));
      } catch (err) {
        console.error('Lỗi khi thêm vào giỏ hàng:', err);
        toast.error(err.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
      } finally {
        btnAddToCart.disabled = false;
      }
    });
  }

  // Mua ngay (Shopee-style: chuyển thẳng sang trang đặt hàng với mode=buy-now)
  if (btnOrderNow) {
    btnOrderNow.addEventListener('click', () => {
      if (!validateOrderInputs()) return;

      const payload = getSelectedOrderPayload();
      if (!payload) return;

      try {
        sessionStorage.setItem('hmp_buy_now_item', JSON.stringify(payload));
      } catch (e) {
        console.warn('Không thể lưu session item:', e);
      }

      window.location.href = '../customer/order.html?mode=buy-now';
    });
  }
}

/**
 * Hiển thị mô tả sản phẩm bằng các phần tử DOM <p> (Không dùng innerHTML)
 */
function renderDescription(product) {
  const descEl = document.getElementById('product-description-content');
  if (descEl && product.description) {
    descEl.replaceChildren();
    const paragraphs = product.description.split('\n').filter(p => p.trim().length > 0);
    paragraphs.forEach(p => {
      const pEl = document.createElement('p');
      pEl.className = 'product-tab-paragraph';
      pEl.textContent = p;
      descEl.appendChild(pEl);
    });
  }

  const specBrand = document.getElementById('spec-brand');
  const specCategory = document.getElementById('spec-category');
  if (specBrand) specBrand.textContent = product.brandName || 'Chính hãng';
  if (specCategory) specCategory.textContent = product.categoryName || 'Tôn sóng lợp mái';
}

/**
 * Xử lý chuyển đổi Tab
 */
function initTabs() {
  const tabBtns = document.querySelectorAll('.product-tab-btn');
  const tabPanes = document.querySelectorAll('.product-tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('product-tab-btn--active'));
      tabPanes.forEach(p => p.classList.remove('product-tab-pane--active'));

      btn.classList.add('product-tab-btn--active');
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) {
        targetPane.classList.add('product-tab-pane--active');
      }
    });
  });
}
