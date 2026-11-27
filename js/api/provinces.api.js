/**
 * provinces.api.js — Dịch vụ nạp dữ liệu Địa giới hành chính Việt Nam (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã)
 * 
 * Sử dụng nguồn dữ liệu mở Open-API Việt Nam với cơ chế cache bộ nhớ để giảm thiểu truy vấn mạng.
 */

const cache = {
  provinces: null,
  districtsByProvince: new Map(),
  wardsByDistrict: new Map()
};

export const provincesApi = {
  /**
   * Lấy danh sách 63 Tỉnh / Thành phố
   * @returns {Promise<Array<{code: number, name: string}>>}
   */
  async getProvinces() {
    if (cache.provinces) return cache.provinces;

    try {
      const res = await fetch('https://provinces.open-api.vn/api/p/');
      if (!res.ok) throw new Error('Không thể nạp danh sách tỉnh thành');
      const data = await res.json();
      cache.provinces = data.map(p => ({
        code: p.code,
        name: p.name
      }));
      return cache.provinces;
    } catch (err) {
      console.warn('[ProvincesApi] Lỗi nạp tỉnh thành:', err);
      return [];
    }
  },

  /**
   * Lấy danh sách Quận / Huyện thuộc Tỉnh
   * @param {number|string} provinceCode
   * @returns {Promise<Array<{code: number, name: string}>>}
   */
  async getDistricts(provinceCode) {
    if (!provinceCode) return [];
    const pCode = Number(provinceCode);
    if (cache.districtsByProvince.has(pCode)) {
      return cache.districtsByProvince.get(pCode);
    }

    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${pCode}?depth=2`);
      if (!res.ok) throw new Error('Không thể nạp danh sách quận huyện');
      const data = await res.json();
      const districts = (data.districts || []).map(d => ({
        code: d.code,
        name: d.name
      }));
      cache.districtsByProvince.set(pCode, districts);
      return districts;
    } catch (err) {
      console.warn(`[ProvincesApi] Lỗi nạp quận huyện tỉnh ${provinceCode}:`, err);
      return [];
    }
  },

  /**
   * Lấy danh sách Phường / Xã thuộc Huyện
   * @param {number|string} districtCode
   * @returns {Promise<Array<{code: number, name: string}>>}
   */
  async getWards(districtCode) {
    if (!districtCode) return [];
    const dCode = Number(districtCode);
    if (cache.wardsByDistrict.has(dCode)) {
      return cache.wardsByDistrict.get(dCode);
    }

    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${dCode}?depth=2`);
      if (!res.ok) throw new Error('Không thể nạp danh sách phường xã');
      const data = await res.json();
      const wards = (data.wards || []).map(w => ({
        code: w.code,
        name: w.name
      }));
      cache.wardsByDistrict.set(dCode, wards);
      return wards;
    } catch (err) {
      console.warn(`[ProvincesApi] Lỗi nạp phường xã huyện ${districtCode}:`, err);
      return [];
    }
  }
};
