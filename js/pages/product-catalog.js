/**
 * product-catalog.js — Script điều khiển Trang Danh Mục Sản Phẩm Tôn Thép
 * 
 * Tính năng:
 * - Nạp động cây danh mục đa cấp từ backend (GET /api/v1/categories/tree)
 * - Tương tác Sidebar accordion (mở/đóng danh mục con, lọc sản phẩm)
 * - Nạp sản phẩm phân trang từ API động (GET /api/v1/categories/{id}/products hoặc GET /api/v1/products)
 * - Tự động fallback ảnh thiếu/lỗi về empty-picture.png
 * - Phân trang chuẩn 0-indexed chuyển đổi sang 1-indexed
 * - Sắp xếp theo tên / thời gian tạo
 */

import { initCommonLayout } from '../components/component-loader.js';
import { getCategoriesTree, getProducts, getProductsByCategory } from '../api/product.api.js';
import { formatVnd } from '../utils/format.js';

// Trạng thái cục bộ của trang
let selectedCategoryId = null;
let currentPage = 0;
const pageSize = 6; // 6 sản phẩm (2 hàng x 3 cột) chuẩn theo mẫu giao diện
let sortBy = 'createdAt';
let sortDirection = 'asc';

const DEFAULT_EMPTY_IMG = '../../assets/images/empty-picture.png';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer từ Component dùng chung
  await initCommonLayout();

  // 2. Đọc categoryId từ URL (nếu có chuyển hướng từ Header dropdown)
  const urlParams = new URLSearchParams(window.location.search);
  const catIdParam = urlParams.get('categoryId');
  if (catIdParam) {
    selectedCategoryId = parseInt(catIdParam, 10);
  }

  // 3. Khởi tạo sự kiện thanh công cụ sắp xếp
  initToolbar();

  // 4. Nạp cây danh mục và danh sách sản phẩm song song
  await Promise.all([
    loadCategorySidebar(),
    loadProducts()
  ]);
});

/**
 * Khởi tạo sự kiện chọn sắp xếp
 */
function initToolbar() {
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const parts = e.target.value.split(',');
      sortBy = parts[0] || 'createdAt';
      sortDirection = parts[1] || 'asc';
      currentPage = 0;
      loadProducts();
    });
  }
}

/**
 * Nạp cây danh mục đa cấp từ backend vào Sidebar và gắn sự kiện click
 * Trình tự hiển thị:
 * 1. "Tất cả sản phẩm"
 * 2. Cây danh mục phân cấp n-cấp lấy từ BE (GET /api/v1/categories/tree)
 */
async function loadCategorySidebar() {
  const treeListEl = document.getElementById('cat-tree-list');
  const btnAll = document.getElementById('btn-cat-all');

  if (!treeListEl || !btnAll) return;

  // Xử lý sự kiện khi click "Tất cả sản phẩm"
  btnAll.addEventListener('click', () => {
    clearSidebarActive();
    btnAll.classList.add('cat-tree__parent-btn--active');
    selectedCategoryId = null;
    currentPage = 0;
    updateBreadcrumb('Tất cả sản phẩm');
    loadProducts();
  });

  try {
    const tree = await getCategoriesTree();
    if (!Array.isArray(tree) || tree.length === 0) return;

    // Xóa các node danh mục cũ phía sau nút "Tất cả sản phẩm" (nếu có)
    const existingItems = treeListEl.querySelectorAll('.cat-tree__item:not(:first-child)');
    existingItems.forEach(el => el.remove());

    const fragment = document.createDocumentFragment();

    tree.forEach(rootCat => {
      const nodeEl = renderCategoryTreeNode(rootCat, 0);
      if (nodeEl) {
        fragment.appendChild(nodeEl);
      }
    });

    treeListEl.appendChild(fragment);

    // Kích hoạt trạng thái active nếu có danh mục được chọn sẵn
    if (selectedCategoryId) {
      highlightActiveCategory(selectedCategoryId);
    } else {
      btnAll.classList.add('cat-tree__parent-btn--active');
    }

  } catch (err) {
    console.warn('Không thể nạp cây danh mục từ BE:', err);
  }
}

