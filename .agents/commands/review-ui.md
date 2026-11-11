Review and verify frontend code quality, UI responsiveness, and API safety.

## 1. File Structure & Conventions
- [ ] Are HTML, CSS, and JS separated into their respective directories?
- [ ] Are dynamic UI components using HTML `<template id="...">` tags instead of mixing raw HTML strings in JS?
- [ ] Are CSS classes using BEM naming conventions?
- [ ] Are colors, font-sizes, and spacing referencing CSS variables from `variables.css`?
- [ ] Are there any inline `style="..."` or inline event handlers (`onclick="..."`)? (Must be eliminated).
- [ ] Is ES6 Module syntax (`import`/`export`) used consistently?

## 2. API Integration & Security
- [ ] Does every API call go through `js/api/client.js` or dedicated `*.api.js` modules?
- [ ] Are all `fetch` requests including `credentials: 'include'`?
- [ ] Is `401 Unauthorized` handled via silent refresh or redirect?
- [ ] Is user input sanitized before insertion into DOM? (Use `textContent`, avoid unsafe `innerHTML`).
- [ ] Are tokens, passwords, or OTPs kept out of `console.log`?

## 3. Business Domain Integrity
- [ ] If product price is `null`, does the UI show "Liên hệ báo giá" instead of `0 VNĐ` or `NaN`?
- [ ] In roofing sheet forms, is size input flexible (allowing decimals like `5.5m`)?
- [ ] Does pagination convert 0-indexed backend pages (`meta.page`) to 1-indexed for display?
- [ ] Does OTP dialog show a 60-second cooldown timer before resend?

## 4. Responsive & Cross-Device Check
- [ ] Mobile view (< 576px): No horizontal overflow/scrolling, touch targets $\ge 44\text{px}$, readable font size.
- [ ] Tablet view (768px – 991px): Grids break into 2 columns appropriately.
- [ ] Desktop view ($\ge$ 992px): Max container width constrained, centered with proper margins.

