const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-support-secret';

const app = require('../app');
const authService = require('../services/authService');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const createRateLimit = require('../middleware/rateLimit');
const supportService = require('../services/supportService');
const { createSupportService } = require('../services/supportService');
const { createAccessToken } = require('../utils/sessionToken');

const CUSTOMER_ID = '99999999-9999-4999-8999-999999999999';
const OTHER_CUSTOMER_ID = '88888888-8888-4888-8888-888888888888';
const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const SERVICE_ID = '22222222-2222-4222-8222-222222222222';
const TICKET_ID = '33333333-3333-4333-8333-333333333333';
const REPLY_ID = '44444444-4444-4444-8444-444444444444';

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCloseMyTicket = supportService.closeMyTicket;
const originalCreateTicket = supportService.createTicket;
const originalGetMyTicketDetail = supportService.getMyTicketDetail;
const originalListMyTickets = supportService.listMyTickets;
const originalReplyToTicket = supportService.replyToTicket;

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
            headers: res.headers,
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end(body);
  });

test.afterEach(() => {
  supportService.closeMyTicket = originalCloseMyTicket;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  supportService.createTicket = originalCreateTicket;
  supportService.getMyTicketDetail = originalGetMyTicketDetail;
  supportService.listMyTickets = originalListMyTickets;
  supportService.replyToTicket = originalReplyToTicket;
  createRateLimit.clearRateLimitStore();
});

test('supportService.createTicket creates an open guest ticket with the first customer reply', async () => {
  let createTicketPayload = null;
  const service = createSupportService({
    repository: {
      createTicket: async (payload) => {
        createTicketPayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T09:05:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: payload.reply.message,
            sender_id: null,
            sender_type: payload.reply.sender_type,
            ticket_id: TICKET_ID,
          },
          ticket: {
            assigned_to: null,
            booking_id: payload.ticket.booking_id,
            closed_at: null,
            created_at: '2026-07-01T09:05:00.000Z',
            customer_email: payload.ticket.customer_email,
            customer_name: payload.ticket.customer_name,
            customer_phone: payload.ticket.customer_phone,
            id: TICKET_ID,
            priority: payload.ticket.priority,
            service_id: payload.ticket.service_id,
            status: payload.ticket.status,
            subject: payload.ticket.subject,
            ticket_code: payload.ticket.ticket_code,
            updated_at: '2026-07-01T09:05:00.000Z',
            user_id: null,
          },
        };
      },
      getBookingById: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return {
          id: bookingId,
          user_id: CUSTOMER_ID,
        };
      },
      getServiceById: async (serviceId) => {
        assert.equal(serviceId, SERVICE_ID);

        return {
          id: serviceId,
          service_type: 'tour',
        };
      },
    },
  });

  const result = await service.createTicket({
    body: {
      booking_id: BOOKING_ID,
      customer_email: 'guest@example.com',
      customer_name: 'Guest User',
      customer_phone: '+84901234567',
      message: 'I need support with this booking.',
      service_id: SERVICE_ID,
      subject: 'Need help',
    },
  });

  assert.equal(createTicketPayload.ticket.user_id, null);
  assert.equal(createTicketPayload.ticket.status, 'open');
  assert.equal(createTicketPayload.ticket.priority, 'normal');
  assert.equal(createTicketPayload.ticket.assigned_to, null);
  assert.equal(createTicketPayload.reply.sender_type, 'customer');
  assert.equal(createTicketPayload.reply.sender_id, null);
  assert.equal(createTicketPayload.reply.is_internal_note, false);
  assert.match(createTicketPayload.ticket.ticket_code, /^TK\d{8}[A-F0-9]{8}$/);
  assert.equal(result.status, 'open');
  assert.equal(result.priority, 'normal');
  assert.equal(result.first_reply.message, 'I need support with this booking.');
});

