/**
 * i18n.js — Quản lý tập trung bản dịch tiếng Việt cho Frontend HMP Sales
 * 
 * Kiến trúc 3 Trụ Cột (3-Pillar Translation Architecture):
 * 1. fieldTranslations: Dịch tên trường dữ liệu (Field Names / Labels)
 * 2. enumTranslations:  Dịch giá trị phân loại / trạng thái (Enum Values / Statuses)
 * 3. messageTranslations: Dịch thông báo / mã lỗi từ Backend (Messages & Errors)
 * 
 * Nguyên tắc cốt lõi:
 * - Dữ liệu gửi lên BE & thuộc tính trong code luôn giữ nguyên tiếng Anh ban đầu.
 * - Chỉ chuyển đổi ngôn ngữ khi hiển thị lên giao diện người dùng (Presentation Layer).
 * - Nếu BE đã trả về thông điệp tiếng Việt thì giữ nguyên, không dịch lại.
 * - Luôn có cơ chế fallback an toàn, không bao giờ làm vỡ giao diện (crash UI).
 */

// =============================================================================
// TRỤ CỘT 1: FIELD TRANSLATIONS (Dịch tên trường / Field Labels)
// =============================================================================

/**
 * Danh mục tên trường dùng chung giữa các phân hệ (Common Fields)
 */
const COMMON_FIELDS = {
  id: 'Mã',
  code: 'Mã',
  name: 'Tên',
  status: 'Trạng thái',
  description: 'Mô tả',
  note: 'Ghi chú',
  notes: 'Ghi chú',
  action: 'Thao tác',
  actions: 'Thao tác',
  createdAt: 'Ngày tạo',
  updatedAt: 'Ngày cập nhật',
  createdBy: 'Người tạo',
  updatedBy: 'Người cập nhật',
  search: 'Tìm kiếm',
  keyword: 'Từ khóa',
  filter: 'Bộ lọc',
  page: 'Trang',
  size: 'Số lượng mỗi trang',
  total: 'Tổng cộng',
  metadata: 'Dữ liệu kèm theo'
};

/**
 * Danh mục tên trường thuộc phân hệ Sản phẩm & Báo giá (Product Module)
 */
const PRODUCT_FIELDS = {
  productId: 'Mã sản phẩm',
  productName: 'Tên sản phẩm',
  sku: 'Mã SKU',
  categoryId: 'Mã danh mục',
  categoryName: 'Danh mục',
  brandId: 'Mã thương hiệu',
  brandName: 'Thương hiệu',
  unitId: 'Mã đơn vị tính',
  unitName: 'Đơn vị tính',
  variantId: 'Mã biến thể',
  variantName: 'Tên biến thể',
  thickness: 'Độ dày',
  length: 'Chiều dài',
  width: 'Khổ rộng',
  effectiveWidth: 'Khổ hiệu dụng',
  ribCount: 'Số sóng',
  price: 'Đơn giá',
  unitPrice: 'Đơn giá',
  quantity: 'Số lượng',
  colorId: 'Mã màu',
  colorName: 'Màu sắc',
  colorCode: 'Mã màu',
  primaryImageUrl: 'Ảnh đại diện',
  images: 'Hình ảnh sản phẩm',
  specification: 'Thông số kỹ thuật',
  specifications: 'Thông số kỹ thuật',
  warrantyPeriod: 'Thời gian bảo hành',
  origin: 'Xuất xứ',
  displayOrder: 'Thứ tự hiển thị',
  isFeatured: 'Sản phẩm nổi bật'
};

/**
 * Danh mục tên trường thuộc phân hệ Đơn hàng (Order Module)
 */
