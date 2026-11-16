/**
 * debounce.js — Hàm tiện ích trì hoãn thực thi (Debounce)
 */

/**
 * Trì hoãn gọi hàm cho tới khi người dùng ngừng thao tác sau một khoảng thời gian.
 * Dùng cho ô tìm kiếm gợi ý (250–300ms) để tránh gọi API liên tục khi gõ phím.
 *
 * @param {Function} fn - Hàm cần trì hoãn
 * @param {number} [delay=300] - Thời gian chờ tính bằng mili-giây
 * @returns {Function} Hàm đã được debounce (có thêm phương thức `cancel()` để hủy lần gọi đang chờ)
 */
export function debounce(fn, delay = 300) {
  let timerId = null;

  const debounced = (...args) => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}
