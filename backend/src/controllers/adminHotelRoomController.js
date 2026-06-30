const adminHotelRoomService = require('../services/adminHotelRoomService');

const listAdminHotelRooms = async (req, res) => {
  const data = await adminHotelRoomService.listRooms({
    auth: req.auth,
    ...req.params,
    ...req.query,
  });

  res.success({
    data,
    message: 'Admin hotel rooms retrieved successfully',
  });
};

const createAdminHotelRoom = async (req, res) => {
  const data = await adminHotelRoomService.createRoom({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin hotel room created successfully',
    statusCode: 201,
  });
};

const updateAdminHotelRoom = async (req, res) => {
  const data = await adminHotelRoomService.updateRoom({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin hotel room updated successfully',
  });
};

const deleteAdminHotelRoom = async (req, res) => {
  const data = await adminHotelRoomService.deleteRoom({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin hotel room deleted successfully',
  });
};

module.exports = {
  createAdminHotelRoom,
  deleteAdminHotelRoom,
  listAdminHotelRooms,
  updateAdminHotelRoom,
};
