# Introduction Page — Implementation Context
> Written: 2026-11-18 | Author: @antigravity

## Business & UX Context
The Introduction page (`pages/introduction/introduction.html`) introduces company identity, manufacturing capabilities, quality commitments, and core values of Tôn Việt (Hoàng Minh Phát - HMP).
It establishes brand authority and trust for B2B building contractors, roofing agencies, and homeowners through actual factory imagery, structured value propositions, and direct call-to-action (CTA) navigation.

## Technical & UI Decisions
List of critical architectural decisions:
- **Hero Banner with Preserved Image Texture**: Uses `assets/images/introduction/banner.png` combined with a smooth gradient fade (`#1b3f7e`) on `.intro-banner__fade`. Ensures roofing wave details remain visible without harsh clipping, while providing crisp contrast for breadcrumb and page title.
- **Structured Storytelling Layout**:
  - *About Us*: Two-column card contrasting company introduction text against full-view factory photo `about-us.png`.
  - *Why Choose Us Grid*: Four-pillar benefit card (Chất lượng vượt trội, Giá cả cạnh tranh, Hỗ trợ chuyên nghiệp, Giao hàng nhanh chóng) styled with soft blue background (`#f0f5fc`), rounded corners, and standalone SVG vector icons.
  - *Mission, Vision & Core Values*: Three distinct pillar cards combined with color roofing sheet showcase `metal-sheet.png`.
  - *CTA Conversion Banner*: High-impact banner with factory visual `footer.png` and primary action button linking directly to the Contact page.
- **Zero Inline Styles & Strict BEM**: 100% adherence to BEM naming convention (`.intro-*`), CSS Variables (`variables.css`), and zero inline CSS or JavaScript.
- **Automated Navigation Highlighting**: Controlled by `component-loader.js` via `data-nav="about"` matching the `/pages/introduction/` path.
- **Mobile-first Responsiveness**: Explicit breakpoints for Mobile (375px), Tablet (768px), and Desktop (1200px), transforming multi-column grids into stacked vertical layouts seamlessly.

## Considered and Rejected
- **Video background in Hero Banner**: Rejected to maintain instant page loading speeds on mobile networks and eliminate external video CDN dependencies.
- **Accordion-based FAQ on Introduction page**: Rejected in favor of concise pillar cards; extensive FAQs will be managed separately if required.

## Dependencies
- Shared Components:
  - `pages/components/common/header.html` & `footer.html` (injected via `component-loader.js`)
  - `js/components/component-loader.js` (detects `getRootPrefix()` -> `../../` and highlights `data-nav="about"`)
- Stylesheets:
  - `assets/css/base/variables.css`, `reset.css`, `global.css`
  - `assets/css/components/button.css`, `header.css`, `footer.css`
  - `assets/css/pages/introduction.css`
- Static Assets:
  - `assets/images/introduction/banner.png`, `about-us.png`, `metal-sheet.png`, `footer.png`
- Depended by:
  - Header navigation menu ("Giới thiệu")
  - Footer sitemap links

## Known Limitations
- ⚠️ Static content: Content and imagery are currently statically defined in HTML/CSS. A CMS or backend endpoint for corporate announcements is out-of-scope for V1.

## Refactor Log

### 2026-11-16 | @antigravity (Session #3)
- Built complete Introduction page adhering to real-world design specifications.
- Implemented hero banner, about-us section, why-choose-us 4-pillar cards, mission/vision/core values section, and CTA banner.
- Unified header/footer embedding with dynamic `component-loader.js` root prefix resolving (`../../`).
