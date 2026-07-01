const adminBookingService = require('../services/adminBookingService');

const listAdminBookings = async (req, res) => {
  const result = await adminBookingService.listBookings({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.items,
    message: 'Admin bookings retrieved successfully',
    meta: result.meta,
  });
};

const getAdminBookingDetail = async (req, res) => {
  const data = await adminBookingService.getBookingDetail({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking detail retrieved successfully',
  });
};

const getAdminBookingStatusHistory = async (req, res) => {
  const data = await adminBookingService.getBookingStatusHistory({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking status history retrieved successfully',
  });
};

const updateAdminBookingStatus = async (req, res) => {
  const data = await adminBookingService.updateBookingStatus({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking status updated successfully',
  });
};

const confirmAdminBooking = async (req, res) => {
  const data = await adminBookingService.confirmBooking({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking confirmed successfully',
  });
};

const completeAdminBooking = async (req, res) => {
  const data = await adminBookingService.completeBooking({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking completed successfully',
  });
};

const cancelAdminBooking = async (req, res) => {
  const data = await adminBookingService.cancelBooking({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking cancelled successfully',
  });
};

const expireAdminBooking = async (req, res) => {
  const data = await adminBookingService.expireBooking({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking expired successfully',
  });
};

const updateAdminBookingItemStatus = async (req, res) => {
  const data = await adminBookingService.updateBookingItemStatus({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking item status updated successfully',
  });
};

const updateAdminBookingItemTravellerInfo = async (req, res) => {
  const data = await adminBookingService.updateBookingItemTravellerInfo({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin booking item traveller info updated successfully',
  });
};

module.exports = {
  cancelAdminBooking,
  completeAdminBooking,
  confirmAdminBooking,
  expireAdminBooking,
  getAdminBookingDetail,
  getAdminBookingStatusHistory,
  listAdminBookings,
  updateAdminBookingItemStatus,
  updateAdminBookingItemTravellerInfo,
  updateAdminBookingStatus,
};
