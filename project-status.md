# Project Status — Sales Website Frontend

> Last updated: 2026-11-27 | By: @antigravity | Session: #27
>
> AI: update this file at the end of every session when asked.
> Follow this exact format. Preserve full milestone checklists and project specifications.

---

## Completed
- ✅ **Tính năng Chọn Địa Giới Hành Chính 3 Cấp & Ghim Bản Đồ Không Watermark (Session #27 - Completed)**:
  - **3 Hộp Chọn Địa Giới Hành Chính (Tỉnh/TP, Quận/Huyện, Phường/Xã)**:
    - Nạp danh mục 63 tỉnh thành Việt Nam tự động qua Open-API (`provinces.open-api.vn`) với cơ chế in-memory caching cực nhanh.
    - Cascading dropdowns: Chọn Tỉnh/TP -> tự động nạp Quận/Huyện -> Chọn Quận/Huyện -> tự động nạp Phường/Xã.
    - Tự động ghép chuỗi địa chỉ `${Địa chỉ chi tiết}, ${Phường/Xã}, ${Quận/Huyện}, ${Tỉnh/TP}` để forward-geocode vị trí.
    - **Quy tắc chọn kết quả**: Khi có nhiều hơn 1 kết quả tọa độ trả về, hệ thống mặc định chọn output đầu tiên (`candidates[0]`) và ghim ngay lên bản đồ, đồng thời vẫn hiển thị danh sách gợi ý để khách hàng xem hoặc đổi nếu muốn.
  - **Tích Hợp Bản Đồ Không Watermark (100% Miễn Phí & Ổn Định Tại Việt Nam)**:
    - Bản đồ nền mặc định: **Esri World Street Map** sắc nét, sạch sẽ, hoàn toàn không watermark, không yêu cầu thẻ tín dụng hay API key.
    - Lớp ảnh vệ tinh thực tế: **Esri World Imagery** sắc nét, rõ ràng đến từng mái tôn và công trình nhận hàng.
    - Bản đồ bổ trợ: Google Maps Street Layer chuyển đổi mượt mà.
  - **Quản Lý Sổ Địa Chỉ & Kiểm Soát Bán Kính Giao Tận Nơi**:
    - Lưu đầy đủ thông tin: `province`, `district`, `ward`, `address`, `latitude`, `longitude`, `isDefault` vào Backend.
    - Kiểm soát bán kính giao hàng 25km quanh xưởng HMP với cảnh báo trực quan.
- ✅ **Tính năng Ghim Vị Trí Bản Đồ & Kiểm Soát Bán Kính Giao Hàng (Delivery Radius & Multi-Layer Map Integration - Session #27)**:
  - **Tích Hợp Bản Đồ Tương Tác Chuẩn Sản Xuất (Lựa chọn 2 - 100% Hợp Pháp & 0 Đồng)**:
    - Nhúng bản đồ đường phố sắc nét **CartoDB Voyager** (hiển thị rõ khối nhà, đường sá, ngõ ngách, tên thôn/xã Việt Nam qua CDN toàn cầu cực nhanh, không bị chặn mạng tại VN).
    - Tích hợp thêm lớp **Ảnh vệ tinh thực tế Esri World Imagery** giúp khách hàng nhìn thấy rõ từng mái nhà, khu xưởng, công trình để đối chiếu.
    - Bộ chuyển đổi lớp bản đồ ở góc trên bên phải (Bản đồ đường phố / Ảnh vệ tinh thực tế / Bản đồ giao thông).
    - Vòng tròn bán kính màu xanh thương hiệu bao quanh tâm xưởng sản xuất HMP (mặc định 25km).
    - Nút định vị GPS "Vị trí của tôi" qua HTML5 Geolocation.
  - **Tự Động Tìm Kiếm & Ghim Vị Trí Theo Địa Chỉ (Forward Geocoding)**:
    - Khách hàng gõ địa chỉ vào ô *"Địa chỉ nhận hàng cụ thể"*, hệ thống tự động tìm kiếm qua ArcGIS World Geocoder (hỗ trợ đầy đủ thôn/xã/huyện/tỉnh Việt Nam).
    - Bản đồ tự động lướt đến vị trí tìm thấy và cắm ghim đỏ ngay tức thì.
    - Khách hàng có thể kéo thả ghim đỏ để tinh chỉnh vị trí nếu có xê dịch.
  - **Tùy Chọn Phương Thức Nhận Hàng (`SHIPPING` vs `PICKUP`)**:
    - "Giao hàng tận nơi" (`SHIPPING`): Bắt buộc ghim vị trí, tự động đo khoảng cách và chặn nếu vượt bán kính.
    - "Khách tự bốc hàng tại xưởng" (`PICKUP`): Không giới hạn khoảng cách, hiển thị địa chỉ xưởng và hotline điều xe.
  - **API Client Mới (`js/api/delivery.api.js`) & Component (`js/components/map-picker.js`)**:
    - Cung cấp `getStoreInfo()`, `checkDeliveryDistance(lat, lng)`, `geocodeAddress(query)`.
- ✅ **Phân Hệ Giỏ Hàng & Đặt Hàng Chuẩn Shopee (Cart & Checkout Flow - Session #6)**:
  - **Trang Chi Tiết Sản Phẩm Động Theo Loại Mặt Hàng (`pages/product/detail.html`, `js/pages/product-detail.js`, `assets/css/pages/product-detail.css`)**:
    - Tích hợp trường nhập liệu theo `ProductType`:
      - `ROOFING_SHEET`: Nhập chiều dài (mét), nút chọn nhanh (3m, 4m, 5m, 6m), số lượng (tấm); ẩn quy cách bẻ chấn.
      - `GUTTER` / `GABLE_FLASHING` / `RIDGE_CAP`: Nhập chiều dài, quy cách bẻ chấn chi tiết (`dimensions`) với gợi ý từ `productType.note`, số lượng (cây / mét).
      - `RETAIL`: Ẩn chiều dài và quy cách bẻ chấn, chỉ nhập số lượng (cái / hộp).
      - `UNKNOWN`: Hiển thị toàn bộ các trường thông số để khách hàng tự do nhập quy cách.
    - Tích hợp 2 nút hành động: "Thêm vào giỏ" (`#btn-add-to-cart`) gọi API `POST /api/v1/cart/items` và "Mua ngay" (`#btn-order-now`) lưu session `hmp_buy_now_item` và chuyển thẳng sang `order.html?mode=buy-now`.
  - **Trang Giỏ Hàng Chuẩn Kiểu Dáng Shopee (`pages/customer/cart.html`, `assets/css/pages/cart.css`, `js/pages/cart.js`)**:
    - Tích hợp đầy đủ API Backend: `GET /cart`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}`, `DELETE /cart/clear`.
    - Danh sách sản phẩm sắp xếp giảm dần theo thời gian cập nhật (`updatedAt DESC`), bổ sung mốc thời gian cập nhật (`formatDateTime`) trên từng món hàng để khách hàng dễ theo dõi.
    - Checkbox chọn tất cả (Top & Bottom) và chọn từng món hàng độc lập.
    - Stepper điều chỉnh số lượng `[-] / [+]` cập nhật trực tiếp qua API, tự động tính toán lại thành tiền dòng và tổng tiền giỏ hàng.
    - Modal xác nhận khi xóa sản phẩm hoặc dọn sạch giỏ hàng.
    - Thanh Sticky Bottom Bar chuẩn Shopee: cố định chân trang hiển thị tổng số món được chọn, tổng tiền thanh toán và nút "Mua Hàng" (chỉ kích hoạt khi chọn ít nhất 1 món).
    - Lưu danh sách món đã chọn vào `sessionStorage` (`hmp_cart_checkout_items`) và điều hướng tới `order.html?mode=cart`.
  - **Trang Đặt Hàng Linh Hoạt 2 Luồng (`pages/customer/order.html`, `assets/css/pages/order.css`, `js/pages/order.js`)**:
    - Nhận diện 2 nguồn đặt hàng: Mua ngay (`?mode=buy-now`) hoặc Giỏ hàng (`?mode=cart`).
    - Form thông tin nhận hàng: Tự động điền họ tên, số điện thoại từ hồ sơ người dùng.
    - Sổ địa chỉ nhận hàng: Tải danh sách từ `GET /api/v1/me/addresses`, hỗ trợ thêm nhanh địa chỉ mới qua `POST /api/v1/me/addresses`.
    - Tóm tắt đơn hàng: Hiển thị đầy đủ thông số kỹ thuật (chiều dài, quy cách bẻ chấn hình học, số lượng, đơn giá, thành tiền).
    - Gửi đơn hàng tới `POST /api/v1/orders`.
    - **QUY TẮC CỐT LÕI**: Sau khi đặt hàng thành công, **TUYỆT ĐỐI KHÔNG XÓA GIỎ HÀNG**, bảo lưu dữ liệu để khách hàng có thể mua lại bất cứ lúc nào.
    - Màn hình xác nhận thành công hiển thị mã đơn hàng `#orderId` và các liên kết điều hướng tiện lợi.
  - **Header & API Client**:
    - Header: Icon giỏ hàng trên desktop và mobile drawer hiển thị badge số lượng món hàng, tự động lắng nghe sự kiện `hmp:cart-updated`.
    - API modules: `cart.api.js` và `order.api.js` đóng gói hoàn chỉnh.
  - **Tuân thủ Clean Code & Bảo Mật**:
    - 0% inline style `style="..."`, 0% `innerHTML` chuỗi thô (chống XSS).
    - Sử dụng thẻ `<template>` và DOM API (`createElement`, `replaceChildren`).
    - CSS BEM, CSS variables, mobile-first responsive.
- ✅ **Phân Hệ Đăng Nhập & Xác Thực Khách Hàng Chuẩn Thực Tế (Authentication & Authorization - Session #5)**:
  - **Trang Đăng Nhập Chuẩn Thiết Kế Tôn Việt (`pages/auth/login.html`, `assets/css/pages/login.css`, `js/pages/login.js`)**:
    - Thiết kế giao diện trung thực theo mẫu đồ họa thực tế: nền nhà xưởng công nghiệp `assets/images/auth/background.png` bao phủ toàn màn hình, thẻ đăng nhập `.auth-card` hiệu ứng kính mờ (`backdrop-filter: blur(12px)`), viền bo tròn 28px, đổ bóng sâu nổi khối sang trọng.
    - Tiêu đề nổi bật *"Chào mừng bạn!"* với từ *"bạn!"* màu xanh thương hiệu `#0066cc`.
    - Nút Google Sign-In dạng con nhộng (Pill button `#0066cc`, bo tròn 9999px) tích hợp logo Google "G" 4 màu chính thức và mũi tên điều hướng.
    - Huy hiệu bảo mật: Biểu tượng khiên xanh và thông điệp *"Thông tin của bạn được bảo mật tuyệt đối"*.
    - Công cụ Dev/Localhost: Hộp thiết lập nhanh Google Client ID lưu tạm vào `localStorage` giúp kiểm thử trực tiếp trên localhost mà không cần sửa code.
    - Thẻ template `<template id="auth-alert-template">` hiển thị thông báo lỗi an toàn, 0% chèn chuỗi HTML thô (chống XSS).
  - **Kiến Trúc Quản Lý Phiên & Bảo Mật Đa Tầng**:
    - **`js/auth/redirect-validator.js`**: Chống triệt để lỗ hổng Open Redirect (CWE-601) bằng Whitelist đường dẫn nội bộ, loại trừ mọi URL ngoại vi, protocol-relative (`//evil.com`), `javascript:`, CRLF injection, và chặn chuyển hướng lặp về trang đăng nhập hoặc vượt quyền vào trang Admin.
    - **`js/auth/auth.state.js`**: Quản lý Access Token độc quyền trong RAM (In-Memory closure), không lưu vào `localStorage` nhằm chống rò rỉ token qua XSS. Sử dụng cờ phiên `hmp_has_session` hỗ trợ cơ chế Silent Session Bootstrap khi F5/tải trang. Tích hợp Single-Flight Refresh Promise ngăn chặn xung đột Replay Attack ở Backend.
    - **`js/auth/auth.guard.js`**: Cung cấp tiện ích bảo vệ UX cho các trang riêng tư của khách hàng (`order.html`, `profile.html`, `my-orders.html`).
    - **`js/api/auth.api.js`**: Đóng gói các hàm gọi API `/auth/google`, `/auth/refresh`, `/auth/logout`, `/me`.
    - **`js/components/toast.js` & `assets/css/components/toast.css`**: Xây dựng mới hoàn chỉnh component thông báo nổi BEM (Success, Error, Warning, Info), chống XSS bằng `textContent`.
  - **Nâng Cấp Header Chung & Quản Trị Trạng Thái Tài Khoản**:
    - Tích hợp Dropdown Menu người dùng trên Header: Hiển thị Avatar chữ cái đầu, họ tên, email và vai trò (`Khách hàng` / `Quản lý` / `Quản trị viên`).
    - Các liên kết nhanh: *"Đơn hàng của tôi"*, *"Thông tin tài khoản"*, và nút *"Đăng xuất"* (gọi API thu hồi token tại Backend).
    - Đồng bộ trạng thái đăng nhập tức thì giữa Desktop Navbar và Mobile Drawer qua hệ thống sự kiện `hmp:auth-changed`, `hmp:session-restored`, `hmp:auth-expired`.
  - **Đồng Bộ Phía Backend**:
    - Bổ sung trường `role` vào DTO `UserProfileResponse` và cập nhật tài liệu `api-spec.md`. Toàn bộ kiểm thử đơn vị và controller phía backend đều đạt 100% `BUILD SUCCESS`.
- ✅ **Hệ Thống Quản Lý Bản Dịch Tiếng Việt Tập Trung (Centralized Translation Architecture - Session #4)**:
  - **Khởi tạo module `js/utils/i18n.js` theo chuẩn 3 Trụ Cột Độc Lập**:
    - **`fieldTranslations`**: Quản lý bản dịch tên trường/nhãn (`translateField(fieldName, domain)`), phân tách theo các Domain: `product`, `order`, `user`, `address`, `category`, `masterData`, và kế thừa `common`. Hỗ trợ fallback thông minh tự động chuyển đổi camelCase sang chuỗi đọc được khi chưa có bản dịch.
    - **`enumTranslations`**: Quản lý bản dịch các giá trị Enum/Status từ Backend (`OrderStatus`, `ProductStatus`, `UserStatus`, `RoleCode`, `CategoryStatus`, `MasterData`, `SearchResourceType`, `NotificationType`, `Permissions`). Hỗ trợ không phân biệt hoa thường (`trim().toUpperCase()`), bảo toàn giá trị gốc khi gặp enum mới, và hàm `getStatusBadgeClass(status)` hỗ trợ hiển thị Badge chuẩn BEM.
    - **`messageTranslations`**: Quản lý bản dịch thông điệp & mã lỗi từ API (`translateMessage(msg)`). Nhận diện tự động chuỗi tiếng Việt: **Nếu Backend đã trả về tiếng Việt thì giữ nguyên 100%, không dịch lại**.
  - **Tích hợp Tầng Giao diện & Tầng Mạng**:
    - `js/pages/product-catalog.js`: Xóa bỏ biến hardcode `SUGGESTION_TYPE_LABELS`, tích hợp `translateSearchType(item.type)`.
    - `js/api/client.js`: Tích hợp `translateMessage(rawMessage)` trong quá trình bóc tách lỗi HTTP, giữ nguyên các thông điệp tiếng Việt từ Backend.
    - Bảo toàn 100% API contract: Các tham số request gửi lên BE vẫn giữ nguyên Enum tiếng Anh (`getProducts({ status: 'ACTIVE' })`).
  - **Cập nhật Hợp Đồng Dự Án (Project Contract)**:
    - Bổ sung Quy tắc 7 vào `.agents/rules/project-rules.md` nghiêm cấm viết `if/else` hoặc `switch/case` phân mảnh trong component để dịch dữ liệu từ Backend.
    - Bổ sung Mục 6 vào `architecture.md` chuẩn hóa kiến trúc Quản lý bản dịch tập trung 3 Trụ Cột.
  - **Kiểm thử chất lượng**: Đã chạy test tự động trên trình duyệt headless (Microsoft Edge) xác nhận 100% test case (Field labels, Enums, Case insensitivity, Badge classes, Message handling) đều đạt kết quả `PASSED`.
- ✅ **Phát Triển Giao Diện Trang Giới Thiệu & Trang Liên Hệ Chuẩn Mẫu Thực Tế (Session #3)**:
  - **Trang Giới thiệu (`pages/introduction/introduction.html`, `assets/css/pages/introduction.css`, `js/pages/introduction.js`)**:
    - **Hero Banner**: Nền ảnh `assets/images/introduction/banner.png` kết hợp gradient xanh thương hiệu, breadcrumb `Trang chủ > Giới thiệu`, tiêu đề lớn.
    - **Khối Về chúng tôi**: Thiết kế 2 cột với nhãn "Về chúng tôi", tiêu đề "Uy tín tạo nên giá trị bền vững", đoạn giới thiệu chi tiết, nút "Tìm hiểu thêm →" và ảnh chụp toàn cảnh nhà máy `about-us.png`.
    - **Khối Vì sao chọn Tôn Việt?**: Dải thẻ nền xanh nhạt viền bo tròn, gồm tiêu đề bên trái và lưới 4 ưu điểm nổi bật (Chất lượng vượt trội, Giá cả cạnh tranh, Hỗ trợ chuyên nghiệp, Giao hàng nhanh chóng) kèm icon vector chuẩn.
    - **Khối Sứ mệnh – Tầm nhìn – Giá trị cốt lõi**: Bố cục 3 cột thẻ trụ cột (Sứ mệnh, Tầm nhìn, Giá trị cốt lõi) kết hợp ảnh minh họa sản phẩm tôn sóng màu `metal-sheet.png`.
    - **Khối Kêu gọi hành động (CTA Banner)**: Nền ảnh `assets/images/introduction/footer.png` kết hợp thông điệp "Đồng hành cùng bạn kiến tạo những công trình bền vững" và nút "Liên hệ ngay →" điều hướng sang trang liên hệ.
  - **Trang Liên hệ (`pages/contact/contact.html`, `assets/css/pages/contact.css`, `js/pages/contact.js`)**:
    - **Hero Banner**: Nền ảnh [banner.png](file:///d:/HMP/sales-frontend/assets/images/contact/banner.png) hiển thị trọn vẹn chi tiết sóng tôn lợp mái (không bị cắt xén/zoom quá mức), kết hợp hiệu ứng gradient chuyển mượt mà về màu xanh tươi sáng (`#1b3f7e`) đồng bộ với banner trang chủ.
    - **Khối 3 Thẻ Thông tin nhanh**: Lưới 3 cột (Hotline hỗ trợ 1900 1234, Email info@tonviet.vn, Địa chỉ `Thôn phất lộc tây, xã Thái Giang, huyện Thái Thụy, Tây Thái Ninh, Hưng Yên`) với icon bo tròn xanh lam hiện đại.
    - **Khối Địa chỉ công ty & Bản đồ Google Maps**: Khung bản đồ Google Maps nhúng qua `<iframe>` của Công ty Hoàng Minh Phát (HMP), kích thước chuẩn format (100% chiều ngang, bo góc, chiều cao linh hoạt responsive: 320px mobile / 400px tablet / 460px desktop; 0 inline styles, kiểm soát hoàn toàn bằng CSS class `.contact-map__iframe`). Phía dưới hiển thị tên công ty và địa chỉ cập nhật.
    - **Khối Kết nối với chúng tôi (Social Connect Banner)**: Nền ảnh nhà máy [footer.png](file:///d:/HMP/sales-frontend/assets/images/contact/footer.png) hiển thị trọn vẹn toàn bộ công trình và tán cây xanh bên phải, làm hiệu ứng chuyển dần (smooth fade) sang màu trắng thuần (`#ffffff`) bên trái, tích hợp nút Facebook liên kết đến trang cá nhân được chỉ định và nút Zalo (đã loại bỏ icon YouTube).
  - **Đồng bộ Chân trang (Footer Component)**:
    - Loại bỏ mã HTML footer tĩnh bị hardcode trong `index.html`, chuyển sang nhúng placeholder đồng bộ `<div id="site-footer" data-component="footer"></div>` giống toàn bộ các trang khác trong hệ thống.
    - Cập nhật địa chỉ công ty thành `Thôn phất lộc tây, xã Thái Giang, huyện Thái Thụy, Tây Thái Ninh, Hưng Yên` với khả năng xuống dòng tự nhiên không bị tràn lề.
    - Thay thế icon YouTube bằng icon Zalo và gắn liên kết trực tiếp Facebook đến `https://www.facebook.com/vinh.lexuan.984786`.
  - **Cập nhật Điều hướng Dùng chung (`component-loader.js` & `pages/components/common/header.html`)**:
    - Mở rộng hàm `getRootPrefix()` nhận diện `/pages/introduction/` và `/pages/contact/` để trả về tiền tố `../../` chính xác 100%.
    - Cập nhật hàm `highlightActiveNav()` tự động kích hoạt `data-nav="about"` và `data-nav="contact"` khi người dùng truy cập trang tương ứng.
    - Cập nhật liên kết trên thanh menu desktop và mobile drawer của Header chuyển thẳng đến `introduction.html` và `contact.html`.
  - **Tuân thủ Tuyệt đối Quy chuẩn Dự án**:
    - 0% inline style (kể cả thuộc tính `style="border:0;"` của thẻ iframe đã được chuyển hóa 100% sang class CSS).
    - 0% inline JavaScript.
    - BEM naming convention đồng nhất (`.intro-*` và `.contact-*`), sử dụng CSS variables từ `variables.css`.
    - Mobile-first responsive hoàn chỉnh cho cả 3 chế độ: Mobile (375px), Tablet (768px), Desktop (1200px).
- ✅ **Cải Tiến Trang Danh Mục Sản Phẩm & Trang Chi Tiết Sản Phẩm (Session #2)**:
  - **Trang danh mục (`pages/product/catalog.html` & `js/pages/product-catalog.js`)**:
    - Bấm vào bất kỳ danh mục nào (kể cả danh mục cha của cha) đều hiển thị sản phẩm của danh mục đó VÀ toàn bộ danh mục con cháu — backend `GET /api/v1/categories/{id}/products` đã được nâng cấp gộp cả cây con.
    - Bỏ ô sắp xếp (HTML, CSS, JS liên quan).
    - Tìm kiếm sản phẩm: ô nhập có gợi ý type-ahead debounce 300ms (`GET /api/v1/search/suggestions`, không dấu + sửa lỗi gõ sai, không hiển thị ô hình ảnh), điều hướng bàn phím (↑ ↓ Enter Esc); chọn gợi ý Sản phẩm / Thương hiệu → tìm kiếm ngay trên trang sản phẩm, Danh mục → lọc danh mục; gửi form tìm `GET /api/v1/products?productName=...&status=ACTIVE` (không phân biệt dấu); khi không có kết quả hiển thị "Có phải bạn muốn tìm: ..." dựa trên bộ gợi ý của backend. Hỗ trợ URL `?keyword=`.
    - Chuyển đổi hiển thị Grid View / List View (ghi nhớ lựa chọn trong `localStorage`).
    - Bấm vào ảnh sản phẩm cũng đi vào trang chi tiết (ảnh là thẻ `<a>`).
    - Lưới "Tất cả sản phẩm" chỉ lấy sản phẩm `ACTIVE`.
  - **Trang chi tiết (`pages/product/detail.html` & `js/pages/product-detail.js`)**:
    - Bỏ mục "Kích thước gia công sản xuất" (HTML, CSS, JS: ô nhập chiều dài, số lượng, tổng tiền tạm tính).
    - Đổi nội dung: bỏ "Danh mục:", bỏ nhãn "Đơn giá niêm yết" và "Giá niêm yết nhà máy", "Tiến hành đặt tôn" → "Mua ngay", "Hotline tư vấn: ..." → "Liên hệ tư vấn".
    - Tab "Chính sách & Vận chuyển" thay bằng tab **Bảng giá** (hàng ngang: đơn vị tính, hàng dọc: biến thể; thiếu quyền `PRODUCT_PRICE_VIEW` hiển thị "Bạn không có quyền xem giá sản phẩm").
    - Thêm tab **Bảng màu** (gom màu của mọi biến thể, ghép ảnh mẫu màu từ `GET /api/v1/colors`; không có dữ liệu hiển thị "Sản phẩm không có thông tin về màu sắc").
    - Mục "Thông số kỹ thuật" bổ sung dòng **Khổ rộng** (thuộc tính `width` mới của `ProductVariant`, hiển thị theo mm) và đồng bộ theo biến thể đang chọn.
  - Bổ sung `js/utils/debounce.js`, `getSearchSuggestions()` và `getActiveColors()` trong `js/api/product.api.js`.
  - ⚠️ Chưa kiểm thử thủ công trên trình duyệt (môi trường không có Node/trình duyệt) — cần mở bằng Live Server để kiểm tra.

- ✅ **Kiến Trúc Nhúng Component Dùng Chung (`pages/components/` & `js/components/component-loader.js`)**:
  - Trích xuất toàn bộ khối Header và Footer từ Trang chủ sang các file component riêng biệt: `pages/components/common/header.html` và `pages/components/common/footer.html`.
  - Tách bạch 100% cả 3 tầng HTML, CSS và JS độc lập cho từng Component:
    - **HTML**: `pages/components/common/header.html`, `footer.html`, `customer/sidebar.html`, `admin/sidebar.html` (chỉ chứa markup ngữ nghĩa, 0 thẻ `<style>`, 0 thẻ `<script>`, 0 inline `style`).
    - **CSS**: `assets/css/components/header.css`, `footer.css`, `sidebar.css`, `button.css`.
    - **JavaScript**: `js/components/header.js`, `footer.js`, `sidebar.js`, `component-loader.js`.
  - Tinh chỉnh Footer chuẩn mẫu thực tế 100% (CSS Grid 5 cột dàn ngang cố định: Logo HMP & Slogan, Sản phẩm, Hỗ trợ, Liên hệ với đầy đủ SĐT, Email `info@tanviet.vn` và Địa chỉ `white-space: nowrap`, 3 nút Mạng xã hội tròn FB/Chat/YouTube).
  - Module `component-loader.js` tự động tải HTML với query cache-buster `?_v=...`, tự động nạp file CSS component vào `<head>` (`ensureStylesheet`), tự động điều chỉnh đường link tương đối theo cấp thư mục (`rootPrefix`), và tự động gắn kết controller JS (`initHeader()`, `initFooter()`, `initCustomerSidebar()`).
  - Cập nhật toàn bộ các trang (`index.html`, `pages/product/catalog.html`, `pages/product/detail.html`) nhúng đồng bộ qua placeholder `<div id="site-header" data-component="header"></div>` và `<div id="site-footer" data-component="footer"></div>`.

- ✅ **Rà Soát & Hoàn Thiện Clean Code Toàn Dự Án (Không Trộn Lẫn HTML, CSS, JS)**:
  - Loại bỏ hoàn toàn 100% thuộc tính `style="..."` nội dòng trong toàn bộ file HTML (`index.html`, `pages/product/catalog.html`, `pages/product/detail.html`).
  - Loại bỏ hoàn toàn việc gán `.style.*` trong mã JavaScript (`header.js`, `home.js`, `product-catalog.js`, `product-detail.js`); chuyển đổi toàn bộ trạng thái ẩn/hiện và bố cục sang các class CSS chuyên trách (`.hidden`, `.header__user-profile--visible`, `.state-box--full-width`).
  - Loại bỏ 100% việc chèn chuỗi HTML thô (`.innerHTML = '...'`) khi hiển thị các khối trạng thái (Loading, Empty, Error) và nút phân trang; thay thế toàn diện bằng thẻ `<template>` kết hợp `.replaceChildren()`, `cloneNode(true)`, và `createDocumentFragment()`.
  - Tách bạch cấu trúc giao diện (HTML), định kiểu thẩm mỹ (CSS theo BEM), và logic tương tác/dữ liệu động (JavaScript).

- ✅ **Trang Danh Mục Sản Phẩm Chuẩn Mẫu Thực Tế (`pages/product/catalog.html`)**:
  - Tách biệt tab "Sản phẩm" trên Header: Không còn cuộn trang tại chỗ mà điều hướng trực tiếp sang trang danh mục sản phẩm.
  - Banner tiêu đề xanh gradient tích hợp ảnh thực tế `assets/images/product/banner-product.png` và breadcrumb động.
  - Sidebar Danh mục accordion nạp động 100% từ API `GET /api/v1/categories/tree`, hỗ trợ mở/đóng danh mục con và lọc tức thời.
  - Lưới sản phẩm 3 cột (`GET /api/v1/categories/{id}/products` hoặc `GET /api/v1/products`), nút bấm "Liên hệ" (hoặc đơn giá khi có quyền xem giá) và tự động fallback `empty-picture.png`.
  - Thanh công cụ sắp xếp và phân trang số trang động `< 1 2 3 >`.
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
- ⚠️ **Ảnh sản phẩm mặc định**: Khi sản phẩm lấy từ backend chưa có ảnh (`primaryImageUrl` hoặc mảng `images` rỗng/null, hoặc link ảnh lỗi 404), toàn bộ giao diện (Trang chủ, Chi tiết sản phẩm...) bắt buộc hiển thị ảnh mặc định `assets/images/empty-picture.png` (dùng đường dẫn tương đối phù hợp cấp thư mục).
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
- [x] Xây dựng Trang danh mục sản phẩm (`pages/product/catalog.html` & `js/pages/product-catalog.js`):
  - [x] Banner chuẩn ảnh `banner-product.png` kèm breadcrumb điều hướng
  - [x] Sidebar cây danh mục đa cấp động (`GET /api/v1/categories/tree`), mở/đóng accordion, lọc sản phẩm
  - [x] Lưới sản phẩm 3 cột chuẩn mẫu thiết kế thực tế, tự động fallback `empty-picture.png`
  - [x] Thanh công cụ sắp xếp (Mặc định, Tên A-Z, Tên Z-A, Mới nhất) & Chế độ xem
  - [x] Phân trang động (0-indexed backend sang 1-indexed UI)
- [x] Xây dựng Trang chi tiết sản phẩm (`pages/product/detail.html` & `js/pages/product-detail.js`):
  - [x] Hiển thị thư viện ảnh (ảnh đại diện, ảnh phụ)
  - [x] Bộ chọn biến thể (độ dày, mã biến thể)
  - [x] Bộ chọn màu sắc (hiển thị ảnh mẫu màu lấy từ Cloudflare R2 / danh sách màu)
  - [x] Bảng giá theo đơn vị tính (m, tấm) — kiểm soát quyền `PRODUCT_PRICE_VIEW`

### Phase 3 — Xác thực Khách hàng & Sổ địa chỉ
- [x] Tích hợp Google Identity Services (GIS SDK): Đăng nhập Google, lấy ID Token gửi về `POST /api/v1/auth/google` (`pages/auth/login.html`)
- [x] Triển khai Kiến trúc Xác thực Cookie-Based (Cách 1 - Full HttpOnly Cookie):
  - [x] Backend Spring Boot: Cấp `access_token` và `refresh_token` qua HttpOnly Cookie (`Path=/`, `SameSite=Lax`)
  - [x] Backend Spring Security: Tùy biến `BearerTokenResolver` tự động bóc tách token từ Cookie `access_token` (vẫn duy trì hỗ trợ header `Authorization: Bearer` cho Postman/Swagger)
  - [x] Kiểm tra tính hợp lệ và trạng thái sống của Token qua Redis (`auth:access:{jti}`) giữ nguyên 100%
  - [x] Frontend Vanilla JS: Chống XSS triệt để, không lưu token vào `localStorage`/`sessionStorage`, trình duyệt tự động gửi cookie qua `credentials: 'include'` khi chuyển trang
- [x] Lưu trạng thái đăng nhập, cập nhật Header hiển thị tên, avatar, role và menu Dropdown (Đơn hàng, Thông tin, Đăng xuất)
- [x] Tối ưu hóa UI Header cho Khách hàng: Thêm mục "Đơn hàng" trên menu điều hướng, thay icon kính lúp thành chuông thông báo (kèm badge), thay nút Đăng nhập bằng Avatar (`avatar-empty.jpg`) và dropdown menu
- [ ] Trang thông tin tài khoản (`pages/customer/profile.html`): xem thông tin `GET /api/v1/me`, đổi tên, đổi SĐT qua xác thực OTP
- [ ] Quản lý sổ địa chỉ giao hàng (`GET/POST/PATCH/DELETE /api/v1/me/addresses`)

### Phase 4 — Quy trình Đặt hàng Tôn sóng & Xác thực OTP
- [ ] Trang đặt hàng (`pages/customer/order.html`):
  - [ ] Form nhập chiều dài (mét) và số lượng (tấm) kèm tự động tính nhẩm thành tiền `UnitPrice × Size × Quantity`
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
- [x] Component chuông thông báo đơn hàng (`GET /api/v1/notifications/unread-count`, badge trên Header và Dashboard)

### Phase 6 — Cổng Quản lý / Quản trị viên (Manager & Admin Portal)
- [x] Giao diện Đăng nhập Quản lý / Admin / Khách hàng đa vai trò (`pages/auth/login.html`)
- [x] Trang chủ Tổng quan Quản trị viên (`pages/admin/dashboard.html` & `js/pages/admin-dashboard.js`):
  - [x] Thẻ metric Sản phẩm, Đơn hàng, Người dùng (lấy động từ BE), Doanh thu 2.8 tỷ (dữ liệu tĩnh)
  - [x] Biểu đồ Line chart SVG "Doanh thu theo thời gian" & Donut chart SVG "Đơn hàng theo trạng thái"
  - [x] Sidebar xanh navy thương hiệu HMP, menu 7 mục, avatar đồng bộ `avatar-empty.jpg`
- [x] Trang chủ Tổng quan Quản lý Điều hành (`pages/manager/dashboard.html` & `js/pages/manager-dashboard.js`):
  - [x] Thẻ metric Đơn chờ xác nhận, Đang xử lý, Đã hoàn thành (lấy động theo status từ BE)
  - [x] Biểu đồ Bar chart SVG "Doanh thu 30 ngày gần nhất" (dữ liệu tĩnh)
  - [x] Danh sách "Đơn hàng mới nhất" (lấy động từ `GET /api/v1/manager/orders?size=4`)
  - [x] Sidebar xanh navy 4 mục, avatar đồng bộ `avatar-empty.jpg`
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

