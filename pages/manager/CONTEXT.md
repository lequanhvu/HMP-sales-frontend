# CONTEXT.md — Phân Hệ Điều Hành Kinh Doanh (Manager Portal)

> **Mô đun**: `pages/manager/`  
> **Phiên làm việc**: #6 | **Ngày tạo**: 2026-11-22 | **Tác giả**: @antigravity  
> **Công nghệ**: HTML5, CSS3 (BEM), Modern ES6 Modules, SVG Data Visualization, Spring Boot 4 REST API.

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ
Phân hệ Điều hành Kinh doanh (`pages/manager/`) dành cho Quản lý (`MANAGER`), phục vụ trực tiếp công tác điều phối đơn hàng gia công tôn, theo dõi tiến độ phê duyệt - gia công - giao hàng, và nắm bắt số lượng đơn đặt mới nhất hàng ngày.

---

## 2. Thiết Kế Giao Diện & Tính Năng Màn Hình Tổng Quan (`dashboard.html`)
Theo mẫu thiết kế thực tế điều hành kinh doanh HMP:
- **Cấu trúc bố cục (Layout)**:
  - **Sidebar Xanh Navy**: Menu tinh gọn 4 mục trọng tâm (Tổng quan active, Đơn hàng, Sản phẩm, Khách hàng), logo thương hiệu `assets/images/logo/logo-hmp-removed-background-v2.png`, thẻ chân trang Quản lý điều hành kinh doanh với avatar `assets/images/avatar-empty.jpg`.
  - **Top Header**: Thanh tiêu đề, chuông thông báo, menu dropdown tài khoản Quản lý (Hiện nút Đăng xuất kèm hộp thoại Confirm Logout chuẩn HMP).
- **Khối Thẻ Chỉ Số Trạng Thái Đơn Hàng (Metric Cards Grid 3 Cột)**:
  1. **Đơn chờ xác nhận**: Thẻ nền cam nhạt, lấy động từ `GET /api/v1/manager/orders?status=PENDING&size=1` (`totalElements`), icon đồng hồ cát.
  2. **Đang xử lý**: Thẻ nền đỏ/hồng nhạt, lấy động từ `GET /api/v1/manager/orders?status=PROCESSING&size=1` (`totalElements`), icon cuộn tôn/xưởng sản xuất.
  3. **Đã hoàn thành**: Thẻ nền xanh lục nhạt, lấy động từ `GET /api/v1/manager/orders?status=COMPLETED&size=1` (`totalElements`), icon xe giao hàng thành công.
- **Biểu Đồ & Danh Sách Nghiệp Vụ**:
  - **Doanh thu 30 ngày gần nhất**: Cột Bar chart SVG responsive xanh dương thể hiện doanh số 12 chu kỳ, dữ liệu tĩnh theo mockup khi BE chưa có module tài chính.
  - **Đơn hàng mới nhất**: Danh sách bảng hiển thị mã đơn hàng (ví dụ `#DH2026119001`) và ngày tạo, lấy động 4 đơn gần nhất từ `GET /api/v1/manager/orders?size=4`, có fallback trực quan khi dữ liệu backend trống.

---

## 3. Kiến Trúc Kỹ Thuật & Bảo Vệ Quyền Hạn
- **Xác thực & Phân quyền**: Được kiểm soát bằng `requireManagerAuth()` trong `js/auth/auth.guard.js` (Chấp nhận role `MANAGER` hoặc `ADMIN`).
- **Giao tiếp API**: Tận dụng `dashboard.api.js` (`getOrdersCountByStatus`, `getLatestOrders`).
- **Avatar Thống Nhất**: Dùng ảnh `assets/images/avatar-empty.jpg` cho hồ sơ quản lý và top navigation.
