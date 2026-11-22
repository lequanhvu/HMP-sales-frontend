# CONTEXT.md — Phân Hệ Xác Thực & Tài Khoản Khách Hàng (Auth)

> **Mô đun**: `pages/auth/`  
> **Phiên làm việc**: #5 | **Ngày tạo**: 2026-11-21 | **Tác giả**: @antigravity  
> **Công nghệ**: HTML5, CSS3 (BEM), Modern ES6 Modules, Google Identity Services (GIS) Web SDK, Spring Boot 4 REST API.

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ
Phân hệ Xác thực và Tài khoản chịu trách nhiệm quản lý toàn bộ luồng đăng nhập, phiên làm việc (Session) và phân quyền trải nghiệm cho Khách hàng (`CUSTOMER`) của hệ thống website thương mại điện tử Tôn Việt (HMP).

Theo quyết định kiến trúc đã thống nhất:
- Khách hàng đăng nhập thuận tiện, nhanh chóng và bảo mật 100% qua **Google Sign-In** (Google Identity Services SDK).
- Không sử dụng mật khẩu cục bộ cho tài khoản Khách hàng (tránh nguy cơ lộ mật khẩu và đơn giản hóa thao tác mua hàng).
- Trạng thái đăng nhập kiểm soát linh hoạt các quyền lợi: Tra cứu giá (`PRODUCT_PRICE_VIEW`), đặt hàng gia công tôn, xem lịch sử đơn hàng, quản lý sổ địa chỉ giao nhận.

---

## 2. Quyết Định Kiến Trúc & Thiết Kế Giao Diện

### 2.1. Thiết kế Giao diện (UI/UX)
* Phỏng theo nguyên mẫu thiết kế thực tế thương hiệu Tôn Việt:
  - **Ảnh nền toàn trang**: Sử dụng ảnh nhà xưởng & sóng tôn công nghiệp hiện đại `assets/images/auth/background.png` với kích thước bao phủ (`background-size: cover`), kết hợp lớp phủ gradient dịu mắt để tôn lên khối thẻ trung tâm.
  - **Thẻ Đăng nhập trung tâm (`.auth-card`)**: Bo tròn mềm mại (`border-radius: 28px`), hiệu ứng kính mờ (`backdrop-filter: blur(12px)`), độ đổ bóng sâu tạo cảm giác nổi khối sang trọng.
  - **Logo & Tiêu đề**: Biểu tượng mái nhà sóng tôn HMP, tiêu đề nổi bật *"Chào mừng bạn!"* với từ *"bạn!"* mang màu xanh công nghệ `#0066cc`.
  - **Nút Đăng nhập Google Pill**: Thiết kế nút bo tròn mềm mại dạng con nhộng (`border-radius: 9999px`), nền xanh đậm, chứa huy hiệu Google "G" 4 màu chính thức bên trái và mũi tên điều hướng bên phải.
  - **Huy hiệu Cam kết Bảo mật**: Icon khiên xanh và thông điệp *"Thông tin của bạn được bảo mật tuyệt đối"* nhằm tạo sự an tâm tối đa cho khách hàng.
  - **Công cụ Dev Localhost**: Cung cấp khu vực cấu hình nhanh Google Client ID lưu tạm vào `localStorage`, phục vụ việc kiểm thử trên môi trường nội bộ mà không cần chỉnh sửa trực tiếp mã nguồn.

---

## 3. Kiến Trúc Kỹ Thuật & Giải Pháp An Ninh (Security Architecture)

### 3.1. Phòng Chống Open Redirect (CWE-601)
* Module `js/auth/redirect-validator.js`:
  - Chuẩn hóa và so khớp tham số `?redirect=` với danh sách Whitelist các trang nội bộ hợp lệ (`ALLOWED_REDIRECT_PATHS`).
  - Chặn đứng mọi URL chứa protocol (`http:`, `https:`, `javascript:`, `data:`), URLs dạng protocol-relative (`//evil.com`, `/\evil.com`), ký tự CRLF injection (`\r`, `\n`).
  - Chặn chuyển hướng lặp vô tận về chính `/pages/auth/login.html` hoặc chuyển hướng vượt quyền vào phân hệ `/pages/admin/*`.
  - Fallback an toàn về trang chủ `/index.html`.

