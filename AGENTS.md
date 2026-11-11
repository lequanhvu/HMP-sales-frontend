# AGENTS.md — Sales Website Frontend Workspace Instructions

## 1. Project identity

This repository is the frontend for a real-world Vietnamese sales website specialized in roofing sheets (`Tôn sóng lợp mái`) and related accessories (`sườn, xối, nóc, máng`).

### Primary stack:
- Vanilla HTML5 (semantic, SEO-friendly, mobile responsive)
- Vanilla CSS3 (CSS Variables, Flexbox, CSS Grid, BEM convention, responsive media queries)
- Vanilla JavaScript (Modern ES6+ Modules: `import` / `export`, async/await, Fetch API)
- Backend API Integration: Spring Boot 4 REST API (`http://localhost:8080/api/v1`)
- Git / GitHub
- Antigravity IDE / Live Server

### Read these documents before making non-trivial changes:
- `architecture.md` — frontend architecture, state handling, auth flow, and component lifecycle
- `.agents/rules/project-rules.md` — coding conventions, CSS organization, API integration, and security rules
- `project-status.md` — implementation checklist, current progress, and active warnings
- `../sales-backend/api-spec.md` — REST API contract of the backend (source of truth for endpoints and payloads)

## 2. Source of truth

Do not invent business behavior or API contracts when requirements are silent. Mark unresolved points as `TBD` and verify with the backend API contract (`api-spec.md`).

### Confirmed architectural decisions:
- Mobile-first, fully responsive on smartphone, tablet, and desktop.
- Vietnamese language throughout the UI (standard Vietnamese, friendly and professional, no teencode).
- Guests can browse catalog, search suggestions, view categories, and view product details without login.
- Customer authentication is via Google Sign-In (Google Identity Services SDK).
- Price visibility is permission-driven (`PRODUCT_PRICE_VIEW`). If `price` or `prices` is `null`, display "Liên hệ báo giá", NEVER display `0đ` or `NaN`.
- Manufacturing product dimensions: Customers enter `quantity` (tấm) and `size` (chiều dài theo mét, e.g., 5.5m). Total price = `UnitPrice × Size × Quantity`.
- Direct phone OTP verification modal when placing orders or updating user phone number.
- API response envelope: Backend always returns `{ statusCode, data, message, timestamp }`. DTOs and results reside inside `data`.
- Pagination: Backend uses 0-indexed pagination (`meta: { page: 0, size: 20, totalElements, totalPages }`). UI must convert to 1-indexed for display (`page + 1`).
- Auth token handling:
  - Access Token (JWT) sent via `Authorization: Bearer <token>`.
  - Refresh Token resides in `HttpOnly` cookie. All API calls must set `credentials: 'include'`.
  - Silent token refresh interceptor on 401 Unauthorized using `POST /api/v1/auth/refresh`.

## 3. Agent behavior

### Before writing code:
1. Identify which page or component is affected.
2. Check the corresponding backend endpoint in `../sales-backend/api-spec.md`.
3. Preserve existing component/API utility contracts.
4. Prefer small, focused modular functions over monolithic scripts.
5. Verify DOM elements exist before attaching event listeners (prevent `null` reference errors).

### When implementing a feature:
- Write modular ES6 JavaScript inside `js/api/`, `js/components/`, `js/pages/`, or `js/utils/`.
- Never write inline JavaScript in HTML attributes (no `onclick="..."` or `href="javascript:..."`). Use `addEventListener`.
- Separate CSS into `assets/css/base/`, `assets/css/components/`, or `assets/css/pages/`. Never use inline `style="..."` except for dynamic values (e.g. background-image or calculated width).
- Update `project-status.md` only after the implementation is complete and verified.

## 4. Frontend architecture expectations

- **Feature-based HTML Routing**: Keep `index.html` at root as the landing page, and organize all other functional HTML pages inside `pages/{module}/` (`pages/auth/`, `pages/product/`, `pages/customer/`, `pages/admin/`). Use relative asset paths accordingly (`../../assets/...`).
- **HTML/JS Separation (<template> Pattern)**: Never inject raw HTML strings or inline styles inside JS controllers. Define reusable UI templates in `<template id="...">` tags in HTML, apply BEM CSS classes, and have JS clone and bind text/attributes using `.textContent` and `.src`.
- **API Layer (`js/api/`)**: All `fetch()` calls must be centralized here. Page scripts must never call raw `fetch()` directly; they import methods from `js/api/*.api.js`.
- **Utils (`js/utils/`)**: Pure utility functions for currency formatting (`formatVnd(amount)`), date formatting, debouncing, and local storage.
- **Components (`js/components/`)**: Reusable UI elements (Header, Footer, Toast notifications, Confirm modals, OTP dialog).
- **Pages (`js/pages/`)**: Page-specific lifecycle scripts, loaded with `<script type="module" src="...">`.

## 5. Security & Data Protection

- Prevent XSS: When inserting user-supplied text into DOM, always use `element.textContent` or a dedicated sanitization helper, NEVER raw `element.innerHTML` with untrusted strings.
- Never log passwords, OTP codes, JWT tokens, or client secrets in console output.
- Always check and sanitize input fields on the client before making API requests.

## 6. Out-of-scope protection (V1)

Do not implement frontend flows for:
- Online payment gateways (VNPAY, Momo, ZaloPay, Stripe) — orders are pay-on-delivery/bank-transfer after confirmation.
- Shopping cart persistent syncing across devices (simple local storage cart is sufficient for guest/customer).
- Product review / rating submission forms.
- Coupon / discount code input fields on customer checkout.
- Blog / news / user-guide article views.

