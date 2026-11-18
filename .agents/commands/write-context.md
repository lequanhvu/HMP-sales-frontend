Write a `CONTEXT.md` file for the current frontend feature or page module.

This file is a **snapshot** — it captures WHY this page/module was designed and built this way,
at the time it was built. It helps future developers (and AI) understand UX and technical decisions
without guessing from HTML, CSS, or JavaScript code.

## Where to Create
Place the file inside the corresponding module or page directory:
```
pages/{module}/CONTEXT.md
```
*(e.g., `pages/product/CONTEXT.md`, `pages/customer/CONTEXT.md`, `pages/auth/CONTEXT.md`, `pages/admin/CONTEXT.md`)*

For global shared components or root landing page:
```
js/components/CONTEXT.md
```

## Template — Fill Every Section

```markdown
# {Module / Page Name} — Implementation Context
> Written: {YYYY-MM-DD} | Author: {who built it}

## Business & UX Context
Why does this page/module exist? What customer or business problem does it solve?
What are the primary user interactions?
(2-3 sentences max)

## Technical & UI Decisions
List each important decision and WHY it was made:
- **DOM & Template Strategy**: {e.g. used `<template id="...">` cloning instead of innerHTML to prevent XSS and separate markup from logic}
- **CSS & Responsive Architecture**: {e.g. mobile-first BEM with `.p-catalog-...` prefix, CSS Grid for product cards, breakpoints 768px / 992px}
- **State & Storage**: {e.g. cart stored in LocalStorage for guests, active filter criteria synced to URL query params}
- **API Integration**: {e.g. consumed `js/api/product.api.js`, handled 0-based pagination conversion, silent token refresh}
- **Business UX Rules**: {e.g. permission-driven price masking with "Liên hệ báo giá", fallback image `empty-picture.png` on 404, dimension calculation `UnitPrice × Size × Quantity`}

## Considered and Rejected
Options that were evaluated but NOT chosen:
- **{Option}**: rejected because {reason}
- **{Option}**: rejected because {reason}

## Dependencies
- Backend Endpoints: {list backend endpoints from `api-spec.md` consumed by this module}
- Shared Components: {e.g. Header, Footer, Toast notifications, Modal OTP}
- Utilities: {e.g. `formatVnd()`, `debounce()`, `storage.js`}
- Depended by: {list pages or navigation flows linking to this module}

## Known Limitations
Things that are intentional trade-offs or not yet implemented:
- ⚠️ {limitation — explain why it's acceptable for now, e.g. V1 out-of-scope items}

## Refactor Log
(Add entries here when significant changes are made. Do NOT edit sections above.)

### {YYYY-MM-DD} | {author}
- {what changed and why}
```

## Rules
1. Write in English.
2. Be specific — "chose X because Y", not just "chose X".
3. Keep each section concise (2-5 bullet points max).
4. "Known Limitations" is critical — prevents future devs from "fixing" intentional trade-offs.
5. NEVER edit old content — only ADD new entries in Refactor Log.
6. Write it NOW while context is fresh — tomorrow you'll forget half the reasons.
