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
const originalCreateTicket = supportService.createTicket;

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
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  supportService.createTicket = originalCreateTicket;
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
