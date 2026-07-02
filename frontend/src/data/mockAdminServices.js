export const adminServiceTypeOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'tour', label: 'tour' },
  { value: 'hotel', label: 'hotel' },
  { value: 'room', label: 'room' },
  { value: 'flight', label: 'flight' },
  { value: 'train', label: 'train' },
  { value: 'combo', label: 'combo' },
]

export const adminServiceFormTypeOptions = adminServiceTypeOptions.filter(
  (option) => option.value !== 'all'
)

export const adminServiceStatusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'draft' },
  { value: 'pending_review', label: 'pending_review' },
  { value: 'active', label: 'active' },
  { value: 'hidden', label: 'hidden' },
  { value: 'sold_out', label: 'sold_out' },
  { value: 'expired', label: 'expired' },
  { value: 'archived', label: 'archived' },
  { value: 'deleted', label: 'deleted' },
]

export const adminServiceFormStatusOptions = adminServiceStatusOptions.filter(
  (option) => option.value !== 'all'
)

export const adminTransportTypeOptions = [
  { value: 'bus', label: 'bus' },
  { value: 'flight', label: 'flight' },
  { value: 'train', label: 'train' },
  { value: 'car', label: 'car' },
  { value: 'ship', label: 'ship' },
  { value: 'mixed', label: 'mixed' },
]

export const adminCabinClassOptions = [
  { value: 'economy', label: 'economy' },
  { value: 'premium_economy', label: 'premium_economy' },
  { value: 'business', label: 'business' },
  { value: 'first', label: 'first' },
]

export const adminSeatClassOptions = [
  { value: 'hard_seat', label: 'hard_seat' },
  { value: 'soft_seat', label: 'soft_seat' },
  { value: 'sleeper', label: 'sleeper' },
  { value: 'vip', label: 'vip' },
]

export const adminRoleDisplayNames = {
  staff: 'Nhân viên điều hành',
  admin: 'Quản trị viên',
  system_admin: 'System Admin',
}

const serviceActionRoleMap = {
  submit_review: ['staff', 'admin', 'system_admin'],
  approve: ['admin', 'system_admin'],
  reject: ['admin', 'system_admin'],
  hide: ['admin', 'system_admin'],
  restore: ['admin', 'system_admin'],
  delete: ['admin', 'system_admin'],
}

const serviceDetailTemplates = {
  tour: {
    departure_location: '',
    destination_location: '',
    duration_days: '',
    duration_nights: '',
    transport_type: 'bus',
    max_group_size: '',
    departure_schedule: '',
    itinerary: '',
    included_services: '',
    excluded_services: '',
    terms: '',
  },
  hotel: {
    star_rating: '',
    address: '',
    checkin_time: '',
    checkout_time: '',
    amenities: '',
    hotel_policy: '',
  },
  flight: {
    airline_name: '',
    flight_number: '',
    departure_airport: '',
    arrival_airport: '',
    departure_at: '',
    arrival_at: '',
    cabin_class: 'economy',
    seats_total: '',
    seats_available: '',
    fare_price: '',
  },
  train: {
    train_number: '',
    departure_station: '',
    arrival_station: '',
    departure_at: '',
    arrival_at: '',
    seat_class: 'soft_seat',
    seats_total: '',
    seats_available: '',
    fare_price: '',
  },
  combo: {
    combo_items: '',
    terms: '',
    included_services: '',
    excluded_services: '',
  },
  room: {},
}

export function createServiceDetailDefaults(serviceType) {
  return {
    ...(serviceDetailTemplates[serviceType] ?? {}),
  }
}

function serializeListValue(value, formatter = (item) => item) {
  if (!Array.isArray(value)) {
    return value ?? ''
  }

  return value.map(formatter).filter(Boolean).join('\n')
}

function serializeComboItems(items) {
  return serializeListValue(items, (item) => {
    if (item && typeof item === 'object') {
      if (item.service_type && item.service_code) {
        return `${item.service_type}:${item.service_code}`
      }

      if (item.service_code) {
        return item.service_code
      }

      return JSON.stringify(item)
    }

    return String(item)
  })
}

export function formatRoleActorName(role) {
  return adminRoleDisplayNames[role] ?? 'Điều phối viên dịch vụ'
}

export function getAdminRoleLabel(role) {
  return adminRoleDisplayNames[role] ?? 'Điều phối viên dịch vụ'
}

