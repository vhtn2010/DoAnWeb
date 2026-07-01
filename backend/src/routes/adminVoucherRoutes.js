const express = require('express');
const {
  getAdminVoucherDetail,
  listAdminVouchers,
} = require('../controllers/adminVoucherController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.use(
  '/admin/vouchers',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
);

router.get('/admin/vouchers', asyncHandler(listAdminVouchers));
router.get('/admin/vouchers/:voucherId', asyncHandler(getAdminVoucherDetail));

module.exports = router;
