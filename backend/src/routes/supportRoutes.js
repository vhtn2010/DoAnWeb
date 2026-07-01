const express = require('express');
const {
  assignAdminSupportTicket,
  closeAdminSupportTicket,
  closeMySupportTicket,
  createSupportTicket,
  getAdminSupportTicketDetail,
  getMySupportTicketDetail,
  listAdminSupportTickets,
  listMySupportTickets,
  markAdminSupportTicketAsSpam,
  reopenAdminSupportTicket,
  replyToAdminSupportTicket,
  replyToSupportTicket,
  updateAdminSupportTicket,
} = require('../controllers/supportController');
const { requireAdminAuth } = require('../middleware/adminAuth');
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
const adminSupportTicketReadRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 120,
  message: 'Too many admin support ticket requests. Please try again later.',
  storeKey: 'admin-support-ticket-read',
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

router.get(
  '/admin/support/tickets',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(listAdminSupportTickets),
);

router.get(
  '/admin/support/tickets/:ticket_id',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(getAdminSupportTicketDetail),
);

router.patch(
  '/admin/support/tickets/:ticket_id',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(updateAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/assign',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(assignAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/replies',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(replyToAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/close',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(closeAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/reopen',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(reopenAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/mark-spam',
  requireAdminAuth,
  adminSupportTicketReadRateLimit,
  asyncHandler(markAdminSupportTicketAsSpam),
);

module.exports = router;
