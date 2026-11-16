/**
 * product-catalog.js — Script điều khiển Trang Danh Mục Sản Phẩm Tôn Thép
 * 
 * Tính năng:
 * - Nạp động cây danh mục đa cấp từ backend (GET /api/v1/categories/tree)
 * - Tương tác Sidebar accordion (mở/đóng danh mục con, lọc sản phẩm)
 * - Chọn một danh mục: hiển thị sản phẩm của danh mục đó VÀ toàn bộ danh mục con cháu
 *   (GET /api/v1/categories/{id}/products — backend gộp cả cây con)
 * - Tìm kiếm sản phẩm: không dấu, gợi ý type-ahead (debounce), gợi ý sửa lỗi chính tả
 *   (GET /api/v1/products?productName=... và GET /api/v1/search/suggestions)
 * - Chuyển đổi hiển thị Grid View / List View
 * - Bấm vào ảnh hoặc tên sản phẩm đều đi tới trang chi tiết
 * - Tự động fallback ảnh thiếu/lỗi về empty-picture.png
 * - Phân trang chuẩn 0-indexed chuyển đổi sang 1-indexed
 */

import { initCommonLayout } from '../components/component-loader.js';
import {
  getCategoriesTree,
  getProducts,
  getProductsByCategory,
  getSearchSuggestions
} from '../api/product.api.js';
import { formatVnd } from '../utils/format.js';
import { debounce } from '../utils/debounce.js';

// Trạng thái cục bộ của trang
let selectedCategoryId = null;
let currentPage = 0;
const pageSize = 6; // 6 sản phẩm (2 hàng x 3 cột) chuẩn theo mẫu giao diện
let keyword = '';
let viewMode = 'grid';

// Trạng thái ô gợi ý tìm kiếm
let suggestionItems = [];
let activeSuggestionIndex = -1;
let suggestionRequestSeq = 0;

const SUGGESTION_DEBOUNCE_MS = 300;
const SEARCH_MAX_LENGTH = 50;
const VIEW_MODE_STORAGE_KEY = 'hmp_catalog_view_mode';
const DEFAULT_EMPTY_IMG = '../../assets/images/empty-picture.png';

const SUGGESTION_TYPE_LABELS = {
  PRODUCT: 'Sản phẩm',
  CATEGORY: 'Danh mục',
  BRAND: 'Thương hiệu'
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nhúng đồng bộ Header & Footer từ Component dùng chung
  await initCommonLayout();

  // 2. Đọc tham số từ URL (categoryId từ Header dropdown, keyword từ liên kết tìm kiếm)
  const urlParams = new URLSearchParams(window.location.search);
  const catIdParam = urlParams.get('categoryId');
  if (catIdParam) {
    selectedCategoryId = parseInt(catIdParam, 10);
  }
  const keywordParam = (urlParams.get('keyword') || '').trim().slice(0, SEARCH_MAX_LENGTH);
  if (keywordParam) {
    keyword = keywordParam;
    selectedCategoryId = null;
  }

  // 3. Khôi phục chế độ xem đã chọn & khởi tạo thanh công cụ (tìm kiếm + Grid/List)
  restoreViewMode();
  initViewToggle();
  initSearch();

  // 4. Nạp cây danh mục và danh sách sản phẩm song song
  await Promise.all([
    loadCategorySidebar(),
    loadProducts()
  ]);
});

/* ==========================================================================
   CHẾ ĐỘ HIỂN THỊ GRID / LIST
   ========================================================================== */

/**
 * Đọc chế độ xem đã lưu (grid | list) và áp dụng lên giao diện.
 */
function restoreViewMode() {
  let saved = null;
  try {
    saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  } catch {
    saved = null;
  }
  applyViewMode(saved === 'list' ? 'list' : 'grid');
}

/**
 * Gắn sự kiện cho 2 nút chuyển đổi Grid View / List View.
 */
function initViewToggle() {
  document.querySelectorAll('.catalog-view-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.view === 'list' ? 'list' : 'grid';
      applyViewMode(mode);
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        // Bỏ qua nếu trình duyệt chặn localStorage
      }
    });
  });
}

/**
 * Áp dụng chế độ hiển thị lên danh sách sản phẩm và trạng thái nút bấm.
 *
 * @param {'grid'|'list'} mode - Chế độ hiển thị
 */
