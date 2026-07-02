const notificationService = require('../services/notificationService');

const listAdminNotifications = async (req, res) => {
  const data = await notificationService.listAdminNotifications({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Admin notifications fetched successfully',
    meta: data.meta,
  });
};

const updateAdminNotificationStatus = async (req, res) => {
  const data = await notificationService.updateAdminNotificationStatus({
    auth: req.auth,
    notificationId: req.params.notification_id,
    status: req.body?.status,
  });

  res.success({
    data,
    message: 'Notification status updated successfully',
  });
};

const deleteMyNotification = async (req, res) => {
  const data = await notificationService.deleteMyNotification({
    auth: req.auth,
    notificationId: req.params.notification_id,
  });

  res.success({
    data,
    message: 'Notification deleted successfully',
  });
};

const getUnreadNotificationCount = async (req, res) => {
  const data = await notificationService.getUnreadNotificationCount({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'Unread notification count fetched successfully',
  });
};

const markAllMyNotificationsRead = async (req, res) => {
  const data = await notificationService.markAllMyNotificationsRead({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'All notifications marked as read successfully',
  });
};

const markMyNotificationRead = async (req, res) => {
  const data = await notificationService.markMyNotificationRead({
    auth: req.auth,
    notificationId: req.params.notification_id,
  });

  res.success({
    data,
    message: 'Notification marked as read successfully',
  });
};

const markMyNotificationsBulkRead = async (req, res) => {
  const data = await notificationService.markMyNotificationsBulkRead({
    auth: req.auth,
    notificationIds: req.body.notification_ids,
  });

  res.success({
    data,
    message: 'Notifications marked as read successfully',
  });
};

const listMyNotifications = async (req, res) => {
  const data = await notificationService.listMyNotifications({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Notifications fetched successfully',
    meta: data.meta,
  });
};

const getMyNotificationDetail = async (req, res) => {
  const data = await notificationService.getMyNotificationDetail({
    auth: req.auth,
    notificationId: req.params.notification_id,
  });

  res.success({
    data,
    message: 'Notification fetched successfully',
  });
};

module.exports = {
  deleteMyNotification,
  getUnreadNotificationCount,
  getMyNotificationDetail,
  listAdminNotifications,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  markMyNotificationsBulkRead,
  updateAdminNotificationStatus,
};
