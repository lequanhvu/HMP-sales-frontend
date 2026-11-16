/**
 * introduction.js — Script điều khiển Trang Giới thiệu Tôn Việt (HMP)
 */

import { initCommonLayout } from '../components/component-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Nhúng Header & Footer dùng chung và kích hoạt trạng thái active điều hướng
  await initCommonLayout();
});
