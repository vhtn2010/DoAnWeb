const express = require('express');
const {
  closeMySupportTicket,
  createSupportTicket,
  getMySupportTicketDetail,
  listMySupportTickets,
  replyToSupportTicket,
} = require('../controllers/supportController');
const asyncHandler = require('../middleware/asyncHandler');
const { authOptional, authRequired } = require('../middleware/authSession');
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
const supportTicketReadRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 120,
  message: 'Too many support ticket requests. Please try again later.',
  storeKey: 'support-ticket-read',
  windowMs: 60 * 1000,
});
const supportTicketInteractionRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 30,
  message: 'Too many support ticket actions. Please try again later.',
  storeKey: 'support-ticket-interaction',
  windowMs: 60 * 1000,
});

router.post(
  '/support/tickets',
  authOptional({ allowedRoles: ['customer'] }),
  supportTicketCreateRateLimit,
  asyncHandler(createSupportTicket),
);

router.get(
  '/support/tickets',
  authRequired({ allowedRoles: ['customer'] }),
  supportTicketReadRateLimit,
  asyncHandler(listMySupportTickets),
);

router.get(
  '/support/tickets/:ticket_id',
  authRequired({ allowedRoles: ['customer'] }),
  supportTicketReadRateLimit,
  asyncHandler(getMySupportTicketDetail),
);

router.post(
  '/support/tickets/:ticket_id/replies',
  authRequired({ allowedRoles: ['customer'] }),
  supportTicketInteractionRateLimit,
  asyncHandler(replyToSupportTicket),
);

router.post(
  '/support/tickets/:ticket_id/close',
  authRequired({ allowedRoles: ['customer'] }),
  supportTicketInteractionRateLimit,
  asyncHandler(closeMySupportTicket),
);

module.exports = router;
