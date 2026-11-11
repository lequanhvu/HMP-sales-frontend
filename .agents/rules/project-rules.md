# Project Rules — Frontend (Vanilla HTML, CSS, JS)

> These rules apply to the entire frontend project. Follow them strictly when writing HTML, CSS, or JavaScript code.

---

## 1. Technology Baseline

| Area | Technology |
|---|---|
| Language | HTML5, CSS3, Modern JavaScript (ES6+) |
| Module System | Native ES6 Modules (`import` / `export`) with `<script type="module">` |
| CSS Architecture | CSS Variables (`variables.css`), Reset (`reset.css`), BEM naming convention, Flexbox & CSS Grid |
| Network / API | Native `fetch()` API with async/await, centralized in `js/api/client.js` |
| Local Server | Live Server / Static Web Server (CORS enabled on backend) |
| Target Browsers | Modern evergreen browsers (Chrome, Edge, Firefox, Safari mobile/desktop) |
| Responsive | Mobile-first responsive design (Breakpoints: 576px, 768px, 992px, 1200px) |

---

## 2. Directory & File Organization

Follow this structure strictly:

```text
sales-frontend/
├── assets/
│   ├── css/
│   │   ├── base/               # Global reset, typography, CSS variables
│   │   │   ├── reset.css
│   │   │   ├── variables.css
│   │   │   └── global.css
│   │   ├── components/         # Reusable UI component styles
│   │   │   ├── header.css
│   │   │   ├── footer.css
│   │   │   ├── button.css
│   │   │   ├── modal.css
│   │   │   ├── toast.css
│   │   │   └── product-card.css
│   │   └── pages/              # Styles specific to a single page
│   │       ├── home.css
│   │       ├── product-detail.css
│   │       ├── order.css
│   │       ├── my-orders.css
│   │       └── admin.css
│   └── images/                 # Static local images, banners, icons
├── js/
│   ├── api/                    # Centralized API service layer
│   │   ├── client.js           # Base HTTP wrapper (fetch, token injection, silent refresh)
│   │   ├── auth.api.js         # Google login, logout, refresh, OTP
│   │   ├── product.api.js      # Categories, search suggestions, products, detail
│   │   ├── order.api.js        # Create order, view orders, cancel, undo-cancel
│   │   └── user.api.js         # User profile, address book
│   ├── components/             # Reusable UI component JavaScript
│   │   ├── header.js           # Render navbar, active link, auth state
│   │   ├── footer.js           # Render footer
│   │   ├── toast.js            # Toast notifications (success, error, info)
│   │   └── modal-otp.js        # Phone OTP verification dialog
│   ├── utils/                  # Helper utilities
│   │   ├── format.js           # formatVnd(), formatDate(), sanitizeHtml()
│   │   ├── debounce.js         # Debounce for search suggestions
│   │   └── storage.js          # Token & session storage helpers
│   └── pages/                  # Page-specific controller scripts
│       ├── home.js
│       ├── product-detail.js
│       ├── order.js
│       ├── my-orders.js
│       └── admin-orders.js
├── index.html                  # Homepage (Catalog, search, highlight products)
├── product-detail.html         # Product specs, variants, dimensions, pricing
├── order.html                  # Checkout & order submission with OTP
└── my-orders.html              # Customer order history & tracking
```

---

## 3. HTML Coding Rules

1. **Semantic HTML5**:
   - Use `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`. Avoid `<div>` soup.
2. **Accessibility & SEO**:
   - Every page must have `<title>`, `<meta name="viewport">`, and `<meta name="description">`.
   - Every image `<img>` must have a meaningful `alt` attribute describing the roofing sheet or brand.
   - Form inputs must have matching `<label for="inputId">`.
3. **No Inline JavaScript or CSS**:
   - Never use `onclick="..."`, `onsubmit="..."`, or `style="..."` in HTML.
   - Use `<script type="module" src="...">` at the end of `<body>` or in `<head>` with `defer`/`type="module"`.

---

## 4. CSS Coding Rules

1. **Always use CSS Variables for theme tokens**:
   - Colors, typography, spacing, border-radius must come from `variables.css`.
   - Example: `color: var(--primary-color); background: var(--bg-surface);`.
