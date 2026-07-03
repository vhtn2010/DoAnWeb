const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-support-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const supportService = require('../services/supportService');
const {
  clearSupportManualEmailRateLimitStore,
  createSupportService,
} = require('../services/supportService');
const { createAccessToken } = require('../utils/sessionToken');

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STAFF_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ASSIGNED_STAFF_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TICKET_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REPLY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const BOOKING_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

const originalAssignAdminTicket = supportService.assignAdminTicket;
const originalCloseAdminTicket = supportService.closeAdminTicket;
const originalGetAdminTicketDetail = supportService.getAdminTicketDetail;
const originalListAdminTickets = supportService.listAdminTickets;
const originalMarkAdminTicketAsSpam = supportService.markAdminTicketAsSpam;
const originalReopenAdminTicket = supportService.reopenAdminTicket;
const originalReplyToAdminTicket = supportService.replyToAdminTicket;
const originalSendAdminTicketEmail = supportService.sendAdminTicketEmail;
const originalUpdateAdminTicket = supportService.updateAdminTicket;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body == null
      ? null
      : (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body));
    const headers = {
      ...(options.headers || {}),
    };

    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        headers,
      },
      (res) => {
        let responseBody = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(responseBody),
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end(body);
  });

test.afterEach(() => {
  supportService.assignAdminTicket = originalAssignAdminTicket;
  supportService.closeAdminTicket = originalCloseAdminTicket;
  supportService.getAdminTicketDetail = originalGetAdminTicketDetail;
  supportService.listAdminTickets = originalListAdminTickets;
  supportService.markAdminTicketAsSpam = originalMarkAdminTicketAsSpam;
  supportService.reopenAdminTicket = originalReopenAdminTicket;
  supportService.replyToAdminTicket = originalReplyToAdminTicket;
  supportService.sendAdminTicketEmail = originalSendAdminTicketEmail;
  supportService.updateAdminTicket = originalUpdateAdminTicket;
  clearSupportManualEmailRateLimitStore();
});

