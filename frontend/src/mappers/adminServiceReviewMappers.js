import {
  ADMIN_SERVICE_TYPE_DISPLAY_NAMES,
  ADMIN_SERVICE_TYPE_OPTIONS,
} from '../constants/adminServices.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

export const ADMIN_SERVICE_REVIEW_TYPE_ALL = 'all'

const FALLBACK_IMAGE_BY_TYPE = Object.freeze({
  [SERVICE_TYPES.flight]: '/assets/template/home/v39_1982.png',
  [SERVICE_TYPES.hotel]: '/assets/template/home/v39_1826.png',
  [SERVICE_TYPES.room]: '/assets/template/home/v39_1826.png',
  [SERVICE_TYPES.train]: '/assets/template/home/v39_1811.png',
  [SERVICE_TYPES.combo]: '/assets/template/service/list/hero-terrace.png',
  [SERVICE_TYPES.tour]: '/assets/template/service/list/tour-ha-long.png',
})

function formatTourDuration(details = {}) {
  const days = Number(details.duration_days)
  const nights = Number(details.duration_nights)

  if (days > 0 && nights >= 0) {
    return `${days} ngày ${nights} đêm`
  }

  if (days > 0) {
    return `${days} ngày`
  }

  return 'Đang cập nhật'
}

function formatTransportDuration(details = {}) {
  if (!details.departure_at) {
    return 'Đang cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(details.departure_at))
}

function getReviewDuration(service = {}) {
  const details = service.details ?? {}

  if (service.service_type === SERVICE_TYPES.tour) {
    return formatTourDuration(details)
  }

  if (service.service_type === SERVICE_TYPES.flight || service.service_type === SERVICE_TYPES.train) {
    return formatTransportDuration(details)
  }

  if (service.service_type === SERVICE_TYPES.hotel && details.star_rating) {
    return `${details.star_rating} sao`
  }

  if (service.service_type === SERVICE_TYPES.combo) {
    return `${Array.isArray(details.combo_items) ? details.combo_items.length : 0} dịch vụ`
  }

  return 'Đang cập nhật'
}

function getReviewCapacity(service = {}) {
  const details = service.details ?? {}

  if (service.service_type === SERVICE_TYPES.tour && details.max_group_size) {
    return `Tối đa ${details.max_group_size} khách`
  }

  if (
    (service.service_type === SERVICE_TYPES.flight || service.service_type === SERVICE_TYPES.train) &&
    details.seats_available != null
  ) {
    return `${details.seats_available}/${details.seats_total ?? '?'} chỗ`
  }

  if (service.service_type === SERVICE_TYPES.hotel) {
    return details.address || service.provider_name || 'Đang cập nhật'
  }

  return service.provider_name || 'Đang cập nhật'
}

export function getAdminServiceReviewTypeLabel(serviceType) {
  if (serviceType === ADMIN_SERVICE_REVIEW_TYPE_ALL) {
    return 'Tất cả'
  }

  return ADMIN_SERVICE_TYPE_DISPLAY_NAMES[serviceType] ?? serviceType ?? 'Dịch vụ'
}

export function mapAdminServiceReviewItem(service = {}) {
  const serviceType = service.service_type ?? SERVICE_TYPES.tour
  const price = Number(service.sale_price ?? service.base_price ?? 0)

  return {
    capacity: getReviewCapacity(service),
    currency: service.currency || 'VND',
    description: service.short_description || service.description || 'Chưa có mô tả kiểm duyệt.',
    duration: getReviewDuration(service),
    id: service.id,
    imageUrl: service.image_url || FALLBACK_IMAGE_BY_TYPE[serviceType] || FALLBACK_IMAGE_BY_TYPE.tour,
    location: service.location_text || 'Chưa cập nhật',
    partnerName: service.provider_name || 'Chưa cập nhật',
    price,
    raw: service,
    serviceCode: service.service_code || 'Chưa có mã',
    tag: getAdminServiceReviewTypeLabel(serviceType),
    title: service.title || service.service_code || 'Dịch vụ chưa có tên',
    type: serviceType,
  }
}

export function createAdminServiceReviewTypeOptions(items = []) {
  const baseOptions = [
    { value: ADMIN_SERVICE_REVIEW_TYPE_ALL, label: 'Tất cả' },
    ...ADMIN_SERVICE_TYPE_OPTIONS.filter((option) => option.value !== ADMIN_SERVICE_REVIEW_TYPE_ALL),
  ]

  return baseOptions.map((option) => {
    const count = option.value === ADMIN_SERVICE_REVIEW_TYPE_ALL
      ? items.length
      : items.filter((item) => item.type === option.value).length

    return {
      ...option,
      label: `${option.label} (${count})`,
    }
  })
}
