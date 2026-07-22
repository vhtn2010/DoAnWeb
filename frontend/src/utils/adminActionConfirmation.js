export function requestAdminActionReason({
  defaultReason = '',
  message,
  requiredMessage = 'Vui lòng nhập lý do để tiếp tục thao tác.',
} = {}) {
  if (typeof window === 'undefined') {
    return defaultReason
  }

  const reason = window.prompt(message, defaultReason)

  if (reason === null) {
    return null
  }

  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    window.alert(requiredMessage)
    return null
  }

  return trimmedReason
}

export function requestAdminConfirmation(message) {
  if (typeof window === 'undefined') {
    return true
  }

  return window.confirm(message)
}
