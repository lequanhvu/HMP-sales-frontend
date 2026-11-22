# CONTEXT.md — Phân Hệ Quản Trị Hệ Thống (Admin Portal)

> **Mô đun**: `pages/admin/`  
> **Phiên làm việc**: #6 | **Ngày tạo**: 2026-11-22 | **Tác giả**: @antigravity  
> **Công nghệ**: HTML5, CSS3 (BEM), Modern ES6 Modules, SVG Data Visualization, Spring Boot 4 REST API.

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ
Phân hệ Quản trị Hệ thống (`pages/admin/`) dành riêng cho Quản trị viên (`ADMIN`), cung cấp góc nhìn toàn diện về sức khỏe hệ thống, số lượng người dùng, quy mô danh mục sản phẩm, hiệu năng luồng xử lý đơn hàng và xu hướng doanh thu tổng thể của công ty HMP (Tôn Việt).

---

## 2. Thiết Kế Giao Diện & Tính Năng Màn Hình Tổng Quan (`dashboard.html`)
Theo mẫu thiết kế thực tế thương hiệu HMP:
- **Cấu trúc bố cục (Layout)**:
  - **Sidebar Xanh Navy cố định**: Nền `#1a3b8b` sang trọng, chứa Logo chính thức `assets/images/logo/logo-hmp-removed-background-v2.png` ở đầu, menu 7 mục điều hướng (Tổng quan active, Sản phẩm, Danh mục, Đơn hàng, Người dùng, Nhật ký hệ thống, Cài đặt hệ thống) và thẻ người dùng quản trị viên với avatar mặc định `assets/images/avatar-empty.jpg` ở chân sidebar.
  - **Top Header**: Tiêu đề trang *"Tổng quan hệ thống"*, chuông thông báo có badge đỏ, cụm Profile dropdown (Hiển thị Admin, avatar `avatar-empty.jpg`, nút Đăng xuất kèm hộp thoại Confirm Logout chuẩn HMP).
- **Khối Thẻ Chỉ Số (Metric Cards Grid 4 Cột)**:
  1. **Sản phẩm**: Lấy động từ `GET /api/v1/products?size=1` (`totalElements`), icon hộp lưu kho.
  2. **Đơn hàng**: Lấy động từ `GET /api/v1/manager/orders?size=1` (`totalElements`), icon giỏ hàng.
  3. **Người dùng**: Lấy động từ `GET /api/v1/admin/users?size=1` (`totalElements`), icon nhóm người dùng.
  4. **Doanh thu**: Hiển thị tĩnh **2.8 tỷ** (hệ thống chưa có bảng doanh thu thực tế), icon đồng xu vàng.
- **Biểu Đồ Trực Quan Hóa (Data Visualizations)**:
  - **Doanh thu theo thời gian**: Line chart SVG responsive hiển thị 12 tháng (T1 - T12), đường vẽ spline mượt mà, gradient fill dịu mắt, điểm mốc tooltip Tháng 8 đạt mốc *"T8 2,1 tỷ"*.
  - **Đơn hàng theo trạng thái**: Donut chart SVG với tâm hiển thị tổng số đơn (580 Tổng đơn), phân bổ 3 lát màu: Chờ xác nhận (15% - Vàng), Đang xử lý (40% - Xanh lam), Đã giao (45% - Xanh lục).

---

## 3. Kiến Trúc Kỹ Thuật & Bảo Vệ Quyền Hạn
- **Xác thực & Điều hướng**: Bảo vệ bằng hàm `requireAdminAuth()` trong `js/auth/auth.guard.js`. Chỉ người dùng có role `ADMIN` mới được truy cập, người dùng chưa đăng nhập hoặc không đủ quyền được tự động chuyển hướng về `pages/auth/login.html`.
- **API & Dữ liệu động**: Giao tiếp qua `js/api/dashboard.api.js`. Nếu API gặp lỗi hoặc DB trống, controller tự động fallback số liệu mẫu chuẩn xác theo mockup mà không làm gãy giao diện.
- **Hình ảnh Avatar**: Tuân thủ quy định hệ thống, sử dụng ảnh đại diện thống nhất `assets/images/avatar-empty.jpg`.
