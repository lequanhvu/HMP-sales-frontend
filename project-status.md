# Project Status — Sales Website Frontend

> Last updated: 2026-11-11 | By: @antigravity | Session: #1
>
> AI: update this file at the end of every session when asked.
> Follow this exact format. Preserve full milestone checklists and project specifications.

---

## Completed
- ✅ **Trang Chi Tiết Sản Phẩm Tôn Sóng (`pages/product/detail.html`)**:
  - Giao diện thư viện ảnh đa góc nhìn (ảnh chính R2 + danh sách thumbnail phụ đổi ảnh mượt mà).
  - Bộ chọn biến thể tôn (độ dày mm, loại sóng) và danh sách màu sắc thực tế.
  - Form nhập kích thước gia công tôn: Chiều dài (mét, hỗ trợ số thập phân), Số lượng (tấm, nút stepper +/-), nút chọn nhanh kích thước (3m, 4m, 5m, 6m).
  - Bảng tính tự động cập nhật tổng tiền theo thời gian thực theo công thức nghiệp vụ: `UnitPrice × Size × Quantity`.
  - Kiểm soát linh hoạt quyền xem giá `PRODUCT_PRICE_VIEW`: tự động chuyển sang badge *"Liên hệ báo giá"* khi caller chưa có quyền, không bao giờ lộ `0 VNĐ` hay `NaN`.
  - Tách biệt 100% dữ liệu và giao diện qua các thẻ `<template>` (`gallery-thumb-template`, `variant-pill-template`, `color-swatch-template`).
  - Hệ thống tab chi tiết: Mô tả sản phẩm, Thông số kỹ thuật (bảng specs chuẩn), Chính sách chất lượng & vận chuyển nhà máy.
- ✅ **Thiết kế Giao diện Trang chủ Chuẩn Mẫu Thực tế (Xanh dương & Trắng)**:
  - Cập nhật ảnh nền Banner thực tế từ `assets/images/home/banner-home.png` với lớp phủ chuyển màu xanh công nghiệp, làm nổi bật tiêu đề *"Giải pháp tôn lợp mái cho mọi công trình"* và nút bấm bo tròn *"Xem danh mục sản phẩm $\rightarrow$"*.
  - Loại bỏ hoàn toàn nút chuyển slide `< >` và 3 chấm phân trang trên Banner theo yêu cầu.
  - Tinh giản Header: Gỡ bỏ biểu tượng giỏ hàng (hệ thống đặt hàng trực tiếp không qua giỏ), giữ lại nút Tìm kiếm và Đăng nhập chuẩn mẫu.
  - Xây dựng khối 4 Thẻ Cam kết / Lợi thế (Sản phẩm đa dạng, Chất lượng uy tín, Giao hàng nhanh, Tư vấn miễn phí).
  - Khởi tạo khối danh mục sản phẩm tuân thủ nghiêm ngặt chuẩn thẻ `<template id="product-card-template">` và BEM CSS.
- ✅ **Khởi tạo Nền tảng & Kiến trúc Frontend Dự án (Vanilla HTML, CSS, JS)**:
  - Thiết lập cấu trúc thư mục chuẩn tách biệt: `assets/css/` (`base`, `components`, `pages`), `js/` (`api`, `components`, `pages`, `utils`).
  - Xây dựng bộ quy tắc & hướng dẫn tác nhân (`AGENTS.md`, `.agents/rules/project-rules.md`, `.agents/commands/`).
  - Thiết lập chuẩn kết nối API Spring Boot 4 (`http://localhost:8080/api/v1`) với xử lý envelope `{ statusCode, data, message, timestamp }`, Cookie HttpOnly (`credentials: 'include'`), và cơ chế Silent Refresh Token tự động.
  - Định hình quy chuẩn nghiệp vụ đặc thù: Tính giá tôn lợp mái (`UnitPrice × Size × Quantity`), kiểm soát quyền xem giá (`PRODUCT_PRICE_VIEW` ẩn giá thành "Liên hệ báo giá"), quy trình OTP số điện thoại và chuyển đổi phân trang 0-indexed.

---

## In Progress
_Nothing._

---