const ORDER_FIELDS = {
  orderId: 'Mã đơn hàng',
  orderCode: 'Mã đơn hàng',
  customerName: 'Tên khách hàng',
  customerPhone: 'Số điện thoại khách hàng',
  recipientName: 'Người nhận hàng',
  recipientPhone: 'Số điện thoại nhận',
  deliveryAddress: 'Địa chỉ giao hàng',
  shippingAddress: 'Địa chỉ nhận hàng',
  orderDate: 'Ngày đặt hàng',
  totalAmount: 'Tổng tiền hàng',
  discountAmount: 'Chiết khấu',
  finalAmount: 'Tổng thanh toán',
  cancellationReason: 'Lý do hủy đơn',
  cancellationWindowMinutes: 'Thời hạn hủy đơn (phút)',
  items: 'Danh sách sản phẩm',
  lineTotal: 'Thành tiền',
  orderStatus: 'Trạng thái đơn hàng',
  history: 'Lịch sử trạng thái'
};

/**
 * Danh mục tên trường thuộc phân hệ Tài khoản & Người dùng (User Module)
 */
const USER_FIELDS = {
  userId: 'Mã người dùng',
  fullName: 'Họ và tên',
  email: 'Địa chỉ email',
  phoneNumber: 'Số điện thoại',
  phone: 'Số điện thoại',
  role: 'Vai trò',
  roles: 'Vai trò',
  avatarUrl: 'Ảnh đại diện',
  isPhoneVerified: 'Xác thực số điện thoại',
  lastLoginAt: 'Đăng nhập lần cuối',
  authProvider: 'Phương thức xác thực'
};

/**
 * Danh mục tên trường thuộc phân hệ Sổ địa chỉ (Address Module)
 */
const ADDRESS_FIELDS = {
  addressId: 'Mã địa chỉ',
  recipientName: 'Họ tên người nhận',
  phoneNumber: 'Số điện thoại nhận hàng',
  addressLine: 'Địa chỉ chi tiết',
  ward: 'Phường / Xã',
  district: 'Quận / Huyện',
  province: 'Tỉnh / Thành phố',
  isDefault: 'Địa chỉ mặc định'
};

/**
 * Danh mục tên trường thuộc phân hệ Danh mục sản phẩm (Category Module)
 */
const CATEGORY_FIELDS = {
  categoryId: 'Mã danh mục',
  categoryName: 'Tên danh mục',
  parentCategoryId: 'Danh mục cha',
  parentName: 'Danh mục cha',
  children: 'Danh mục con',
  productCount: 'Số lượng sản phẩm'
};

/**
 * Danh mục tên trường Dữ liệu chủ Master Data (Brand, Color, Unit)
 */
const MASTER_DATA_FIELDS = {
  brandId: 'Mã thương hiệu',
  brandName: 'Tên thương hiệu',
  unitId: 'Mã đơn vị tính',
  unitName: 'Tên đơn vị tính',
  colorId: 'Mã màu',
  colorName: 'Tên màu sắc',
  hexCode: 'Mã màu HEX'
};

/**
 * Bảng gom toàn bộ Field Maps theo Domain
 */
const DOMAIN_FIELD_MAPS = {
  common: COMMON_FIELDS,
  product: PRODUCT_FIELDS,
  order: ORDER_FIELDS,
  user: USER_FIELDS,
  address: ADDRESS_FIELDS,
  category: CATEGORY_FIELDS,
  masterData: MASTER_DATA_FIELDS
};

/**
 * Chuyển đổi tên trường dạng camelCase thành chuỗi đọc được (Fallback cho trường chưa dịch).
 * Ví dụ: "customerAddressNote" -> "Customer Address Note"
 *
 * @param {string} str - Tên trường camelCase
 * @returns {string} Chuỗi định dạng dễ đọc
 */
