# Contact Page — Implementation Context
> Written: 2026-11-18 | Author: @antigravity

## Business & UX Context
The Contact page (`pages/contact/contact.html`) provides direct communication channels for customers, building contractors, and wholesale dealers to reach Tôn Việt (Hoàng Minh Phát - HMP).
It delivers immediate access to consultation via hotline (1900 1234), official quote inquiries via email (info@tonviet.vn), physical office & factory address at Hưng Yên, Google Maps navigation, and instant social messaging (Facebook & Zalo).

## Technical & UI Decisions
List of critical architectural decisions:
- **Hero Banner with Roofing Wave Detail**: Employs `assets/images/contact/banner.png` with a non-destructive gradient overlay (`#1b3f7e`) on `.contact-banner__fade` preserving real corrugated sheet texture while providing clear contrast for the title and breadcrumb.
- **Three Quick-Contact Cards (3-column Grid)**:
  - Hotline card: tel:19001234.
  - Email card: mailto:info@tonviet.vn.
  - Address card: Office & factory at `Thôn phất lộc tây, xã Thái Giang, huyện Thái Thụy, Tây Thái Ninh, Hưng Yên`.
  - Decorated with standalone inline SVG vector icons wrapped in rounded blue circular badge boxes (`.contact-card__icon-box`).
- **Google Maps Integration with 0% Inline Styles**: Embedded Google Maps `<iframe>` with full width and rounded corners. The default third-party `style="border:0;"` attribute was completely stripped and replaced by `.contact-map__iframe` CSS class with responsive height rules: 320px (mobile), 400px (tablet), 460px (desktop).
- **Social Connect Banner**: Integrates background image `footer.png` on the right with a soft CSS linear gradient fade to pure white (`#ffffff`) on the left. Houses direct links to Facebook (`https://www.facebook.com/vinh.lexuan.984786`) and Zalo.
- **Clean Code & BEM Architecture**: 100% adherence to BEM naming convention (`.contact-*`), CSS Variables, zero inline styles, and zero inline JS.
- **Dynamic Active Navigation**: `component-loader.js` automatically detects `/pages/contact/` and activates `data-nav="contact"`.

## Considered and Rejected
- **Contact inquiry submission form (Name/Phone/Message fields)**: Omitted for V1 to streamline direct customer inquiries through hotline and live chat (Zalo/Facebook), avoiding unauthenticated spam and unnecessary backend contact inbox storage.
- **YouTube social icon**: Explicitly removed to focus user attention on high-conversion consultation channels (Hotline, Zalo, Facebook).
- **Inline style on Google Maps iframe**: Banned and refactored into CSS class `.contact-map__iframe`.

## Dependencies
- Shared Components:
  - `pages/components/common/header.html` & `footer.html` (injected via `component-loader.js`)
  - `js/components/component-loader.js` (detects `getRootPrefix()` -> `../../` and highlights `data-nav="contact"`)
- Stylesheets:
  - `assets/css/base/variables.css`, `reset.css`, `global.css`
  - `assets/css/components/button.css`, `header.css`, `footer.css`
  - `assets/css/pages/contact.css`
- Static Assets:
  - `assets/images/contact/banner.png`, `footer.png`
- External Services:
  - Google Maps iframe embed
  - Facebook & Zalo social links

## Known Limitations
- ⚠️ Static contact information: Hotline, email, and address are statically maintained in HTML. Future administrative management via `master-data` API can be wired when backend endpoints become available.

## Refactor Log

### 2026-11-16 | @antigravity (Session #3)
- Built complete Contact page adhering to real-world design specifications.
- Implemented hero banner, 3 quick contact cards, CSS-only Google Maps iframe embed, and social connect banner.
- Unified address to `Thôn phất lộc tây, xã Thái Giang, huyện Thái Thụy, Tây Thái Ninh, Hưng Yên` with natural multi-line wrapping.
- Replaced YouTube with Zalo icon and linked Facebook directly to the company representative profile.
