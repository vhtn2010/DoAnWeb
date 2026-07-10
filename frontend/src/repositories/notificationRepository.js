import {
  deleteMyNotification as deleteMyNotificationWithApiAdapter,
  getUnreadNotificationCount as getUnreadNotificationCountWithApiAdapter,
  listMyNotifications as listMyNotificationsWithApiAdapter,
  markAllMyNotificationsRead as markAllMyNotificationsReadWithApiAdapter,
  markMyNotificationRead as markMyNotificationReadWithApiAdapter,
  markMyNotificationsBulkRead as markMyNotificationsBulkReadWithApiAdapter,
} from '../adapters/api/notificationApiAdapter.js'

export function listMyNotifications(params = {}) {
  return listMyNotificationsWithApiAdapter(params)
}

export function getUnreadNotificationCount() {
  return getUnreadNotificationCountWithApiAdapter()
}

export function markAllMyNotificationsRead() {
  return markAllMyNotificationsReadWithApiAdapter()
}

export function markMyNotificationRead(notificationId) {
  return markMyNotificationReadWithApiAdapter(notificationId)
}

export function markMyNotificationsBulkRead(notificationIds = []) {
  return markMyNotificationsBulkReadWithApiAdapter(notificationIds)
}

export function deleteMyNotification(notificationId) {
  return deleteMyNotificationWithApiAdapter(notificationId)
}
