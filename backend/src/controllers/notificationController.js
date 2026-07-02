const notificationService = require('../services/notificationService');

const broadcastAdminNotification = async (req, res) => {
  const data = await notificationService.broadcastAdminNotification({
    auth: req.auth,
    body: req.body,
    context: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  res.success({
    data,
    message: 'Broadcast notification created successfully',
    statusCode: 201,
  });
};

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

const sendAdminNotificationToUser = async (req, res) => {
  const data = await notificationService.sendAdminNotificationToUser({
    auth: req.auth,
    body: req.body,
    context: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    },
    userId: req.params.user_id,
  });

  res.success({
    data,
    message: 'Notification created successfully',
    statusCode: 201,
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
  broadcastAdminNotification,
  deleteMyNotification,
  getUnreadNotificationCount,
  getMyNotificationDetail,
  listAdminNotifications,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  markMyNotificationsBulkRead,
  sendAdminNotificationToUser,
  updateAdminNotificationStatus,
};
