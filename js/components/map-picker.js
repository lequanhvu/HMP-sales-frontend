/**
 * map-picker.js — Thành phần Bản đồ tương tác Leaflet chọn vị trí giao hàng & hiển thị bán kính phục vụ
 * 
 * Tính năng:
 * - Tích hợp lớp gạch nền Google Maps tiêu chuẩn (hiển thị đầy đủ đường sá, số nhà, khối nhà, địa danh Việt Nam).
 * - Hỗ trợ chuyển đổi giữa "Bản đồ đường phố" và "Ảnh vệ tinh Google" để người dùng dễ nhận biết mái nhà/công trình.
 * - Hiển thị vị trí xưởng sản xuất HMP (tâm phục vụ) kèm vòng tròn bán kính cho phép.
 * - Cho phép khách hàng click hoặc kéo thả ghim đỏ để chọn vị trí nhận hàng chính xác.
 * - Hỗ trợ nút "Lấy vị trí hiện tại của tôi" qua Geolocation API của trình duyệt.
 * - Hỗ trợ phương thức panToLocation() để tự động ghim vị trí khi người dùng gõ địa chỉ.
 */

import { deliveryApi } from '../api/delivery.api.js';

export class MapPicker {
  /**
   * @param {Object} options
   * @param {string|HTMLElement} options.container - ID hoặc phần tử DOM chứa bản đồ
   * @param {Object} options.storeInfo - { storeLatitude, storeLongitude, maxDeliveryRadiusKm, storeName, storeAddress, storeHotline }
   * @param {Function} options.onLocationChange - Callback khi tọa độ thay đổi: ({ lat, lng, distanceKm, withinRadius, maxRadiusKm, storeHotline }) => void
   * @param {number} [options.initialLat] - Vĩ độ khởi tạo (nếu có)
   * @param {number} [options.initialLng] - Kinh độ khởi tạo (nếu có)
   */
  constructor(options) {
    this.container = typeof options.container === 'string'
      ? document.getElementById(options.container)
      : options.container;

    this.storeInfo = options.storeInfo || {
      storeLatitude: 21.352410,
      storeLongitude: 105.541280,
      maxDeliveryRadiusKm: 25.0,
      storeName: 'Xưởng Tôn Thép HMP',
      storeAddress: 'Huyện Lập Thạch, Tỉnh Vĩnh Phúc',
      storeHotline: '0987654321'
    };

    this.onLocationChange = options.onLocationChange || (() => {});
    this.selectedLat = options.initialLat || null;
    this.selectedLng = options.initialLng || null;

    this.map = null;
    this.storeMarker = null;
    this.radiusCircle = null;
    this.deliveryMarker = null;
    this.debounceTimer = null;

    this.init();
  }

