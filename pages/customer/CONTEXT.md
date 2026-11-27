# Customer Module (Cart & Checkout) — Implementation Context
> Written: 2026-11-25 | Author: @antigravity

## Business & UX Context
The Customer Module (`pages/customer/`) provides a complete, modern e-commerce shopping and ordering experience for roofing sheets, gutters, flashings, and retail accessories:
1. **Shopee-style Shopping Experience**:
   - Customers buying a single item can click **"Mua ngay"** on the product detail page to skip the cart and navigate directly to the order checkout page (`order.html?mode=buy-now`).
   - Customers buying multiple items can click **"Thêm vào giỏ"** on the product detail page, then go to the Cart page (`cart.html`), review items, tick checkboxes for items they wish to order, and proceed to checkout (`order.html?mode=cart`).
2. **Dynamic Product Specification Input**:
   - Input forms dynamically adjust based on `ProductType`:
     - `ROOFING_SHEET`: Custom sheet cutting length (meters, with quick buttons 3m, 4m, 5m, 6m) and sheet quantity; geometric bending dimensions hidden.
     - `GUTTER` / `GABLE_FLASHING` / `RIDGE_CAP`: Length, complex bending cross-section dimensions (`dimensions`), and quantity.
     - `RETAIL`: Length and dimensions hidden; standard unit quantity.
     - `UNKNOWN`: All input fields visible to allow custom manufacturing requests.
3. **Cart Retention Policy**:
   - **Crucial Business Rule**: When an order is placed successfully from the cart, the system **DOES NOT DELETE OR CLEAR CART ITEMS**. Items are preserved in the user's cart so customers can reorder the exact custom items easily.

## Technical & UI Decisions
- **Cart API Integration (`/api/v1/cart/**`)**:
  - `GET /cart`: Retrieves user's cart items, sorted descending by `updatedAt DESC`.
  - `PATCH /cart/items/{id}`: Real-time stepper updates (`[-] / [+]`) for item quantity.
  - `DELETE /cart/items/{id}` & `DELETE /cart/clear`: Modal-confirmed item removal and cart clearing.
  - `GET /cart/count`: Syncs cart badge counter across desktop header and mobile drawer via custom DOM event `hmp:cart-updated`.
- **Checkout Flow (`order.html`)**:
  - Distinguishes two entry modes: `mode=buy-now` (reads from `sessionStorage: hmp_buy_now_item`) and `mode=cart` (reads selected items from `sessionStorage: hmp_cart_checkout_items`).
  - Fetches customer delivery addresses from `GET /api/v1/me/addresses`, allows instant address creation via `POST /api/v1/me/addresses`.
  - Submits order via `POST /api/v1/orders` with atomic transaction handling in backend.
- **Strict Clean Code & Security**:
  - 0% inline `style="..."` attributes.
  - 0% `innerHTML` with raw user data (prevents XSS vulnerabilities).
  - Uses `<template id="cart-item-template">`, `<template id="order-summary-item-template">`, `<template id="address-radio-template">`, and native DOM APIs (`replaceChildren`, `createDocumentFragment`).
  - Mobile-first responsive layouts with BEM naming conventions.

## Dependencies
- Backend Endpoints:
  - `GET /api/v1/cart`, `GET /api/v1/cart/count`, `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/{id}`, `DELETE /api/v1/cart/items/{id}`, `DELETE /api/v1/cart/clear`
  - `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/{id}`
  - `GET /api/v1/me/addresses`, `POST /api/v1/me/addresses`
- Frontend Modules:
  - `js/api/cart.api.js`, `js/api/order.api.js`, `js/api/client.js`
  - `js/auth/auth.state.js`
  - `js/components/component-loader.js`, `js/components/toast.js`
  - `js/utils/format.js`

## Refactor Log
### 2026-11-27 | @antigravity (Session #27)
- Tích hợp tính năng Ghim vị trí bản đồ & Kiểm soát bán kính giao hàng (Delivery Radius Enforcement):
  - Sử dụng giải pháp bản đồ mở sản xuất chuẩn (Option 2): CartoDB Voyager CDN (đầy đủ đường sá, khối nhà chi tiết cao), Esri World Imagery (ảnh vệ tinh độ nét cao) và Esri World Street Map. Hoàn toàn 0 đồng, không cần thẻ ngân hàng, không vi phạm bản quyền Google.
  - Tích hợp định vị địa chỉ tự động (Forward Geocoding qua ArcGIS): Khách nhập địa chỉ (thôn/xã/huyện) hệ thống tự động tìm và ghim vị trí trên bản đồ, hỗ trợ kéo thả ghim đỏ để tinh chỉnh.
  - Hỗ trợ 2 phương thức nhận hàng: "Giao hàng tận nơi" (`SHIPPING`) vs "Khách tự bốc hàng tại xưởng" (`PICKUP`).
  - Tự động gọi API `GET /api/v1/delivery/check-distance` tính toán khoảng cách thực tế từ xưởng HMP đến vị trí ghim của khách hàng.
  - Cảnh báo trực quan (huy hiệu xanh/đỏ) và chặn tạo đơn nếu vị trí giao hàng vượt quá bán kính quy định (mặc định 25km). Cho phép khách chuyển sang "Tự bốc hàng tại xưởng" hoặc gọi Hotline.
  - Thêm module API `js/api/delivery.api.js` và component `js/components/map-picker.js`.

### 2026-11-25 | @antigravity (Session #6)
- Implemented `ProductType` dynamic form field rendering in `product-detail.js`.
- Added Cart button and live badge counter to Header component with `hmp:cart-updated` event.
- Built Cart page (`pages/customer/cart.html`, `cart.css`, `cart.js`) with Select All, timestamp milestones, item stepper, delete modal, and sticky bottom bar.
- Built Order checkout page (`pages/customer/order.html`, `order.css`, `order.js`) supporting both `buy-now` and `cart` modes, address management, and post-order cart retention.
