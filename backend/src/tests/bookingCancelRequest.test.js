const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-customer-cancel-secret';

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
const originalRequestBookingCancellation = bookingService.requestBookingCancellation;

const createAuthContext = ({
  permissions = ['booking.cancel'],
  roleCode = 'customer',
  userId = CUSTOMER_ID,
} = {}) => ({
  permissions: roleCode === 'customer' ? permissions : [],
  roleCode,
  tokenId: 'access-jti-cancel-1',
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
  bookingService.requestBookingCancellation = originalRequestBookingCancellation;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.requestBookingCancellation = originalRequestBookingCancellation;
});

test('bookingService.requestBookingCancellation updates eligible bookings to cancel_requested', async () => {
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
          booking_code: 'BK202607010001',
          id: BOOKING_ID,
          status: BOOKING_STATUS.PAID,
          updated_at: '2026-07-01T02:00:00.000Z',
        };
      },
      requestBookingCancellation: async (payload) => {
        capturedPayload = payload;

        return {
          booking_code: 'BK202607010001',
          id: BOOKING_ID,
          status: BOOKING_STATUS.CANCEL_REQUESTED,
          updated_at: '2026-07-01T03:00:00.000Z',
        };
      },
    },
  });

  const result = await service.requestBookingCancellation({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      reason: 'Thay doi ke hoach ca nhan',
    },
    bookingId: BOOKING_ID,
  });

  assert.deepEqual(capturedPayload, {
    actorUserId: CUSTOMER_ID,
    bookingId: BOOKING_ID,
    fromStatus: BOOKING_STATUS.PAID,
    reason: 'Thay doi ke hoach ca nhan',
  });
  assert.deepEqual(result, {
    booking_code: 'BK202607010001',
    id: BOOKING_ID,
    status: BOOKING_STATUS.CANCEL_REQUESTED,
    updated_at: '2026-07-01T03:00:00.000Z',
  });
});

test('bookingService.requestBookingCancellation returns idempotent success for already requested booking', async () => {
  let repositoryCalled = false;
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async () => ({
        booking_code: 'BK202607010001',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CANCEL_REQUESTED,
        updated_at: '2026-07-01T03:00:00.000Z',
      }),
      requestBookingCancellation: async () => {
        repositoryCalled = true;
        return null;
      },
    },
  });

  const result = await service.requestBookingCancellation({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      reason: 'Muon huy booking',
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(repositoryCalled, false);
  assert.equal(result.status, BOOKING_STATUS.CANCEL_REQUESTED);
});

test('bookingService.requestBookingCancellation rejects invalid state and missing booking', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
      }) => {
        if (bookingId === BOOKING_ID) {
          return {
            id: BOOKING_ID,
            status: BOOKING_STATUS.COMPLETED,
          };
        }

        return null;
      },
    },
  });

  await assert.rejects(
    () => service.requestBookingCancellation({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: 'Khong the di duoc',
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );

  await assert.rejects(
    () => service.requestBookingCancellation({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: 'Khong the di duoc',
      },
      bookingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('bookingService.requestBookingCancellation validates UUID and required reason', async () => {
  const service = bookingService.createBookingService({
    repository: {},
  });

  await assert.rejects(
    () => service.requestBookingCancellation({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: 'Hop le',
      },
      bookingId: 'not-a-uuid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.requestBookingCancellation({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: '   ',
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('POST /api/bookings/{booking_id}/cancel-request requires a customer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/cancel-request`,
      {
        body: {
          reason: 'Muon huy booking',
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

test('POST /api/bookings/{booking_id}/cancel-request rejects non-customer roles', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-1',
    });

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/cancel-request`,
      {
        body: {
          reason: 'Muon huy booking',
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
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /api/bookings/{booking_id}/cancel-request validates body before repository lookup', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/cancel-request`,
      {
        body: {
          reason: '   ',
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

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /api/bookings/{booking_id}/cancel-request returns updated booking state', async () => {
  const server = app.listen(0);
  let capturedContext = null;
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.requestBookingCancellation = async (context) => {
    capturedContext = context;

    return {
      booking_code: 'BK202607010001',
      id: BOOKING_ID,
      status: BOOKING_STATUS.CANCEL_REQUESTED,
      updated_at: '2026-07-01T04:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/cancel-request`,
      {
        body: {
          reason: 'Khach co viec dot xuat',
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
    assert.equal(response.body.data.status, BOOKING_STATUS.CANCEL_REQUESTED);
    assert.equal(capturedContext.auth.userId, CUSTOMER_ID);
    assert.equal(capturedContext.bookingId, BOOKING_ID);
    assert.equal(capturedContext.body.reason, 'Khach co viec dot xuat');
  } finally {
    bookingService.requestBookingCancellation = originalRequestBookingCancellation;
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
