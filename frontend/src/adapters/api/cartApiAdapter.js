import { apiDelete, apiGet, apiPatch, apiPost } from '../../services/apiClient.js'

const FALLBACK_SERVICE_IMAGE_URL = '/assets/template/service/detail/ha-long-gallery-main.png'

function normalizeService(service = {}) {
  return {
    ...service,
    image_url: service.image_url ?? service.primary_image ?? FALLBACK_SERVICE_IMAGE_URL,
  }
}

function normalizeCartItem(item = {}) {
  return {
    ...item,
    options: item.options && typeof item.options === 'object' ? item.options : {},
    service: normalizeService(item.service),
  }
}

function normalizeActiveCartPayload(data = {}) {
  return {
    cart: {
      created_at: data.created_at ?? null,
      id: data.id ?? '',
      status: data.status ?? '',
      updated_at: data.updated_at ?? null,
    },
    cart_items: Array.isArray(data.items) ? data.items.map((item) => normalizeCartItem(item)) : [],
  }
}

function normalizeCartCreatePayload(payload = {}) {
  return {
    end_at: payload.end_at,
    options: payload.options ?? {},
    quantity: payload.quantity,
    reference_id: payload.reference_id,
    service_id: payload.service_id,
    service_type: payload.service_type,
    start_at: payload.start_at,
  }
}

export async function getActiveCart() {
  const response = await apiGet('/cart')

  return {
    ...response,
    data: normalizeActiveCartPayload(response.data),
  }
}

export function addCartItem(payload = {}) {
  return apiPost('/cart/items', {
    body: normalizeCartCreatePayload(payload),
  })
}

export function getCartSummary() {
  return apiGet('/cart/summary')
}

export function removeCartItem(cartItemId) {
  return apiDelete(`/cart/items/${cartItemId}`)
}

export async function updateCartItem(cartItemId, payload = {}) {
  const response = await apiPatch(`/cart/items/${cartItemId}`, {
    body: payload,
  })

  return {
    ...response,
    data: response.data
      ? {
          ...response.data,
          cart_item: response.data.cart_item ? normalizeCartItem(response.data.cart_item) : null,
        }
      : response.data,
  }
}

export function validateCart() {
  return apiPost('/cart/validate', {
    body: {},
  })
}