function formatCamelCase(str) {
  if (!str || typeof str !== 'string') return '';
  const formatted = str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Dịch tên trường dữ liệu (Field Name / Label) sang tiếng Việt.
 * Tìm trong Domain chỉ định -> Nếu không có thì tìm trong Common -> Nếu không có thì format fallback.
 *
 * @param {string} fieldName - Tên trường tiếng Anh (vd: "productName", "length", "status")
 * @param {string} [domain='common'] - Phân hệ: 'product' | 'order' | 'user' | 'address' | 'category' | 'masterData' | 'common'
 * @param {string|null} [fallback=null] - Bản dịch dự phòng nếu không tìm thấy
 * @returns {string} Tên trường tiếng Việt hoặc fallback
 */
export function translateField(fieldName, domain = 'common', fallback = null) {
  if (fieldName === null || fieldName === undefined || fieldName === '') {
    return fallback !== null ? fallback : '-';
  }

  const cleanKey = String(fieldName).trim();

  // 1. Tìm trong Domain được chỉ định
  const targetMap = DOMAIN_FIELD_MAPS[domain];
  if (targetMap && Object.prototype.hasOwnProperty.call(targetMap, cleanKey)) {
    return targetMap[cleanKey];
  }

  // 2. Tìm trong nhóm dùng chung (Common Fields) nếu domain chỉ định không có
  if (domain !== 'common' && Object.prototype.hasOwnProperty.call(COMMON_FIELDS, cleanKey)) {
    return COMMON_FIELDS[cleanKey];
  }

  // 3. Quét qua các domain khác để tối đa hóa khả năng tái sử dụng
  for (const [dom, map] of Object.entries(DOMAIN_FIELD_MAPS)) {
    if (dom !== domain && dom !== 'common' && Object.prototype.hasOwnProperty.call(map, cleanKey)) {
      return map[cleanKey];
    }
  }

  // 4. Nếu có fallback tùy chỉnh truyền vào
  if (fallback !== null) {
    return fallback;
  }

  // 5. Fallback định dạng dễ đọc từ chính fieldName gốc
  return formatCamelCase(cleanKey);
}

// =============================================================================
// TRỤ CỘT 2: ENUM TRANSLATIONS (Dịch giá trị Enum / Trạng thái / Phân loại)
// =============================================================================

/**
 * Trạng thái đơn hàng (OrderStatus)
 */
export const ORDER_STATUS_MAP = {
  PENDING: 'Chờ xử lý',
  WAITING_FOR_CUSTOMER_CONFIRMATION: 'Chờ khách xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang gia công sản xuất',
  SHIPPING: 'Đang vận chuyển',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

/**
 * Trạng thái hoạt động sản phẩm & biến thể (ProductStatus, VariantStatus)
 */
export const PRODUCT_STATUS_MAP = {
  ACTIVE: 'Đang kinh doanh',
  INACTIVE: 'Ngừng kinh doanh'
};

/**
 * Trạng thái danh mục sản phẩm (CategoryStatus)
 */
export const CATEGORY_STATUS_MAP = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Đã khóa'
};

/**
 * Trạng thái Master Data (Thương hiệu, Đơn vị tính, Màu sắc)
 */
export const MASTER_DATA_STATUS_MAP = {
  ACTIVE: 'Đang áp dụng',
  LOCKED: 'Đã khóa'
};

/**
 * Trạng thái tài khoản người dùng (UserStatus)
 */
export const USER_STATUS_MAP = {
  ACTIVE: 'Đang hoạt động',
  LOCKED: 'Bị khóa'
};

/**
 * Vai trò người dùng (RoleCode)
 */
export const ROLE_MAP = {
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý',
  CUSTOMER: 'Khách hàng'
};

/**
 * Phương thức xác thực (AuthProvider)
 */
export const AUTH_PROVIDER_MAP = {
  GOOGLE: 'Google',
  LOCAL: 'Tài khoản nội bộ'
};

/**
 * Trạng thái địa chỉ nhận hàng (AddressStatus)
 */
export const ADDRESS_STATUS_MAP = {
  ACTIVE: 'Đang sử dụng',
  INACTIVE: 'Ngừng sử dụng'
};

/**
 * Phân loại tài nguyên tìm kiếm gợi ý (SearchResourceType)
 */
export const SEARCH_TYPE_MAP = {
  PRODUCT: 'Sản phẩm',
  CATEGORY: 'Danh mục',
  BRAND: 'Thương hiệu'
};

/**
 * Phân loại thông báo người dùng (NotificationType)
 */
export const NOTIFICATION_TYPE_MAP = {
  ORDER_CREATED: 'Đơn hàng mới tạo',
  ORDER_CONFIRMED: 'Đơn hàng đã duyệt',
  ORDER_PROCESSING: 'Đơn hàng đang sản xuất',
  ORDER_SHIPPING: 'Đơn hàng đang giao',
  ORDER_COMPLETED: 'Đơn hàng đã hoàn thành',
  ORDER_CANCELLED: 'Đơn hàng đã hủy',
  ORDER_RESTORED: 'Đơn hàng được hoàn tác hủy'
};

/**
 * Quyền hạn người dùng (Permissions)
 */
export const PERMISSION_MAP = {
  PRODUCT_VIEW: 'Xem danh sách và chi tiết sản phẩm',
  PRODUCT_PRICE_VIEW: 'Xem giá sản phẩm',
  PRODUCT_CREATE: 'Tạo sản phẩm mới',
  PRODUCT_UPDATE: 'Cập nhật sản phẩm',
  PRODUCT_LOCK: 'Khóa sản phẩm',
  PRODUCT_UNLOCK: 'Mở khóa sản phẩm',
  PRODUCT_DELETE: 'Xóa sản phẩm',
  PRODUCT_IMAGE_MANAGE: 'Thêm ảnh sản phẩm',
  PRODUCT_IMAGE_DELETE: 'Xóa ảnh sản phẩm',
  PRODUCT_VARIANT_CREATE: 'Thêm biến thể sản phẩm',
  PRODUCT_VARIANT_UPDATE: 'Cập nhật biến thể',
  PRODUCT_VARIANT_LOCK: 'Khóa biến thể',
  PRODUCT_VARIANT_UNLOCK: 'Mở khóa biến thể',
  PRODUCT_VARIANT_DELETE: 'Xóa biến thể',
  FEATURED_PRODUCT_VIEW_ALL: 'Xem danh sách nổi bật',
  FEATURED_PRODUCT_MANAGE: 'Thêm sản phẩm nổi bật',
  FEATURED_PRODUCT_UPDATE: 'Cập nhật sản phẩm nổi bật',
  FEATURED_PRODUCT_DELETE: 'Xóa sản phẩm nổi bật',
  PRODUCT_CATEGORY_VIEW: 'Xem danh mục sản phẩm',
  PRODUCT_CATEGORY_CREATE: 'Tạo danh mục sản phẩm',
  PRODUCT_CATEGORY_UPDATE: 'Cập nhật danh mục',
  PRODUCT_CATEGORY_LOCK: 'Khóa danh mục',
  PRODUCT_CATEGORY_UNLOCK: 'Mở khóa danh mục',
  PRODUCT_CATEGORY_DELETE: 'Xóa danh mục',
  ORDER_CREATE: 'Tạo đơn hàng mới',
  ORDER_VIEW_OWN: 'Xem đơn hàng của mình',
  ORDER_CANCEL_OWN: 'Hủy đơn hàng của mình',
  ORDER_OTP_REQUEST: 'Yêu cầu mã OTP đặt hàng',
  ORDER_OTP_VERIFY: 'Xác thực mã OTP đặt hàng',
  ME_OTP_REQUEST: 'Yêu cầu mã OTP số điện thoại',
  ME_OTP_VERIFY: 'Xác thực mã OTP số điện thoại',
  ORDER_VIEW_ALL: 'Xem toàn bộ đơn hàng',
  ORDER_CALCULATE: 'Tính giá đơn hàng sản xuất',
  ORDER_CONFIRM: 'Quản lý duyệt đơn hàng',
  ORDER_CANCEL_ANY: 'Hủy đơn hàng bất kỳ',
  ORDER_UNDO_CANCEL_OWN: 'Hoàn tác hủy đơn của mình',
  ORDER_UNDO_CANCEL_ANY: 'Hoàn tác hủy đơn quản lý',
  ORDER_STATUS_UPDATE: 'Cập nhật trạng thái đơn hàng',
  USER_VIEW_ALL: 'Xem danh sách người dùng',
  USER_LOCK: 'Khóa tài khoản người dùng',
  USER_UNLOCK: 'Mở khóa tài khoản',
  USER_DELETE: 'Xóa tài khoản người dùng',
  MANAGER_CREATE: 'Tạo tài khoản quản lý',
  ME_PROFILE_VIEW: 'Xem hồ sơ cá nhân',
  ME_PROFILE_UPDATE: 'Cập nhật hồ sơ cá nhân',
  ME_ADDRESS_VIEW: 'Xem sổ địa chỉ nhận hàng',
  ME_ADDRESS_CREATE: 'Thêm địa chỉ nhận hàng',
  ME_ADDRESS_UPDATE: 'Cập nhật địa chỉ nhận hàng',
  ME_ADDRESS_DELETE: 'Xóa địa chỉ nhận hàng',
  SYSTEM_LOG_VIEW: 'Xem nhật ký hệ thống',
  SYSTEM_SETTING_VIEW: 'Xem cấu hình hệ thống',
  SYSTEM_SETTING_UPDATE: 'Cập nhật cấu hình hệ thống',
  ROLE_PERMISSION_VIEW: 'Xem phân quyền vai trò',
  ROLE_PERMISSION_UPDATE: 'Cập nhật phân quyền vai trò',
  NOTIFICATION_VIEW_OWN: 'Xem thông báo cá nhân',
  NOTIFICATION_MARK_READ: 'Đánh dấu thông báo đã đọc',
  NOTIFICATION_MARK_ALL_READ: 'Đánh dấu tất cả đã đọc',
  FILE_UPLOAD: 'Tải tệp tin lên hệ thống'
};

/**
 * Trạng thái chung / Fallback chung (General Status)
 */
export const GENERAL_STATUS_MAP = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Bị khóa',
  PENDING: 'Chờ xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  ERROR: 'Lỗi',
  TRUE: 'Có',
  FALSE: 'Không'
};

