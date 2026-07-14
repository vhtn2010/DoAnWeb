const AUTH_STORAGE_KEYS = Object.freeze({
  accessToken: 'net-viet-travel.access-token',
  expiresAt: 'net-viet-travel.expires-at',
  expiresIn: 'net-viet-travel.expires-in',
  permissions: 'net-viet-travel.permissions',
  refreshExpiresAt: 'net-viet-travel.refresh-expires-at',
  refreshExpiresIn: 'net-viet-travel.refresh-expires-in',
  refreshToken: 'net-viet-travel.refresh-token',
  user: 'net-viet-travel.user',
})

const AUTH_STORAGE_EVENT_KEYS = Object.freeze(Object.values(AUTH_STORAGE_KEYS))

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage)
}

function readFromStorage(storage, key) {
  try {
    return storage?.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeToStorage(storage, key, value) {
  try {
    if (value) {
      storage?.setItem(key, value)
      return true
    }

    storage?.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function readStoredItem(key) {
  if (!canUseLocalStorage() && !canUseSessionStorage()) {
    return ''
  }

  const localValue = canUseLocalStorage() ? readFromStorage(window.localStorage, key) : ''

  if (localValue) {
    return localValue
  }

  const sessionValue = canUseSessionStorage() ? readFromStorage(window.sessionStorage, key) : ''

  if (sessionValue && canUseLocalStorage()) {
    writeToStorage(window.localStorage, key, sessionValue)
    writeToStorage(window.sessionStorage, key, '')
  }

  return sessionValue
}

export function writeStoredItem(key, value) {
  if (!canUseLocalStorage() && !canUseSessionStorage()) {
    return
  }

  if (value) {
    const wroteToLocalStorage = canUseLocalStorage()
      ? writeToStorage(window.localStorage, key, value)
      : false

    if (!wroteToLocalStorage && canUseSessionStorage()) {
      writeToStorage(window.sessionStorage, key, value)
      return
    }

    if (canUseSessionStorage()) {
      writeToStorage(window.sessionStorage, key, '')
    }

    return
  }

  if (canUseLocalStorage()) {
    writeToStorage(window.localStorage, key, '')
  }

  if (canUseSessionStorage()) {
    writeToStorage(window.sessionStorage, key, '')
  }
}

export function subscribeStorageChanges(listener, keys = AUTH_STORAGE_EVENT_KEYS) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {}
  }

  const watchedKeys = new Set(keys)

  const handleStorageEvent = (event) => {
    if (event.storageArea && canUseLocalStorage() && event.storageArea !== window.localStorage) {
      return
    }

    if (event.key && watchedKeys.size > 0 && !watchedKeys.has(event.key)) {
      return
    }

    listener?.(event)
  }

  window.addEventListener('storage', handleStorageEvent)

  return () => {
    window.removeEventListener('storage', handleStorageEvent)
  }
}

export { AUTH_STORAGE_EVENT_KEYS, AUTH_STORAGE_KEYS }
