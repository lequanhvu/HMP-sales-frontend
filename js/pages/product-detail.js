/**
 * product-detail.js — Script điều khiển Trang Chi Tiết Sản Phẩm Tôn Sóng
 * 
 * Nghiệp vụ:
 * - Clean Code: Tách biệt hoàn toàn HTML, CSS và JavaScript
 * - Tuyệt đối không dùng inline style="..." hoặc gán .innerHTML chuỗi thô
 * - Sử dụng thẻ <template> và DOM API (replaceChildren, classList, createElement)
 * - Tự động tính nhẩm giá: TotalPrice = UnitPrice × Size × Quantity
 * - Kiểm soát quyền xem giá (PRODUCT_PRICE_VIEW)
 * - Tự động fallback ảnh hỏng/thiếu về empty-picture.png
 */

import { initHeader } from '../components/header.js';
import { getProductDetail } from '../api/product.api.js';
import { formatVnd } from '../utils/format.js';

// Trạng thái cục bộ của trang
let productData = null;
let selectedVariant = null;
let selectedColor = null;

const DEFAULT_EMPTY_IMAGE = '../../assets/images/empty-picture.png';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Khởi tạo thanh điều hướng Header
  initHeader();

  // 2. Khởi tạo xử lý chuyển Tab
  initTabs();

  // 3. Khởi tạo các sự kiện nhập kích thước tôn
  initCalcInputs();

  // 4. Lấy productId từ query param và tải dữ liệu
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError('Không tìm thấy mã sản phẩm trong đường dẫn.');
    return;
  }

  await loadProductDetail(productId);
});

/**
 * Tải chi tiết sản phẩm từ API Backend
 * 
 * @param {string|number} productId - ID sản phẩm
 */
