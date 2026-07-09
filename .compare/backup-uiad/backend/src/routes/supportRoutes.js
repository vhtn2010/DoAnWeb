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
  sendAdminSupportTicketEmail,
  updateAdminSupportTicket,
} = require('../controllers/supportController');
const {
  requireAdminAuth,
  requireAdminPermissions,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const {
  authOptional,
  authRequired,
  requirePermissions,
  requirePermissionsIfAuthenticated,
} = require('../middleware/authSession');
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
const adminSupportTicketEmailRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    `${req.auth?.userId || req.ip || 'anonymous'}:${req.params.ticket_id || 'unknown'}`,
  maxRequests: 20,
  message: 'Too many support email requests. Please try again later.',
  storeKey: 'admin-support-ticket-send-email',
  windowMs: 60 * 1000,
});

router.post(
  '/support/tickets',
  authOptional({ allowedRoles: ['customer'] }),
  requirePermissionsIfAuthenticated(['support.create_ticket']),
  supportTicketCreateRateLimit,
  asyncHandler(createSupportTicket),
);

router.get(
  '/support/tickets',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['support.read_self']),
  supportTicketReadRateLimit,
  asyncHandler(listMySupportTickets),
);

router.get(
  '/support/tickets/:ticket_id',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['support.read_self']),
  supportTicketReadRateLimit,
  asyncHandler(getMySupportTicketDetail),
);

router.post(
  '/support/tickets/:ticket_id/replies',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['support.reply']),
  supportTicketInteractionRateLimit,
  asyncHandler(replyToSupportTicket),
);

router.post(
  '/support/tickets/:ticket_id/close',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['support.close']),
  supportTicketInteractionRateLimit,
  asyncHandler(closeMySupportTicket),
);

router.get(
  '/admin/support/tickets',
  requireAdminAuth,
  requireAdminPermissions(['support.read_all']),
  adminSupportTicketReadRateLimit,
  asyncHandler(listAdminSupportTickets),
);

router.get(
  '/admin/support/tickets/:ticket_id',
  requireAdminAuth,
  requireAdminPermissions(['support.read_all']),
  adminSupportTicketReadRateLimit,
  asyncHandler(getAdminSupportTicketDetail),
);

router.patch(
  '/admin/support/tickets/:ticket_id',
  requireAdminAuth,
  requireAdminPermissions(['support.assign']),
  adminSupportTicketReadRateLimit,
  asyncHandler(updateAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/assign',
  requireAdminAuth,
  requireAdminPermissions(['support.assign']),
  adminSupportTicketReadRateLimit,
  asyncHandler(assignAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/replies',
  requireAdminAuth,
  requireAdminPermissions(['support.reply']),
  adminSupportTicketReadRateLimit,
  asyncHandler(replyToAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/close',
  requireAdminAuth,
  requireAdminPermissions(['support.close']),
  adminSupportTicketReadRateLimit,
  asyncHandler(closeAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/reopen',
  requireAdminAuth,
  requireAdminPermissions(['support.close']),
  adminSupportTicketReadRateLimit,
  asyncHandler(reopenAdminSupportTicket),
);

router.post(
  '/admin/support/tickets/:ticket_id/mark-spam',
  requireAdminAuth,
  requireAdminPermissions(['support.close']),
  adminSupportTicketReadRateLimit,
  asyncHandler(markAdminSupportTicketAsSpam),
);

router.post(
  '/admin/support/tickets/:ticket_id/send-email',
  requireAdminAuth,
  requireAdminPermissions(['email.send']),
  adminSupportTicketEmailRateLimit,
  asyncHandler(sendAdminSupportTicketEmail),
);

router.post(
  '/admin/support/tickets/:ticket_id/send-emails',
  requireAdminAuth,
  requireAdminPermissions(['email.send']),
  adminSupportTicketEmailRateLimit,
  asyncHandler(sendAdminSupportTicketEmail),
);

module.exports = router;