/**
 * Render đệ quy một node trong cây danh mục đa cấp
 * 
 * @param {Object} cat - Dữ liệu danh mục { id, categoryName, children }
 * @param {number} level - Cấp độ sâu trong cây (0: gốc, 1, 2, ...)
 * @returns {HTMLElement} Node <li> đại diện cho danh mục
 */
function renderCategoryTreeNode(cat, level = 0) {
  const parentTemplate = document.getElementById('cat-parent-template');
  const childTemplate = document.getElementById('cat-child-template');
  if (!parentTemplate || !childTemplate) return null;

  const catId = cat.id || cat.categoryId;
  const catName = cat.categoryName || cat.name || '';
  const hasChildren = Array.isArray(cat.children) && cat.children.length > 0;

  if (hasChildren) {
    // 1. Node cha có danh mục con lồng nhau
    const parentClone = parentTemplate.content.cloneNode(true);
    const itemLi = parentClone.querySelector('.cat-tree__item');
    const parentBtn = parentClone.querySelector('.cat-tree__parent-btn');
    const parentName = parentClone.querySelector('.cat-tree__parent-name');
    const childrenList = parentClone.querySelector('.cat-tree__children');

    parentBtn.dataset.catId = String(catId);
    parentName.textContent = catName;

    // Render đệ quy tất cả danh mục con
    cat.children.forEach(childCat => {
      const childNode = renderCategoryTreeNode(childCat, level + 1);
      if (childNode) {
        childrenList.appendChild(childNode);
      }
    });

    // Mặc định CHỈ HIỂN THỊ ROOT: không tự động mở sẵn các nhánh con khi mới vào trang.
    // Người dùng bấm vào mũi tên xuống để xổ nhánh con ra.

    // Xử lý sự kiện click
    parentBtn.addEventListener('click', (e) => {
      const isToggleClick = Boolean(e.target.closest('.cat-tree__toggle-icon'));
      const isExpanded = parentBtn.classList.contains('cat-tree__parent-btn--expanded');

      if (isToggleClick) {
        // Bấm vào biểu tượng mũi tên xuống: đóng / mở nhánh con
        if (isExpanded) {
          parentBtn.classList.remove('cat-tree__parent-btn--expanded');
          childrenList.classList.remove('cat-tree__children--open');
        } else {
          parentBtn.classList.add('cat-tree__parent-btn--expanded');
          childrenList.classList.add('cat-tree__children--open');
        }
      } else {
        // Bấm vào tên danh mục: chọn lọc sản phẩm + tự động mở nhánh con nếu đang đóng
        if (!isExpanded) {
          parentBtn.classList.add('cat-tree__parent-btn--expanded');
          childrenList.classList.add('cat-tree__children--open');
        }

        clearSidebarActive();
        parentBtn.classList.add('cat-tree__parent-btn--active');

        selectedCategoryId = catId;
        currentPage = 0;
        updateBreadcrumb(catName);
        loadProducts();
      }
    });

    return itemLi;
  } else {
    // 2. Node lá (không có danh mục con)
    const childClone = childTemplate.content.cloneNode(true);
    const itemLi = childClone.querySelector('.cat-tree__item');
    const childBtn = childClone.querySelector('.cat-tree__child-btn');
    const childName = childClone.querySelector('.cat-tree__child-name');

    childBtn.dataset.catId = String(catId);
    childName.textContent = catName;

    childBtn.addEventListener('click', () => {
      clearSidebarActive();
      childBtn.classList.add('cat-tree__child-btn--active');

      // Đảm bảo tất cả các nhánh cha phía trên luôn mở
      openParentBranches(childBtn);

      selectedCategoryId = catId;
      currentPage = 0;
      updateBreadcrumb(catName);
      loadProducts();
    });

    return itemLi;
  }
}

/**
 * Đảm bảo tất cả các nhánh cha cấp trên của node đang chọn đều được mở
 */
