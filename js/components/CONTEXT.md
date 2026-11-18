# Frontend Core Architecture & JavaScript Subsystem — Implementation Context
> Written: 2026-11-18 | Author: @antigravity

## Business & UX Context
The JavaScript core layer (`js/api/`, `js/components/`, `js/utils/`, and `js/pages/`) serves as the functional backbone of the frontend application.
It orchestrates communication with the Spring Boot 4 REST backend, manages customer auth tokens, standardizes currency and date formatting, enforces permission-driven UI states, and controls page lifecycles for both the landing page (`index.html`) and specialized feature pages.

## Technical & UI Decisions
List of critical architectural decisions:
- **Centralized HTTP Client (`js/api/client.js`)**:
  - *Unified Fetch Wrapper*: Exposes `client.get()`, `client.post()`, `client.put()`, `client.patch()`, and `client.delete()`.
  - *Envelope Resolution*: Automatically extracts `data` from backend envelope `{ statusCode, data, message, timestamp }`. Throws structured JavaScript errors on HTTP status >= 400.
  - *Auth Token Injection*: Automatically attaches `Authorization: Bearer <token>` from `storage.js` when an access token exists.
  - *HttpOnly Cookie Credential Support*: Enforces `credentials: 'include'` on all network requests so that the `refreshToken` HttpOnly cookie is seamlessly transmitted and managed by the browser.
  - *Silent Token Refresh*: Intercepts 401 Unauthorized responses. If an access token was present, calls `POST /api/v1/auth/refresh` behind the scenes, stores the fresh access token, and retries the original failed request once.
- **Utility Layer (`js/utils/`)**:
  - *Currency Formatter (`format.js`)*: `formatVnd(amount)` transforms numeric values into Vietnamese currency strings (`150.000 đ`). Returns *"Liên hệ báo giá"* when amount is `null` or `undefined` to enforce permission-driven price masking.
  - *Debounce Utility (`debounce.js`)*: Standard debounce function used for search type-ahead suggestions (300ms delay) to minimize backend load.
  - *Storage Helper (`storage.js`)*: Encapsulates `localStorage` operations for auth tokens, user info, and UI preferences (e.g. catalog view mode).
- **Landing Page Controller (`index.html` & `js/pages/home.js`)**:
  - *Hero Banner*: Features factory roofing visual `assets/images/home/banner-home.png` with industrial blue gradient, headline *"Giải pháp tôn lợp mái cho mọi công trình"*, and CTA linking to catalog. Slider controls were removed per design spec.
  - *Four Commitment Cards*: Highlights product diversity, certified quality, fast delivery, and free technical advice.
  - *Dynamic Product Showcase*: Fetches products via `GET /api/v1/products` and renders cards via `<template id="product-card-template">` using `.cloneNode(true)` and `.replaceChildren()`.
  - *Image Fallback*: Product images without valid URLs or failing to load default to `assets/images/empty-picture.png`.
- **Zero Inline Script & Style Enforcement**: All event listeners are bound via `addEventListener`. DOM manipulation strictly utilizes `textContent`, `setAttribute`, and CSS class toggling (`.hidden`), with 0% direct `.style.*` mutations.

## Considered and Rejected
- **Storing Refresh Token in LocalStorage**: Strictly rejected for security. Refresh tokens are kept in HttpOnly cookies to prevent XSS credential theft.
- **Raw `innerHTML` for Data Rendering**: Rejected. All dynamic content insertion uses `<template>` elements or `textContent` to eliminate XSS vectors.
- **Direct `fetch()` calls in Page Scripts**: Rejected. Page scripts must only import functions from `js/api/*.api.js` to decouple UI controllers from backend URL endpoints.

## Dependencies
- Backend Endpoints:
  - `POST /api/v1/auth/refresh` (Silent token refresh)
  - `POST /api/v1/auth/logout` (Session revocation)
  - `GET /api/v1/products` (Homepage product showcase)
- Shared Utilities:
  - `js/utils/debounce.js`, `format.js`, `storage.js`
- Core Stylesheets:
  - `assets/css/base/variables.css`, `reset.css`, `global.css`
  - `assets/css/components/product-card.css`, `button.css`
  - `assets/css/pages/home.css`

## Known Limitations
- ⚠️ Refresh token expiration: When the refresh token cookie expires (7 days), silent refresh fails, and the user must be redirected to log in again via Google Sign-In.
- ⚠️ Cart persistence: Cart state for guests is kept purely in `localStorage` without multi-device synchronization (deferred for V1).

## Refactor Log

### 2026-11-16 | @antigravity (Session #3)
- Converted homepage footer in `index.html` to dynamic placeholder component.
- Audited all page scripts to ensure zero `.style.*` usage and zero raw `innerHTML` injections.

### 2026-11-12 | @antigravity (Session #1)
- Built `client.js` with envelope parsing, Bearer token injection, and automatic 401 silent refresh.
- Built `format.js` with permission-safe `formatVnd()` and `storage.js`.
- Implemented homepage controller `home.js` and `<template>` card rendering.