### 3.2. Quản Lý Phiên Đăng Nhập Qua HttpOnly Cookie (Cookie-Based Authentication)
* **Toàn bộ Token được lưu trong Cookie HttpOnly (Cách 1 - Chuẩn Bảo Mật Công Nghiệp)**:
  - **Access Token**: Backend tự động gắn vào cookie `access_token` với cờ `HttpOnly; SameSite=Lax; Path=/`.
  - **Refresh Token**: Backend tự động gắn vào cookie `refresh_token` với cờ `HttpOnly; SameSite=Lax; Path=/api/v1/auth`.
  - **Chống XSS Triệt Để (100%)**: JavaScript ở Frontend **tuyệt đối không chạm vào Token**, không lưu token vào `localStorage` hay `sessionStorage`. Trình duyệt web tự động đính kèm Cookie trong mọi request qua `credentials: 'include'`.
  - **Backend BearerTokenResolver Linh Hoạt**: Spring Security sử dụng `BearerTokenResolver` tùy biến:
    1. Ưu tiên đọc từ Header `Authorization: Bearer <token>` (cho Postman, Mobile, Swagger).
    2. Nếu không có header, tự động bóc tách từ Cookie `access_token` (cho Web Frontend).
  - **Kiểm Tra Trạng Thái Sống Qua Redis (100%)**: Dù nhận token từ Cookie hay Header, `RedisTokenValidationFilter` vẫn trích xuất `jti` và xác thực key `auth:access:{jti}` trên Redis. Đảm bảo hỗ trợ thu hồi tức thì (Instant Revocation) khi Logout hoặc khi Admin khóa tài khoản.
  - **Session Cache Cho UI**: `localStorage` chỉ lưu cờ nhẹ `hmp_has_session` và thông tin hiển thị cơ bản `hmp_user_info` (tên, role) để Header hiển thị ngay tức thì mà không bị chớp giật.
  - **Silent Token Rotation**: Khi `access_token` hết hạn (401 Unauthorized), `client.js` gọi ngầm `POST /api/v1/auth/refresh`. Backend tự động cấp lại cặp cookie mới và gửi lại request ban đầu mà không làm gián đoạn người dùng.

### 3.3. Phân Quyền Đa Tầng (Defense-in-Depth)
* **Frontend Guard (`auth.guard.js`)**: Kiểm tra và hỗ trợ điều hướng nhanh về trang đăng nhập đối với các trang riêng tư (Order, Profile, My Orders).
* **Backend Source of Truth**: Backend chịu trách nhiệm tối cao trong việc xác thực chữ ký JWT, kiểm tra trạng thái hoạt động trên Redis (`auth:access:{jti}`), kiểm tra Role và trả về HTTP 401/403. Người dùng không thể leo quyền bằng cách can thiệp mã nguồn phía Client.

---

## 4. Tệp Tin & Cấu Trúc Thành Phần Liên Quan

| Tệp tin | Trách nhiệm |
|---|---|
| `pages/auth/login.html` | Cấu trúc ngữ nghĩa trang Đăng nhập, tích hợp GIS container, thẻ `<template>` alert |
| `assets/css/pages/login.css` | Định kiểu giao diện đăng nhập BEM, Mobile-first, hiệu ứng kính mờ và nút pill |
| `js/pages/login.js` | Controller điều khiển luồng GIS SDK, tiếp nhận credential, gọi API và điều hướng |
| `js/auth/redirect-validator.js` | Module kiểm tra và làm sạch URL redirect, chống Open Redirect (CWE-601) |
| `js/auth/auth.state.js` | Quản lý in-memory Access Token, single-flight refresh, sự kiện reactive `hmp:auth-changed` |
| `js/auth/auth.guard.js` | Guard kiểm tra đăng nhập cho các trang riêng tư của khách hàng |
| `js/api/auth.api.js` | Dịch vụ gọi API xác thực (`/auth/google`, `/auth/refresh`, `/auth/logout`, `/me`) |
| `js/components/toast.js` | Component thông báo nổi đa trạng thái (Success, Error, Warning, Info) chuẩn BEM |
| `assets/css/components/toast.css` | Định kiểu thông báo nổi với animations trượt mượt mà |
| `js/components/header.js` | Tích hợp menu dropdown hồ sơ người dùng, hiển thị Role, xử lý đăng xuất |