function applyViewMode(mode) {
  viewMode = mode;
  const listEl = document.getElementById('catalog-products-list');
  if (listEl) {
    listEl.classList.toggle('catalog-grid--list', mode === 'list');
  }

  document.querySelectorAll('.catalog-view-btn[data-view]').forEach(btn => {
    const isActive = btn.dataset.view === mode;
    btn.classList.toggle('catalog-view-btn--active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

/* ==========================================================================
   TÌM KIẾM SẢN PHẨM (GỢI Ý + SỬA LỖI CHÍNH TẢ)
   ========================================================================== */

/**
 * Khởi tạo ô tìm kiếm: gợi ý type-ahead có debounce, điều hướng bàn phím, gửi form.
 */
function initSearch() {
  const formEl = document.getElementById('catalog-search-form');
  const inputEl = document.getElementById('catalog-search-input');
  const clearBtn = document.getElementById('catalog-search-clear');
  const dropdownEl = document.getElementById('catalog-search-suggestions');

  if (!formEl || !inputEl || !dropdownEl) return;

  // Hiển thị lại từ khóa nếu vào trang từ liên kết có ?keyword=
  inputEl.value = keyword;
  toggleClearButton();

  const fetchSuggestionsDebounced = debounce(fetchAndRenderSuggestions, SUGGESTION_DEBOUNCE_MS);

  inputEl.addEventListener('input', () => {
    toggleClearButton();
    const text = inputEl.value.trim();
    if (!text) {
      fetchSuggestionsDebounced.cancel();
      suggestionRequestSeq++;
      closeSuggestions();
      return;
    }
    fetchSuggestionsDebounced(text);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSuggestions();
      return;
    }
    if (dropdownEl.classList.contains('hidden') || suggestionItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((activeSuggestionIndex + 1) % suggestionItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((activeSuggestionIndex - 1 + suggestionItems.length) % suggestionItems.length);
    } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestionItems[activeSuggestionIndex]);
    }
  });

  inputEl.addEventListener('focus', () => {
    if (suggestionItems.length > 0 && inputEl.value.trim()) {
      openSuggestions();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      toggleClearButton();
      closeSuggestions();
      inputEl.focus();
      if (keyword || selectedCategoryId) {
        keyword = '';
        currentPage = 0;
        resetSidebarToAll();
        loadProducts();
      }
    });
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchSuggestionsDebounced.cancel();
    suggestionRequestSeq++;
    closeSuggestions();
    runSearch(inputEl.value);
  });

  // Đóng danh sách gợi ý khi bấm ra ngoài ô tìm kiếm
  document.addEventListener('click', (e) => {
    if (!formEl.contains(e.target)) {
      closeSuggestions();
    }
  });
}

/**
 * Ẩn/hiện nút xóa nhanh từ khóa theo nội dung ô nhập.
 */
function toggleClearButton() {
  const inputEl = document.getElementById('catalog-search-input');
  const clearBtn = document.getElementById('catalog-search-clear');
  if (inputEl && clearBtn) {
    clearBtn.classList.toggle('hidden', inputEl.value.length === 0);
  }
}

/**
 * Thực hiện tìm kiếm sản phẩm theo từ khóa người dùng nhập (tìm toàn bộ sản phẩm, không phân biệt dấu).
 *
 * @param {string} rawKeyword - Từ khóa thô người dùng nhập
 */
function runSearch(rawKeyword) {
  const text = (rawKeyword || '').trim().slice(0, SEARCH_MAX_LENGTH);
  const inputEl = document.getElementById('catalog-search-input');
  if (inputEl) {
    inputEl.value = text;
    toggleClearButton();
  }

  keyword = text;
  currentPage = 0;

  if (text) {
    // Tìm kiếm áp dụng trên toàn bộ sản phẩm nên bỏ chọn danh mục
    selectedCategoryId = null;
    clearSidebarActive();
    updateBreadcrumb('Kết quả tìm kiếm');
  } else {
    resetSidebarToAll();
  }
  loadProducts();
}

/**
 * Gọi API gợi ý và hiển thị danh sách thả xuống.
 *
 * @param {string} text - Từ khóa đang gõ
 */
async function fetchAndRenderSuggestions(text) {
  const requestSeq = ++suggestionRequestSeq;
  try {
    const items = await getSearchSuggestions(text.slice(0, SEARCH_MAX_LENGTH));
    // Bỏ qua kết quả cũ nếu người dùng đã gõ tiếp hoặc đã gửi tìm kiếm
    if (requestSeq !== suggestionRequestSeq) return;
    renderSuggestions(Array.isArray(items) ? items : []);
  } catch (err) {
    if (requestSeq !== suggestionRequestSeq) return;
    console.warn('Không thể nạp gợi ý tìm kiếm:', err);
    closeSuggestions();
  }
}

/**
 * Render danh sách gợi ý bằng thẻ <template>.
 *
 * @param {Array} items - Danh sách gợi ý { id, name, type, imageUrl, extraInfo }
 */
function renderSuggestions(items) {
  const dropdownEl = document.getElementById('catalog-search-suggestions');
  const template = document.getElementById('search-suggestion-template');
  if (!dropdownEl || !template) return;

  suggestionItems = items;
  activeSuggestionIndex = -1;

  if (items.length === 0) {
    closeSuggestions();
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const clone = template.content.cloneNode(true);
    const optionEl = clone.querySelector('.catalog-search__option');
    const nameEl = clone.querySelector('.catalog-search__option-name');
    const metaEl = clone.querySelector('.catalog-search__option-meta');
    const typeEl = clone.querySelector('.catalog-search__option-type');

    nameEl.textContent = item.name;
    metaEl.textContent = item.extraInfo || '';
    typeEl.textContent = SUGGESTION_TYPE_LABELS[item.type] || '';

    optionEl.dataset.index = String(index);
    // mousedown để xử lý trước khi ô nhập mất focus
    optionEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectSuggestion(item);
    });

    fragment.appendChild(clone);
  });

  dropdownEl.replaceChildren(fragment);
  openSuggestions();
}

