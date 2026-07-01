const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-customer-contact-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const bookingService = require('../services/bookingService');
const { createAccessToken } = require('../utils/sessionToken');

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CUSTOMER_ID = '99999999-9999-4999-8999-999999999999';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalUpdateMyBookingContact = bookingService.updateMyBookingContact;

const createAuthContext = ({
  roleCode = 'customer',
  userId = CUSTOMER_ID,
} = {}) => ({
  roleCode,
  tokenId: 'access-jti-contact-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_code: roleCode,
  },
  userId,
});

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

test.beforeEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.updateMyBookingContact = originalUpdateMyBookingContact;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.updateMyBookingContact = originalUpdateMyBookingContact;
});

test('bookingService.updateMyBookingContact updates allowed fields for editable booking states', async () => {
  let capturedPayload = null;
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return {
          booking_code: 'BK202607010020',
          id: BOOKING_ID,
          status: BOOKING_STATUS.PENDING_PAYMENT,
        };
      },
      updateBookingContact: async (payload) => {
        capturedPayload = payload;

        return {
          booking_code: 'BK202607010020',
          contact_name: 'Nguyen Van Updated',
          contact_phone: '+84905556667',
          id: BOOKING_ID,
          note: 'Call before departure',
          status: BOOKING_STATUS.PENDING_PAYMENT,
          updated_at: '2026-07-01T05:00:00.000Z',
        };
      },
    },
  });

  const result = await service.updateMyBookingContact({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      contact_name: 'Nguyen Van Updated',
      contact_phone: '+84905556667',
      note: 'Call before departure',
    },
    bookingId: BOOKING_ID,
  });

  assert.deepEqual(capturedPayload, {
    actorUserId: CUSTOMER_ID,
    bookingId: BOOKING_ID,
    updates: {
      contact_name: 'Nguyen Van Updated',
      contact_phone: '+84905556667',
      note: 'Call before departure',
    },
  });
  assert.deepEqual(result, {
    booking_code: 'BK202607010020',
    contact_name: 'Nguyen Van Updated',
    contact_phone: '+84905556667',
    id: BOOKING_ID,
    note: 'Call before departure',
    status: BOOKING_STATUS.PENDING_PAYMENT,
    updated_at: '2026-07-01T05:00:00.000Z',
  });
});

test('bookingService.updateMyBookingContact rejects empty body and forbidden fields', async () => {
  const service = bookingService.createBookingService({
    repository: {},
  });

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {},
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        contact_email: 'new@example.com',
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('bookingService.updateMyBookingContact rejects invalid phone, bad uuid, missing booking, and invalid state', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
      }) => {
        if (bookingId === BOOKING_ID) {
          return {
            id: BOOKING_ID,
            status: BOOKING_STATUS.CONFIRMED,
          };
        }

        return null;
      },
    },
  });

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        contact_phone: 'bad-phone',
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        note: 'ok',
      },
      bookingId: 'bad-id',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        note: 'ok',
      },
      bookingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateMyBookingContact({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        note: 'ok',
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('PATCH /api/bookings/{booking_id}/contact requires customer authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/contact`,
      {
        body: {
          note: 'Need support',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /api/bookings/{booking_id}/contact rejects non-customer roles and invalid body', async () => {
  const server = app.listen(0);

  try {
    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'admin',
        userId: 'admin-1',
      });

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/contact`,
      {
        body: {
          note: 'Need support',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext();

    const invalidBodyResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/contact`,
      {
        body: {},
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(invalidBodyResponse.statusCode, 400);
    assert.equal(invalidBodyResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /api/bookings/{booking_id}/contact returns sanitized contact payload', async () => {
  const server = app.listen(0);
  let capturedContext = null;
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.updateMyBookingContact = async (context) => {
    capturedContext = context;

    return {
      booking_code: 'BK202607010020',
      contact_name: 'Nguyen Van Updated',
      contact_phone: '+84905556667',
      id: BOOKING_ID,
      note: 'Call before departure',
      status: BOOKING_STATUS.PAYMENT_PROCESSING,
      updated_at: '2026-07-01T05:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/contact`,
      {
        body: {
          note: 'Call before departure',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, BOOKING_ID);
    assert.equal(response.body.data.status, BOOKING_STATUS.PAYMENT_PROCESSING);
    assert.equal(capturedContext.auth.userId, CUSTOMER_ID);
    assert.equal(capturedContext.bookingId, BOOKING_ID);
    assert.equal(capturedContext.body.note, 'Call before departure');
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    bookingService.updateMyBookingContact = originalUpdateMyBookingContact;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
