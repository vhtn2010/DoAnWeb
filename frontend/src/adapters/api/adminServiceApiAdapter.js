import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

const TRANSPORT_INVENTORY_FIELDS = new Set(['seats_available', 'seats_total'])

function normalizeListParams({
  destination,
  limit,
  page,
  q,
  sort,
  status,
  type,
} = {}) {
  const keyword = String(q ?? '').trim()
  const destinationKeyword =
    destination && destination !== 'all' ? String(destination).trim() : ''

  return Object.entries({
    limit,
    page,
    q: keyword || destinationKeyword || undefined,
    sort: sort && sort !== 'all' ? sort : undefined,
    status: status && status !== 'all' ? status : undefined,
    type: type && type !== 'all' ? type : undefined,
  }).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function getPrimaryImageUrl(service = {}) {
  if (service.image_url) {
    return service.image_url
  }

  if (service.primary_image) {
    return service.primary_image
  }

  if (!Array.isArray(service.images) || service.images.length === 0) {
    return ''
  }

  return (
    service.images.find((image) => image?.is_primary)?.image_url ||
    service.images[0]?.image_url ||
    ''
  )
}

function normalizeTransportDetails(details) {
  if (!Array.isArray(details)) {
    return details ?? {}
  }

  return details[0] ?? {}
}

function normalizeService(service = {}) {
  const imageUrl = getPrimaryImageUrl(service)
  let details = service.details ?? {}

  if (service.service_type === 'flight' || service.service_type === 'train') {
    details = normalizeTransportDetails(details)
  }

  if (service.service_type === 'combo') {
    details = {
      ...details,
      combo_items: service.combo_items ?? details?.combo_items ?? [],
    }
  }

  return {
    ...service,
    details,
    image_url: imageUrl,
  }
}

function normalizeServiceResponse(response) {
  return {
    ...response,
    data: response?.data ? normalizeService(response.data) : response?.data,
  }
}

function normalizeServiceListResponse(response) {
  const responseData = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.services)
      ? response.data.services
      : Array.isArray(response?.services)
        ? response.services
        : []

  return {
    ...response,
    data: responseData.map((service) => normalizeService(service)),
    meta: response?.meta ?? response?.data?.meta,
  }
}

function omitUnsupportedUpdateFields(payload = {}) {
  const {
    image_url: imageUrl,
    service_type: serviceType,
    status: _status,
    ...updatablePayload
  } = payload

  return {
    imageUrl,
    payload: updatablePayload,
    serviceType,
  }
}

function omitUnsupportedCreateFields(payload = {}) {
  const {
    image_url: imageUrl,
    status: _status,
    ...createPayload
  } = payload

  return {
    imageUrl,
    payload: createPayload,
  }
}

