const express = require('express');
const { createSupportTicket } = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');
const { authOptional } = require('../middleware/authSession');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const supportTicketCreateRateLimit = createRateLimiter({
  keyGenerator: (req) => {
    const email = String(req.body?.customer_email || req.auth?.user?.email || '')
      .trim()
      .toLowerCase();
    const actorKey = req.auth?.userId || email || 'anonymous';

    return `${req.ip || 'unknown'}:${actorKey}`;
  },
  maxRequests: 10,
  message: 'Too many support tickets submitted. Please try again later.',
  storeKey: 'support-ticket-create',
  windowMs: 60 * 1000,
});

router.post(
  '/support/tickets',
  authOptional({ allowedRoles: ['customer'] }),
  supportTicketCreateRateLimit,
  asyncHandler(createSupportTicket),
);

module.exports = router;
