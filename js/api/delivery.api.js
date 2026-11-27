/**
 * delivery.api.js — Các API liên quan đến thông tin vị trí cửa hàng và tính khoảng cách giao hàng
 */

import { client } from './client.js';

export const deliveryApi = {
  /**
   * Lấy thông tin cửa hàng công khai (tọa độ tâm, bán kính phục vụ tối đa, hotline)
   * @returns {Promise<{storeName: string, storeAddress: string, storeLatitude: number, storeLongitude: number, maxDeliveryRadiusKm: number, storeHotline: string}>}
   */
  getStoreInfo() {
    return client.get('/delivery/store-info');
  },

  /**
   * Kiểm tra khoảng cách từ xưởng đến tọa độ của khách hàng
   * @param {number} lat - Vĩ độ khách hàng
   * @param {number} lng - Kinh độ khách hàng
   * @returns {Promise<{distanceKm: number, maxRadiusKm: number, withinRadius: boolean, storeName: string, storeAddress: string, storeHotline: string}>}
   */
  checkDeliveryDistance(lat, lng) {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng)
    });
    return client.get(`/delivery/check-distance?${params.toString()}`).then(res => {
      const isAllowed = res.allowed !== undefined ? Boolean(res.allowed) : Boolean(res.withinRadius);
      return {
        ...res,
        withinRadius: isAllowed,
        allowed: isAllowed
      };
    });
  },

  /**
   * Gọi API ArcGIS World Geocoder công khai
   * @private
   */
  async _fetchArcGisCandidates(searchQuery) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(searchQuery)}&countryCode=VNM&maxLocations=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.candidates)) return [];
    return data.candidates.map(c => ({
      address: c.address,
      lat: c.location.y,
      lng: c.location.x,
      score: c.score
    }));
  },

  /**
   * Tìm kiếm tọa độ từ địa chỉ người dùng nhập với cơ chế Dự phòng Đa tầng Thông minh (Smart Multi-tier Fallback)
   * 1. Hỗ trợ nhận diện trực tiếp cặp tọa độ GPS (Copy từ Google Maps: "20.53916, 106.51688").
   * 2. Tìm kiếm nguyên văn chuỗi người dùng nhập qua ArcGIS Geocoder.
   * 3. Tự động bóc tách các mốc nhỏ (cầu, thôn, xóm, số nhà) để định vị chính xác về Phường/Xã hoặc Quận/Huyện kèm chỉ dẫn kéo ghim.
   * @param {string} query - Chuỗi địa chỉ người dùng nhập
   * @returns {Promise<Array<{address: string, lat: number, lng: number, score: number, isFallback?: boolean, landmarkHint?: string}>>}
   */
  async geocodeAddress(query) {
    if (!query || query.trim().length < 3) return [];
    const cleanQuery = query.trim();

    // 1. Kiểm tra nếu người dùng dán trực tiếp Tọa độ GPS (ví dụ lấy từ Google Maps: 20.53916, 106.51688 hoặc URL @20.53916,106.51688)
    const coordMatch = cleanQuery.match(/(?:@)?([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) {
        return [{
          address: `Tọa độ GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
          score: 100,
          isGps: true
        }];
      }
    }

    try {
      const parts = cleanQuery.split(/[,;-]/).map(p => p.trim()).filter(Boolean);
      const detailPart = parts.length > 1 ? parts[0] : '';

      // Tầng 1: Tìm kiếm nguyên văn đầy đủ
      const directCandidates = await this._fetchArcGisCandidates(cleanQuery);
      if (directCandidates.length > 0 && directCandidates[0].score >= 70) {
        // Kiểm tra xem kết quả có phải là cấp xã/huyện thay vì mốc cụ thể hay không
        const best = directCandidates[0];
        const isBroaderArea = detailPart && !best.address.toLowerCase().includes(detailPart.toLowerCase());
        return directCandidates.map(c => ({
          ...c,
          isFallback: isBroaderArea,
          landmarkHint: isBroaderArea ? detailPart : undefined
        }));
      }

      // Tầng 2: Nếu có dấu phẩy ngăn cách (ví dụ: "cầu hoàng nguyên, Xã Sơn Hà, Huyện Thái Thụy, Tỉnh Thái Bình")
      // Tự động bóc tách bỏ mốc nhỏ đầu tiên (cầu/ngõ/thôn/số nhà) để tìm theo cấp xã/huyện/tỉnh
      if (parts.length >= 2) {
        const landmarkPart = parts[0];
        const broaderQuery = parts.slice(1).join(', ');

        const broaderCandidates = await this._fetchArcGisCandidates(broaderQuery);
        if (broaderCandidates.length > 0) {
          return broaderCandidates.map(c => ({
            ...c,
            isFallback: true,
            landmarkHint: landmarkPart
          }));
        }

        // Tầng 3: Nếu vẫn chưa thấy và có >= 3 vế, thử tìm cấp huyện/tỉnh
        if (parts.length >= 3) {
          const districtProvinceQuery = parts.slice(2).join(', ');
          const districtCandidates = await this._fetchArcGisCandidates(districtProvinceQuery);
          if (districtCandidates.length > 0) {
            return districtCandidates.map(c => ({
              ...c,
              isFallback: true,
              landmarkHint: landmarkPart
            }));
          }
        }
      }

      // Trả về kết quả trực tiếp nếu có (dù điểm thấp) hoặc rỗng
      return directCandidates;
    } catch (err) {
      console.warn('[DeliveryAPI] Lỗi khi định vị địa chỉ:', err);
      return [];
    }
  }
};
