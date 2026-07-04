import { ADMIN_SERVICE_PAGE_SIZE } from '../../constants/adminServices.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { adminServiceFixtures } from '../../fixtures/adminServices.fixtures.js'
import {
  buildServiceStatusActionPayload,
  formatRoleActorName,
  getAllowedServiceActions,
  getServiceStatusTransition,
  matchesAdminServiceFilters,
  paginateAdminServices,
  slugifyServiceTitle,
  sortAdminServices,
} from '../../mappers/adminServiceMappers.js'

const SERVICE_CODE_PREFIX_BY_TYPE = Object.freeze({
  tour: 'TOUR',
  hotel: 'HOTEL',
  room: 'ROOM',
  flight: 'FLIGHT',
  train: 'TRAIN',
  combo: 'COMBO',
})

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function createInitialAdminServiceState() {
  return cloneValue(adminServiceFixtures)
}

function getInvalidActionResponse() {
  return {
    success: false,
    message: 'Thao tác không hợp lệ với trạng thái hiện tại.',
    data: null,
  }
}

function buildServiceCode(serviceType) {
  const prefix = SERVICE_CODE_PREFIX_BY_TYPE[serviceType] ?? 'SVC'
  const sequence = String(mockAdminServicesState.length + 1).padStart(4, '0')
  return `${prefix}-MOCK-${sequence}`
}

function buildStoredServiceFromPayload(payload, currentRole) {
  const now = new Date().toISOString()
  const actorName = formatRoleActorName(currentRole)
  const nextStatus = payload.status || SERVICE_STATUSES.draft

  return {
    id: `mock-admin-service-${Date.now()}`,
    service_code: buildServiceCode(payload.service_type),
    service_type: payload.service_type,
    title: payload.title,
    slug: payload.slug || slugifyServiceTitle(payload.title),
    short_description: payload.short_description,
    description: payload.description,
    provider_name: payload.provider_name,
    location_text: payload.location_text,
    base_price: payload.base_price,
    sale_price: payload.sale_price,
    currency: payload.currency || 'VND',
    status: nextStatus,
    cancellation_policy: payload.cancellation_policy,
    image_url: payload.image_url,
    created_by_name: actorName,
    updated_by_name: actorName,
    approved_by_name: nextStatus === SERVICE_STATUSES.active ? actorName : null,
    approved_at: nextStatus === SERVICE_STATUSES.active ? now : null,
    created_at: now,
    updated_at: now,
    deleted_at: nextStatus === SERVICE_STATUSES.deleted ? now : null,
    details: cloneValue(payload.details ?? {}),
  }
}

function mergeServicePayload(currentService, payload, currentRole) {
  const now = new Date().toISOString()
  const actorName = formatRoleActorName(currentRole)
  const nextStatus = payload.status || currentService.status
  const nextService = {
    ...currentService,
    service_type: payload.service_type,
    title: payload.title,
    slug: payload.slug || slugifyServiceTitle(payload.title),
    short_description: payload.short_description,
    description: payload.description,
    provider_name: payload.provider_name,
    location_text: payload.location_text,
    base_price: payload.base_price,
    sale_price: payload.sale_price,
    currency: payload.currency || currentService.currency || 'VND',
    status: nextStatus,
    cancellation_policy: payload.cancellation_policy,
    image_url: payload.image_url,
    updated_by_name: actorName,
    updated_at: now,
    deleted_at:
      nextStatus === SERVICE_STATUSES.deleted
        ? currentService.deleted_at ?? now
        : null,
    details: cloneValue(payload.details ?? {}),
  }

  if (nextStatus === SERVICE_STATUSES.active) {
    nextService.approved_by_name = currentService.approved_by_name ?? actorName
    nextService.approved_at = currentService.approved_at ?? now
  }

  if ([SERVICE_STATUSES.draft, SERVICE_STATUSES.pendingReview].includes(nextStatus)) {
    nextService.approved_by_name = null
    nextService.approved_at = null
  }

  if (nextStatus !== SERVICE_STATUSES.deleted) {
    nextService.deleted_at = null
  }

  return nextService
}

function findServiceIndex(serviceId) {
  return mockAdminServicesState.findIndex((service) => service.id === serviceId)
}

function replaceServiceAtIndex(serviceIndex, nextService) {
  mockAdminServicesState[serviceIndex] = nextService
}