function openParentBranches(element) {
  let parentEl = element.parentElement;
  while (parentEl && parentEl.id !== 'cat-tree-list') {
    if (parentEl.classList.contains('cat-tree__children')) {
      parentEl.classList.add('cat-tree__children--open');
      const parentBtn = parentEl.previousElementSibling;
      if (parentBtn && parentBtn.classList.contains('cat-tree__parent-btn')) {
        parentBtn.classList.add('cat-tree__parent-btn--expanded');
      }
    }
    parentEl = parentEl.parentElement;
  }
}

/**
 * Làm sáng danh mục đang được kích hoạt và mở nhánh cha tương ứng
 */
function highlightActiveCategory(targetCatId) {
  clearSidebarActive();
  const targetBtn = document.querySelector(`.cat-tree [data-cat-id="${targetCatId}"]`);
  if (!targetBtn) return;

  if (targetBtn.classList.contains('cat-tree__parent-btn')) {
    targetBtn.classList.add('cat-tree__parent-btn--active', 'cat-tree__parent-btn--expanded');
    const childrenUl = targetBtn.nextElementSibling;
    if (childrenUl && childrenUl.classList.contains('cat-tree__children')) {
      childrenUl.classList.add('cat-tree__children--open');
    }
  } else if (targetBtn.classList.contains('cat-tree__child-btn')) {
    targetBtn.classList.add('cat-tree__child-btn--active');
  }

  openParentBranches(targetBtn);
}

/**
 * Xóa trạng thái active của toàn bộ cây danh mục trong Sidebar
 */
function clearSidebarActive() {
  const btnAll = document.getElementById('btn-cat-all');
  if (btnAll) btnAll.classList.remove('cat-tree__parent-btn--active');

  document.querySelectorAll('.cat-tree__parent-btn').forEach(b => b.classList.remove('cat-tree__parent-btn--active'));
  document.querySelectorAll('.cat-tree__child-btn').forEach(b => b.classList.remove('cat-tree__child-btn--active'));
}

/**
 * Cập nhật tên danh mục trên thanh Breadcrumb của Banner
 */
function updateBreadcrumb(categoryName) {
  const currentEl = document.getElementById('banner-current-cat');
  if (currentEl) {
    currentEl.textContent = categoryName || 'Sản phẩm';
  }
}

/**
 * Nạp danh sách sản phẩm động từ backend theo danh mục và phân trang
 */
