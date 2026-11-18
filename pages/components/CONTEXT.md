# Shared UI Components & Component Loader — Implementation Context
> Written: 2026-11-18 | Author: @antigravity

## Business & UX Context
The Shared UI Components module (`pages/components/` and `js/components/`) provides a unified, reusable layout foundation across all public pages (`index.html`, catalog, detail, introduction, contact) and future authenticated portals (customer profile, order tracking, admin portal).
It ensures brand consistency (Header with dynamic category navigation, Search, Mobile drawer; Footer with verified HMP company credentials, Hotline, and Social links) without duplicating markup or styles across HTML pages.

## Technical & UI Decisions
List of critical architectural decisions:
- **Dynamic Component Loader (`component-loader.js`)**:
  - *Automated Relative Path Resolution (`getRootPrefix`)*: Inspects current URL pathname and dynamically resolves relative paths: `./` for root pages (`index.html`), `../../` for nested module pages (`pages/product/`, `pages/customer/`, `pages/admin/`, `pages/auth/`, `pages/introduction/`, `pages/contact/`), and `../` for single-level subdirectories.
  - *Automatic CSS Injection (`ensureStylesheet`)*: Verifies whether component stylesheet (`header.css`, `footer.css`, `sidebar.css`) is already linked in `<head>`; if absent, dynamically creates and appends `<link rel="stylesheet">`.
  - *Cache-busting Query Params*: Appends `?_v={Date.now()}` when fetching component HTML fragments to prevent stale browser caching.
  - *Automated Link Correction*: Recursively rewrites relative `href` and `src` attributes in loaded component templates based on `rootPrefix`, allowing single template files to function seamlessly at any directory depth.
  - *Automatic Navigation State (`highlightActiveNav`)*: Inspects the active route and applies `.nav__link--active` to corresponding `data-nav` elements (`home`, `products`, `about`, `contact`).
- **Strict Decoupling of HTML, CSS, and JS**:
  - Component HTML templates (`pages/components/common/header.html`, `footer.html`, `sidebar.html`) contain 100% pure semantic markup with 0 inline styles, 0 `<style>`, and 0 `<script>` tags.
  - Component styling is strictly isolated in `assets/css/components/` following BEM conventions (`.header__*`, `.footer__*`, `.sidebar__*`).
  - Interactive logic is encapsulated in ES6 controllers (`js/components/header.js`, `footer.js`, `sidebar.js`) and bound via `addEventListener`.
- **Dynamic Category Navigation in Header (`GET /api/v1/categories/tree`)**:
  - Header dropdown dynamically renders the multi-level category tree from backend, maintaining responsive behavior on both desktop hover and mobile accordion toggle.
- **Footer Grid Layout**:
  - CSS Grid with fixed layout across 5 columns: Logo & Slogan, Product Categories, Customer Support, Contact (Phone, Email, Address with `white-space: nowrap`), and Social Connect (Facebook, Zalo).

## Considered and Rejected
- **HTML Web Components (`<custom-element>`) / Shadow DOM**: Rejected because Shadow DOM creates CSS isolation boundaries that prevent global CSS variables (`variables.css`) and reset rules from cascading cleanly into components.
- **Monolithic HTML Duplication**: Copy-pasting header and footer into every single `.html` file was rejected to eliminate maintenance drift and ensure 1-step updates for global navigation.
- **Heavy Client-Side Frameworks (React, Vue, Svelte)**: Rejected to preserve lightweight Vanilla MPA speed, zero bundling steps, and instant Live Server development workflow.

## Dependencies
- Backend Endpoints:
  - `GET /api/v1/categories/tree` (Header dynamic category menu)
- Stylesheets:
  - `assets/css/base/variables.css`, `reset.css`, `global.css`
  - `assets/css/components/header.css`, `footer.css`, `sidebar.css`, `button.css`
- Consumer Pages:
  - `index.html` (Landing page)
  - `pages/product/catalog.html`, `pages/product/detail.html`
  - `pages/introduction/introduction.html`
  - `pages/contact/contact.html`
  - `pages/customer/*.html`, `pages/admin/*.html` (future phases)

## Known Limitations
- ⚠️ Client-side fetch on page load: Components are fetched via client-side `fetch()` during `DOMContentLoaded`. In fast networks this is imperceptible, but skeleton/placeholder dimensions should be preserved to avoid Cumulative Layout Shift (CLS).

## Refactor Log

### 2026-11-16 | @antigravity (Session #3)
- Expanded `component-loader.js` route matching to handle `/pages/introduction/` and `/pages/contact/` with `../../` prefix.
- Added automatic active state highlighting for `data-nav="about"` and `data-nav="contact"`.
- Migrated static footer in `index.html` to dynamic placeholder `<div id="site-footer" data-component="footer"></div>`.
- Updated official company address in footer to `Thôn phất lộc tây, xã Thái Giang, huyện Thái Thụy, Tây Thái Ninh, Hưng Yên` with multi-line wrap support.
- Replaced YouTube icon with Zalo icon and linked Facebook directly to representative profile.

### 2026-11-12 | @antigravity (Session #1)
- Extracted header, footer, customer sidebar, and admin sidebar into independent HTML components.
- Implemented `component-loader.js` with automatic relative path resolution, stylesheet injection, and controller mounting.