export function slugifyServiceTitle(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeMultilineArray(value) {
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseComboItems(value) {
  return normalizeMultilineArray(value).map((line) => {
    const [serviceType, serviceCode] = line.split(':').map((item) => item?.trim())

    if (serviceType && serviceCode) {
      return {
        service_type: serviceType,
        service_code: serviceCode,
      }
    }

    return {
      service_code: line,
    }
  })
}

function parseNumberValue(value, fallback = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? fallback : parsed
}

function normalizeServiceDetails(serviceType, details, fallbackPrice) {
  if (serviceType === 'tour') {
    return {
      departure_location: details.departure_location.trim(),
      destination_location: details.destination_location.trim(),
      duration_days: parseNumberValue(details.duration_days),
      duration_nights: parseNumberValue(details.duration_nights),
      transport_type: details.transport_type || 'bus',
      max_group_size: parseNumberValue(details.max_group_size),
      departure_schedule: normalizeMultilineArray(details.departure_schedule),
      itinerary: normalizeMultilineArray(details.itinerary),
      included_services: details.included_services.trim(),
      excluded_services: details.excluded_services.trim(),
      terms: details.terms.trim(),
    }
  }

  if (serviceType === 'hotel') {
    return {
      star_rating: parseNumberValue(details.star_rating),
      address: details.address.trim(),
      checkin_time: details.checkin_time.trim(),
      checkout_time: details.checkout_time.trim(),
      amenities: normalizeMultilineArray(details.amenities),
      hotel_policy: details.hotel_policy.trim(),
    }
  }

  if (serviceType === 'flight') {
    return {
      airline_name: details.airline_name.trim(),
      flight_number: details.flight_number.trim(),
      departure_airport: details.departure_airport.trim(),
      arrival_airport: details.arrival_airport.trim(),
      departure_at: details.departure_at || null,
      arrival_at: details.arrival_at || null,
      cabin_class: details.cabin_class || 'economy',
      seats_total: parseNumberValue(details.seats_total),
      seats_available: parseNumberValue(details.seats_available),
      fare_price: parseNumberValue(details.fare_price, fallbackPrice),
    }
  }

  if (serviceType === 'train') {
    return {
      train_number: details.train_number.trim(),
      departure_station: details.departure_station.trim(),
      arrival_station: details.arrival_station.trim(),
      departure_at: details.departure_at || null,
      arrival_at: details.arrival_at || null,
      seat_class: details.seat_class || 'soft_seat',
      seats_total: parseNumberValue(details.seats_total),
      seats_available: parseNumberValue(details.seats_available),
      fare_price: parseNumberValue(details.fare_price, fallbackPrice),
    }
  }

  if (serviceType === 'combo') {
    return {
      combo_items: parseComboItems(details.combo_items),
      terms: details.terms.trim(),
      included_services: details.included_services.trim(),
      excluded_services: details.excluded_services.trim(),
    }
  }

  return {}
}

export function getInitialServiceFormValues(service = null) {
  const serviceType = service?.service_type ?? 'tour'
  const defaults = createServiceDetailDefaults(serviceType)
  const sourceDetails = service?.details ?? {}

  return {
    service_type: serviceType,
    title: service?.title ?? '',
    slug: service?.slug ?? '',
    short_description: service?.short_description ?? '',
    description: service?.description ?? '',
    provider_name: service?.provider_name ?? '',
    location_text: service?.location_text ?? '',
    base_price: service?.base_price != null ? String(service.base_price) : '',
    sale_price: service?.sale_price != null ? String(service.sale_price) : '',
    currency: service?.currency ?? 'VND',
    status: service?.status ?? 'draft',
    cancellation_policy: service?.cancellation_policy ?? '',
    image_url: service?.image_url ?? '',
    details: {
      ...defaults,
      ...(serviceType === 'tour'
        ? {
            departure_location: sourceDetails.departure_location ?? defaults.departure_location,
            destination_location:
              sourceDetails.destination_location ?? defaults.destination_location,
            duration_days:
              sourceDetails.duration_days != null ? String(sourceDetails.duration_days) : '',
            duration_nights:
              sourceDetails.duration_nights != null ? String(sourceDetails.duration_nights) : '',
            transport_type: sourceDetails.transport_type ?? defaults.transport_type,
            max_group_size:
              sourceDetails.max_group_size != null ? String(sourceDetails.max_group_size) : '',
            departure_schedule: serializeListValue(sourceDetails.departure_schedule),
            itinerary: serializeListValue(sourceDetails.itinerary),
            included_services: sourceDetails.included_services ?? defaults.included_services,
            excluded_services: sourceDetails.excluded_services ?? defaults.excluded_services,
            terms: sourceDetails.terms ?? defaults.terms,
          }
        : {}),
      ...(serviceType === 'hotel'
        ? {
            star_rating: sourceDetails.star_rating != null ? String(sourceDetails.star_rating) : '',
            address: sourceDetails.address ?? defaults.address,
            checkin_time: sourceDetails.checkin_time ?? defaults.checkin_time,
            checkout_time: sourceDetails.checkout_time ?? defaults.checkout_time,
            amenities: serializeListValue(sourceDetails.amenities),
            hotel_policy: sourceDetails.hotel_policy ?? defaults.hotel_policy,
          }
        : {}),
      ...(serviceType === 'flight'
        ? {
            airline_name: sourceDetails.airline_name ?? defaults.airline_name,
            flight_number: sourceDetails.flight_number ?? defaults.flight_number,
            departure_airport: sourceDetails.departure_airport ?? defaults.departure_airport,
            arrival_airport: sourceDetails.arrival_airport ?? defaults.arrival_airport,
            departure_at: sourceDetails.departure_at ?? defaults.departure_at,
            arrival_at: sourceDetails.arrival_at ?? defaults.arrival_at,
            cabin_class: sourceDetails.cabin_class ?? defaults.cabin_class,
            seats_total: sourceDetails.seats_total != null ? String(sourceDetails.seats_total) : '',
            seats_available:
              sourceDetails.seats_available != null ? String(sourceDetails.seats_available) : '',
            fare_price:
              sourceDetails.fare_price != null
                ? String(sourceDetails.fare_price)
                : service?.base_price != null
                  ? String(service.base_price)
                  : '',
          }
        : {}),
      ...(serviceType === 'train'
        ? {
            train_number: sourceDetails.train_number ?? defaults.train_number,
            departure_station: sourceDetails.departure_station ?? defaults.departure_station,
            arrival_station: sourceDetails.arrival_station ?? defaults.arrival_station,
            departure_at: sourceDetails.departure_at ?? defaults.departure_at,
            arrival_at: sourceDetails.arrival_at ?? defaults.arrival_at,
            seat_class: sourceDetails.seat_class ?? defaults.seat_class,
            seats_total: sourceDetails.seats_total != null ? String(sourceDetails.seats_total) : '',
            seats_available:
              sourceDetails.seats_available != null ? String(sourceDetails.seats_available) : '',
            fare_price:
              sourceDetails.fare_price != null
                ? String(sourceDetails.fare_price)
                : service?.base_price != null
                  ? String(service.base_price)
                  : '',
          }
        : {}),
      ...(serviceType === 'combo'
        ? {
            combo_items: serializeComboItems(sourceDetails.combo_items),
            terms: sourceDetails.terms ?? defaults.terms,
            included_services: sourceDetails.included_services ?? defaults.included_services,
            excluded_services: sourceDetails.excluded_services ?? defaults.excluded_services,
          }
        : {}),
    },
  }
}

export function normalizeServiceFormValues(formValues) {
  const basePrice = parseNumberValue(formValues.base_price, 0)

  return {
    service_type: formValues.service_type,
    title: formValues.title.trim(),
    slug: formValues.slug.trim(),
    short_description: formValues.short_description.trim(),
    description: formValues.description.trim(),
    provider_name: formValues.provider_name.trim(),
    location_text: formValues.location_text.trim(),
    base_price: basePrice,
    sale_price: parseNumberValue(formValues.sale_price),
    currency: formValues.currency.trim() || 'VND',
    status: formValues.status || 'draft',
    cancellation_policy: formValues.cancellation_policy.trim(),
    image_url: formValues.image_url.trim(),
    details: normalizeServiceDetails(formValues.service_type, formValues.details, basePrice),
  }
}

export function buildServicePayloadFromForm(
  formValues,
  { currentRole, existingService = null, mode = 'add', submitIntent = 'save' }
) {
  const normalized = normalizeServiceFormValues(formValues)
  const now = new Date().toISOString()
  const timestamp = Date.now()
  const actorName = formatRoleActorName(currentRole)
  const nextStatus = submitIntent === 'draft' ? 'draft' : normalized.status || 'draft'

  return {
    id: mode === 'add' ? `mock-${timestamp}` : existingService.id,
    service_code: mode === 'add' ? `SVC-${timestamp}` : existingService.service_code,
    service_type: normalized.service_type,
    title: normalized.title,
    slug: normalized.slug || slugifyServiceTitle(normalized.title),
    short_description: normalized.short_description,
    description: normalized.description,
    provider_name: normalized.provider_name,
    location_text: normalized.location_text,
    base_price: normalized.base_price,
    sale_price: normalized.sale_price,
    currency: normalized.currency || 'VND',
    status: nextStatus,
    cancellation_policy: normalized.cancellation_policy,
    image_url: normalized.image_url,
    created_by_name: mode === 'add' ? actorName : existingService.created_by_name,
    updated_by_name: actorName,
    approved_by_name: mode === 'add' ? null : existingService.approved_by_name,
    approved_at: mode === 'add' ? null : existingService.approved_at,
    created_at: mode === 'add' ? now : existingService.created_at,
    updated_at: now,
    deleted_at: nextStatus === 'deleted' ? existingService?.deleted_at ?? now : null,
    details: normalized.details,
  }
}

function isRoleAllowedForServiceAction(action, currentRole) {
  return serviceActionRoleMap[action]?.includes(currentRole) ?? false
}

export function getServiceStatusTransition(action, currentStatus, targetStatus = 'active') {
  if (action === 'submit_review') {
    return currentStatus === 'draft' ? 'pending_review' : null
  }

  if (action === 'approve') {
    return currentStatus === 'pending_review' ? 'active' : null
  }

  if (action === 'reject') {
    return currentStatus === 'pending_review' ? 'draft' : null
  }

  if (action === 'hide') {
    return currentStatus === 'active' ? 'hidden' : null
  }

  if (action === 'restore') {
    if (!['hidden', 'archived'].includes(currentStatus)) {
      return null
    }

    return targetStatus === 'draft' ? 'draft' : 'active'
  }

  if (action === 'delete') {
    return currentStatus !== 'deleted' ? 'deleted' : null
  }

  return null
}

export function getAllowedServiceActions(service, currentRole) {
  const actions = ['view', 'edit']
  const statusActions = ['submit_review', 'approve', 'reject', 'hide', 'restore', 'delete']

  statusActions.forEach((action) => {
    if (!isRoleAllowedForServiceAction(action, currentRole)) {
      return
    }

    if (getServiceStatusTransition(action, service.status)) {
      actions.push(action)
    }
  })

  return actions
}

export function buildServiceStatusActionPayload(action, service, reasonOrNote = {}) {
  const normalizedReason = reasonOrNote.reason?.trim()
  const normalizedNote = reasonOrNote.note?.trim()
  const canRestoreToDraft = ['hidden', 'archived'].includes(service?.status)
  const targetStatus =
    reasonOrNote.target_status === 'draft' && canRestoreToDraft ? 'draft' : 'active'

  if (action === 'submit_review') {
    return {}
  }

  if (action === 'approve') {
    return normalizedNote ? { note: normalizedNote } : {}
  }

  if (action === 'reject') {
    return normalizedReason ? { reason: normalizedReason } : {}
  }

  if (action === 'hide') {
    return normalizedReason ? { reason: normalizedReason } : {}
  }

  if (action === 'restore') {
    return { target_status: targetStatus }
  }

  if (action === 'delete') {
    return normalizedReason ? { reason: normalizedReason } : {}
  }

  return null
}

export function applyServiceStatusTransition(service, action, actorName, reasonOrNote = {}) {
  const payload = buildServiceStatusActionPayload(action, service, reasonOrNote)
  const nextStatus = getServiceStatusTransition(
    action,
    service.status,
    payload?.target_status ?? 'active'
  )

  if (!nextStatus) {
    return null
  }

  const now = new Date().toISOString()
  const nextService = {
    ...service,
    status: nextStatus,
    updated_at: now,
    updated_by_name: actorName,
    deleted_at: nextStatus === 'deleted' ? service.deleted_at ?? now : null,
  }

  if (action === 'approve') {
    nextService.approved_by_name = actorName
    nextService.approved_at = now
  }

  if (action === 'reject' || action === 'submit_review') {
    nextService.approved_by_name = null
    nextService.approved_at = null
  }

  return nextService
}

export function updateServiceStatusMock(service, action, currentRole, reasonOrNote = {}) {
  if (!isRoleAllowedForServiceAction(action, currentRole)) {
    return null
  }

  // TODO: replace local status transition with Admin Service API action endpoint in integration phase.
  return applyServiceStatusTransition(service, action, formatRoleActorName(currentRole), reasonOrNote)
}

export const mockAdminServices = [
  {
    id: '3f58d07f-4d67-45e6-9a71-8c9d91a1a101',
    service_code: 'TOUR-HL-0001',
    service_type: 'tour',
    title: 'Du thuyền Hạ Long Luxury 2N1Đ',
    slug: 'du-thuyen-ha-long-luxury-2n1d',
    short_description: 'Hành trình nghỉ dưỡng ngắm vịnh Hạ Long với hải sản và cabin hướng biển.',
    description:
      'Gói tour khởi hành hằng tuần, bao gồm lưu trú, bữa tối trên du thuyền và lịch trình tham quan hang động.',
    provider_name: 'Net Viet Cruise',
    location_text: 'Quảng Ninh',
    base_price: 4500000,
    sale_price: 3990000,
    currency: 'VND',
    status: 'active',
    cancellation_policy: 'Hoàn 50% nếu hủy trước 7 ngày so với ngày khởi hành.',
    image_url: '/assets/template/service/list/tour-ha-long.png',
    created_by_name: 'Trần Minh Khôi',
    updated_by_name: 'Lê Thu Hà',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-05-11T09:00:00+07:00',
    created_at: '2026-04-18T08:30:00+07:00',
    updated_at: '2026-06-29T14:15:00+07:00',
    deleted_at: null,
    details: {
      departure_location: 'Hà Nội',
      destination_location: 'Hạ Long',
      duration_days: 2,
      duration_nights: 1,
      transport_type: 'ship',
      max_group_size: 24,
      departure_schedule: ['Thứ 6 hàng tuần', 'Thứ 7 hàng tuần'],
      itinerary: ['Ngày 1: Khởi hành và check-in du thuyền', 'Ngày 2: Hang động và trở về bờ'],
      included_services: 'Cabin, ăn chính, vé tham quan',
      excluded_services: 'Đồ uống cá nhân, chi phí phát sinh',
      terms: 'Giữ chỗ tối thiểu 48 giờ trước giờ khởi hành.',
    },
  },
  {
    id: '2c0e4d2a-2737-4af0-b90e-b8a1a1b9c202',
    service_code: 'HOTEL-DN-0042',
    service_type: 'hotel',
    title: 'InterContinental Danang Resort',
    slug: 'intercontinental-danang-resort',
    short_description: 'Khu nghỉ dưỡng ven biển với hồ bơi vô cực và shuttle riêng đến bán đảo Sơn Trà.',
    description:
      'Dịch vụ khách sạn cao cấp phục vụ nhóm gia đình và khách nghỉ dưỡng dài ngày tại Đà Nẵng.',
    provider_name: 'InterContinental Danang',
    location_text: 'Đà Nẵng',
    base_price: 6200000,
    sale_price: 5400000,
    currency: 'VND',
    status: 'active',
    cancellation_policy: 'Miễn phí hủy trước 72 giờ, sau thời hạn áp dụng 1 đêm phí lưu trú.',
    image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
    created_by_name: 'Phạm Ngọc Anh',
    updated_by_name: 'Phạm Ngọc Anh',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-05-20T10:30:00+07:00',
    created_at: '2026-05-02T10:00:00+07:00',
    updated_at: '2026-06-30T09:20:00+07:00',
    deleted_at: null,
    details: {
      star_rating: 5,
      address: 'Bãi Bắc, Sơn Trà, Đà Nẵng',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Hồ bơi vô cực', 'Spa', 'Shuttle ra sân bay'],
      hotel_policy: 'Nhận phòng với CCCD hoặc hộ chiếu hợp lệ.',
    },
  },
  {
    id: '1a3559e9-1d8f-435f-9b44-59c2e741a303',
    service_code: 'COMBO-PQ-0108',
    service_type: 'combo',
    title: 'Combo Phú Quốc 3N2Đ bay + resort',
    slug: 'combo-phu-quoc-3n2d-bay-resort',
    short_description: 'Combo trọn gói gồm vé khứ hồi, xe đón tiễn và 2 đêm resort gần biển.',
    description:
      'Gói combo linh hoạt cho khách cặp đôi và gia đình nhỏ với mức giá ưu đãi theo mùa.',
    provider_name: 'Net Viet Holidays',
    location_text: 'Phú Quốc',
    base_price: 8990000,
    sale_price: 8290000,
    currency: 'VND',
    status: 'pending_review',
    cancellation_policy: 'Áp dụng theo điều kiện vé máy bay và chính sách đối tác lưu trú.',
    image_url: '/assets/template/service/list/tour-mien-trung.png',
    created_by_name: 'Lê Quốc Bảo',
    updated_by_name: 'Lê Quốc Bảo',
    approved_by_name: null,
    approved_at: null,
    created_at: '2026-06-20T11:10:00+07:00',
    updated_at: '2026-07-01T08:45:00+07:00',
    deleted_at: null,
    details: {
      combo_items: [
        { service_type: 'flight', service_code: 'FLIGHT-SGN-PQC-210' },
        { service_type: 'hotel', service_code: 'HOTEL-PQ-0021' },
      ],
      terms: 'Áp dụng cho khởi hành trong vòng 30 ngày kể từ khi xác nhận.',
      included_services: 'Vé khứ hồi, 2 đêm resort, xe đón sân bay',
      excluded_services: 'Phụ thu cuối tuần, ăn trưa cá nhân',
    },
  },
  {
    id: '31f3d7cf-aecd-4c0a-a32e-e6eb73735404',
    service_code: 'TRAIN-HN-DN-0009',
    service_type: 'train',
    title: 'Tàu SE3 Hà Nội - Đà Nẵng',
    slug: 'tau-se3-ha-noi-da-nang',
    short_description: 'Chuyến tàu đêm ổn định cho tuyến Bắc Trung Bộ với nhiều lựa chọn giường nằm.',
    description:
      'Dịch vụ vận chuyển đường sắt phù hợp khách du lịch muốn tối ưu chi phí và thời gian nghỉ đêm.',
    provider_name: 'Đường sắt Việt Nam',
    location_text: 'Hà Nội - Đà Nẵng',
    base_price: 1450000,
    sale_price: null,
    currency: 'VND',
    status: 'draft',
    cancellation_policy: 'Điều chỉnh theo quy định hoàn đổi vé của đơn vị vận tải.',
    image_url: '/assets/template/home/v39_1669.png',
    created_by_name: 'Trần Quang Vinh',
    updated_by_name: 'Trần Quang Vinh',
    approved_by_name: null,
    approved_at: null,
    created_at: '2026-06-26T15:00:00+07:00',
    updated_at: '2026-07-01T10:15:00+07:00',
    deleted_at: null,
    details: {
      train_number: 'SE3',
      departure_station: 'Ga Hà Nội',
      arrival_station: 'Ga Đà Nẵng',
      departure_at: '2026-07-20T21:30',
      arrival_at: '2026-07-21T11:40',
      seat_class: 'sleeper',
      seats_total: 40,
      seats_available: 18,
      fare_price: 1450000,
    },
  },
  {
    id: 'e9b559a4-55d0-4860-9f61-27c9a8b6c505',
    service_code: 'FLIGHT-SGN-HAN-0210',
    service_type: 'flight',
    title: 'Vietnam Airlines SGN - HAN buổi sáng',
    slug: 'vietnam-airlines-sgn-han-buoi-sang',
    short_description: 'Khung giờ đẹp cho khách công tác và gia đình cần check-in sớm tại Hà Nội.',
    description:
      'Vé máy bay một chiều hạng phổ thông, chính sách đổi tên và hoàn vé áp dụng theo hãng.',
    provider_name: 'Vietnam Airlines',
    location_text: 'TP.HCM - Hà Nội',
    base_price: 2890000,
    sale_price: 2590000,
    currency: 'VND',
    status: 'pending_review',
    cancellation_policy: 'Theo điều kiện giá vé và thời hạn giữ chỗ của hãng bay.',
    image_url: '/assets/template/home/v39_1982.png',
    created_by_name: 'Ngô Thu Trang',
    updated_by_name: 'Ngô Thu Trang',
    approved_by_name: null,
    approved_at: null,
    created_at: '2026-06-24T09:40:00+07:00',
    updated_at: '2026-07-01T09:35:00+07:00',
    deleted_at: null,
    details: {
      airline_name: 'Vietnam Airlines',
      flight_number: 'VN210',
      departure_airport: 'SGN',
      arrival_airport: 'HAN',
      departure_at: '2026-07-18T07:15',
      arrival_at: '2026-07-18T09:25',
      cabin_class: 'economy',
      seats_total: 180,
      seats_available: 32,
      fare_price: 2890000,
    },
  },
  {
    id: 'b4fa7305-1cdd-4b82-9910-0fb4d811d606',
    service_code: 'TOUR-DL-0017',
    service_type: 'tour',
    title: 'Đà Lạt săn mây và đồi thông 3N2Đ',
    slug: 'da-lat-san-may-va-doi-thong-3n2d',
    short_description: 'Tour trải nghiệm cảnh quan cao nguyên với lịch trình nhẹ và homestay trung tâm.',
    description:
      'Phù hợp nhóm bạn và khách trẻ, đang tạm ẩn để điều chỉnh lịch khởi hành mùa cao điểm.',
    provider_name: 'Net Viet Travel',
    location_text: 'Đà Lạt',
    base_price: 3290000,
    sale_price: 2990000,
    currency: 'VND',
    status: 'hidden',
    cancellation_policy: 'Hoàn 70% nếu hủy trước 5 ngày, sau đó giữ phí dịch vụ.',
    image_url: '/assets/template/service/list/tour-da-lat.png',
    created_by_name: 'Hoàng Gia Linh',
    updated_by_name: 'Nguyễn Văn A',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-04-30T13:00:00+07:00',
    created_at: '2026-04-14T08:00:00+07:00',
    updated_at: '2026-06-27T16:25:00+07:00',
    deleted_at: null,
    details: {
      departure_location: 'TP.HCM',
      destination_location: 'Đà Lạt',
      duration_days: 3,
      duration_nights: 2,
      transport_type: 'bus',
      max_group_size: 28,
      departure_schedule: ['Khởi hành mỗi thứ 5', 'Khởi hành mỗi thứ 7'],
      itinerary: ['Ngày 1: Đón khách và di chuyển', 'Ngày 2: Săn mây, đồi thông', 'Ngày 3: Chợ Đà Lạt và về lại TP.HCM'],
      included_services: 'Xe giường nằm, khách sạn, bữa sáng',
      excluded_services: 'Chi phí cá nhân, vé trò chơi tự chọn',
      terms: 'Đủ tối thiểu 10 khách để giữ lịch khởi hành.',
    },
  },
  {
    id: '864dbf7d-f6bb-4ba7-b0df-a77bbf3e8607',
    service_code: 'ROOM-DN-2001',
    service_type: 'room',
    title: 'Phòng Deluxe Ocean View',
    slug: 'phong-deluxe-ocean-view',
    short_description: 'Loại phòng 1 giường lớn hướng biển, đã kín chỗ cho kỳ nghỉ lễ gần nhất.',
    description:
      'Room type thuộc khách sạn đối tác tại Đà Nẵng, hiện giữ để đồng bộ tồn kho trước khi mở bán lại.',
    provider_name: 'InterContinental Danang',
    location_text: 'Đà Nẵng',
    base_price: 4100000,
    sale_price: null,
    currency: 'VND',
    status: 'sold_out',
    cancellation_policy: 'Theo chính sách room type và gói giá đã chọn khi đặt phòng.',
    image_url: '/assets/template/service/detail/ha-long-gallery-cabin.png',
    created_by_name: 'Phạm Ngọc Anh',
    updated_by_name: 'Lê Thu Hà',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-05-22T14:10:00+07:00',
    created_at: '2026-05-18T09:25:00+07:00',
    updated_at: '2026-06-28T18:05:00+07:00',
    deleted_at: null,
    details: {},
  },
  {
    id: 'e7ff05a1-0a33-4d3f-b0d3-5dc90d7cf708',
    service_code: 'HOTEL-NT-0088',
    service_type: 'hotel',
    title: 'Sunrise Nha Trang Heritage Stay',
    slug: 'sunrise-nha-trang-heritage-stay',
    short_description: 'Khách sạn trung tâm thành phố, đang lưu trữ để làm mới mô tả và bộ ảnh.',
    description:
      'Tài nguyên đã từng bán tốt nhưng tạm chuyển kho lưu trữ trong khi cập nhật lại nội dung.',
    provider_name: 'Sunrise Nha Trang',
    location_text: 'Nha Trang',
    base_price: 2800000,
    sale_price: 2550000,
    currency: 'VND',
    status: 'archived',
    cancellation_policy: 'Miễn phí hủy trước 48 giờ, sau đó tính 100% đêm đầu tiên.',
    image_url: '/assets/template/service/detail/ha-long-gallery-dinner.png',
    created_by_name: 'Đỗ Khánh Huy',
    updated_by_name: 'Đỗ Khánh Huy',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-03-28T08:20:00+07:00',
    created_at: '2026-03-12T11:05:00+07:00',
    updated_at: '2026-06-18T15:40:00+07:00',
    deleted_at: null,
    details: {
      star_rating: 4,
      address: '12 Trần Phú, Nha Trang, Khánh Hòa',
      checkin_time: '14:00',
      checkout_time: '12:00',
      amenities: ['Ăn sáng buffet', 'Hồ bơi ngoài trời', 'Xe đưa đón theo lịch'],
      hotel_policy: 'Không hút thuốc trong phòng nghỉ.',
    },
  },
  {
    id: 'd5d31f37-0b48-4f3f-bb1a-8b99bbdb8609',
    service_code: 'FLIGHT-DAD-CXR-0046',
    service_type: 'flight',
    title: 'VietJet Air Đà Nẵng - Cam Ranh',
    slug: 'vietjet-air-da-nang-cam-ranh',
    short_description: 'Chặng bay nội địa theo mùa hè, sắp hết hạn khai thác theo lịch đối tác.',
    description:
      'Dịch vụ vé bay đã mở bán theo chiến dịch ngắn hạn và đang chờ khóa khi hết thời gian kinh doanh.',
    provider_name: 'VietJet Air',
    location_text: 'Đà Nẵng - Cam Ranh',
    base_price: 1690000,
    sale_price: 1490000,
    currency: 'VND',
    status: 'expired',
    cancellation_policy: 'Theo điều kiện vé khuyến mãi và thời hạn bay được công bố.',
    image_url: '/assets/template/home/v39_1685.png',
    created_by_name: 'Ngô Thu Trang',
    updated_by_name: 'Nguyễn Văn A',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-05-05T17:00:00+07:00',
    created_at: '2026-04-28T16:45:00+07:00',
    updated_at: '2026-06-16T08:10:00+07:00',
    deleted_at: null,
    details: {
      airline_name: 'VietJet Air',
      flight_number: 'VJ846',
      departure_airport: 'DAD',
      arrival_airport: 'CXR',
      departure_at: '2026-07-14T10:20',
      arrival_at: '2026-07-14T11:35',
      cabin_class: 'economy',
      seats_total: 180,
      seats_available: 12,
      fare_price: 1690000,
    },
  },
  {
    id: '10b09829-7e75-4c5b-83db-36379df6ee10',
    service_code: 'TRAIN-SGN-NTR-0033',
    service_type: 'train',
    title: 'Tàu đêm SNT1 Sài Gòn - Nha Trang',
    slug: 'tau-dem-snt1-sai-gon-nha-trang',
    short_description: 'Tuyến tàu đêm cũ đã ngừng khai thác và được giữ lại dưới dạng xóa mềm.',
    description:
      'Bản ghi này dùng để mô phỏng service đã soft delete, phục vụ quản lý nội bộ và tra cứu lịch sử.',
    provider_name: 'Đường sắt Việt Nam',
    location_text: 'TP.HCM - Nha Trang',
    base_price: 1180000,
    sale_price: null,
    currency: 'VND',
    status: 'deleted',
    cancellation_policy: 'Không áp dụng do dịch vụ đã ngừng quản lý trên giao diện bán.',
    image_url: '/assets/template/home/v39_1631.png',
    created_by_name: 'Trần Quang Vinh',
    updated_by_name: 'Nguyễn Văn A',
    approved_by_name: 'Nguyễn Văn A',
    approved_at: '2026-02-18T09:45:00+07:00',
    created_at: '2026-02-02T08:30:00+07:00',
    updated_at: '2026-06-10T10:50:00+07:00',
    deleted_at: '2026-06-10T10:50:00+07:00',
    details: {
      train_number: 'SNT1',
      departure_station: 'Ga Sài Gòn',
      arrival_station: 'Ga Nha Trang',
      departure_at: '2026-07-25T22:10',
      arrival_at: '2026-07-26T06:25',
      seat_class: 'soft_seat',
      seats_total: 56,
      seats_available: 0,
      fare_price: 1180000,
    },
  },
]
