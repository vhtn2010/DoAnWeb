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

module.exports = {
  getAdminBookingDetail,
  getAdminBookingStatusHistory,
  listAdminBookings,
  updateAdminBookingStatus,
};