async function loadProducts() {
  const productListEl = document.getElementById('catalog-products-list');
  const cardTemplate = document.getElementById('catalog-card-template');
  const loadingTemplate = document.getElementById('catalog-loading-template');
  const emptyTemplate = document.getElementById('catalog-empty-template');
  const errorTemplate = document.getElementById('catalog-error-template');
  const paginationWrap = document.getElementById('catalog-pagination-wrap');

  if (!productListEl || !cardTemplate) return;

  // Hiển thị trạng thái đang tải qua <template>
  if (loadingTemplate) {
    productListEl.replaceChildren(loadingTemplate.content.cloneNode(true));
  }

  try {
    let products = [];
    let meta = { page: 0, totalPages: 1 };

    if (selectedCategoryId) {
      // 1. Gọi API lấy theo danh mục cụ thể: GET /categories/{id}/products
      const response = await getProductsByCategory(selectedCategoryId, {
        page: currentPage,
        size: pageSize
      });

      if (response && response.products) {
        products = response.products.result || [];
        meta = response.products.meta || meta;
        if (response.categoryName) {
          updateBreadcrumb(response.categoryName);
        }
      }
    } else {
      // 2. Gọi API lấy toàn bộ sản phẩm: GET /products
      const params = {
        page: currentPage,
        size: pageSize,
        sortBy: sortBy,
        sortDirection: sortDirection
      };
      const response = await getProducts(params);
      products = response.result || [];
      meta = response.meta || meta;
    }

    // Nếu không có sản phẩm nào trong danh mục
    if (products.length === 0) {
      if (emptyTemplate) {
        productListEl.replaceChildren(emptyTemplate.content.cloneNode(true));
      }
      if (paginationWrap) {
        paginationWrap.replaceChildren();
      }
      return;
    }

    // Render danh sách sản phẩm bằng cách clone template
    const fragment = document.createDocumentFragment();

    products.forEach(product => {
      const clone = cardTemplate.content.cloneNode(true);
      const productId = product.id || product.productId;
      const detailUrl = `./detail.html?id=${productId}`;

      // Ảnh sản phẩm (hoặc fallback empty-picture.png)
      const imgEl = clone.querySelector('.catalog-card__img');
      if (imgEl) {
        imgEl.src = product.primaryImageUrl || DEFAULT_EMPTY_IMG;
        imgEl.alt = product.productName;
        imgEl.onerror = () => {
          imgEl.src = DEFAULT_EMPTY_IMG;
        };
      }

      // Tên sản phẩm & liên kết
      const linkEl = clone.querySelector('.catalog-card__link');
      if (linkEl) {
        linkEl.textContent = product.productName;
        linkEl.href = detailUrl;
      }

      // Quy cách / thương hiệu
      const specEl = clone.querySelector('.catalog-card__spec');
      if (specEl) {
        specEl.textContent = product.brandName || product.categoryName || 'Quy cách tiêu chuẩn';
      }

      // Nút hành động: "Liên hệ" (hoặc đơn giá nếu có quyền xem giá)
      const actionBtn = clone.querySelector('.catalog-card__action-btn');
      if (actionBtn) {
        actionBtn.href = detailUrl;
        if (product.priceVisible && product.price !== null && product.price !== undefined) {
          actionBtn.textContent = formatVnd(product.price);
        } else {
          actionBtn.textContent = 'Liên hệ';
        }
      }

      fragment.appendChild(clone);
    });

    productListEl.replaceChildren(fragment);

    // Render thanh phân trang
    renderPagination(meta);

  } catch (error) {
    console.error('Lỗi khi nạp sản phẩm:', error);
    if (errorTemplate) {
      const errorClone = errorTemplate.content.cloneNode(true);
      const msgEl = errorClone.querySelector('.catalog-error-msg');
      if (msgEl) {
        msgEl.textContent = error.message || 'Lỗi mạng khi tải dữ liệu';
      }
      productListEl.replaceChildren(errorClone);
    }
    if (paginationWrap) {
      paginationWrap.replaceChildren();
    }
  }
}

/**
 * Render thanh phân trang chuẩn: < 1 2 3 >
 * 
 * @param {Object} meta - Thông tin phân trang từ backend { page, totalPages, totalElements }
 */
function renderPagination(meta) {
  const paginationWrap = document.getElementById('catalog-pagination-wrap');
  if (!paginationWrap) return;

  const totalPages = meta.totalPages || 1;
  const current = meta.page !== undefined ? meta.page : currentPage;

  if (totalPages <= 1) {
    paginationWrap.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();

  // Nút Trước (<)
  const isFirst = current <= 0;
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'pagination-btn';
  prevBtn.id = 'btn-page-prev';
  prevBtn.disabled = isFirst;
  prevBtn.setAttribute('aria-label', 'Trang trước');
  prevBtn.textContent = '<';
  if (!isFirst) {
    prevBtn.addEventListener('click', () => {
      currentPage = current - 1;
      loadProducts();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  }
  fragment.appendChild(prevBtn);

  // Các nút số trang: 1 2 3 ...
  for (let i = 0; i < totalPages; i++) {
    const isActive = i === current;
    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = isActive ? 'pagination-btn pagination-btn--active' : 'pagination-btn';
    pageBtn.dataset.page = String(i);
    pageBtn.textContent = String(i + 1);
    pageBtn.addEventListener('click', () => {
      if (i !== current) {
        currentPage = i;
        loadProducts();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });
    fragment.appendChild(pageBtn);
  }

  // Nút Sau (>)
  const isLast = current >= totalPages - 1;
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'pagination-btn';
  nextBtn.id = 'btn-page-next';
  nextBtn.disabled = isLast;
  nextBtn.setAttribute('aria-label', 'Trang sau');
  nextBtn.textContent = '>';
  if (!isLast) {
    nextBtn.addEventListener('click', () => {
      currentPage = current + 1;
      loadProducts();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  }
  fragment.appendChild(nextBtn);

  paginationWrap.replaceChildren(fragment);
}