async function loadProductDetail(productId) {
  const loadingEl = document.getElementById('product-loading-state');
  const errorEl = document.getElementById('product-error-state');
  const detailCardEl = document.getElementById('product-detail-card');

  try {
    const response = await getProductDetail(productId);
    productData = response;

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
    renderGallery(productData.images || []);
    renderVariants(productData.variants || []);
    renderDescription(productData);

  } catch (error) {
    console.error('Lỗi khi tải chi tiết sản phẩm:', error);
    showError(error.message || 'Không thể kết nối đến máy chủ.');
  }
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

  const breadcrumbCategory = document.getElementById('breadcrumb-category');
  const breadcrumbProduct = document.getElementById('breadcrumb-product-name');
  if (breadcrumbCategory) breadcrumbCategory.textContent = product.categoryName || 'Sản phẩm tôn';
  if (breadcrumbProduct) breadcrumbProduct.textContent = product.productName;

  const titleEl = document.getElementById('product-title');
  const brandTagEl = document.getElementById('product-brand-tag');
  const categoryTextEl = document.getElementById('product-category-text');
  const statusTextEl = document.getElementById('product-status-text');

  if (titleEl) titleEl.textContent = product.productName;
  if (brandTagEl) brandTagEl.textContent = product.brandName || 'Chính Hãng';
  if (categoryTextEl) categoryTextEl.textContent = `Danh mục: ${product.categoryName || 'Tôn sóng lợp mái'}`;
  
  if (statusTextEl) {
    statusTextEl.textContent = product.status === 'ACTIVE' ? 'Sẵn hàng sản xuất' : 'Tạm ngừng nhận đơn';
  }
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
  const specThickness = document.getElementById('spec-thickness');
  const specTypeValue = document.getElementById('spec-type-value');
  const specVariantCode = document.getElementById('spec-variant-code');

  if (specThickness) specThickness.textContent = variant.thickness ? `${variant.thickness} mm` : 'Theo yêu cầu';
  if (specTypeValue) specTypeValue.textContent = variant.typeValue || 'Tiêu chuẩn';
  if (specVariantCode) specVariantCode.textContent = variant.variantCode || 'HMP-STD';

  renderColors(variant.colors || []);
  updatePriceAndTotal();
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
    const imageUrl = typeof colorItem === 'object' ? colorItem.imageUrl : null;

    nameEl.textContent = colorName;

    // Hiển thị ảnh mẫu màu hoặc chấm tròn màu
    if (imageUrl) {
      thumbEl.src = imageUrl;
      thumbEl.classList.remove('hidden');
      dotEl.classList.add('hidden');
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
 * Cập nhật bảng giá niêm yết và tự động tính tổng tiền tạm tính
 * Công thức: TotalPrice = UnitPrice × Size × Quantity
 */
function updatePriceAndTotal() {
  const priceAmountEl = document.getElementById('product-price-amount');
  const priceUnitEl = document.getElementById('product-price-unit');
  const priceBadgeEl = document.getElementById('product-price-badge');
  const totalAmountEl = document.getElementById('product-calc-total-amount');
  const formulaHintEl = document.getElementById('product-calc-formula-hint');

  let unitPrice = null;

  if (productData && productData.priceVisible && selectedVariant && selectedVariant.prices) {
    unitPrice = selectedVariant.prices['m'] || selectedVariant.prices['mét'] || Object.values(selectedVariant.prices)[0];
  }

  const lengthInput = document.getElementById('input-length');
  const quantityInput = document.getElementById('input-quantity');

  const length = parseFloat(lengthInput ? lengthInput.value : 0) || 0;
  const quantity = parseInt(quantityInput ? quantityInput.value : 0, 10) || 0;

  if (unitPrice !== null && unitPrice !== undefined) {
    if (priceAmountEl) priceAmountEl.textContent = formatVnd(unitPrice);
    if (priceUnitEl) {
      priceUnitEl.textContent = '/ mét';
      priceUnitEl.classList.remove('hidden');
    }
    if (priceBadgeEl) {
      priceBadgeEl.className = 'product-price-box__badge product-price-box__badge--verified';
      priceBadgeEl.textContent = 'Giá niêm yết nhà máy';
    }

    const total = Math.round(unitPrice * length * quantity);
    if (totalAmountEl) {
      totalAmountEl.textContent = formatVnd(total);
      totalAmountEl.classList.remove('product-calc-total__amount--contact');
    }
    if (formulaHintEl) {
      formulaHintEl.textContent = `Công thức: ${formatVnd(unitPrice)} × ${length}m × ${quantity} tấm`;
    }
  } else {
    if (priceAmountEl) priceAmountEl.textContent = 'Liên hệ báo giá';
    if (priceUnitEl) priceUnitEl.classList.add('hidden');
    if (priceBadgeEl) {
      priceBadgeEl.className = 'product-price-box__badge product-price-box__badge--contact';
      priceBadgeEl.textContent = 'Báo giá khi đặt hàng';
    }
    if (totalAmountEl) {
      totalAmountEl.textContent = 'Báo giá sau khi đặt';
      totalAmountEl.classList.add('product-calc-total__amount--contact');
    }
    if (formulaHintEl) {
      formulaHintEl.textContent = 'Nhân viên kinh doanh sẽ liên hệ báo giá ưu đãi sau khi nhận kích thước';
    }
  }
}

/**
 * Khởi tạo các sự kiện nhập kích thước tôn và nút đặt hàng
 */
function initCalcInputs() {
  const lengthInput = document.getElementById('input-length');
  const quantityInput = document.getElementById('input-quantity');
  const btnMinus = document.getElementById('btn-qty-minus');
  const btnPlus = document.getElementById('btn-qty-plus');
  const quickChips = document.querySelectorAll('.quick-chip');
  const btnOrderNow = document.getElementById('btn-order-now');

  if (lengthInput) {
    lengthInput.addEventListener('input', () => updatePriceAndTotal());
  }

  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      let val = parseInt(quantityInput.value, 10);
      if (isNaN(val) || val < 1) quantityInput.value = 1;
      updatePriceAndTotal();
    });
  }

  if (btnMinus && quantityInput) {
    btnMinus.addEventListener('click', () => {
      let val = parseInt(quantityInput.value, 10) || 1;
      if (val > 1) {
        quantityInput.value = val - 1;
        updatePriceAndTotal();
      }
    });
  }

  if (btnPlus && quantityInput) {
    btnPlus.addEventListener('click', () => {
      let val = parseInt(quantityInput.value, 10) || 1;
      quantityInput.value = val + 1;
      updatePriceAndTotal();
    });
  }

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const len = chip.dataset.length;
      if (lengthInput && len) {
        lengthInput.value = len;
        updatePriceAndTotal();
      }
    });
  });

  if (btnOrderNow) {
    btnOrderNow.addEventListener('click', () => {
      if (!productData) return;

      const length = parseFloat(lengthInput ? lengthInput.value : 0) || 0;
      const quantity = parseInt(quantityInput ? quantityInput.value : 0, 10) || 0;

      if (length <= 0) {
        alert('Vui lòng nhập chiều dài tôn hợp lệ (lớn hơn 0).');
        lengthInput?.focus();
        return;
      }

      if (quantity < 1) {
        alert('Vui lòng nhập số lượng tấm tối thiểu là 1.');
        quantityInput?.focus();
        return;
      }

      const params = new URLSearchParams({
        productId: productData.id,
        productName: productData.productName,
        variantId: selectedVariant ? selectedVariant.id : '',
        variantName: selectedVariant ? (selectedVariant.variantName || `${selectedVariant.thickness}mm`) : '',
        length: length.toString(),
        quantity: quantity.toString(),
        color: selectedColor || ''
      });

      window.location.href = `../customer/order.html?${params.toString()}`;
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
