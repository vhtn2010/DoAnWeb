const FAVORITES_STORAGE_KEY_PREFIX = 'net-viet-travel.favorites'
const FAVORITES_EVENT_NAME = 'net-viet-travel.favorites'

const FAVORITE_SOURCE_LABELS = Object.freeze({
  flight: 'Vé máy bay',
  hotel: 'Khách sạn',
  service: 'Tour',
  tour: 'Tour',
  train: 'Vé tàu',
})

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function normalizeText(value = '') {
  return String(value ?? '').trim()
}

function normalizePath(value = '') {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return '/'
  }

  return normalizedValue.startsWith('/') ? normalizedValue : `/${normalizedValue}`
}

function normalizeDateString(value = '') {
  const normalizedValue = normalizeText(value)
  return normalizedValue || new Date().toISOString()
}

function buildStorageKey(ownerKey) {
  return `${FAVORITES_STORAGE_KEY_PREFIX}.${ownerKey}`
}

function emitFavoriteStorageEvent(ownerKey) {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function' ||
    typeof CustomEvent !== 'function'
  ) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(FAVORITES_EVENT_NAME, {
      detail: {
        ownerKey,
      },
    }),
  )
}

function sortFavoriteItems(items = []) {
  return [...items].sort((leftItem, rightItem) => {
    const leftTime = new Date(leftItem.created_at).getTime()
    const rightTime = new Date(rightItem.created_at).getTime()

    return rightTime - leftTime
  })
}

function dedupeFavoriteItems(items = []) {
  const normalizedItems = []
  const seenFavoriteKeys = new Set()

  items.forEach((item) => {
    const normalizedItem = normalizeFavoriteItem(item)

    if (!normalizedItem || seenFavoriteKeys.has(normalizedItem.favorite_key)) {
      return
    }

    seenFavoriteKeys.add(normalizedItem.favorite_key)
    normalizedItems.push(normalizedItem)
  })

  return sortFavoriteItems(normalizedItems)
}

export function resolveFavoriteOwnerKey(currentUser = null) {
  const userId = normalizeText(currentUser?.id)
  const userEmail = normalizeText(currentUser?.email)

  if (userId) {
    return `customer:${userId}`
  }

  if (userEmail) {
    return `customer:${userEmail}`
  }

  return 'guest'
}

export function buildFavoriteKey(serviceType = '', identifier = '') {
  const normalizedType = normalizeText(serviceType).toLowerCase()
  const normalizedIdentifier = normalizeText(identifier).toLowerCase()

  if (!normalizedType || !normalizedIdentifier) {
    return ''
  }

  return `${normalizedType}:${normalizedIdentifier}`
}

export function buildFavoriteSourcePath(location = {}) {
  const pathname = normalizePath(location.pathname ?? '/')
  const search = normalizeText(location.search)
  const hash = normalizeText(location.hash)

  return `${pathname}${search}${hash}`
}

export function getFavoriteSourceLabel(serviceType = '') {
  return FAVORITE_SOURCE_LABELS[normalizeText(serviceType).toLowerCase()] ?? 'Dịch vụ yêu thích'
}

export function normalizeFavoriteItem(item = {}) {
  const normalizedServiceType = normalizeText(item.service_type).toLowerCase()
  const normalizedIdentifier =
    normalizeText(item.service_id) ||
    normalizeText(item.slug) ||
    normalizeText(item.id)
  const favoriteKey =
    normalizeText(item.favorite_key) || buildFavoriteKey(normalizedServiceType, normalizedIdentifier)

  if (!favoriteKey) {
    return null
  }

  return {
    favorite_key: favoriteKey,
    service_type: normalizedServiceType || 'service',
    service_id: normalizeText(item.service_id),
    slug: normalizeText(item.slug),
    title: normalizeText(item.title) || 'Dịch vụ yêu thích',
    image_url: normalizeText(item.image_url),
    detail_path: normalizePath(item.detail_path || item.source_path || '/'),
    source_path: normalizePath(item.source_path || item.detail_path || '/'),
    source_label:
      normalizeText(item.source_label) || getFavoriteSourceLabel(normalizedServiceType),
    summary: normalizeText(item.summary),
    location_text: normalizeText(item.location_text),
    created_at: normalizeDateString(item.created_at),
  }
}

export function buildFavoriteItem(item = {}) {
  return normalizeFavoriteItem(item)
}

export function readStoredFavorites(ownerKey) {
  if (!canUseStorage()) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(buildStorageKey(ownerKey))

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return dedupeFavoriteItems(parsedValue)
  } catch {
    return []
  }
}

export function persistStoredFavorites(ownerKey, favorites = []) {
  if (!canUseStorage()) {
    return
  }

  try {
    const normalizedFavorites = dedupeFavoriteItems(favorites)
    window.localStorage.setItem(buildStorageKey(ownerKey), JSON.stringify(normalizedFavorites))
    emitFavoriteStorageEvent(ownerKey)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function subscribeFavoriteStorage(ownerKey, callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleFavoriteEvent(event) {
    if (!event?.detail?.ownerKey || event.detail.ownerKey === ownerKey) {
      callback()
    }
  }

  function handleStorageEvent(event) {
    if (!event.key || event.key === buildStorageKey(ownerKey)) {
      callback()
    }
  }

  window.addEventListener(FAVORITES_EVENT_NAME, handleFavoriteEvent)
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener(FAVORITES_EVENT_NAME, handleFavoriteEvent)
    window.removeEventListener('storage', handleStorageEvent)
  }
}