/**
 * Gom toàn bộ Enum Maps theo nhóm nghiệp vụ
 */
const ENUM_GROUP_MAPS = {
  order: ORDER_STATUS_MAP,
  product: PRODUCT_STATUS_MAP,
  category: CATEGORY_STATUS_MAP,
  masterData: MASTER_DATA_STATUS_MAP,
  user: USER_STATUS_MAP,
  role: ROLE_MAP,
  authProvider: AUTH_PROVIDER_MAP,
  address: ADDRESS_STATUS_MAP,
  search: SEARCH_TYPE_MAP,
  notification: NOTIFICATION_TYPE_MAP,
  permission: PERMISSION_MAP,
  general: GENERAL_STATUS_MAP
};

/**
 * Dịch giá trị Enum tổng quát.
 *
 * @param {string|number|boolean} value - Giá trị enum tiếng Anh (vd: "PENDING", "ACTIVE")
 * @param {string} [group='general'] - Tên nhóm enum: 'order' | 'product' | 'user' | 'role' | 'search' | 'notification' | 'general'...
 * @param {string|null} [fallback=null] - Giá trị fallback khi không tìm thấy
 * @returns {string} Chuỗi tiếng Việt tương ứng
 */
export function translateEnum(value, group = 'general', fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback !== null ? fallback : '-';
  }

  // Chuẩn hóa: trim và viết hoa để không phân biệt hoa thường
  const normalizedKey = String(value).trim().toUpperCase();

  // 1. Tìm trong nhóm chỉ định
  const targetMap = ENUM_GROUP_MAPS[group];
  if (targetMap && Object.prototype.hasOwnProperty.call(targetMap, normalizedKey)) {
    return targetMap[normalizedKey];
  }

  // 2. Tìm trong nhóm tổng quát (General Status)
  if (group !== 'general' && Object.prototype.hasOwnProperty.call(GENERAL_STATUS_MAP, normalizedKey)) {
    return GENERAL_STATUS_MAP[normalizedKey];
  }

  // 3. Fallback tùy chỉnh nếu có
  if (fallback !== null) {
    return fallback;
  }

  // 4. Nếu không tìm thấy, trả về chính giá trị gốc để không làm vỡ giao diện
  return String(value);
}

