import { apiDelete, apiGet, apiPatch } from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function listMyNotifications(params = {}) {
  return apiGet('/notifications', {
    params: normalizeParams(params),
  })
}

export function getUnreadNotificationCount() {
  return apiGet('/notifications/unread-count')
}

export function markAllMyNotificationsRead() {
  return apiPatch('/notifications/read-all')
}

export function markMyNotificationRead(notificationId) {
  return apiPatch(`/notifications/${notificationId}/read`)
}

export function markMyNotificationsBulkRead(notificationIds = []) {
  return apiPatch('/notifications/bulk-read', {
    notification_ids: notificationIds,
  })
}

export function deleteMyNotification(notificationId) {
  return apiDelete(`/notifications/${notificationId}`)
}