/**
 * Đánh dấu mục gợi ý đang được chọn bằng bàn phím.
 *
 * @param {number} index - Vị trí mục gợi ý
 */
function setActiveSuggestion(index) {
  const dropdownEl = document.getElementById('catalog-search-suggestions');
  if (!dropdownEl) return;

  activeSuggestionIndex = index;
  dropdownEl.querySelectorAll('.catalog-search__option').forEach((el, i) => {
    const isActive = i === index;
    el.classList.toggle('catalog-search__option--active', isActive);
    el.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

/**
 * Xử lý khi người dùng chọn một mục gợi ý (hoặc một nút gợi ý sửa lỗi chính tả).
 * - CATEGORY: lọc theo danh mục (gồm cả danh mục con)
 * - PRODUCT / BRAND: ở lại trang sản phẩm và tìm kiếm theo tên được gợi ý
 *
 * @param {{id: number, name: string, type: string}} item - Mục gợi ý được chọn
 */
function selectSuggestion(item) {
  closeSuggestions();

  if (item.type === 'CATEGORY') {
    selectCategoryFromSuggestion(item);
    return;
  }

  runSearch(item.name);
}

/**
 * Chọn danh mục từ gợi ý tìm kiếm: điền tên danh mục vào ô tìm kiếm, làm sáng danh mục trên Sidebar và nạp sản phẩm.
 *
 * @param {{id: number, name: string}} item - Danh mục được gợi ý
 */
function selectCategoryFromSuggestion(item) {
  keyword = '';
  const inputEl = document.getElementById('catalog-search-input');
  if (inputEl) {
    inputEl.value = item.name || '';
    toggleClearButton();
  }

  selectedCategoryId = item.id;
  currentPage = 0;
  highlightActiveCategory(item.id);
  updateBreadcrumb(item.name);
  loadProducts();
}

/**
 * Mở danh sách gợi ý thả xuống.
 */
function openSuggestions() {
  const dropdownEl = document.getElementById('catalog-search-suggestions');
  const inputEl = document.getElementById('catalog-search-input');
  if (dropdownEl) dropdownEl.classList.remove('hidden');
  if (inputEl) inputEl.setAttribute('aria-expanded', 'true');
}

/**
 * Đóng danh sách gợi ý thả xuống.
 */
function closeSuggestions() {
  const dropdownEl = document.getElementById('catalog-search-suggestions');
  const inputEl = document.getElementById('catalog-search-input');
  if (dropdownEl) dropdownEl.classList.add('hidden');
  if (inputEl) inputEl.setAttribute('aria-expanded', 'false');
  activeSuggestionIndex = -1;
}

/**
 * Hiển thị thông báo tìm kiếm (số kết quả / không có kết quả kèm gợi ý "Có phải bạn muốn tìm").
 *
 * @param {string} message - Nội dung thông báo (null để ẩn hoàn toàn khung thông báo)
 * @param {Array} [suggestions] - Danh sách gợi ý sửa lỗi chính tả hiển thị dạng nút
 */
function renderSearchNotice(message, suggestions = []) {
  const noticeEl = document.getElementById('catalog-search-notice');
  const textEl = document.getElementById('catalog-notice-text');
  const chipsEl = document.getElementById('catalog-notice-chips');
  const chipTemplate = document.getElementById('search-chip-template');
  if (!noticeEl || !textEl || !chipsEl) return;

  if (!message) {
    noticeEl.classList.add('hidden');
    textEl.textContent = '';
    chipsEl.replaceChildren();
    return;
  }

  textEl.textContent = message;

  const fragment = document.createDocumentFragment();
  if (chipTemplate) {
    suggestions.forEach(item => {
      const clone = chipTemplate.content.cloneNode(true);
      const chipBtn = clone.querySelector('.catalog-notice__chip');
      chipBtn.textContent = item.name;
      chipBtn.addEventListener('click', () => selectSuggestion(item));
      fragment.appendChild(clone);
    });
  }
  chipsEl.replaceChildren(fragment);
  noticeEl.classList.remove('hidden');
}

/**
 * Khi tìm kiếm không có kết quả: nhờ bộ gợi ý (không dấu + sửa lỗi gõ sai) đề xuất từ khóa gần đúng nhất.
 *
 * @param {string} searchedKeyword - Từ khóa đã tìm nhưng không có kết quả
 */
async function showSpellingSuggestions(searchedKeyword) {
  let suggestions = [];
  try {
    const items = await getSearchSuggestions(searchedKeyword, { limit: 5 });
    suggestions = Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn('Không thể nạp gợi ý sửa lỗi chính tả:', err);
  }

  // Tránh hiển thị kết quả muộn nếu người dùng đã đổi từ khóa khác
  if (keyword !== searchedKeyword) return;

  if (suggestions.length > 0) {
    renderSearchNotice(`Không tìm thấy sản phẩm nào cho “${searchedKeyword}”. Có phải bạn muốn tìm:`, suggestions);
  } else {
    renderSearchNotice(`Không tìm thấy sản phẩm nào cho “${searchedKeyword}”. Vui lòng thử từ khóa khác.`);
  }
}

/* ==========================================================================
   SIDEBAR CÂY DANH MỤC
   ========================================================================== */

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
    clearSearchState();
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
    } else if (keyword) {
      clearSidebarActive();
    } else {
      btnAll.classList.add('cat-tree__parent-btn--active');
    }

  } catch (err) {
    console.warn('Không thể nạp cây danh mục từ BE:', err);
  }
}