// Helper chuyên biệt cho từng nhóm Enum thường dùng:
export function translateOrderStatus(status) {
  return translateEnum(status, 'order');
}

export function translateProductStatus(status) {
  return translateEnum(status, 'product');
}

export function translateUserStatus(status) {
  return translateEnum(status, 'user');
}

export function translateRole(role) {
  return translateEnum(role, 'role');
}

export function translateSearchType(type) {
  return translateEnum(type, 'search');
}

export function translateNotificationType(type) {
  return translateEnum(type, 'notification');
}

export function translatePermission(perm) {
  return translateEnum(perm, 'permission');
}

export function translateGeneralStatus(status) {
  return translateEnum(status, 'general');
}

/**
 * Trả về class modifier CSS BEM tương ứng với trạng thái để hiển thị Badge giao diện.
 * Ví dụ: 'badge--success', 'badge--warning', 'badge--danger', 'badge--info'
 *
 * @param {string} status - Mã trạng thái
 * @returns {string} Tên class modifier CSS BEM
 */
export function getStatusBadgeClass(status) {
  if (!status) return 'badge--default';
  const norm = String(status).trim().toUpperCase();

  switch (norm) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'SUCCESS':
      return 'badge--success';

    case 'PENDING':
    case 'WAITING_FOR_CUSTOMER_CONFIRMATION':
      return 'badge--warning';

    case 'PROCESSING':
    case 'SHIPPING':
      return 'badge--info';

    case 'CANCELLED':
    case 'LOCKED':
    case 'INACTIVE':
    case 'FAILED':
    case 'ERROR':
      return 'badge--danger';

    default:
      return 'badge--secondary';
  }
}

