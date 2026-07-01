const express = require('express');
const {
  createAdminVoucher,
  changeAdminVoucherStatus,
  deleteAdminVoucher,
  duplicateAdminVoucher,
  getAdminVoucherDetail,
  listAdminVouchers,
  updateAdminVoucher,
} = require('../controllers/adminVoucherController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const router = express.Router();

const requireVoucherDeleteRoles = (req, res, next) => {
  if (['admin', 'system_admin'].includes(req.auth?.roleCode)) {
    next();
    return;
  }

  next(
    new AppError('Forbidden', {
      code: API_ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    }),
  );
};

router.use(
  '/admin/vouchers',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
);

router.get('/admin/vouchers', asyncHandler(listAdminVouchers));
router.post('/admin/vouchers', asyncHandler(createAdminVoucher));
router.get('/admin/vouchers/:voucherId', asyncHandler(getAdminVoucherDetail));
router.patch('/admin/vouchers/:voucherId', asyncHandler(updateAdminVoucher));
router.patch(
  '/admin/vouchers/:voucherId/status',
  asyncHandler(changeAdminVoucherStatus),
);
router.post(
  '/admin/vouchers/:voucherId/duplicate',
  asyncHandler(duplicateAdminVoucher),
);
router.delete(
  '/admin/vouchers/:voucherId',
  requireVoucherDeleteRoles,
  asyncHandler(deleteAdminVoucher),
);

module.exports = router;