test('supportService.listAdminTickets validates filters and applies staff assignment scope', async () => {
  const service = createSupportService({
    repository: {
      listTicketsForAdmin: async (filters) => {
        assert.deepEqual(filters, {
          assignedTo: ASSIGNED_STAFF_ID,
          limit: 2,
          offset: 2,
          priority: 'urgent',
          staffScopeUserId: STAFF_ID,
          status: 'open',
        });

        return {
          rows: [
            {
              assigned_to: ASSIGNED_STAFF_ID,
              assigned_user_full_name: 'Support Staff',
              assigned_user_role_code: 'staff',
              booking_code: 'BK202607010001',
              booking_id: BOOKING_ID,
              booking_status: 'pending_payment',
              closed_at: null,
              created_at: '2026-07-01T10:00:00.000Z',
              customer_email: 'guest@example.com',
              customer_name: 'Guest User',
              customer_phone: '+84901234567',
              customer_user_email: null,
              customer_user_full_name: null,
              customer_user_phone: null,
              id: TICKET_ID,
              priority: 'urgent',
              service_id: SERVICE_ID,
              service_slug: 'tour-da-nang',
              service_title: 'Tour Da Nang',
              service_type: 'tour',
              status: 'open',
              subject: 'Need urgent help',
              ticket_code: 'TK20260701AAAA0001',
              updated_at: '2026-07-01T10:10:00.000Z',
              user_id: null,
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listAdminTickets({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: STAFF_ID,
    },
    query: {
      assigned_to: ASSIGNED_STAFF_ID,
      limit: '2',
      page: '2',
      priority: 'urgent',
      status: 'open',
    },
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].assigned_to.id, ASSIGNED_STAFF_ID);
  assert.equal(result.items[0].customer.full_name, 'Guest User');
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 2,
    page: 2,
    total: 3,
    total_pages: 2,
  });
});

test('supportService.listAdminTickets rejects invalid priority and missing permission', async () => {
  const service = createSupportService({
    repository: {
      listTicketsForAdmin: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listAdminTickets({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['booking.read_all'],
        },
        userId: STAFF_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminTickets({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.read_all'],
        },
        userId: ADMIN_ID,
      },
      query: {
        priority: 'critical',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('supportService.getAdminTicketDetail filters internal notes for staff without permission and includes them for admin', async () => {
  const repository = {
    getTicketByIdForAdmin: async ({
      staffScopeUserId,
      ticketId,
    }) => {
      assert.equal(ticketId, TICKET_ID);

      if (staffScopeUserId != null) {
        assert.equal(staffScopeUserId, STAFF_ID);
      }

      return {
        assigned_to: ASSIGNED_STAFF_ID,
        assigned_user_full_name: 'Support Staff',
        assigned_user_role_code: 'staff',
        booking_code: 'BK202607010001',
        booking_id: BOOKING_ID,
        booking_status: 'pending_payment',
        closed_at: null,
        created_at: '2026-07-01T10:00:00.000Z',
        customer_email: 'customer@example.com',
        customer_name: 'Customer Name',
        customer_phone: '+84901234567',
        customer_user_email: 'customer@example.com',
        customer_user_full_name: 'Customer Name',
        customer_user_phone: '+84901234567',
        id: TICKET_ID,
        priority: 'high',
        service_id: SERVICE_ID,
        service_slug: 'tour-da-nang',
        service_title: 'Tour Da Nang',
        service_type: 'tour',
        status: 'assigned',
        subject: 'Need support',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:10:00.000Z',
        user_id: '99999999-9999-4999-8999-999999999999',
      };
    },
    listRepliesByTicketIdForAdmin: async (ticketId) => {
      assert.equal(ticketId, TICKET_ID);

      return [
        {
          created_at: '2026-07-01T10:00:00.000Z',
          id: REPLY_ID,
          is_internal_note: false,
          message: 'Customer message',
          sender_full_name: 'Customer Name',
          sender_id: '99999999-9999-4999-8999-999999999999',
          sender_role_code: 'customer',
          sender_type: 'customer',
        },
        {
          created_at: '2026-07-01T10:05:00.000Z',
          id: '12121212-1212-4121-8121-121212121212',
          is_internal_note: true,
          message: 'Internal follow-up',
          sender_full_name: 'Support Staff',
          sender_id: ASSIGNED_STAFF_ID,
          sender_role_code: 'staff',
          sender_type: 'staff',
        },
      ];
    },
  };
  const service = createSupportService({
    repository,
  });

  const staffResult = await service.getAdminTicketDetail({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: STAFF_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(staffResult.replies.length, 1);
  assert.equal(staffResult.replies[0].is_internal_note, false);

  const adminResult = await service.getAdminTicketDetail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: ADMIN_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(adminResult.replies.length, 2);
  assert.equal(adminResult.replies[1].is_internal_note, true);
  assert.equal(adminResult.assigned_to.full_name, 'Support Staff');
});

test('supportService.updateAdminTicket validates permission, assignable user, and auto-assigns open tickets', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async (userId) => {
        assert.equal(userId, ASSIGNED_STAFF_ID);

        return {
          deleted_at: null,
          id: userId,
          role_code: 'staff',
          status: 'active',
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: payload.updates.assigned_to,
          closed_at: null,
          id: TICKET_ID,
          priority: payload.updates.priority,
          status: payload.updates.status,
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:10:00.000Z',
        };
      },
    },
  });

  const result = await service.updateAdminTicket({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.assign'],
      },
      userId: ADMIN_ID,
    },
    body: {
      assigned_to: ASSIGNED_STAFF_ID,
      priority: 'high',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_update');
  assert.equal(updatePayload.updates.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(updatePayload.updates.priority, 'high');
  assert.equal(updatePayload.updates.status, 'assigned');
  assert.equal(result.status, 'assigned');
  assert.equal(result.priority, 'high');
});

test('supportService.updateAdminTicket rejects empty body, forbidden status, and closed tickets', async () => {
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => null,
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: '2026-07-01T10:10:00.000Z',
        id: TICKET_ID,
        priority: 'normal',
        status: 'closed',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:10:00.000Z',
      }),
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {},
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        status: 'closed',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        priority: 'high',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('supportService.assignAdminTicket validates assign target and moves open ticket to assigned', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async (userId) => {
        assert.equal(userId, ASSIGNED_STAFF_ID);

        return {
          deleted_at: null,
          id: userId,
          role_code: 'staff',
          status: 'active',
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: payload.updates.assigned_to,
          closed_at: null,
          id: TICKET_ID,
          priority: 'normal',
          status: payload.updates.status,
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:11:00.000Z',
        };
      },
    },
  });

  const result = await service.assignAdminTicket({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.assign'],
      },
      userId: STAFF_ID,
    },
    body: {
      assigned_to: ASSIGNED_STAFF_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_assign');
  assert.equal(updatePayload.updates.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(updatePayload.updates.status, 'assigned');
  assert.equal(result.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(result.status, 'assigned');
});

test('supportService.assignAdminTicket rejects invalid assign target and missing permission', async () => {
  const invalidUserService = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => ({
        deleted_at: null,
        id: ASSIGNED_STAFF_ID,
        role_code: 'customer',
        status: 'active',
      }),
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'waiting_staff',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => invalidUserService.assignAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        assigned_to: ASSIGNED_STAFF_ID,
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  const forbiddenService = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => null,
      getTicketByIdForAdmin: async () => null,
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => forbiddenService.assignAdminTicket({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.read_all'],
        },
        userId: STAFF_ID,
      },
      body: {
        assigned_to: ASSIGNED_STAFF_ID,
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('supportService.replyToAdminTicket creates public reply and moves ticket to waiting_customer', async () => {
  let createReplyPayload = null;
  const service = createSupportService({
    repository: {
      createAdminReply: async (payload) => {
        createReplyPayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T10:25:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: payload.message,
            sender_full_name: 'Support Staff',
            sender_id: STAFF_ID,
            sender_role_code: 'staff',
            sender_type: 'staff',
          },
          ticket: {
            assigned_to: ASSIGNED_STAFF_ID,
            closed_at: null,
            id: TICKET_ID,
            priority: 'normal',
            status: 'waiting_customer',
            ticket_code: 'TK20260701AAAA0001',
            updated_at: '2026-07-01T10:25:00.000Z',
          },
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'assigned',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:20:00.000Z',
      }),
    },
  });

  const result = await service.replyToAdminTicket({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.reply'],
      },
      userId: STAFF_ID,
    },
    body: {
      message: 'We have updated your request.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(createReplyPayload.action, 'admin.support.reply_create');
  assert.equal(createReplyPayload.senderType, 'staff');
  assert.equal(createReplyPayload.isInternalNote, false);
  assert.equal(createReplyPayload.toStatus, 'waiting_customer');
  assert.equal(result.ticket.status, 'waiting_customer');
  assert.equal(result.reply.is_internal_note, false);
});

test('supportService.replyToAdminTicket creates internal note without changing status and rejects invalid access', async () => {
  let createReplyPayload = null;
  const service = createSupportService({
    repository: {
      createAdminReply: async (payload) => {
        createReplyPayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T10:27:00.000Z',
            id: REPLY_ID,
            is_internal_note: true,
            message: payload.message,
            sender_full_name: 'Admin User',
            sender_id: ADMIN_ID,
            sender_role_code: 'admin',
            sender_type: 'admin',
          },
          ticket: {
            assigned_to: ASSIGNED_STAFF_ID,
            closed_at: null,
            id: TICKET_ID,
            priority: 'high',
            status: 'resolved',
            ticket_code: 'TK20260701AAAA0001',
            updated_at: '2026-07-01T10:27:00.000Z',
          },
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: null,
        id: TICKET_ID,
        priority: 'high',
        status: 'resolved',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:20:00.000Z',
      }),
    },
  });

  const result = await service.replyToAdminTicket({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.reply'],
      },
      userId: ADMIN_ID,
    },
    body: {
      is_internal_note: true,
      message: 'Internal follow-up note.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(createReplyPayload.senderType, 'admin');
  assert.equal(createReplyPayload.isInternalNote, true);
  assert.equal(createReplyPayload.toStatus, undefined);
  assert.equal(result.ticket.status, 'resolved');
  assert.equal(result.reply.is_internal_note, true);

  const forbiddenService = createSupportService({
    repository: {
      createAdminReply: async () => null,
      getTicketByIdForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => forbiddenService.replyToAdminTicket({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: STAFF_ID,
      },
      body: {
        message: 'Please check',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('supportService.closeAdminTicket closes an allowed ticket and supports idempotent closed state', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'waiting_staff',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:20:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: ASSIGNED_STAFF_ID,
          closed_at: '2026-07-01T10:35:00.000Z',
          id: TICKET_ID,
          priority: 'normal',
          status: 'closed',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:35:00.000Z',
        };
      },
    },
  });

  const result = await service.closeAdminTicket({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.close'],
      },
      userId: STAFF_ID,
    },
    body: {
      reason: 'Issue resolved by support team.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_close');
  assert.equal(updatePayload.updates.status, 'closed');
  assert.ok(updatePayload.updates.closed_at);
  assert.equal(result.status, 'closed');
  assert.ok(result.closed_at);

  const idempotentService = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: '2026-07-01T10:35:00.000Z',
        id: TICKET_ID,
        priority: 'normal',
        status: 'closed',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:35:00.000Z',
      }),
      updateTicketForAdmin: async () => {
        throw new Error('updateTicketForAdmin should not be called for closed ticket');
      },
    },
  });

  const idempotentResult = await idempotentService.closeAdminTicket({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.close'],
      },
      userId: ADMIN_ID,
    },
    body: {
      reason: 'Already closed.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(idempotentResult.status, 'closed');
});

test('supportService.reopenAdminTicket reopens closed or resolved tickets and rejects invalid states', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: '2026-07-01T10:35:00.000Z',
        id: TICKET_ID,
        priority: 'high',
        status: 'closed',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:35:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: ASSIGNED_STAFF_ID,
          closed_at: null,
          id: TICKET_ID,
          priority: 'high',
          status: 'open',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:40:00.000Z',
        };
      },
    },
  });

  const result = await service.reopenAdminTicket({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.close'],
      },
      userId: ADMIN_ID,
    },
    body: {
      reason: 'Customer needs further assistance.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_reopen');
  assert.equal(updatePayload.updates.status, 'open');
  assert.equal(updatePayload.updates.closed_at, null);
  assert.equal(result.status, 'open');
  assert.equal(result.closed_at, null);

  const invalidStateService = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:20:00.000Z',
      }),
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => invalidStateService.reopenAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.close'],
        },
        userId: ADMIN_ID,
      },
      body: {
        reason: 'Need reopen.',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('supportService.markAdminTicketAsSpam requires manage permission and supports idempotent spam state', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'urgent',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:20:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: null,
          closed_at: '2026-07-01T10:45:00.000Z',
          id: TICKET_ID,
          priority: 'urgent',
          status: 'spam',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:45:00.000Z',
        };
      },
    },
  });

  const result = await service.markAdminTicketAsSpam({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['support.manage'],
      },
      userId: ADMIN_ID,
    },
    body: {
      reason: 'Detected as spam content.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_mark_spam');
  assert.equal(updatePayload.updates.status, 'spam');
  assert.ok(updatePayload.updates.closed_at);
  assert.equal(result.status, 'spam');

  const idempotentService = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: '2026-07-01T10:45:00.000Z',
        id: TICKET_ID,
        priority: 'urgent',
        status: 'spam',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:45:00.000Z',
      }),
      updateTicketForAdmin: async () => {
        throw new Error('updateTicketForAdmin should not be called for spam ticket');
      },
    },
  });

  const idempotentResult = await idempotentService.markAdminTicketAsSpam({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.manage'],
      },
      userId: ADMIN_ID,
    },
    body: {
      reason: 'Already spam.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(idempotentResult.status, 'spam');

  const forbiddenService = createSupportService({
    repository: {
      getTicketByIdForAdmin: async () => null,
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => forbiddenService.markAdminTicketAsSpam({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.close'],
        },
        userId: STAFF_ID,
      },
      body: {
        reason: 'Spam.',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('GET /admin/support/tickets requires admin authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets`,
      {
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /admin/support/tickets returns paginated admin ticket summaries', async () => {
  const server = app.listen(0);
  supportService.listAdminTickets = async ({ auth, query }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(auth.userId, STAFF_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['support.read_all']);
    assert.equal(query.status, 'open');

    return {
      items: [
        {
          assigned_to: null,
          closed_at: null,
          created_at: '2026-07-01T10:00:00.000Z',
          customer: {
            email: 'guest@example.com',
            full_name: 'Guest User',
            id: null,
            phone: '+84901234567',
          },
          id: TICKET_ID,
          priority: 'normal',
          status: 'open',
          subject: 'Need support',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:10:00.000Z',
        },
      ],
      meta: {
        has_next: false,
        limit: 20,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets?status=open`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.meta.total, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /admin/support/tickets/{ticket_id} returns admin-safe detail and blocks customer role', async () => {
  const server = app.listen(0);
  supportService.getAdminTicketDetail = async ({ auth, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);

    return {
      assigned_to: {
        full_name: 'Support Staff',
        id: ASSIGNED_STAFF_ID,
        role_code: 'staff',
      },
      closed_at: null,
      created_at: '2026-07-01T10:00:00.000Z',
      customer: {
        email: 'customer@example.com',
        full_name: 'Customer Name',
        id: '99999999-9999-4999-8999-999999999999',
        phone: '+84901234567',
      },
      id: TICKET_ID,
      priority: 'high',
      replies: [
        {
          created_at: '2026-07-01T10:00:00.000Z',
          id: REPLY_ID,
          is_internal_note: false,
          message: 'Customer message',
          sender: {
            full_name: 'Customer Name',
            id: '99999999-9999-4999-8999-999999999999',
            role_code: 'customer',
            type: 'customer',
          },
        },
      ],
      status: 'assigned',
      subject: 'Need support',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:10:00.000Z',
    };
  };

  try {
    const okResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.replies.length, 1);

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /admin/support/tickets/{ticket_id} updates admin support ticket fields', async () => {
  const server = app.listen(0);
  supportService.updateAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.priority, 'high');
    assert.equal(body.assigned_to, ASSIGNED_STAFF_ID);

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: null,
      id: TICKET_ID,
      priority: 'high',
      status: 'assigned',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:15:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
          priority: 'high',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.priority, 'high');
    assert.equal(response.body.data.status, 'assigned');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/assign assigns ticket for authorized admin role', async () => {
  const server = app.listen(0);
  supportService.assignAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.assigned_to, ASSIGNED_STAFF_ID);

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: null,
      id: TICKET_ID,
      priority: 'normal',
      status: 'assigned',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:20:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/assign`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.assigned_to, ASSIGNED_STAFF_ID);
    assert.equal(response.body.data.status, 'assigned');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /admin/support/tickets/{ticket_id} and assign route block customer role', async () => {
  const server = app.listen(0);

  try {
    const patchResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        body: {
          priority: 'high',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(patchResponse.statusCode, 403);
    assert.equal(patchResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const assignResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/assign`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(assignResponse.statusCode, 403);
    assert.equal(assignResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/replies creates admin reply', async () => {
  const server = app.listen(0);
  supportService.replyToAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.message, 'We are processing your request.');
    assert.equal(body.is_internal_note, false);

    return {
      reply: {
        created_at: '2026-07-01T10:30:00.000Z',
        id: REPLY_ID,
        is_internal_note: false,
        message: 'We are processing your request.',
        sender: {
          full_name: 'Admin User',
          id: ADMIN_ID,
          role_code: 'admin',
          type: 'admin',
        },
      },
      ticket: {
        assigned_to: ASSIGNED_STAFF_ID,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'waiting_customer',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:30:00.000Z',
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/replies`,
      {
        body: {
          is_internal_note: false,
          message: 'We are processing your request.',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.reply'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.ticket.status, 'waiting_customer');
    assert.equal(response.body.data.reply.is_internal_note, false);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/replies blocks customer role', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/replies`,
      {
        body: {
          message: 'Please help',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.reply'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('supportService.sendAdminTicketEmail prefers the linked user email, writes email logs, and does not mutate ticket state', async () => {
  let createEmailLogCalls = 0;
  let markSentCalls = 0;
  let nowCallCount = 0;
  const service = createSupportService({
    now: () => new Date(Date.UTC(2026, 6, 2, 8, nowCallCount++ * 5, 0)),
    repository: {
      createSupportManualEmailLog: async ({
        bookingId,
        createdAt,
        subject,
        templateCode,
        toEmail,
        userId,
      }) => {
        createEmailLogCalls += 1;
        assert.equal(bookingId, BOOKING_ID);
        assert.ok(createdAt instanceof Date);
        assert.equal(subject, 'Follow-up support');
        assert.equal(templateCode, 'SUPPORT_MANUAL_EMAIL');
        assert.equal(toEmail, 'member@example.com');
        assert.equal(userId, '22222222-2222-4222-8222-222222222222');

        return {
          booking_id: BOOKING_ID,
          created_at: createdAt.toISOString(),
          id: '33333333-3333-4333-8333-333333333333',
          provider: 'sendgrid',
          sent_at: null,
          status: 'queued',
          subject,
          template_code: templateCode,
          to_email: toEmail,
          user_id: userId,
        };
      },
      getTicketByIdForAdmin: async ({
        staffScopeUserId,
        ticketId,
      }) => {
        assert.equal(staffScopeUserId, null);
        assert.equal(ticketId, TICKET_ID);

        return {
          assigned_to: ASSIGNED_STAFF_ID,
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T07:30:00.000Z',
          customer_email: 'guest-ticket@example.com',
          customer_name: 'Guest Contact',
          customer_phone: '+84901234567',
          customer_user_email: 'member@example.com',
          customer_user_full_name: 'Member User',
          customer_user_phone: '+84901234568',
          id: TICKET_ID,
          priority: 'normal',
          status: 'closed',
          subject: 'Need help',
          ticket_code: 'TK20260702AAAA0001',
          updated_at: '2026-07-02T07:40:00.000Z',
          user_id: '22222222-2222-4222-8222-222222222222',
        };
      },
      markSupportManualEmailLogSent: async ({
        actorUserId,
        emailLogId,
        messageId,
        metadata,
        sentAt,
        ticketId,
      }) => {
        markSentCalls += 1;
        assert.equal(actorUserId, ADMIN_ID);
        assert.equal(emailLogId, '33333333-3333-4333-8333-333333333333');
        assert.equal(messageId, 'sg-message-1');
        assert.equal(ticketId, TICKET_ID);
        assert.equal(metadata.status, 'sent');
        assert.equal(metadata.recipient_source, 'user');
        assert.equal(metadata.ticket_status, 'closed');
        assert.ok(sentAt instanceof Date);

        return {
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T08:00:00.000Z',
          id: emailLogId,
          provider: 'sendgrid',
          sent_at: sentAt.toISOString(),
          status: 'sent',
          subject: 'Follow-up support',
          template_code: 'SUPPORT_MANUAL_EMAIL',
          to_email: 'member@example.com',
          user_id: '22222222-2222-4222-8222-222222222222',
        };
      },
    },
    sendEmailImpl: async ({
      html,
      subject,
      text,
      to,
    }) => {
      assert.equal(subject, 'Follow-up support');
      assert.equal(to.email, 'member@example.com');
      assert.equal(to.name, 'Guest Contact');
      assert.match(html, /TK20260702AAAA0001/);
      assert.match(text, /Follow-up support/);

      return {
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.sendAdminTicketEmail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['email.send'],
      },
      userId: ADMIN_ID,
    },
    body: {
      message: 'We are checking your support case.',
      subject: 'Follow-up support',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(createEmailLogCalls, 1);
  assert.equal(markSentCalls, 1);
  assert.equal(result.status, 'sent');
  assert.equal(result.to_email, 'member@example.com');
  assert.equal(result.recipient_source, 'user');
  assert.equal(result.ticket_id, TICKET_ID);
  assert.equal(result.template_code, 'SUPPORT_MANUAL_EMAIL');
});

test('supportService.sendAdminTicketEmail returns forbidden when staff is outside ticket scope', async () => {
  const service = createSupportService({
    repository: {
      getTicketById: async (ticketId) => {
        assert.equal(ticketId, TICKET_ID);

        return {
          id: TICKET_ID,
          status: 'open',
        };
      },
      getTicketByIdForAdmin: async ({
        staffScopeUserId,
        ticketId,
      }) => {
        assert.equal(staffScopeUserId, STAFF_ID);
        assert.equal(ticketId, TICKET_ID);
        return null;
      },
    },
  });

  await assert.rejects(
    () => service.sendAdminTicketEmail({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.reply'],
        },
        userId: STAFF_ID,
      },
      body: {
        message: 'Checking',
        subject: 'Need update',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test('supportService.sendAdminTicketEmail marks email log failed and returns internal error when provider fails', async () => {
  let failedLogRecorded = 0;
  const service = createSupportService({
    now: () => new Date('2026-07-02T09:00:00.000Z'),
    repository: {
      createSupportManualEmailLog: async () => ({
        booking_id: null,
        created_at: '2026-07-02T09:00:00.000Z',
        id: '44444444-4444-4444-8444-444444444444',
        provider: 'sendgrid',
        sent_at: null,
        status: 'queued',
        subject: 'Need help',
        template_code: 'SUPPORT_MANUAL_EMAIL',
        to_email: 'guest@example.com',
        user_id: null,
      }),
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        booking_id: null,
        customer_email: 'guest@example.com',
        customer_name: 'Guest User',
        customer_user_email: null,
        customer_user_full_name: null,
        id: TICKET_ID,
        status: 'open',
        subject: 'Question',
        ticket_code: 'TK20260702AAAA0002',
        user_id: null,
      }),
      markSupportManualEmailLogFailed: async ({
        actorUserId,
        emailLogId,
        errorMessage,
        metadata,
        ticketId,
      }) => {
        failedLogRecorded += 1;
        assert.equal(actorUserId, ADMIN_ID);
        assert.equal(emailLogId, '44444444-4444-4444-8444-444444444444');
        assert.equal(ticketId, TICKET_ID);
        assert.equal(errorMessage, 'Provider outage');
        assert.equal(metadata.status, 'failed');
        assert.equal(metadata.to_email, 'guest@example.com');

        return {
          id: emailLogId,
          status: 'failed',
        };
      },
    },
    sendEmailImpl: async () => {
      throw new Error('Provider outage');
    },
  });

  await assert.rejects(
    () => service.sendAdminTicketEmail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email.send'],
        },
        userId: ADMIN_ID,
      },
      body: {
        message: 'Need help',
        subject: 'Need help',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INTERNAL_ERROR);
      assert.equal(error.statusCode, 500);
      return true;
    },
  );

  assert.equal(failedLogRecorded, 1);
});

test('supportService.sendAdminTicketEmail enforces rate limit per ticket recipient', async () => {
  let createEmailLogCalls = 0;
  let markSentCalls = 0;
  const service = createSupportService({
    now: () => new Date('2026-07-02T10:00:00.000Z'),
    repository: {
      createSupportManualEmailLog: async () => {
        createEmailLogCalls += 1;

        return {
          booking_id: null,
          created_at: '2026-07-02T10:00:00.000Z',
          id: `55555555-5555-4555-8555-55555555555${createEmailLogCalls}`,
          provider: 'sendgrid',
          sent_at: null,
          status: 'queued',
          subject: 'Quick update',
          template_code: 'SUPPORT_MANUAL_EMAIL',
          to_email: 'guest@example.com',
          user_id: null,
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        booking_id: null,
        customer_email: 'guest@example.com',
        customer_name: 'Guest User',
        customer_user_email: null,
        customer_user_full_name: null,
        id: TICKET_ID,
        status: 'open',
        subject: 'Question',
        ticket_code: 'TK20260702AAAA0003',
        user_id: null,
      }),
      markSupportManualEmailLogSent: async ({
        emailLogId,
      }) => {
        markSentCalls += 1;

        return {
          booking_id: null,
          id: emailLogId,
          provider: 'sendgrid',
          sent_at: '2026-07-02T10:00:00.000Z',
          status: 'sent',
          template_code: 'SUPPORT_MANUAL_EMAIL',
          to_email: 'guest@example.com',
          user_id: null,
        };
      },
    },
    sendEmailImpl: async () => ({
      messageId: 'sg-message-rate-limit',
    }),
  });

  const payload = {
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['email.send'],
      },
      userId: ADMIN_ID,
    },
    body: {
      message: 'Quick update',
      subject: 'Quick update',
    },
    ticketId: TICKET_ID,
  };

  await service.sendAdminTicketEmail(payload);
  await service.sendAdminTicketEmail(payload);
  await service.sendAdminTicketEmail(payload);

  await assert.rejects(
    () => service.sendAdminTicketEmail(payload),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RATE_LIMITED);
      assert.equal(error.statusCode, 429);
      return true;
    },
  );

  assert.equal(createEmailLogCalls, 3);
  assert.equal(markSentCalls, 3);
});

test('POST /admin/support/tickets/{ticket_id}/send-email returns manual support email result for authorized admins', async () => {
  const server = app.listen(0);
  supportService.sendAdminTicketEmail = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.subject, 'Manual follow up');
    assert.equal(body.message, 'We have sent you more details.');

    return {
      booking_id: BOOKING_ID,
      email_log_id: '66666666-6666-4666-8666-666666666666',
      provider: 'sendgrid',
      recipient_source: 'user',
      recipient_user_id: '22222222-2222-4222-8222-222222222222',
      sent_at: '2026-07-02T10:15:00.000Z',
      status: 'sent',
      template_code: 'SUPPORT_MANUAL_EMAIL',
      ticket_id: TICKET_ID,
      ticket_code: 'TK20260702AAAA0004',
      to_email: 'member@example.com',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/send-email`,
      {
        body: {
          message: 'We have sent you more details.',
          subject: 'Manual follow up',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['email.send'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'sent');
    assert.equal(response.body.data.template_code, 'SUPPORT_MANUAL_EMAIL');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/send-emails uses the same manual support email handler alias', async () => {
  const server = app.listen(0);
  let handlerCalls = 0;
  supportService.sendAdminTicketEmail = async ({ ticketId }) => {
    handlerCalls += 1;
    assert.equal(ticketId, TICKET_ID);

    return {
      booking_id: null,
      email_log_id: '77777777-7777-4777-8777-777777777777',
      provider: 'sendgrid',
      recipient_source: 'ticket',
      recipient_user_id: null,
      sent_at: '2026-07-02T10:20:00.000Z',
      status: 'sent',
      template_code: 'SUPPORT_MANUAL_EMAIL',
      ticket_id: TICKET_ID,
      ticket_code: 'TK20260702AAAA0005',
      to_email: 'guest@example.com',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/send-emails`,
      {
        body: {
          message: 'Alias route check.',
          subject: 'Alias route',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.reply'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.to_email, 'guest@example.com');
    assert.equal(handlerCalls, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/close returns closed ticket result', async () => {
  const server = app.listen(0);
  supportService.closeAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.reason, 'Resolved and closing ticket.');

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: '2026-07-01T10:40:00.000Z',
      id: TICKET_ID,
      priority: 'normal',
      status: 'closed',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:40:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/close`,
      {
        body: {
          reason: 'Resolved and closing ticket.',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.close'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'closed');
    assert.ok(response.body.data.closed_at);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/reopen returns reopened ticket result', async () => {
  const server = app.listen(0);
  supportService.reopenAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.reason, 'Customer replied again.');

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: null,
      id: TICKET_ID,
      priority: 'high',
      status: 'open',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:42:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/reopen`,
      {
        body: {
          reason: 'Customer replied again.',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.close'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'open');
    assert.equal(response.body.data.closed_at, null);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/mark-spam returns spam result and blocks customer role', async () => {
  const server = app.listen(0);
  supportService.markAdminTicketAsSpam = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'system_admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.reason, 'Spam campaign detected.');

    return {
      assigned_to: null,
      closed_at: '2026-07-01T10:44:00.000Z',
      id: TICKET_ID,
      priority: 'urgent',
      status: 'spam',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:44:00.000Z',
    };
  };

  try {
    const okResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/mark-spam`,
      {
        body: {
          reason: 'Spam campaign detected.',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.manage'],
            roleCode: 'system_admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.status, 'spam');

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/mark-spam`,
      {
        body: {
          reason: 'Spam campaign detected.',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.manage'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