## Deferred Issues
- **[P2]** Google Identity Services Client ID: Lấy Client ID chính thức từ Google Cloud Console để cấu hình vào nút Google Sign-In.
- **[P2]** CDN vs Local Icons: Lựa chọn nhúng thư viện icon (Bootstrap Icons / FontAwesome qua CDN hoặc SVG nội bộ).
- **[P3]** PWA / Service Worker: Cân nhắc cấu hình bộ nhớ đệm offline cho trang catalog tôn sóng trong các pha sau.

---

## Warnings
- ⚠️ **Chạy qua Local Server**: Tuyệt đối không mở file trực tiếp `file:///` để tránh bị trình duyệt chặn CORS; luôn chạy qua Live Server hoặc máy chủ tĩnh.
- ⚠️ **Cookie & Refresh Token**: Mọi request `fetch()` phải thiết lập `credentials: 'include'` để gửi và nhận Cookie HttpOnly lưu Refresh Token.
- ⚠️ **Phân trang 0-indexed**: Backend trả về `meta.page` bắt đầu từ `0`. Frontend phải cộng thêm 1 khi hiển thị trên giao diện người dùng.
- ⚠️ **Quyền xem giá (`PRODUCT_PRICE_VIEW`)**: Khi giá trả về `null`, phải hiển thị *"Liên hệ báo giá"*, tuyệt đối không hiển thị `0 VNĐ` hay `NaN`.
- ⚠️ **Chống XSS**: Không dùng `innerHTML` để hiển thị dữ liệu do người dùng nhập hoặc từ API trả về; dùng `textContent` hoặc `createElement`.
- ⚠️ **Công thức tôn sóng**: Tôn lợp mái có kích thước chiều dài linh hoạt; form đặt hàng cần cho phép nhập số thập phân (ví dụ: `5.5m`).

---

## Next Tasks
1. **[P1]** Xây dựng `js/api/client.js` và `js/utils/format.js`, `storage.js` chuẩn hóa gọi API backend.
2. **[P1]** Xây dựng bộ CSS cơ sở: `variables.css` (bảng màu thương hiệu tôn), `reset.css`, `global.css`, `button.css`.
3. **[P1]** Triển khai Component Header/Navbar responsive (menu danh mục cấp 1-2 từ `GET /api/v1/categories/tree` và ô tìm kiếm nhanh).
4. **[P2]** Xây dựng trang chủ `index.html` với danh sách sản phẩm nổi bật và phân trang.

---

## Milestones

### Phase 0 — Nền tảng, Khung Dự án & API Client
- [x] Tạo cấu trúc thư mục chuẩn (`assets/`, `js/`, `.agents/`)
- [x] Soạn thảo `AGENTS.md`, `project-rules.md`, `project-status.md`, `architecture.md`
- [x] Xây dựng file `variables.css` (Bảng màu, font chữ, biến giao diện)
- [x] Xây dựng file `reset.css` và `global.css`
- [x] Xây dựng `client.js` (Wrapper fetch API, xử lý Bearer JWT, credentials, silent refresh khi 401)
- [x] Xây dựng các hàm tiện ích `format.js` (formatVnd, formatDate) và `storage.js`

### Phase 1 — Điều hướng, Danh mục & Tìm kiếm nhanh
- [x] Xây dựng Component Header responsive (Logo, Menu danh mục động, Ô tìm kiếm, Nút đăng nhập/tài khoản)
- [x] Tích hợp API `GET /api/v1/categories/tree` render menu danh mục đa cấp
- [ ] Xây dựng Component ô tìm kiếm nhanh với Debounce gọi API `GET /api/v1/search/suggestions` (Type-ahead)
- [x] Xây dựng Component Footer thông tin liên hệ và chính sách

### Phase 2 — Danh sách & Chi tiết Sản phẩm Tôn sóng
- [x] Xây dựng Component thẻ sản phẩm (`product-card.css`) hiển thị ảnh, tên, thương hiệu, giá hoặc "Liên hệ báo giá"
- [x] Xây dựng Trang chủ (`index.html`) hiển thị sản phẩm phân trang (`GET /api/v1/products`) theo chuẩn `<template>`
- [x] Xây dựng Trang chi tiết sản phẩm (`pages/product/detail.html` & `js/pages/product-detail.js`):
  - [x] Hiển thị thư viện ảnh (ảnh đại diện, ảnh phụ)
  - [x] Bộ chọn biến thể (độ dày, mã biến thể)
  - [x] Bộ chọn màu sắc (hiển thị ảnh mẫu màu lấy từ Cloudflare R2 / danh sách màu)
  - [x] Bảng giá theo đơn vị tính (m, tấm) — kiểm soát quyền `PRODUCT_PRICE_VIEW`
  - [x] Form nhập chiều dài (mét) và số lượng (tấm) kèm tự động tính nhẩm thành tiền `UnitPrice × Size × Quantity`

