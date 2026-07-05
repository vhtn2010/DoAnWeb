import {
  ADMIN_ROLE_DISPLAY_NAMES,
  ADMIN_SERVICE_INITIAL_FEEDBACK,
  ADMIN_SERVICE_STATUS_DISPLAY_NAMES,
  ADMIN_SERVICE_STATUS_META,
  ADMIN_SERVICE_SUMMARY_CARD_CONFIG,
  ADMIN_SERVICE_TYPE_DISPLAY_NAMES,
} from '../constants/adminServices.js'
import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import {
  ADMIN_PERMISSIONS,
  hasPermission,
  normalizeAdminRole,
} from '../utils/rolePermissions.js'

const SERVICE_ACTION_PERMISSION_MAP = Object.freeze({
  submit_review: ADMIN_PERMISSIONS.servicesSubmitReview,
  approve: ADMIN_PERMISSIONS.servicesApprove,
  reject: ADMIN_PERMISSIONS.servicesReject,
  hide: ADMIN_PERMISSIONS.servicesHide,
  restore: ADMIN_PERMISSIONS.servicesRestore,
  delete: ADMIN_PERMISSIONS.servicesDelete,
})

const SERVICE_DETAIL_TEMPLATES = Object.freeze({
  [SERVICE_TYPES.tour]: {
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
  [SERVICE_TYPES.hotel]: {
    star_rating: '',
    address: '',
    checkin_time: '',
    checkout_time: '',
    amenities: '',
    hotel_policy: '',
  },
  [SERVICE_TYPES.flight]: {
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
  [SERVICE_TYPES.train]: {
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
  [SERVICE_TYPES.combo]: {
    combo_items: '',
    terms: '',
    included_services: '',
    excluded_services: '',
  },
  [SERVICE_TYPES.room]: {},
})

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function parseNumberValue(value, fallback = null) {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }

  const parsedValue = Number(value)
  return Number.isNaN(parsedValue) ? fallback : parsedValue
}

function serializeListValue(value, formatter = (item) => item) {
  if (!Array.isArray(value)) {
    return value ?? ''
  }

  return value.map(formatter).filter(Boolean).join('\n')
}

function serializeComboItems(items) {
  return serializeListValue(items, (item) => {
    if (!item || typeof item !== 'object') {
      return String(item)
    }

    if (item.service_type && item.service_code) {
      return `${item.service_type}:${item.service_code}`
    }

    if (item.service_code) {
      return item.service_code
    }

    return JSON.stringify(item)
  })
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

function normalizeServiceDetails(serviceType, details, fallbackPrice) {
  if (serviceType === SERVICE_TYPES.tour) {
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

  if (serviceType === SERVICE_TYPES.hotel) {
    return {
      star_rating: parseNumberValue(details.star_rating),
      address: details.address.trim(),
      checkin_time: details.checkin_time.trim(),
      checkout_time: details.checkout_time.trim(),
      amenities: normalizeMultilineArray(details.amenities),
      hotel_policy: details.hotel_policy.trim(),
    }
  }

  if (serviceType === SERVICE_TYPES.flight) {
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

  if (serviceType === SERVICE_TYPES.train) {
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

  if (serviceType === SERVICE_TYPES.combo) {
    return {
      combo_items: parseComboItems(details.combo_items),
      terms: details.terms.trim(),
      included_services: details.included_services.trim(),
      excluded_services: details.excluded_services.trim(),
    }
  }

  return {}
}

function getStatusTone(status) {
  return ADMIN_SERVICE_STATUS_META[status]?.tone ?? 'draft'
}

function isRoleAllowedForServiceAction(action, currentRole) {
  return hasPermission(currentRole, SERVICE_ACTION_PERMISSION_MAP[action])
}

export function normalizeAdminPreviewRole(value) {
  return normalizeAdminRole(value)
}

export function createFeedbackState(tone = 'info', message = '') {
  if (!message) {
    return {
      tone: ADMIN_SERVICE_INITIAL_FEEDBACK.tone,
      message: ADMIN_SERVICE_INITIAL_FEEDBACK.message,
    }
  }

  return { tone, message }
}

export function formatRoleActorName(role) {
  return ADMIN_ROLE_DISPLAY_NAMES[role] ?? 'Điều phối viên dịch vụ'
}

export function getAdminRoleLabel(role) {
  return ADMIN_ROLE_DISPLAY_NAMES[role] ?? 'Điều phối viên dịch vụ'
}

export function getAdminServiceTypeLabel(serviceType) {
  return ADMIN_SERVICE_TYPE_DISPLAY_NAMES[serviceType] ?? serviceType ?? 'Chưa xác định'
}

export function getAdminServiceStatusLabel(status) {
  return ADMIN_SERVICE_STATUS_DISPLAY_NAMES[status] ?? status ?? 'Chưa cập nhật'
}

export function getAdminServiceStatusTone(status) {
  return getStatusTone(status)
}

export function slugifyServiceTitle(value) {
  return normalizeText(value)
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function createServiceDetailDefaults(serviceType) {
  return {
    ...(SERVICE_DETAIL_TEMPLATES[serviceType] ?? {}),
  }
}

export function getInitialServiceFormValues(service = null) {
  const serviceType = service?.service_type ?? SERVICE_TYPES.tour
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
    status: service?.status ?? SERVICE_STATUSES.draft,
    cancellation_policy: service?.cancellation_policy ?? '',
    image_url: service?.image_url ?? '',
    details: {
      ...defaults,
      ...(serviceType === SERVICE_TYPES.tour
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
      ...(serviceType === SERVICE_TYPES.hotel
        ? {
            star_rating: sourceDetails.star_rating != null ? String(sourceDetails.star_rating) : '',
            address: sourceDetails.address ?? defaults.address,
            checkin_time: sourceDetails.checkin_time ?? defaults.checkin_time,
            checkout_time: sourceDetails.checkout_time ?? defaults.checkout_time,
            amenities: serializeListValue(sourceDetails.amenities),
            hotel_policy: sourceDetails.hotel_policy ?? defaults.hotel_policy,
          }
        : {}),
      ...(serviceType === SERVICE_TYPES.flight
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
      ...(serviceType === SERVICE_TYPES.train
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
      ...(serviceType === SERVICE_TYPES.combo
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
    status: formValues.status || SERVICE_STATUSES.draft,
    cancellation_policy: formValues.cancellation_policy.trim(),
    image_url: formValues.image_url.trim(),
    details: normalizeServiceDetails(formValues.service_type, formValues.details, basePrice),
  }
}

export function buildServicePayloadFromForm(formValues, { submitIntent = 'save' } = {}) {
  const normalizedValues = normalizeServiceFormValues(formValues)

  return {
    ...normalizedValues,
    status:
      submitIntent === 'draft'
        ? SERVICE_STATUSES.draft
        : normalizedValues.status || SERVICE_STATUSES.draft,
  }
}

export function getServiceStatusTransition(action, currentStatus, targetStatus = SERVICE_STATUSES.active) {
  if (action === 'submit_review') {
    return currentStatus === SERVICE_STATUSES.draft ? SERVICE_STATUSES.pendingReview : null
  }

  if (action === 'approve') {
    return currentStatus === SERVICE_STATUSES.pendingReview ? SERVICE_STATUSES.active : null
  }

  if (action === 'reject') {
    return currentStatus === SERVICE_STATUSES.pendingReview ? SERVICE_STATUSES.draft : null
  }

  if (action === 'hide') {
    return currentStatus === SERVICE_STATUSES.active ? SERVICE_STATUSES.hidden : null
  }

  if (action === 'restore') {
    if (![SERVICE_STATUSES.hidden, SERVICE_STATUSES.archived].includes(currentStatus)) {
      return null
    }

    return targetStatus === SERVICE_STATUSES.draft
      ? SERVICE_STATUSES.draft
      : SERVICE_STATUSES.active
  }

  if (action === 'delete') {
    return currentStatus !== SERVICE_STATUSES.deleted ? SERVICE_STATUSES.deleted : null
  }

  return null
}

export function getAllowedServiceActions(service, currentRole) {
  const actions = []

  if (hasPermission(currentRole, ADMIN_PERMISSIONS.servicesRead)) {
    actions.push('view')
  }

  if (hasPermission(currentRole, ADMIN_PERMISSIONS.servicesUpdate)) {
    actions.push('edit')
  }

  ;['submit_review', 'approve', 'reject', 'hide', 'restore', 'delete'].forEach((action) => {
    if (!isRoleAllowedForServiceAction(action, currentRole)) {
      return
    }

    if (getServiceStatusTransition(action, service.status)) {
      actions.push(action)
    }
  })

  return actions
}

export function buildServiceStatusActionPayload(action, service, formValues = {}) {
  const normalizedReason = formValues.reason?.trim()
  const normalizedNote = formValues.note?.trim()
  const canRestoreToDraft = [SERVICE_STATUSES.hidden, SERVICE_STATUSES.archived].includes(
    service?.status,
  )
  const targetStatus =
    formValues.target_status === SERVICE_STATUSES.draft && canRestoreToDraft
      ? SERVICE_STATUSES.draft
      : SERVICE_STATUSES.active

  if (action === 'approve') {
    return normalizedNote ? { note: normalizedNote } : {}
  }

  if (action === 'reject' || action === 'hide' || action === 'delete') {
    return normalizedReason ? { reason: normalizedReason } : {}
  }

  if (action === 'restore') {
    return { target_status: targetStatus }
  }

  if (action === 'submit_review') {
    return {}
  }

  return null
}

export function getCurrentPrice(service) {
  return service.sale_price ?? service.base_price
}

export function matchesAdminServiceFilters(
  service,
  { destination = 'all', q = '', type = 'all', status = 'all' } = {},
) {
  const normalizedQuery = normalizeText(q.trim())
  const matchesQuery =
    normalizedQuery.length === 0 ||
    [service.service_code, service.title, service.location_text].some((value) =>
      normalizeText(value).includes(normalizedQuery),
    )

  const matchesType = type === 'all' || service.service_type === type
  const matchesStatus = status === 'all' || service.status === status
  const matchesDestination =
    destination === 'all' || normalizeText(service.location_text) === normalizeText(destination)

  return matchesQuery && matchesType && matchesStatus && matchesDestination
}

export function sortAdminServices(services, sortValue = 'newest') {
  const nextServices = [...services]

  if (sortValue === 'oldest') {
    nextServices.sort(
      (firstService, secondService) =>
        new Date(firstService.updated_at) - new Date(secondService.updated_at),
    )
    return nextServices
  }

  if (sortValue === 'price_asc') {
    nextServices.sort(
      (firstService, secondService) =>
        getCurrentPrice(firstService) - getCurrentPrice(secondService),
    )
    return nextServices
  }

  if (sortValue === 'price_desc') {
    nextServices.sort(
      (firstService, secondService) =>
        getCurrentPrice(secondService) - getCurrentPrice(firstService),
    )
    return nextServices
  }

  nextServices.sort(
    (firstService, secondService) =>
      new Date(secondService.updated_at) - new Date(firstService.updated_at),
  )
  return nextServices
}

export function createAdminServicesSummary(services = []) {
  const summaryValues = {
    total: services.length,
    active: services.filter((service) => service.status === SERVICE_STATUSES.active).length,
    pending_review: services.filter(
      (service) => service.status === SERVICE_STATUSES.pendingReview,
    ).length,
    limited: services.filter((service) =>
      [SERVICE_STATUSES.hidden, SERVICE_STATUSES.soldOut].includes(service.status),
    ).length,
  }

  return ADMIN_SERVICE_SUMMARY_CARD_CONFIG.map((card) => ({
    ...card,
    value: summaryValues[card.key] ?? 0,
  }))
}

export function paginateAdminServices(services = [], page = 1, limit = 20) {
  const safeLimit = Math.max(Number(limit) || 20, 1)
  const total = services.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit

  return {
    data: services.slice(startIndex, startIndex + safeLimit),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
      has_next: safePage < totalPages,
    },
  }
}

export function getServiceDetailSummary(service) {
  if (service.service_type === SERVICE_TYPES.tour) {
    return `${service.details.duration_days ?? '-'}N${service.details.duration_nights ?? '-'}Đ - ${service.details.transport_type ?? 'n/a'}`
  }

  if (service.service_type === SERVICE_TYPES.hotel) {
    return `${service.details.star_rating ?? '-'} sao - ${service.details.address ?? service.provider_name}`
  }

  if (service.service_type === SERVICE_TYPES.flight) {
    return `${service.details.airline_name ?? service.provider_name} - ${service.details.flight_number ?? 'n/a'}`
  }

  if (service.service_type === SERVICE_TYPES.train) {
    return `Số tàu ${service.details.train_number ?? 'n/a'}`
  }

  if (service.service_type === SERVICE_TYPES.combo) {
    return `${Array.isArray(service.details.combo_items) ? service.details.combo_items.length : 0} hạng mục trong combo`
  }

  return service.provider_name
}

export function formatAdminServiceCurrency(amount, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatAdminServiceDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function createAdminServicesPageNumbers(totalPages) {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
}
