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
const { authRequired, requirePermissions } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.use(
  '/admin/vouchers',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
);

router.get('/admin/vouchers', requirePermissions(['voucher.read_all']), asyncHandler(listAdminVouchers));
router.post('/admin/vouchers', requirePermissions(['voucher.create']), asyncHandler(createAdminVoucher));
router.get('/admin/vouchers/:voucherId', requirePermissions(['voucher.read_all']), asyncHandler(getAdminVoucherDetail));
router.patch('/admin/vouchers/:voucherId', requirePermissions(['voucher.update']), asyncHandler(updateAdminVoucher));
router.patch(
  '/admin/vouchers/:voucherId/status',
  requirePermissions(['voucher.update']),
  asyncHandler(changeAdminVoucherStatus),
);
router.post(
  '/admin/vouchers/:voucherId/duplicate',
  requirePermissions(['voucher.create']),
  asyncHandler(duplicateAdminVoucher),
);
router.delete(
  '/admin/vouchers/:voucherId',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  requirePermissions(['voucher.delete']),
  asyncHandler(deleteAdminVoucher),
);

module.exports = router;
