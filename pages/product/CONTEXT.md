# Product Catalog & Product Detail — Implementation Context
> Written: 2026-11-18 | Author: @antigravity

## Business & UX Context
The Product module (`pages/product/`) enables customers and prospective buyers to browse the roofing sheet catalog (`Tôn sóng lợp mái, tôn xốp PU, phụ kiện xối nóc`), navigate hierarchical category trees, search products with fast type-ahead suggestions, and inspect product specifications, pricing, and color swatches.
Guests can browse without authentication. Public price visibility is strictly governed by permissions (`PRODUCT_PRICE_VIEW`).

## Technical & UI Decisions
List of critical architectural decisions:
- **Hierarchical Category Accordion (`GET /api/v1/categories/tree`)**: Implemented dynamic accordion navigation for nested categories. Clicking any ancestor or parent category requests `GET /api/v1/categories/{id}/products`, which backend rolls up to include all products from descendant subcategories.
- **Debounced Type-ahead Search (`GET /api/v1/search/suggestions`)**: Uses `js/utils/debounce.js` with 300ms delay. Supports unaccented Vietnamese and typo correction. Supports full keyboard navigation (Arrow Up, Arrow Down, Enter, Escape). Selecting a category suggestion filters the catalog; selecting a product/brand suggestion executes an immediate search.
- **Grid vs List View Toggle**: Implemented layout switcher on catalog page. The user's preferred view mode is persisted in `localStorage` under key `product_catalog_view_mode`.
- **Permission-driven Price Masking (`PRODUCT_PRICE_VIEW`)**: Evaluated dynamically; if `price` or `prices` is `null`, the UI displays the badge *"Liên hệ báo giá"*, never `0 VNĐ` or `NaN`. On the detail page, Tab "Bảng giá" renders a full matrix of variants (rows) vs measurement units (columns) with unauthorized state handling.
- **Color Swatch System (`GET /api/v1/colors`)**: Variant colors are matched against master color data and displayed as swatch circles with preview tooltips and a dedicated "Bảng màu" tab.
- **Manufacturing Sheet Width (`width`)**: Detail page technical specifications display sheet width in millimeters (`width` attribute of `ProductVariant`) and update dynamically when switching between variants.
- **Fallback Image Safety**: Missing, null, or broken (404) product image URLs automatically fallback to `assets/images/empty-picture.png` using relative path resolving.
- **Strict HTML/JS Separation (<template> Pattern)**: 100% elimination of inline styles and `innerHTML` markup generation. Product cards, gallery thumbnails, variant pills, and swatches use `<template>` tags cloned via `.cloneNode(true)` and mounted via `.replaceChildren()`.

## Considered and Rejected
- **Client-side category descendant filtering**: Rejected because backend handles recursive child tree queries in a single indexed query (`/categories/{id}/products`), avoiding bulky client payloads.
- **Inline ordering / custom length calculator on Detail page**: Removed in Session #2 to simplify the user journey into clean "Mua ngay" and "Liên hệ tư vấn" flows, deferring exact sheet cutting configurations to checkout.
- **Hard-coded price hiding by user role**: Rejected because price visibility is permission-driven (`PRODUCT_PRICE_VIEW`) and configured by Admin.
- **String template literals with innerHTML for cards**: Rejected to prevent XSS vulnerabilities and maintain strict separation of concerns.

## Dependencies
- Backend Endpoints:
  - `GET /api/v1/categories/tree` (Category accordion sidebar)
  - `GET /api/v1/categories/{id}/products` (Recursive category products rollup)
  - `GET /api/v1/products` (Product catalog list & search filter)
  - `GET /api/v1/products/{id}` (Product detail data)
  - `GET /api/v1/search/suggestions` (Type-ahead autocomplete)
  - `GET /api/v1/colors` (Master color swatches)
- Shared Components:
  - `js/components/component-loader.js` (Header, Footer injection)
  - `js/components/header.js`, `footer.js`
- Utilities:
  - `js/api/client.js`, `js/api/product.api.js`
  - `js/utils/debounce.js`, `js/utils/format.js`, `js/utils/storage.js`
- Stylesheets:
  - `assets/css/base/variables.css`, `reset.css`, `global.css`
  - `assets/css/components/button.css`, `header.css`, `footer.css`
  - `assets/css/pages/catalog.css`, `product-detail.css`
- Depended by:
  - Homepage (`index.html`) product links
  - Header navigation menu

## Known Limitations
- ⚠️ Multi-filter URL sync: Currently supports `?keyword=` and `?category=`; complex combinations of brand/thickness filters are not yet fully serialized to URL query params.
- ⚠️ Offline caching: Service Worker / PWA caching for catalog products is deferred to later milestones.

## Refactor Log

### 2026-11-15 | @antigravity (Session #2)
- Upgraded category catalog to aggregate all descendant subcategories in `GET /api/v1/categories/{id}/products`.
- Implemented 300ms debounced type-ahead search with unaccented Vietnamese matching and keyboard navigation.
- Added Grid / List view mode switcher with `localStorage` persistence.
- Replaced shipping policy tab on Detail page with interactive **Bảng giá** (Variant × Unit matrix) with permission-driven price masking.
- Added **Bảng màu** tab fetching swatches from `GET /api/v1/colors`.
- Added `width` (khổ rộng tôn, mm) to technical specifications synced to active variant.
- Replaced inline custom size calculator on Detail page with simplified "Mua ngay" & "Liên hệ tư vấn" CTAs.