/**
 * Xóa trạng thái tìm kiếm hiện tại (từ khóa, ô nhập, thông báo) khi người dùng chuyển sang lọc theo danh mục.
 */
function clearSearchState() {
  keyword = '';
  const inputEl = document.getElementById('catalog-search-input');
  if (inputEl) {
    inputEl.value = '';
    toggleClearButton();
  }
  closeSuggestions();
  renderSearchNotice(null);
}

/**
 * Đưa Sidebar về trạng thái "Tất cả sản phẩm" (sau khi xóa từ khóa tìm kiếm).
 */
function resetSidebarToAll() {
  const btnAll = document.getElementById('btn-cat-all');
  selectedCategoryId = null;
  clearSidebarActive();
  if (btnAll) btnAll.classList.add('cat-tree__parent-btn--active');
  updateBreadcrumb('Tất cả sản phẩm');
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
        // Bấm vào tên danh mục: lọc sản phẩm của danh mục + toàn bộ danh mục con cháu,
        // đồng thời tự động mở nhánh con nếu đang đóng
        if (!isExpanded) {
          parentBtn.classList.add('cat-tree__parent-btn--expanded');
          childrenList.classList.add('cat-tree__children--open');
        }

        clearSidebarActive();
        parentBtn.classList.add('cat-tree__parent-btn--active');

        selectedCategoryId = catId;
        clearSearchState();
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
      clearSearchState();
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

/* ==========================================================================
   DANH SÁCH SẢN PHẨM & PHÂN TRANG
   ========================================================================== */

/**
 * Nạp danh sách sản phẩm động từ backend theo từ khóa tìm kiếm hoặc danh mục và phân trang.
 * Ưu tiên: từ khóa tìm kiếm > danh mục đang chọn > toàn bộ sản phẩm.
 */
async function loadProducts() {
  const productListEl = document.getElementById('catalog-products-list');
  const cardTemplate = document.getElementById('catalog-card-template');
  const loadingTemplate = document.getElementById('catalog-loading-template');
  const emptyTemplate = document.getElementById('catalog-empty-template');
  const errorTemplate = document.getElementById('catalog-error-template');
  const paginationWrap = document.getElementById('catalog-pagination-wrap');

  if (!productListEl || !cardTemplate) return;

  // Ghi nhớ từ khóa của lần nạp này để bỏ qua kết quả cũ nếu người dùng đổi điều kiện giữa chừng
  const requestKeyword = keyword;
  const requestCategoryId = selectedCategoryId;
  const requestPage = currentPage;

  // Hiển thị trạng thái đang tải qua <template>
  if (loadingTemplate) {
    productListEl.replaceChildren(loadingTemplate.content.cloneNode(true));
  }

  try {
    let products = [];
    let meta = { page: 0, totalPages: 1, totalElements: 0 };

    if (requestKeyword) {
      // 1. Tìm theo tên sản phẩm (không phân biệt dấu & hoa thường), chỉ sản phẩm đang bán
      const response = await getProducts({
        productName: requestKeyword,
        status: 'ACTIVE',
        page: requestPage,
        size: pageSize
      });
      products = (response && response.result) || [];
      meta = (response && response.meta) || meta;
    } else if (requestCategoryId) {
      // 2. Lấy theo danh mục: backend tự động gộp sản phẩm của danh mục và toàn bộ danh mục con cháu
      const response = await getProductsByCategory(requestCategoryId, {
        page: requestPage,
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
      // 3. Lấy toàn bộ sản phẩm đang bán: GET /products
      const response = await getProducts({
        status: 'ACTIVE',
        page: requestPage,
        size: pageSize
      });
      products = (response && response.result) || [];
      meta = (response && response.meta) || meta;
    }

    // Bỏ qua kết quả đã cũ (người dùng đã đổi từ khóa / danh mục / trang trong lúc chờ)
    if (requestKeyword !== keyword || requestCategoryId !== selectedCategoryId || requestPage !== currentPage) {
      return;
    }

    // Thông báo kết quả tìm kiếm
    if (requestKeyword && products.length > 0) {
      const total = meta.totalElements !== undefined ? meta.totalElements : products.length;
      renderSearchNotice(`Tìm thấy ${total} sản phẩm cho “${requestKeyword}”.`);
    } else if (!requestKeyword) {
      renderSearchNotice(null);
    }

    // Nếu không có sản phẩm nào
    if (products.length === 0) {
      if (emptyTemplate) {
        productListEl.replaceChildren(emptyTemplate.content.cloneNode(true));
      }
      if (paginationWrap) {
        paginationWrap.replaceChildren();
      }
      if (requestKeyword) {
        // Gợi ý sửa lỗi chính tả / không dấu từ bộ gợi ý của backend
        showSpellingSuggestions(requestKeyword);
      }
      return;
    }

    // Render danh sách sản phẩm bằng cách clone template
    const fragment = document.createDocumentFragment();

    products.forEach(product => {
      const clone = cardTemplate.content.cloneNode(true);
      const productId = product.id || product.productId;
      const detailUrl = `./detail.html?id=${productId}`;

      // Ảnh sản phẩm (hoặc fallback empty-picture.png) — bấm vào ảnh đi tới trang chi tiết
      const imageLinkEl = clone.querySelector('.catalog-card__image-wrap');
      if (imageLinkEl) {
        imageLinkEl.href = detailUrl;
      }

      const imgEl = clone.querySelector('.catalog-card__img');
      if (imgEl) {
        imgEl.src = product.primaryImageUrl || DEFAULT_EMPTY_IMG;
        imgEl.alt = product.productName;
        imgEl.onerror = () => {
          imgEl.onerror = null;
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