### Phase 3 — Xác thực Khách hàng & Sổ địa chỉ
- [ ] Tích hợp Google Identity Services (GIS SDK): Đăng nhập Google, lấy ID Token gửi về `POST /api/v1/auth/google` (`pages/auth/login.html`)
- [ ] Lưu trạng thái đăng nhập, cập nhật Header hiển thị tên & avatar người dùng
- [ ] Trang thông tin tài khoản (`pages/customer/profile.html`): xem thông tin `GET /api/v1/me`, đổi tên, đổi SĐT qua xác thực OTP
- [ ] Quản lý sổ địa chỉ giao hàng (`GET/POST/PATCH/DELETE /api/v1/me/addresses`)

### Phase 4 — Quy trình Đặt hàng Tôn sóng & Xác thực OTP
- [ ] Trang đặt hàng (`pages/customer/order.html`):
  - [ ] Tóm tắt sản phẩm tôn đã chọn (chiều dài, số lượng, màu sắc, đơn giá snapshot)
  - [ ] Chọn địa chỉ giao hàng từ sổ địa chỉ hoặc nhập thông tin người nhận mới
  - [ ] Modal xác thực OTP số điện thoại: đếm ngược 60s, nhập 6 số gửi `POST /api/v1/orders/otp/verify`
  - [ ] Gửi đơn hàng `POST /api/v1/orders` (trạng thái khởi tạo `PENDING`)
  - [ ] Trang thông báo đặt hàng thành công

### Phase 5 — Theo dõi Đơn hàng & Quản lý Trạng thái Khách hàng
- [ ] Trang danh sách đơn hàng của tôi (`pages/customer/my-orders.html`):
  - [ ] Lọc theo trạng thái (`PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `COMPLETED`, `CANCELLED`)
  - [ ] Xem chi tiết đơn hàng: trạng thái, tổng tiền khi Quản lý đã tính giá
  - [ ] Hủy đơn hàng trong cửa sổ cho phép (`POST /api/v1/orders/{orderId}/cancel`)
  - [ ] Hoàn tác hủy đơn hàng (`POST /api/v1/orders/{orderId}/undo-cancel`) trong vòng 60 phút
- [ ] Component chuông thông báo đơn hàng (`GET /api/v1/notifications`, đánh dấu đã đọc)

### Phase 6 — Cổng Quản lý / Quản trị viên (Manager & Admin Portal)
- [ ] Giao diện Đăng nhập Quản lý / Admin
- [ ] Quản lý đơn hàng (`pages/admin/orders.html`): Xem danh sách đơn `PENDING`, form nhập đơn giá / chiết khấu và tính giá (`/calculate`), nút xác nhận đơn (`/confirm`), cập nhật trạng thái đơn (`/status`)
- [ ] Quản lý danh mục & sản phẩm (`pages/admin/products.html`): Thêm danh mục con, tạo sản phẩm, upload ảnh
- [ ] Quản lý Master data (`pages/admin/master-data.html`): Quản trị thương hiệu, đơn vị tính, màu sắc (upload ảnh mẫu màu 1 bước)

---

## Definition of Done

Một trang hoặc thành phần được coi là Hoàn thành khi:
1. Giao diện hiển thị đúng chuẩn responsive trên cả Desktop và Mobile.
2. Tích hợp API thành công, xử lý đầy đủ các trạng thái Loading, Thành công, và Báo lỗi thân thiện.
3. Tuân thủ chuẩn BEM và CSS Variables, không dùng CSS/JS nội dòng.
4. Xử lý an toàn dữ liệu đầu vào (chống XSS) và kiểm soát hiển thị giá theo quyền `PRODUCT_PRICE_VIEW`.
5. Đã cập nhật và đánh dấu hoàn thành trong `project-status.md`.

