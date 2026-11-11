Create a new page or UI feature. Follow these steps in exact order.

## Step 1: Understand Context
- Read `AGENTS.md` → project overview and source of truth
- Read `.agents/rules/project-rules.md` → coding conventions, CSS BEM, security
- Read `../sales-backend/api-spec.md` → check endpoint contracts, request/response structures
- Read `project-status.md` → check current phase progress

## Step 2: Create Files Following Project Structure
1. **HTML file** at root: `{page-name}.html`
   - Include semantic tags (`<header>`, `<nav>`, `<main>`, `<footer>`).
   - Link base CSS (`variables.css`, `reset.css`, `global.css`).
   - Link component CSS (`header.css`, `footer.css`, `button.css`, etc.).
   - Link page CSS (`assets/css/pages/{page-name}.css`).
   - Include `<script type="module" src="./js/pages/{page-name}.js"></script>`.
2. **Page CSS** at `assets/css/pages/{page-name}.css`
   - Mobile-first styles.
   - Use CSS variables for colors, spacing, borders.
   - BEM class names with page-specific prefix (e.g. `.p-detail-...`).
   - Add media queries for tablet (>= 768px) and desktop (>= 992px).
3. **API Module** at `js/api/{domain}.api.js` (if not already existing)
   - Export asynchronous functions calling `client.get()`, `client.post()`, etc.
   - No direct DOM manipulation here.
4. **Page Controller Script** at `js/pages/{page-name}.js`
   - Listen to `DOMContentLoaded`.
   - Render components (Header, Footer).
   - Fetch initial data asynchronously, handle loading spinner and error messages.
   - Attach event listeners to interactive elements.

## Step 3: Verify Checklist
- [ ] Responsive check on mobile (375px), tablet (768px), and desktop (1200px).
- [ ] No inline styles or inline JS.
- [ ] API error handling displays a user-friendly Vietnamese toast or message.
- [ ] Price visibility check: displays "Liên hệ báo giá" if price is `null`.
- [ ] Update `project-status.md` upon completion.