  /**
   * Khởi tạo bản đồ và các lớp hiển thị
   */
  init() {
    if (!this.container) {
      console.warn('[MapPicker] Không tìm thấy phần tử container bản đồ.');
      return;
    }

    if (typeof window.L === 'undefined') {
      console.error('[MapPicker] Thư viện Leaflet chưa được nạp.');
      return;
    }

    const storeLat = Number(this.storeInfo.storeLatitude) || 21.352410;
    const storeLng = Number(this.storeInfo.storeLongitude) || 105.541280;
    const radiusMeters = (Number(this.storeInfo.maxDeliveryRadiusKm) || 25) * 1000;

    const centerLat = this.selectedLat || storeLat;
    const centerLng = this.selectedLng || storeLng;

    // 1. Tạo đối tượng Leaflet Map
    this.map = window.L.map(this.container, {
      center: [centerLat, centerLng],
      zoom: 12,
      scrollWheelZoom: true
    });

    // 2. Lớp bản đồ giao thông & đường phố Esri World Street Map (Sạch 100%, không chữ chìm, miễn phí & hợp pháp)
    const esriStreets = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Bản đồ © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>'
    });

    // Lớp ảnh vệ tinh thực tế Esri World Imagery (độ nét cao, thấy rõ mái nhà, khu xưởng, không chữ chìm)
    const esriSatellite = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Ảnh vệ tinh © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Maxar'
    });

    // Lớp bản đồ Google Maps (tiêu chuẩn quen thuộc)
    const googleRoadmap = window.L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: 'Bản đồ © Google Maps'
    });

    // Thiết lập Bản đồ Esri làm lớp mặc định (hoàn toàn sạch sẽ, không watermark)
    esriStreets.addTo(this.map);

    // Thêm bộ điều khiển chuyển đổi lớp bản đồ (Góc trên bên phải)
    const baseMaps = {
      'Bản đồ đường phố (Esri)': esriStreets,
      'Ảnh vệ tinh thực tế': esriSatellite,
      'Bản đồ Google Maps': googleRoadmap
    };
    window.L.control.layers(baseMaps, null, { position: 'topright' }).addTo(this.map);

    // 3. Vòng tròn bán kính phục vụ xung quanh xưởng (Màu xanh thương hiệu HMP)
    this.radiusCircle = window.L.circle([storeLat, storeLng], {
      color: '#1351b4',
      fillColor: '#1351b4',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '6, 6',
      radius: radiusMeters
    }).addTo(this.map);

    // 4. Marker xưởng sản xuất HMP
    const storeIcon = window.L.divIcon({
      className: 'store-map-marker-pin',
      html: `
        <div class="map-marker-badge map-marker-badge--store" title="${this.storeInfo.storeName}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });

    this.storeMarker = window.L.marker([storeLat, storeLng], { icon: storeIcon })
      .addTo(this.map)
      .bindPopup(`<strong>${this.storeInfo.storeName}</strong><br><small>${this.storeInfo.storeAddress}</small><br><span style="color:#1351b4;font-weight:600">Bán kính giao hàng: ${this.storeInfo.maxDeliveryRadiusKm} km</span>`);

    // 5. Nếu đã có tọa độ khởi tạo, đặt marker giao hàng
    if (this.selectedLat && this.selectedLng) {
      this.createOrUpdateDeliveryMarker(this.selectedLat, this.selectedLng);
      this.updateSelectedLocation(this.selectedLat, this.selectedLng);
    }

    // 6. Sự kiện click trên bản đồ để di chuyển ghim
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.setDeliveryLocation(lat, lng);
    });

    // 7. Tự động khắc phục kích thước ẩn (invalidateSize)
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);
  }

  /**
   * Tạo hoặc di chuyển ghim vị trí giao hàng của khách
   * @param {number} lat
   * @param {number} lng
   */
  createOrUpdateDeliveryMarker(lat, lng) {
    if (!this.map) return;

    if (!this.deliveryMarker) {
      const deliveryIcon = window.L.divIcon({
        className: 'customer-map-marker-pin',
        html: `
          <div class="map-marker-badge map-marker-badge--customer" title="Vị trí nhận hàng (Kéo để điều chỉnh)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [36, 40],
        iconAnchor: [18, 40],
        popupAnchor: [0, -40]
      });

      this.deliveryMarker = window.L.marker([lat, lng], {
        draggable: true,
        icon: deliveryIcon
      }).addTo(this.map);

      this.deliveryMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        this.updateSelectedLocation(pos.lat, pos.lng);
      });
    } else {
      this.deliveryMarker.setLatLng([lat, lng]);
      if (!this.map.hasLayer(this.deliveryMarker)) {
        this.deliveryMarker.addTo(this.map);
      }
    }
  }

  /**
   * Cập nhật vị trí giao hàng và gọi kiểm tra khoảng cách
   * @param {number} lat
   * @param {number} lng
   */
  setDeliveryLocation(lat, lng) {
    this.selectedLat = lat;
    this.selectedLng = lng;

    this.createOrUpdateDeliveryMarker(lat, lng);
    this.updateSelectedLocation(lat, lng);
  }

  /**
   * Di chuyển bản đồ đến tọa độ chỉ định (ví dụ từ kết quả tìm kiếm địa chỉ) và đặt ghim
   * @param {number} lat
   * @param {number} lng
   * @param {number} [zoom=15]
   */
  panToLocation(lat, lng, zoom = 15) {
    this.selectedLat = lat;
    this.selectedLng = lng;

    if (this.map) {
      try {
        this.map.invalidateSize();
        this.map.setView([lat, lng], zoom, { animate: false });
      } catch (e) {
        console.warn('[MapPicker] Lỗi khi setView:', e);
      }
    }

    this.createOrUpdateDeliveryMarker(lat, lng);
    this.updateSelectedLocation(lat, lng);
  }

  /**
   * Debounce gọi API kiểm tra khoảng cách với Backend
   * @param {number} lat
   * @param {number} lng
   */
  updateSelectedLocation(lat, lng) {
    this.selectedLat = lat;
    this.selectedLng = lng;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        const checkResult = await deliveryApi.checkDeliveryDistance(lat, lng);
        const isWithin = Boolean(checkResult.withinRadius ?? checkResult.allowed);
        if (this.deliveryMarker) {
          const statusText = isWithin
            ? `<span style="color:#10b981;font-weight:600">✓ Trong phạm vi phục vụ (${checkResult.distanceKm} km)</span>`
            : `<span style="color:#ef4444;font-weight:600">⚠ Vượt bán kính phục vụ (${checkResult.distanceKm} km / tối đa ${checkResult.maxRadiusKm} km)</span>`;
          this.deliveryMarker.bindPopup(`<strong>Vị trí nhận tôn</strong><br>${statusText}<br><small style="color:#64748b">Kéo ghim để tinh chỉnh vị trí</small>`).openPopup();
        }

        this.onLocationChange({
          lat,
          lng,
          distanceKm: checkResult.distanceKm,
          withinRadius: isWithin,
          maxRadiusKm: checkResult.maxRadiusKm,
          storeHotline: checkResult.storeHotline
        });
      } catch (err) {
        console.error('[MapPicker] Lỗi kiểm tra khoảng cách:', err);
      }
    }, 250);
  }

  /**
   * Yêu cầu trình duyệt lấy vị trí GPS hiện tại
   */
  locateCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị GPS.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.panToLocation(lat, lng, 15);
          resolve({ lat, lng });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Làm tươi kích thước bản đồ khi hiển thị từ trạng thái ẩn (display: none / hidden)
   */
  invalidateSize() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * Lấy tọa độ đang chọn
   */
  getSelectedLocation() {
    return {
      lat: this.selectedLat,
      lng: this.selectedLng
    };
  }

  /**
   * Hủy bản đồ khi không dùng
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