function runStatusAction(serviceId, actionKey, payload, currentRole) {
  const serviceIndex = findServiceIndex(serviceId)

  if (serviceIndex < 0) {
    return {
      success: false,
      message: 'Không tìm thấy dịch vụ cần xử lý.',
      data: null,
    }
  }

  const currentService = mockAdminServicesState[serviceIndex]
  const allowedActions = getAllowedServiceActions(currentService, currentRole)

  if (!allowedActions.includes(actionKey)) {
    return getInvalidActionResponse()
  }

  const actionPayload = buildServiceStatusActionPayload(actionKey, currentService, payload)
  const nextStatus = getServiceStatusTransition(
    actionKey,
    currentService.status,
    actionPayload?.target_status,
  )

  if (!nextStatus) {
    return getInvalidActionResponse()
  }

  const now = new Date().toISOString()
  const actorName = formatRoleActorName(currentRole)
  const nextService = {
    ...currentService,
    status: nextStatus,
    updated_at: now,
    updated_by_name: actorName,
    deleted_at:
      nextStatus === SERVICE_STATUSES.deleted ? currentService.deleted_at ?? now : null,
  }

  if (actionKey === 'approve') {
    nextService.approved_by_name = actorName
    nextService.approved_at = now
  }

  if (actionKey === 'reject' || actionKey === 'submit_review') {
    nextService.approved_by_name = null
    nextService.approved_at = null
  }

  if (actionKey === 'restore') {
    nextService.deleted_at = null
  }

  if (actionKey !== 'delete' && nextStatus !== SERVICE_STATUSES.deleted) {
    nextService.deleted_at = null
  }

  replaceServiceAtIndex(serviceIndex, nextService)
  return {
    success: true,
    data: cloneValue(nextService),
  }
}

let mockAdminServicesState = createInitialAdminServiceState()

export async function listAdminServices({
  currentRole,
  limit = ADMIN_SERVICE_PAGE_SIZE,
  page = 1,
  q = '',
  sort = 'newest',
  status = 'all',
  type = 'all',
} = {}) {
  const filteredServices = sortAdminServices(
    mockAdminServicesState.filter((service) =>
      matchesAdminServiceFilters(service, { q, type, status, currentRole }),
    ),
    sort,
  )
  const paginatedResponse = paginateAdminServices(filteredServices, page, limit)

  return {
    success: true,
    message: 'OK',
    data: cloneValue(paginatedResponse.data),
    meta: paginatedResponse.meta,
  }
}

export async function getAdminServiceById(serviceId) {
  const service = mockAdminServicesState.find((currentService) => currentService.id === serviceId)

  if (!service) {
    return {
      success: false,
      message: 'Không tìm thấy dịch vụ.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: cloneValue(service),
  }
}

export async function createAdminService(payload, { currentRole } = {}) {
  // TODO: replace mock create with POST /admin/services in API integration phase.
  const nextService = buildStoredServiceFromPayload(payload, currentRole)
  mockAdminServicesState = [nextService, ...mockAdminServicesState]

  return {
    success: true,
    message: 'Đã tạo bản nháp dịch vụ.',
    data: cloneValue(nextService),
  }
}

export async function updateAdminService(serviceId, payload, { currentRole } = {}) {
  // TODO: replace mock update with PATCH /admin/services/{service_id} in API integration phase.
  const serviceIndex = findServiceIndex(serviceId)

  if (serviceIndex < 0) {
    return {
      success: false,
      message: 'Không tìm thấy dịch vụ.',
      data: null,
    }
  }

  const nextService = mergeServicePayload(
    mockAdminServicesState[serviceIndex],
    payload,
    currentRole,
  )
  replaceServiceAtIndex(serviceIndex, nextService)

  return {
    success: true,
    message: 'Đã cập nhật dịch vụ.',
    data: cloneValue(nextService),
  }
}

export async function submitServiceForReview(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'submit_review', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã gửi dịch vụ chờ duyệt.',
    data: response.data,
  }
}

export async function approveService(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'approve', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã duyệt và công khai dịch vụ.',
    data: response.data,
  }
}

export async function rejectService(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'reject', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã từ chối và chuyển về bản nháp.',
    data: response.data,
  }
}

export async function hideService(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'hide', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã tạm ẩn dịch vụ.',
    data: response.data,
  }
}

export async function restoreService(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'restore', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã khôi phục dịch vụ.',
    data: response.data,
  }
}

export async function softDeleteService(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const response = runStatusAction(serviceId, 'delete', payload, currentRole)

  if (!response.success) {
    return response
  }

  return {
    success: true,
    message: 'Đã chuyển dịch vụ vào trạng thái đã xóa.',
    data: response.data,
  }
}

export async function updateServiceStatus(serviceId, payload = {}, { currentRole } = {}) {
  // TODO: replace mock status transition with Admin Service API action endpoint in integration phase.
  const actionByStatus = {
    [SERVICE_STATUSES.pendingReview]: 'submit_review',
    [SERVICE_STATUSES.active]: 'approve',
    [SERVICE_STATUSES.hidden]: 'hide',
    [SERVICE_STATUSES.deleted]: 'delete',
  }

  const actionKey =
    payload.action_key ||
    (payload.status === SERVICE_STATUSES.draft ? 'restore' : actionByStatus[payload.status])

  if (!actionKey) {
    return getInvalidActionResponse()
  }

  return runStatusAction(serviceId, actionKey, payload, currentRole)
}