test('supportService.createTicket uses authenticated customer profile defaults and keeps ownership checks', async () => {
  let createTicketPayload = null;
  const service = createSupportService({
    repository: {
      createTicket: async (payload) => {
        createTicketPayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T09:10:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: payload.reply.message,
            sender_id: CUSTOMER_ID,
            sender_type: payload.reply.sender_type,
            ticket_id: TICKET_ID,
          },
          ticket: {
            assigned_to: null,
            booking_id: payload.ticket.booking_id,
            closed_at: null,
            created_at: '2026-07-01T09:10:00.000Z',
            customer_email: payload.ticket.customer_email,
            customer_name: payload.ticket.customer_name,
            customer_phone: payload.ticket.customer_phone,
            id: TICKET_ID,
            priority: payload.ticket.priority,
            service_id: payload.ticket.service_id,
            status: payload.ticket.status,
            subject: payload.ticket.subject,
            ticket_code: payload.ticket.ticket_code,
            updated_at: '2026-07-01T09:10:00.000Z',
            user_id: CUSTOMER_ID,
          },
        };
      },
      getBookingById: async () => ({
        id: BOOKING_ID,
        user_id: CUSTOMER_ID,
      }),
      getServiceById: async () => null,
    },
  });

  const result = await service.createTicket({
    auth: {
      roleCode: 'customer',
      user: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
      },
      userId: CUSTOMER_ID,
    },
    body: {
      booking_id: BOOKING_ID,
      message: 'Please call me back soon.',
      subject: 'Support request',
    },
  });

  assert.equal(createTicketPayload.ticket.user_id, CUSTOMER_ID);
  assert.equal(createTicketPayload.ticket.customer_name, 'Nguyen Van A');
  assert.equal(createTicketPayload.ticket.customer_email, 'customer@example.com');
  assert.equal(createTicketPayload.reply.sender_id, CUSTOMER_ID);
  assert.equal(result.user_id, CUSTOMER_ID);
  assert.equal(result.customer_email, 'customer@example.com');
});