// =============================================================================
// TRỤ CỘT 3: MESSAGE TRANSLATIONS (Dịch thông báo / Mã lỗi từ Backend)
// =============================================================================

/**
 * Từ điển chuyển đổi thông điệp / thông báo lỗi tiếng Anh từ Backend
 */
const MESSAGE_TRANSLATIONS = {
  // Xác thực, phân quyền & phiên làm việc
  'Unauthorized': 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
  'Full authentication is required to access this resource': 'Vui lòng đăng nhập để tiếp tục thực hiện.',
  'Access is denied': 'Bạn không có quyền thực hiện thao tác này.',
  'Access denied': 'Bạn không có quyền thực hiện thao tác này.',
  'Invalid credentials': 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  'Bad credentials': 'Tên đăng nhập hoặc mật khẩu không chính xác.',
  'Invalid refresh token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  'Session expired': 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  
  // OTP điện thoại
  'Invalid OTP': 'Mã OTP không chính xác. Vui lòng thử lại.',
  'Invalid verification code': 'Mã OTP không chính xác. Vui lòng thử lại.',
  'OTP has expired': 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
  'Verification code expired': 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.',
  'Maximum OTP attempts exceeded': 'Bạn đã nhập sai quá số lần cho phép. Vui lòng thử lại sau.',

  // Sản phẩm, danh mục, thương hiệu
  'Product not found': 'Không tìm thấy thông tin sản phẩm.',
  'Category not found': 'Không tìm thấy danh mục yêu cầu.',
  'Brand not found': 'Không tìm thấy thương hiệu yêu cầu.',
  'Color not found': 'Không tìm thấy màu sắc yêu cầu.',
  'Unit not found': 'Không tìm thấy đơn vị tính yêu cầu.',
  'Product variant not found': 'Không tìm thấy biến thể sản phẩm yêu cầu.',
  'Product is inactive': 'Sản phẩm hiện đang tạm ngừng kinh doanh.',
  
  // Đơn hàng
  'Order not found': 'Không tìm thấy thông tin đơn hàng.',
  'Invalid order state': 'Trạng thái đơn hàng không hợp lệ cho thao tác này.',
  'Invalid order state transition': 'Trạng thái đơn hàng không hợp lệ cho thao tác này.',
  'Cancellation window has expired': 'Đã hết thời hạn cho phép khách hàng hủy đơn.',
  'Cannot undo cancellation': 'Không thể hoàn tác trạng thái hủy của đơn hàng này.',

  // Người dùng & Sổ địa chỉ
  'User not found': 'Không tìm thấy tài khoản người dùng.',
  'User is locked': 'Tài khoản người dùng đã bị khóa quyền truy cập.',
  'Address not found': 'Không tìm thấy địa chỉ yêu cầu.',

  // Hệ thống & Mạng
  'Internal server error': 'Hệ thống đang bận. Vui lòng thử lại sau.',
  'Network error': 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền mạng.',
  'Validation failed': 'Dữ liệu nhập vào chưa hợp lệ. Vui lòng kiểm tra lại.',
  'Duplicate resource': 'Dữ liệu đã tồn tại trong hệ thống.'
};

