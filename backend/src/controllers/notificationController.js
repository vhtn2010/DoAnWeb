const notificationService = require('../services/notificationService');

const getUnreadNotificationCount = async (req, res) => {
  const data = await notificationService.getUnreadNotificationCount({
    auth: req.auth,
  });

  res.success({
    data,
    message: 'Unread notification count fetched successfully',
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
  getUnreadNotificationCount,
  getMyNotificationDetail,
  listMyNotifications,
};