test('supportService.createTicket rejects booking references that do not belong to the authenticated customer', async () => {
  const service = createSupportService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        user_id: OTHER_CUSTOMER_ID,
      }),
      getServiceById: async () => null,
    },
  });

  await assert.rejects(
    () => service.createTicket({
      auth: {
        roleCode: 'customer',
        user: {
          email: 'customer@example.com',
          full_name: 'Nguyen Van A',
        },
        userId: CUSTOMER_ID,
      },
      body: {
        booking_id: BOOKING_ID,
        message: 'Please help',
        subject: 'Wrong booking',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test('supportService.createTicket requires guest contact information', async () => {
  const service = createSupportService({
    repository: {
      getBookingById: async () => null,
      getServiceById: async () => null,
    },
  });

  await assert.rejects(
    () => service.createTicket({
      body: {
        message: 'Need support',
        subject: 'Missing contact',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      assert.equal(error.details[0].field, 'customer_name');
      return true;
    },
  );
});

test('supportService.listMyTickets returns paginated customer ticket summaries', async () => {
  const service = createSupportService({
    repository: {
      listRepliesByTicketId: async () => [],
      listTicketsByUser: async ({
        limit,
        offset,
        status,
        userId,
      }) => {
        assert.equal(limit, 20);
        assert.equal(offset, 0);
        assert.equal(status, 'open');
        assert.equal(userId, CUSTOMER_ID);

        return {
          rows: [
            {
              booking_code: 'BK202607010001',
              booking_id: BOOKING_ID,
              booking_status: 'pending_payment',
              closed_at: null,
              created_at: '2026-07-01T09:20:00.000Z',
              id: TICKET_ID,
              priority: 'normal',
              service_id: SERVICE_ID,
              service_slug: 'tour-da-nang',
              service_title: 'Tour Da Nang',
              service_type: 'tour',
              status: 'open',
              subject: 'Need support',
              ticket_code: 'TK20260701AAAA0001',
              updated_at: '2026-07-01T09:25:00.000Z',
            },
          ],
          total: 1,
        };
      },
    },
  });

  const result = await service.listMyTickets({
    auth: {
      roleCode: 'customer',
      userId: CUSTOMER_ID,
    },
    query: {
      status: 'open',
    },
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].ticket_code, 'TK20260701AAAA0001');
  assert.equal(result.items[0].booking.booking_code, 'BK202607010001');
  assert.equal(result.items[0].service.slug, 'tour-da-nang');
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 1,
    total_pages: 1,
  });
});

test('supportService.listMyTickets rejects invalid status and pagination', async () => {
  const service = createSupportService({
    repository: {
      listTicketsByUser: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listMyTickets({
      auth: {
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      },
      query: {
        limit: '51',
        status: 'bad-status',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('supportService.getMyTicketDetail returns customer-safe detail without internal replies', async () => {
  const service = createSupportService({
    repository: {
      getTicketByIdAndUser: async ({
        ticketId,
        userId,
      }) => {
        assert.equal(ticketId, TICKET_ID);
        assert.equal(userId, CUSTOMER_ID);

        return {
          booking_code: 'BK202607010001',
          booking_id: BOOKING_ID,
          booking_status: 'pending_payment',
          closed_at: null,
          created_at: '2026-07-01T09:20:00.000Z',
          customer_email: 'customer@example.com',
          customer_name: 'Nguyen Van A',
          customer_phone: '+84901234567',
          id: TICKET_ID,
          priority: 'normal',
          service_id: SERVICE_ID,
          service_slug: 'tour-da-nang',
          service_title: 'Tour Da Nang',
          service_type: 'tour',
          status: 'waiting_staff',
          subject: 'Need support',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T09:25:00.000Z',
        };
      },
      listRepliesByTicketId: async (ticketId) => {
        assert.equal(ticketId, TICKET_ID);

        return [
          {
            created_at: '2026-07-01T09:20:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: 'Need support',
            sender_type: 'customer',
          },
          {
            created_at: '2026-07-01T09:21:00.000Z',
            id: '55555555-5555-4555-8555-555555555555',
            is_internal_note: true,
            message: 'Internal note',
            sender_type: 'staff',
          },
          {
            created_at: '2026-07-01T09:22:00.000Z',
            id: '66666666-6666-4666-8666-666666666666',
            is_internal_note: false,
            message: 'We are checking this for you.',
            sender_type: 'staff',
          },
        ];
      },
    },
  });

  const result = await service.getMyTicketDetail({
    auth: {
      roleCode: 'customer',
      userId: CUSTOMER_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(result.replies.length, 2);
  assert.equal(result.replies[0].message, 'Need support');
  assert.equal(result.replies[1].message, 'We are checking this for you.');
  assert.equal(result.service.title, 'Tour Da Nang');
  assert.equal(result.booking.booking_code, 'BK202607010001');
});

test('supportService.getMyTicketDetail returns 404 for missing ownership-scoped ticket', async () => {
  const service = createSupportService({
    repository: {
      getTicketByIdAndUser: async () => null,
      listRepliesByTicketId: async () => [],
    },
  });

  await assert.rejects(
    () => service.getMyTicketDetail({
      auth: {
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('supportService.replyToTicket creates a customer reply and moves the ticket to waiting_staff', async () => {
  let addReplyPayload = null;
  const service = createSupportService({
    repository: {
      addCustomerReply: async (payload) => {
        addReplyPayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T10:00:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: payload.message,
            sender_id: CUSTOMER_ID,
            sender_type: 'customer',
            ticket_id: TICKET_ID,
          },
          ticket: {
            closed_at: null,
            id: TICKET_ID,
            status: 'waiting_staff',
            ticket_code: 'TK20260701AAAA0001',
            updated_at: '2026-07-01T10:00:00.000Z',
          },
        };
      },
      getTicketByIdAndUser: async () => ({
        id: TICKET_ID,
        status: 'resolved',
        ticket_code: 'TK20260701AAAA0001',
      }),
    },
  });

  const result = await service.replyToTicket({
    auth: {
      roleCode: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      message: 'Can you help me one more time?',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(addReplyPayload.senderId, CUSTOMER_ID);
  assert.equal(addReplyPayload.ticketId, TICKET_ID);
  assert.equal(addReplyPayload.toStatus, 'waiting_staff');
  assert.equal(result.ticket.status, 'waiting_staff');
  assert.equal(result.reply.sender_type, 'customer');
});

test('supportService.replyToTicket rejects closed and spam tickets', async () => {
  const service = createSupportService({
    repository: {
      addCustomerReply: async () => null,
      getTicketByIdAndUser: async () => ({
        id: TICKET_ID,
        status: 'closed',
      }),
    },
  });

  await assert.rejects(
    () => service.replyToTicket({
      auth: {
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        message: 'Please reopen',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('supportService.closeMyTicket closes a customer-owned ticket and optionally stores the reason as reply', async () => {
  let closePayload = null;
  const service = createSupportService({
    repository: {
      closeTicketByCustomer: async (payload) => {
        closePayload = payload;

        return {
          reply: {
            created_at: '2026-07-01T10:05:00.000Z',
            id: REPLY_ID,
            is_internal_note: false,
            message: payload.reason,
            sender_type: 'customer',
          },
          ticket: {
            closed_at: '2026-07-01T10:05:00.000Z',
            id: TICKET_ID,
            status: 'closed',
            ticket_code: 'TK20260701AAAA0001',
            updated_at: '2026-07-01T10:05:00.000Z',
          },
        };
      },
      getTicketByIdAndUser: async () => ({
        closed_at: null,
        id: TICKET_ID,
        status: 'waiting_staff',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T09:25:00.000Z',
      }),
    },
  });

  const result = await service.closeMyTicket({
    auth: {
      roleCode: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      reason: 'Issue has been resolved.',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(closePayload.ticketId, TICKET_ID);
  assert.equal(closePayload.reason, 'Issue has been resolved.');
  assert.equal(result.status, 'closed');
  assert.equal(result.close_reason_reply.message, 'Issue has been resolved.');
  assert.equal(result.closed_at, '2026-07-01T10:05:00.000Z');
});

test('supportService.closeMyTicket returns idempotent success for an already closed ticket and rejects spam', async () => {
  const idempotentService = createSupportService({
    repository: {
      closeTicketByCustomer: async () => null,
      getTicketByIdAndUser: async () => ({
        closed_at: '2026-07-01T10:05:00.000Z',
        id: TICKET_ID,
        status: 'closed',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:05:00.000Z',
      }),
    },
  });

  const idempotentResult = await idempotentService.closeMyTicket({
    auth: {
      roleCode: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {},
    ticketId: TICKET_ID,
  });

  assert.equal(idempotentResult.status, 'closed');
  assert.equal(idempotentResult.close_reason_reply, null);

  const invalidService = createSupportService({
    repository: {
      closeTicketByCustomer: async () => null,
      getTicketByIdAndUser: async () => ({
        closed_at: null,
        id: TICKET_ID,
        status: 'spam',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:05:00.000Z',
      }),
    },
  });

  await assert.rejects(
    () => invalidService.closeMyTicket({
      auth: {
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {},
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('POST /support/tickets allows guest submissions without a token', async () => {
  const server = app.listen(0);
  supportService.createTicket = async ({ auth, body }) => {
    assert.equal(auth, null);
    assert.equal(body.subject, 'Guest support');

    return {
      first_reply: {
        created_at: '2026-07-01T09:15:00.000Z',
        id: REPLY_ID,
        is_internal_note: false,
        message: 'Need support',
        sender_type: 'customer',
      },
      id: TICKET_ID,
      priority: 'normal',
      status: 'open',
      subject: body.subject,
      ticket_code: 'TK20260701AAAA0001',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets`,
      {
        body: {
          customer_email: 'guest@example.com',
          customer_name: 'Guest User',
          message: 'Need support',
          subject: 'Guest support',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'open');
    assert.equal(response.body.data.ticket_code, 'TK20260701AAAA0001');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /support/tickets blocks authenticated non-customer roles', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'admin',
    tokenId: 'token-admin',
    user: { id: 'admin-1', role_code: 'admin' },
    userId: 'admin-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets`,
      {
        body: {
          message: 'Need support',
          subject: 'Guest support',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /support/tickets applies a public rate limit to repeated submissions', async () => {
  const server = app.listen(0);
  supportService.createTicket = async () => ({
    first_reply: {
      created_at: '2026-07-01T09:15:00.000Z',
      id: REPLY_ID,
      is_internal_note: false,
      message: 'Need support',
      sender_type: 'customer',
    },
    id: TICKET_ID,
    priority: 'normal',
    status: 'open',
    subject: 'Guest support',
    ticket_code: 'TK20260701AAAA0001',
  });

  try {
    let lastResponse = null;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(
        server,
        `${apiPrefix}/support/tickets`,
        {
          body: {
            customer_email: 'guest@example.com',
            customer_name: 'Guest User',
            message: 'Need support',
            subject: 'Guest support',
          },
          method: 'POST',
        },
      );
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /support/tickets requires customer authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets`,
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

test('GET /support/tickets returns paginated customer tickets', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    permissions: ['support.read_self'],
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });
  supportService.listMyTickets = async ({ auth, query }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(query.status, 'open');

    return {
      items: [
        {
          closed_at: null,
          created_at: '2026-07-01T09:20:00.000Z',
          id: TICKET_ID,
          priority: 'normal',
          status: 'open',
          subject: 'Need support',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T09:25:00.000Z',
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
      `${apiPrefix}/support/tickets?status=open`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
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

test('GET /support/tickets/{ticket_id} returns sanitized detail for the owner', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    permissions: ['support.read_self'],
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });
  supportService.getMyTicketDetail = async ({ auth, ticketId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(ticketId, TICKET_ID);

    return {
      closed_at: null,
      created_at: '2026-07-01T09:20:00.000Z',
      customer_email: 'customer@example.com',
      customer_name: 'Nguyen Van A',
      customer_phone: '+84901234567',
      id: TICKET_ID,
      priority: 'normal',
      replies: [
        {
          created_at: '2026-07-01T09:20:00.000Z',
          id: REPLY_ID,
          message: 'Need support',
          sender_type: 'customer',
        },
      ],
      status: 'open',
      subject: 'Need support',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T09:25:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets/${TICKET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.replies.length, 1);
    assert.equal(response.body.data.ticket_code, 'TK20260701AAAA0001');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /support/tickets/{ticket_id}/replies requires customer authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets/${TICKET_ID}/replies`,
      {
        body: {
          message: 'Please help',
        },
        method: 'POST',
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

test('POST /support/tickets/{ticket_id}/replies returns 201 for valid customer reply', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    permissions: ['support.reply'],
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });
  supportService.replyToTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(body.message, 'Please help');
    assert.equal(ticketId, TICKET_ID);

    return {
      reply: {
        created_at: '2026-07-01T10:00:00.000Z',
        id: REPLY_ID,
        message: 'Please help',
        sender_type: 'customer',
      },
      ticket: {
        closed_at: null,
        id: TICKET_ID,
        status: 'waiting_staff',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets/${TICKET_ID}/replies`,
      {
        body: {
          message: 'Please help',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.ticket.status, 'waiting_staff');
    assert.equal(response.body.data.reply.sender_type, 'customer');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /support/tickets/{ticket_id}/close returns closed status for customer owner', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    permissions: ['support.close'],
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });
  supportService.closeMyTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(body.reason, 'Resolved now');
    assert.equal(ticketId, TICKET_ID);

    return {
      close_reason_reply: {
        created_at: '2026-07-01T10:05:00.000Z',
        id: REPLY_ID,
        message: 'Resolved now',
        sender_type: 'customer',
      },
      closed_at: '2026-07-01T10:05:00.000Z',
      id: TICKET_ID,
      status: 'closed',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:05:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/support/tickets/${TICKET_ID}/close`,
      {
        body: {
          reason: 'Resolved now',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'closed');
    assert.equal(response.body.data.closed_at, '2026-07-01T10:05:00.000Z');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