2. **BEM Naming Convention (Block__Element--Modifier)**:
   - Block: `.product-card`
   - Element: `.product-card__title`, `.product-card__price`, `.product-card__image`
   - Modifier: `.product-card--discounted`, `.btn--primary`, `.btn--disabled`
3. **Mobile-First Responsive Design**:
   - Write mobile styles first, then use `min-width` media queries:
     ```css
     /* Mobile first */
     .product-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
     /* Tablet (>= 768px) */
     @media (min-width: 768px) { .product-grid { grid-template-columns: repeat(2, 1fr); } }
     /* Desktop (>= 992px) */
     @media (min-width: 992px) { .product-grid { grid-template-columns: repeat(4, 1fr); } }
     ```

---

## 5. JavaScript & API Rules

1. **Strict ES6 Modules**:
   - Use `import` and `export`. Do not pollute the global `window` object.
2. **HTML/JS Separation & `<template>` Pattern (Quy tắc Tách biệt Template HTML)**:
   - **Tuyệt đối không nhúng chuỗi HTML thô lớn và inline `style="..."` vào file JavaScript**.
   - Đối với các phần tử hiển thị động lặp lại (thẻ sản phẩm, dòng giỏ hàng, bảng đơn hàng, thông báo...):
     - Định nghĩa khung xương HTML bên trong thẻ `<template id="...">` ngay tại file `.html` với đầy đủ các class CSS chuẩn BEM.
     - Trong file JavaScript: chỉ nhân bản template (`template.content.cloneNode(true)`), tìm phần tử bằng class và điền dữ liệu bằng `.textContent`, `.src`, `.alt`.
     - Giữ HTML 100% ở file `.html`, CSS 100% ở file `.css`, và JavaScript chỉ chuyên trách logic xử lý dữ liệu.
3. **Centralized API Wrapper (`js/api/client.js`)**:
   - Never call `fetch()` directly in page scripts. Always invoke methods through `js/api/*.api.js`.
   - All requests must include `credentials: 'include'` to pass HttpOnly cookies for refresh token.
   - Handle JWT injection: `headers['Authorization'] = 'Bearer ' + getAccessToken()`.
   - Handle 401 Unauthorized with automatic token refresh (`POST /api/v1/auth/refresh`).
4. **API Response Parsing**:
   - Remember the backend envelope:
     ```javascript
     const json = await response.json();
     if (!response.ok) {
       throw new Error(json.message || 'Có lỗi xảy ra');
     }
     return json.data; // The actual business payload
     ```
5. **Pagination (0-indexed)**:
   - Backend page numbers start at `0`.
   - Convert for display: `const displayPage = meta.page + 1;`.
   - Convert for query: `page: selectedPage - 1`.
6. **Debounce Search Suggestions**:
   - Autocomplete/search input must be debounced by 250–300ms before calling `GET /api/v1/search/suggestions`.

---

## 6. Business Domain & UI Rules

1. **Price Visibility Rule**:
   - Product price can be `null` when caller lacks `PRODUCT_PRICE_VIEW`.
   - Display: `<span class="price-contact">Liên hệ báo giá</span>`.
   - NEVER show `0 VNĐ`, `0đ`, or `NaN`.
2. **Roofing Sheet Dimension Calculator**:
   - Total price = `UnitPrice × Size (length in meters) × Quantity (sheets)`.
   - Size can be decimal (e.g. `5.5` meters). Always validate `size > 0` and `quantity > 0` before submitting.
3. **Currency Formatting**:
   - Always format money in Vietnamese Dong (VND) with commas or periods:
     ```javascript
     export function formatVnd(amount) {
       if (amount === null || amount === undefined) return 'Liên hệ báo giá';
       return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
     }
     ```
4. **Phone OTP Flow**:
   - When placing orders or updating phone numbers, trigger the OTP dialog modal.
   - Display a 60-second countdown timer before allowing "Gửi lại mã OTP".
   - Disable input and show loading spinners during async calls.

---

## 7. Security Rules

- **XSS Prevention**: Never inject untrusted user input using `.innerHTML`. Use `.textContent`, or create elements with `document.createElement()`.
- **Secret Protection**: Never store secrets, API keys, or raw passwords in frontend code.
- **Token Storage**: Keep Access Token in memory or securely in `localStorage` for session persistence. Never log tokens to `console.log`.