function stripTransportInventoryFields(details = {}) {
  return Object.entries(details).reduce((result, [key, value]) => {
    if (TRANSPORT_INVENTORY_FIELDS.has(key)) {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function normalizeDetailsForRequest(serviceType, details, { isUpdate = false } = {}) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return details
  }

  if (isUpdate && (serviceType === 'flight' || serviceType === 'train')) {
    return stripTransportInventoryFields(details)
  }

  return details
}

function normalizePayloadForRequest(payload = {}, options = {}) {
  if (!payload.details) {
    return payload
  }

  return {
    ...payload,
    details: normalizeDetailsForRequest(
      options.serviceType ?? payload.service_type,
      payload.details,
      options,
    ),
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeComboPayloadForRequest(payload = {}, options = {}) {
  const normalizedPayload = normalizePayloadForRequest(payload, options)
  const {
    details,
    metadata,
    ...basePayload
  } = normalizedPayload
  const comboItems = Array.isArray(normalizedPayload.combo_items)
    ? normalizedPayload.combo_items
    : isPlainObject(details)
      ? details.combo_items
      : undefined
  const nextMetadata = isPlainObject(metadata) ? { ...metadata } : {}

  if (isPlainObject(details)) {
    Object.entries(details).forEach(([key, value]) => {
      if (key === 'combo_items' || value === undefined || value === null || value === '') {
        return
      }

      nextMetadata[key] = value
    })
  }

  if (Object.keys(nextMetadata).length > 0) {
    basePayload.metadata = nextMetadata
  }

  if (comboItems !== undefined) {
    basePayload.combo_items = comboItems
  }

  return basePayload
}

function isComboPayload(payload = {}, serviceType) {
  return (serviceType ?? payload.service_type) === 'combo'
}

async function attachPrimaryImageIfNeeded(service, imageUrl) {
  const nextImageUrl = String(imageUrl ?? '').trim()

  if (!service?.id || !nextImageUrl || service.image_url === nextImageUrl) {
    return service
  }

  try {
    await apiPost(`/admin/services/${service.id}/images`, {
      alt_text: service.title || 'Service image',
      image_url: nextImageUrl,
      is_primary: true,
    })

    const refreshedResponse = await getAdminServiceById(service.id)
    return refreshedResponse.data
  } catch (error) {
    return {
      ...service,
      image_upload_error: error?.message || 'Không thể gắn ảnh bìa cho dịch vụ.',
    }
  }
}

export async function listAdminServices(params = {}) {
  const response = await apiGet('/admin/services', {
    params: normalizeListParams(params),
  })

  return normalizeServiceListResponse(response)
}

export async function getAdminServiceById(serviceId) {
  const response = await apiGet(`/admin/services/${serviceId}`)

  return normalizeServiceResponse(response)
}

export async function createAdminService(payload = {}) {
  const { imageUrl, payload: servicePayload } = omitUnsupportedCreateFields(payload)
  const isComboService = isComboPayload(servicePayload)
  const response = await apiPost(
    isComboService ? '/admin/services/combos' : '/admin/services',
    isComboService
      ? normalizeComboPayloadForRequest(servicePayload)
      : normalizePayloadForRequest(servicePayload),
  )
  const normalizedResponse = normalizeServiceResponse(response)
  const serviceWithImage = await attachPrimaryImageIfNeeded(
    normalizedResponse.data,
    imageUrl,
  )

  return {
    ...normalizedResponse,
    data: normalizeService(serviceWithImage),
  }
}

export async function updateAdminService(serviceId, payload = {}) {
  const {
    imageUrl,
    payload: servicePayload,
    serviceType,
  } = omitUnsupportedUpdateFields(payload)
  const isComboService = isComboPayload(servicePayload, serviceType)
  const response = await apiPatch(
    isComboService ? `/admin/services/combos/${serviceId}` : `/admin/services/${serviceId}`,
    isComboService
      ? normalizeComboPayloadForRequest(servicePayload, { isUpdate: true, serviceType })
      : normalizePayloadForRequest(servicePayload, { isUpdate: true, serviceType }),
  )
  const normalizedResponse = normalizeServiceResponse(response)
  const serviceWithImage = await attachPrimaryImageIfNeeded(
    normalizedResponse.data,
    imageUrl,
  )

  return {
    ...normalizedResponse,
    data: normalizeService(serviceWithImage),
  }
}

export async function submitServiceForReview(serviceId) {
  const response = await apiPost(`/admin/services/${serviceId}/submit-review`)

  return normalizeServiceResponse(response)
}

export async function approveService(serviceId, payload = {}) {
  const response = await apiPost(`/admin/services/${serviceId}/approve`, payload)

  return normalizeServiceResponse(response)
}

export async function rejectService(serviceId, payload = {}) {
  const response = await apiPost(`/admin/services/${serviceId}/reject`, payload)

  return normalizeServiceResponse(response)
}

export async function hideService(serviceId, payload = {}) {
  const response = await apiPost(`/admin/services/${serviceId}/hide`, payload)

  return normalizeServiceResponse(response)
}

export async function restoreService(serviceId, payload = {}) {
  const response = await apiPost(`/admin/services/${serviceId}/restore`, payload)

  return normalizeServiceResponse(response)
}

export async function softDeleteService(serviceId, payload = {}) {
  const response = await apiDelete(`/admin/services/${serviceId}`, {
    data: payload,
  })

  try {
    const detailResponse = await getAdminServiceById(serviceId)

    return {
      ...response,
      data: detailResponse.data,
    }
  } catch {
    return normalizeServiceResponse(response)
  }
}

export async function updateServiceStatus(serviceId, payload = {}) {
  const response = await apiPatch(`/admin/services/${serviceId}/status`, payload)

  return normalizeServiceResponse(response)
}