/**
 * Biểu thức chính quy nhận diện chuỗi đã chứa tiếng Việt có dấu.
 */
const VIETNAMESE_DIACRITICS_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/**
 * Kiểm tra xem chuỗi có phải đã là tiếng Việt hay không.
 *
 * @param {string} text - Chuỗi cần kiểm tra
 * @returns {boolean} True nếu chuỗi chứa ký tự tiếng Việt
 */
function isVietnameseText(text) {
  if (!text || typeof text !== 'string') return false;
  return VIETNAMESE_DIACRITICS_REGEX.test(text);
}

/**
 * Dịch thông báo / lỗi từ Backend sang tiếng Việt.
 * LƯU Ý QUAN TRỌNG: Nếu Backend đã trả về thông điệp tiếng Việt thì giữ nguyên, không dịch lại.
 *
 * @param {string} message - Thông điệp nhận được từ BE hoặc chuỗi lỗi
 * @param {string|null} [fallback=null] - Thông báo dự phòng nếu message rỗng
 * @returns {string} Thông báo tiếng Việt hoàn chỉnh
 */
export function translateMessage(message, fallback = null) {
  if (!message || typeof message !== 'string') {
    return fallback !== null ? fallback : 'Có lỗi xảy ra. Vui lòng thử lại.';
  }

  const trimmed = message.trim();

  // 1. Nếu Backend đã trả về thông điệp tiếng Việt (chứa dấu tiếng Việt) -> GIỮ NGUYÊN 100%
  if (isVietnameseText(trimmed)) {
    return trimmed;
  }

  // 2. Tra cứu trong bảng bản dịch tiếng Anh
  if (Object.prototype.hasOwnProperty.call(MESSAGE_TRANSLATIONS, trimmed)) {
    return MESSAGE_TRANSLATIONS[trimmed];
  }

  // 2b. Tra cứu không phân biệt hoa/thường
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [key, translated] of Object.entries(MESSAGE_TRANSLATIONS)) {
    if (key.toLowerCase() === lowerTrimmed) {
      return translated;
    }
  }

  // 3. Fallback tùy chỉnh nếu có
  if (fallback !== null) {
    return fallback;
  }

  // 4. Nếu không nằm trong danh mục dịch, giữ nguyên thông điệp ban đầu để hỗ trợ debug
  return trimmed;
}
