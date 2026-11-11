# HMP Sales Frontend — Nền Tảng Bán Lẻ & Đặt Hàng Tôn Thép Trực Tuyến

Giao diện người dùng (Frontend) cho hệ thống bán lẻ và gia công tôn lợp mái, tôn xốp cách nhiệt, và phụ kiện lợp mái chính hãng (Hoa Sen, Đông Á, Nam Kim).

> 🔗 **Mã nguồn Backend (Spring Boot 4 / PostgreSQL / Redis)**: [https://github.com/lequanhvu/hmp-sales-project](https://github.com/lequanhvu/hmp-sales-project)

---

## 🚀 Công Nghệ Sử Dụng

- **Ngôn ngữ**: HTML5 Semantic, CSS3 (CSS Variables, Flexbox, CSS Grid), Modern JavaScript (ES6+ Modules).
- **Kiến trúc CSS**: Phương pháp đặt tên BEM (Block__Element--Modifier), chia 3 tầng (`base`, `components`, `pages`).
- **Mẫu Thiết kế Giao diện**: Mẫu tách biệt `<template>` (HTML thuần giữ trong file `.html`, CSS trong file `.css`, JS chỉ làm data-binding).
- **Giao tiếp Mạng**: Native Fetch API đóng gói trong `client.js`, tự động đính kèm Bearer Token và hỗ trợ **Silent Refresh Token** khi nhận lỗi 401 Unauthorized.
- **Tương thích**: Thiết kế Mobile-First Responsive toàn diện (Mobile, Tablet, Desktop).

---

## 📂 Cấu Trúc Thư Mục

```text
sales-frontend/
├── assets/
│   ├── css/
│   │   ├── base/               # Biến màu sắc thương hiệu, reset, layout dùng chung
│   │   │   ├── variables.css
│   │   │   ├── reset.css
│   │   │   └── global.css
│   │   ├── components/         # Định dạng các component tái sử dụng
│   │   │   ├── header.css
│   │   │   ├── footer.css
│   │   │   ├── button.css
│   │   │   └── product-card.css
│   │   └── pages/              # CSS riêng theo từng trang
│   │       └── home.css
│   └── images/                 # Ảnh banner, logo, icon
├── js/
│   ├── api/                    # Tầng giao tiếp API tập trung
│   │   └── client.js           # Fetch wrapper, bóc tách envelope, xử lý token & refresh
│   ├── components/             # Logic các thành phần dùng chung (Header, Menu...)
│   │   └── header.js
│   ├── pages/                  # Logic điều khiển trang
│   │   └── home.js
│   └── utils/                  # Tiện ích định dạng tiền VND, ngày tháng, lưu trữ
│       ├── format.js
│       └── storage.js
├── index.html                  # Trang chủ (Banner thực tế, 4 thẻ cam kết, danh mục tôn)
├── AGENTS.md                   # Nguồn chỉ dẫn & quy chuẩn phát triển
├── architecture.md             # Tài liệu kiến trúc Frontend & xác thực Token
└── project-status.md           # Bảng theo dõi tiến độ chi tiết
```

---

## 🛠 Hướng Dẫn Chạy Dự Án

### Yêu cầu:
1. Backend Spring Boot đang chạy tại cổng `http://localhost:8080`.
2. Trình duyệt web hiện đại (Chrome, Edge, Firefox, Safari).

### Các bước:
1. Mở thư mục `sales-frontend` trong Visual Studio Code hoặc Antigravity IDE.
2. Chuột phải vào file `index.html` $\rightarrow$ Chọn **Open with Live Server** (cổng mặc định `5500`).
3. Trang web sẽ tự động kết nối API backend để lấy danh mục tôn và hiển thị lên màn hình.

---

## 📄 Bản Quyền
© 2026 Tôn Thép HMP — Kiến tạo mái nhà Việt. All rights reserved.
