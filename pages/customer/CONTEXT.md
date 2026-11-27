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
  - `GET /api/v1/me`, `PATCH /api/v1/me`, `POST /api/v1/me/otp/request`, `POST /api/v1/me/otp/verify`
  - `GET /api/v1/me/addresses`, `POST /api/v1/me/addresses`, `PATCH /api/v1/me/addresses/{id}`, `DELETE /api/v1/me/addresses/{id}`
- Frontend Modules:
  - `js/api/user.api.js`, `js/api/cart.api.js`, `js/api/order.api.js`, `js/api/delivery.api.js`, `js/api/provinces.api.js`, `js/api/client.js`
  - `js/auth/auth.state.js`, `js/auth/auth.guard.js`
  - `js/components/component-loader.js`, `js/components/toast.js`, `js/components/confirm-modal.js`, `js/components/map-picker.js`
  - `js/utils/format.js`, `js/utils/storage.js`

## Refactor Log
### 2026-11-27 | @antigravity (Session #33)
- **Chuẩn hóa Hiệu ứng Hover Nút Trạng Thái & Nút Sidebar Đã Chọn (Standardize Button Hover)**:
  - Khắc phục triệt để lỗi màu nền sáng chói làm mất chữ khi hover vào các nút đang active / selected:
    - Tab trạng thái đang chọn: `.orders-tab-btn--active:hover` chuyển màu nền đậm đà `var(--color-primary-hover, #0c3e8e)` và giữ màu chữ trắng sáng `#ffffff` rõ nét, tương tự như hiệu ứng hover của nút "Lọc Đơn Hàng" (`.btn--primary:hover`).
    - Nút sidebar đang chọn: `.customer-sidebar__link--active:hover` cũng chuyển sang `var(--color-primary-hover, #0c3e8e)` với chữ trắng `#ffffff`, không còn bị đổi sang màu xanh nhạt `#e0f2fe` gây chói mắt.
    - Nút trang đang chọn: `.pagination-btn--active:hover` đồng bộ hiệu ứng màu `#0c3e8e`.
    - Nút điều hướng Header: `.nav__link--active:hover` chuyển màu chữ và vạch kẻ sang `var(--color-primary-hover)`.
  - Phân tách rõ ràng trạng thái chưa chọn `:hover:not(.active)` và đã chọn `.active:hover` trên toàn bộ hệ thống CSS ([my-orders.css](file:///d:/HMP/sales-frontend/assets/css/pages/my-orders.css), [sidebar.css](file:///d:/HMP/sales-frontend/assets/css/components/sidebar.css), [profile.css](file:///d:/HMP/sales-frontend/assets/css/pages/profile.css), [header.css](file:///d:/HMP/sales-frontend/assets/css/components/header.css), [order-detail.css](file:///d:/HMP/sales-frontend/assets/css/pages/order-detail.css)).

### 2026-11-27 | @antigravity (Session #32)
- **Chuẩn hóa Header Tab Trạng Thái & Cố Định Sticky Sidebar**:
  - Tinh gọn & chuẩn hóa tên 7 Tabs trạng thái đơn hàng trên Header: `Tất cả` (`ALL`), `Chờ xác nhận` (`PENDING`), `Đã xác nhận` (`CONFIRMED`), `Đang xử lý` (`PROCESSING`), `Đang giao` (`SHIPPING`), `Hoàn thành` (`COMPLETED`), `Đã hủy` (`CANCELLED`).
  - Đồng bộ `ORDER_STATUS_MAP` trong `js/utils/i18n.js` để badge trạng thái trên các thẻ đơn hàng hiển thị chính xác tương ứng.
  - Cố định Sidebar bên trái (`.customer-sidebar`): Sử dụng `position: sticky; top: calc(76px + 1.25rem); align-self: start;` trên desktop (`min-width: 992px`) giúp Sidebar giữ nguyên vị trí ở top-left khi người dùng trượt / cuộn trang xuống.
  - Áp dụng đồng bộ cho cả trang Đơn hàng của tôi (`my-orders.html`) và Thông tin cá nhân (`profile.html`).

### 2026-11-27 | @antigravity (Session #31)
- **Khắc phục triệt để lỗi tràn khối chi tiết đơn hàng (Modal Spill) và Chuẩn hóa 100% Clean Code**:
  - Loại bỏ hoàn toàn khối HTML `#order-detail-modal-overlay` dư thừa dưới đáy trang `my-orders.html` (do chi tiết đơn hàng đã chuyển sang trang chuyên biệt `order-detail.html`).
  - Bổ sung định kiểu chuẩn `.modal-overlay`, `.modal-overlay--open`, `.modal-dialog`, `.modal-dialog--sm`, `.modal-header`, `.modal-body`, `.modal-footer` vào `my-orders.css` để bảo đảm modal xác nhận hủy đơn (`#cancel-order-modal-overlay`) hoạt động chuẩn xác, không bị hiển thị thô trên luồng tài liệu.
  - Xóa bỏ 100% thuộc tính `style="..."` (Zero inline styles) trên cả `my-orders.html` và `order-detail.html`. Toàn bộ định kiểu được quy hoạch thành các class CSS BEM trong `my-orders.css` và `order-detail.css`.
  - Tối ưu hóa điều hướng xem chi tiết: Nút "Xem chi tiết" dẫn mượt mà tới `order-detail.html?id=...` với layout chuẩn mẫu thiết kế.
  - Thêm tiền tố cache-busting `?v=20261127_05` để ngăn trình duyệt lưu cache cũ.

### 2026-11-27 | @antigravity (Session #30)
- **Tối ưu hóa Giao diện Sidebar Khách hàng & Điều hướng Header**:
  - Khắc phục triệt để lỗi Sidebar không nhận CSS: Nhúng bổ sung `sidebar.css` và đóng gói toàn diện kiểu dáng `.customer-sidebar` trực tiếp trong `my-orders.css`.
  - Cập nhật `highlightActiveNav()` trong `component-loader.js` nhận diện URL `my-orders.html` và `order-detail.html` để đánh dấu active (gạch chân xanh) chính xác vào mục **"Đơn hàng"** trên Header.
  - Sửa lỗi hiển thị tổng tiền cho đơn hàng mới tạo ở trạng thái `PENDING`: Hiển thị rõ ràng nhãn nghiêng *"Đang chờ Quản lý tính giá"*, tránh hiển thị `0 đ`.
- **Xây dựng Mới Trang Chi Tiết Đơn Hàng Chuyên Biệt Chuẩn Mẫu Thiết Kế (`pages/customer/order-detail.html`, `order-detail.css`, `order-detail.js`)**:
  - **Breadcrumb điều hướng**: `Trang chủ > Đơn hàng của tôi > Chi tiết đơn hàng`.
  - **Thẻ tóm tắt 3 cột**: Mã đơn hàng `#...`, ngày đặt hàng và huy hiệu trạng thái.
  - **Thanh tiến trình ngang (Horizontal Stepper)**: 4 mốc tiến độ trực quan (`Đặt hàng` -> `Đang xử lý` -> `Đang giao` -> `Đã giao`) với line nối chuyển màu xanh và mốc thời gian động.
  - **2 Thẻ thông tin độc lập**: Thông tin giao hàng (họ tên, SĐT, địa chỉ nhận hàng) & Phương thức thanh toán/vận chuyển (COD, giao tận nơi/bốc tại xưởng).
  - **Bảng danh sách sản phẩm**:
    - Hiển thị đầy đủ: STT, hình ảnh đại diện sản phẩm, tên sản phẩm, đơn giá, số lượng, thành tiền.
    - **Đặc biệt theo yêu cầu**: Hiển thị dòng mô tả yêu cầu khách hàng (chiều dài, màu sắc, biến thể và quy cách gia công bẻ chấn chi tiết `dimensions`) bằng chữ màu xám thanh lịch `#64748b` ngay bên dưới tên sản phẩm.
  - **Thanh tổng kết chân trang**: Tổng cộng số tiền, nút *"In hóa đơn"* (tích hợp `@media print` ẩn header/footer) và nút *"Quay lại"* danh sách đơn hàng.
### 2026-11-28 | @antigravity (Session #35)
- **Hoàn thiện Giao diện Danh sách Thông báo Phân trang & Mốc thời gian**:
  - Xây dựng trang `pages/customer/notifications.html`, `assets/css/pages/notifications.css`, `js/pages/notifications.js`.
  - Phân cụm các thông báo theo **Mốc thời gian (Milestone Groups)**: "Hôm nay", "Hôm qua", "Tuần này", "Tháng này", "Trước đó" với thanh kẻ phân cách tinh tế.
  - Thẻ thông báo phân loại theo `NotificationType` với icon SVG màu sắc chuyên biệt (tạo đơn, chốt duyệt, gia công, đang giao, hoàn thành, đã hủy, khôi phục).
  - Tích hợp liên kết chuyển nhanh đến trang Chi tiết đơn hàng `order-detail.html?id=...` và tự động đánh dấu đã đọc.
  - Phân trang đầy đủ (Previous, Next, số trang) và bộ lọc tabs: "Tất cả", "Chưa đọc", "Đơn hàng".
  - Hiệu chỉnh logic bóc tách `PageResponse`: backend trả về trường `result` (thay vì `items`), sửa thành `pageRes?.result || pageRes?.items` để toàn bộ thông báo từ database hiển thị đầy đủ, phân cụm chuẩn xác và phân trang chính xác.
  - Đảm bảo 100% số lượng thông báo được lấy động từ `GET /api/v1/notifications/unread-count`, loại bỏ hoàn toàn các giá trị khởi tạo tĩnh trong template HTML.
  - Bổ sung `js/api/notification.api.js` và cập nhật sự kiện `hmp:notifications-updated` đồng bộ realtime số lượng chưa đọc trên Header và Sidebar.

### 2026-11-28 | @antigravity (Session #31)
- **Đồng bộ hóa giao diện thanh điều hướng Breadcrumb**:
  - Tạo component dùng chung `assets/css/components/breadcrumb.css` chuẩn theo thiết kế thực tế (dấu gạch chéo `/`, màu slate thanh lịch `#64748b`, chữ đậm leaf `#1e293b`, hover xanh thương hiệu `#1351b4`).
  - Đồng bộ cấu trúc và giao diện Breadcrumb trên toàn bộ các trang: `pages/customer/order-detail.html`, `pages/customer/cart.html`, `pages/customer/order.html`, và `pages/product/detail.html`.
  - Loại bỏ các CSS breadcrumb dư thừa hoặc lệch kiểu trong `order-detail.css`, `order.css`, `product-detail.css`.
- **Tối ưu hóa Header & Active Cart Icon**:
  - Sửa logic `highlightActiveNav` trong `component-loader.js`: khi người dùng ở trang Giỏ hàng (`cart.html`), icon Giỏ hàng trên Header được kích hoạt trạng thái `.header__cart-btn--active` (nền xanh nhạt, icon xanh đậm), không còn kích hoạt nhầm mục "Trang chủ".
  - Thêm quy chuẩn hover đậm màu `#0c3e8e` cho tất cả các nút bấm thương hiệu xanh và icon button.
- **Thực hiện tính năng Xóa địa chỉ ở Thông tin cá nhân**:
  - Tích hợp `showConfirmModal` từ `confirm-modal.js` thay thế toàn bộ `window.confirm` nguyên thủy.
  - Kết nối chính xác `userApi.deleteAddress(addressId)` và tự động tải lại danh sách sổ địa chỉ nhận hàng sau khi xóa.
- **Tính năng Hoàn tác hủy đơn hàng hoàn chỉnh**:
  - Hỗ trợ khôi phục đơn hàng trên cả trang Quản lý đơn hàng (`my-orders.html`) và trang Chi tiết đơn hàng (`order-detail.html`).
  - Đếm ngược thời gian trong cửa sổ 60 phút sau khi hủy đơn hàng.
  - Bổ sung nút Hủy đơn, nút Hoàn tác hủy và Modal hủy đơn với dropdown chọn lý do chuẩn phong cách HMP trên trang Chi tiết đơn hàng.

### 2026-11-27 | @antigravity (Session #29)
- **Hoàn thành Phase 5: Trang Quản lý Đơn hàng của tôi (`pages/customer/my-orders.html`, `my-orders.css`, `my-orders.js`)**:
  - **Thanh Tabs Lọc Trạng Thái Đơn Hàng**:
    - Hỗ trợ 7 tabs trạng thái mượt mà: Tất cả (`ALL`), Chờ tính giá (`PENDING`), Đã chốt giá (`CONFIRMED`), Đang gia công tôn (`PROCESSING`), Đang giao hàng (`SHIPPING`), Hoàn thành (`COMPLETED`), Đã hủy (`CANCELLED`).
    - Lọc linh hoạt theo khoảng ngày (`dateFrom`, `dateTo`).
  - **Danh Sách Thẻ Đơn Hàng Chuẩn E-commerce**:
    - Hiển thị mã đơn hàng `#orderId`, ngày đặt, huy hiệu trạng thái chuẩn BEM tương ứng với từng trạng thái (`order-status-badge--*`).
    - Thông tin người nhận, hình thức nhận hàng (`SHIPPING` kèm khoảng cách km / `PICKUP` tự bốc tại xưởng).
    - Hiển thị giá tiền format VND (`formatVnd`) hoặc nhãn *"Đang chờ Quản lý tính giá"* khi đơn mới tạo.
    - Xử lý hành động nghiệp vụ theo trạng thái:
      - Khi đơn ở trạng thái `PENDING` hoặc `CONFIRMED`: hiển thị nút **"Hủy đơn"** mở popup xác nhận và nhập lý do hủy.
      - Khi đơn ở trạng thái `CANCELLED`: hiển thị nút **"Hoàn tác hủy"** cho phép khôi phục đơn hàng trong vòng 60 phút sau khi hủy.
  - **Modal Chi Tiết Đơn Hàng Toàn Diện**:
    - Xem thông tin người nhận, địa chỉ, phương thức vận chuyển và ghi chú đặt hàng.
    - Bảng thông số chi tiết các dòng tôn: quy cách chiều dài (m), kích thước bẻ chấn chi tiết (`dimensions`), màu sắc, đơn giá, số lượng, thành tiền.
    - Khối tóm tắt tài chính: Tổng tiền hàng, chiết khấu của Quản lý (`discountAmount`), tổng thanh toán, ghi chú chiết khấu.
    - Dòng thời gian lịch sử trạng thái (Status Timeline): Hiển thị từng mốc chuyển đổi trạng thái với thời gian và lý do.
  - **API & Phân trang**:
    - Bổ sung hàm `undoCancelOrder(orderId)` trong `js/api/order.api.js`.
    - Phân trang 0-indexed backend sang 1-indexed UI (`orders-pagination`).
    - Chuyển hướng nhanh từ màn hình đặt hàng thành công (`order.html`) sang `my-orders.html`.

### 2026-11-27 | @antigravity (Session #28)
- Phát triển hoàn thiện Trang Thông tin cá nhân & Sổ địa chỉ (`pages/customer/profile.html`, `profile.css`, `profile.js`):
  - **Lối tắt Avatar Dropdown**: Bổ sung liên kết *"Thông tin cá nhân"* (`data-link="profile"`) và *"Đơn hàng của tôi"* (`data-link="my-orders"`) vào dropdown menu của Avatar trên Header (cả desktop và mobile drawer).
  - **Hồ sơ cá nhân & Đổi tên**: Tích hợp `GET /api/v1/me` và `PATCH /api/v1/me`, cập nhật họ tên, lưu vết vào storage và cập nhật tức thì trên giao diện Sidebar.
  - **Quy trình Liên kết / Đổi Số điện thoại qua OTP**:
    - Tích hợp `POST /api/v1/me/otp/request` và `POST /api/v1/me/otp/verify`.
    - Modal nhập số điện thoại, đếm ngược 60 giây và cho phép gửi lại mã OTP.
    - Huy hiệu trạng thái *"✓ Đã xác thực OTP"* trực quan.
  - **Phân hệ Quản lý Sổ địa chỉ (Address Book CRUD)**:
    - Xem danh sách địa chỉ nhận hàng cá nhân (`GET /api/v1/me/addresses`).
    - Thêm địa chỉ mới (`POST /api/v1/me/addresses`) và Cập nhật (`PATCH /api/v1/me/addresses/{id}`).
    - Lưới chọn địa giới hành chính 3 cấp (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã) từ `provincesApi`.
    - Tự động tìm kiếm tọa độ (Forward Geocoding) và tích hợp bản đồ chọn vị trí `MapPicker` (Esri World Street Map, Esri World Imagery vệ tinh, định vị GPS).
    - Thiết lập địa chỉ mặc định và Xóa địa chỉ (`DELETE /api/v1/me/addresses/{id}`).
  - Thêm module API `js/api/user.api.js`.
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
