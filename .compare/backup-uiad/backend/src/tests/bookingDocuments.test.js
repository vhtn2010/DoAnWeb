const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-customer-documents-secret';

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
const originalGetMyBookingInvoice = bookingService.getMyBookingInvoice;
const originalDownloadMyBookingSummary = bookingService.downloadMyBookingSummary;

const createAuthContext = ({
  permissions = ['booking.read_self'],
  roleCode = 'customer',
  userId = CUSTOMER_ID,
} = {}) => ({
  permissions: roleCode === 'customer' ? permissions : [],
  roleCode,
  tokenId: 'access-jti-docs-1',
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
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';

        resolve({
          body: contentType.includes('application/json')
            ? JSON.parse(bodyBuffer.toString('utf8'))
            : bodyBuffer,
          headers: res.headers,
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.getMyBookingInvoice = originalGetMyBookingInvoice;
  bookingService.downloadMyBookingSummary = originalDownloadMyBookingSummary;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.getMyBookingInvoice = originalGetMyBookingInvoice;
  bookingService.downloadMyBookingSummary = originalDownloadMyBookingSummary;
});

test('bookingService.getMyBookingInvoice returns customer-safe invoice data from booking amounts', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return {
          booking_code: 'BK202607010010',
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van B',
          contact_phone: '+84901111222',
          created_at: '2026-07-01T08:00:00.000Z',
          currency: 'VND',
          discount_amount: '100000',
          expires_at: '2026-07-02T08:00:00.000Z',
          id: BOOKING_ID,
          status: BOOKING_STATUS.PENDING_PAYMENT,
          subtotal_amount: '2500000',
          total_amount: '2400000',
          updated_at: '2026-07-01T08:10:00.000Z',
        };
      },
      listBookingItemsByBookingId: async () => [
        {
          end_at: '2026-07-12T00:00:00.000Z',
          quantity: 2,
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          status: 'pending',
          title_snapshot: 'Tour Ha Long',
          total_amount: '2400000',
          unit_price: '1200000',
        },
      ],
      listBookingPaymentsByBookingId: async () => [
        {
          amount: '2400000',
          created_at: '2026-07-01T08:05:00.000Z',
          currency: 'VND',
          expired_at: '2026-07-02T08:00:00.000Z',
          id: 'payment-1',
          paid_at: null,
          payment_code: 'PAYDOC001',
          payment_method: 'qr',
          provider: 'vnpay',
          raw_response: { secret: true },
          status: 'pending',
        },
      ],
      listBookingRefundsByBookingId: async () => [
        {
          amount: '200000',
          created_at: '2026-07-01T10:00:00.000Z',
          id: 'refund-1',
          payment_id: 'payment-1',
          processed_at: null,
          reason: 'Partial goodwill',
          refund_code: 'REFDOC001',
          raw_response: { hidden: true },
          status: 'requested',
        },
      ],
    },
  });

  const result = await service.getMyBookingInvoice({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(result.booking_id, BOOKING_ID);
  assert.equal(result.document_type, 'proforma');
  assert.equal(result.subtotal_amount, 2500000);
  assert.equal(result.discount_amount, 100000);
  assert.equal(result.total_amount, 2400000);
  assert.equal(result.items.length, 1);
  assert.equal(result.payments[0].payment_code, 'PAYDOC001');
  assert.equal(result.payments[0].raw_response, undefined);
  assert.equal(result.refunds[0].refund_code, 'REFDOC001');
});

test('bookingService.downloadMyBookingSummary returns a PDF buffer generated from booking snapshot data', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async () => ({
        booking_code: 'BK202607010011',
        contact_email: 'customer@example.com',
        contact_name: 'Tran Thi C',
        contact_phone: '+84903333444',
        created_at: '2026-07-01T08:00:00.000Z',
        currency: 'VND',
        discount_amount: '0',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CONFIRMED,
        subtotal_amount: '3000000',
        total_amount: '3000000',
        updated_at: '2026-07-01T09:00:00.000Z',
      }),
      listBookingItemsByBookingId: async () => [
        {
          end_at: '2026-07-22T00:00:00.000Z',
          quantity: 1,
          service_snapshot: {
            title: 'Legacy Hotel Snapshot',
          },
          service_type: 'hotel',
          start_at: '2026-07-20T00:00:00.000Z',
          title_snapshot: 'Legacy Hotel Snapshot',
          total_amount: '3000000',
          unit_price: '3000000',
        },
      ],
      listBookingPaymentsByBookingId: async () => [
        {
          amount: '3000000',
          created_at: '2026-07-01T08:05:00.000Z',
          currency: 'VND',
          expired_at: null,
          id: 'payment-2',
          paid_at: '2026-07-01T08:06:00.000Z',
          payment_code: 'PAYDOC002',
          payment_method: 'qr',
          provider: 'vnpay',
          status: 'success',
        },
      ],
      listBookingRefundsByBookingId: async () => [],
    },
  });

  const result = await service.downloadMyBookingSummary({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(result.contentType, 'application/pdf');
  assert.match(result.contentDisposition, /attachment; filename="bk202607010011\.pdf"/);
  assert.ok(Buffer.isBuffer(result.buffer));
  assert.match(result.buffer.toString('utf8', 0, 8), /%PDF-1\.4/);
});

test('bookingService document endpoints validate UUID and missing booking ownership safely', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async () => null,
      listBookingItemsByBookingId: async () => [],
      listBookingPaymentsByBookingId: async () => [],
      listBookingRefundsByBookingId: async () => [],
    },
  });

  await assert.rejects(
    () => service.getMyBookingInvoice({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: 'bad-id',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.downloadMyBookingSummary({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('GET /api/bookings/{booking_id}/invoice requires customer authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/invoice`,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /api/bookings/{booking_id}/invoice returns customer-safe invoice json', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.getMyBookingInvoice = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return {
      booking_code: 'BK202607010012',
      booking_id: BOOKING_ID,
      currency: 'VND',
      discount_amount: 50000,
      document_type: 'receipt',
      items: [],
      payments: [],
      refunds: [],
      status: BOOKING_STATUS.PAID,
      subtotal_amount: 1000000,
      total_amount: 950000,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/invoice`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.booking_id, BOOKING_ID);
    assert.equal(response.body.data.document_type, 'receipt');
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    bookingService.getMyBookingInvoice = originalGetMyBookingInvoice;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /api/bookings/{booking_id}/download-summary returns protected PDF download', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.downloadMyBookingSummary = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return {
      buffer: Buffer.from('%PDF-1.4\nmock', 'utf8'),
      contentDisposition: 'attachment; filename="booking-summary.pdf"',
      contentType: 'application/pdf',
      filename: 'booking-summary.pdf',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/download-summary`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.equal(
      response.headers['content-disposition'],
      'attachment; filename="booking-summary.pdf"',
    );
    assert.match(response.body.toString('utf8'), /%PDF-1\.4/);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    bookingService.downloadMyBookingSummary = originalDownloadMyBookingSummary;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /api/bookings/{booking_id}/download-summary validates UUID and rejects non-customer roles', async () => {
  const server = app.listen(0);

  try {
    authService.resolveAuthenticatedUser = async () =>
      createAuthContext();

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/bookings/not-a-uuid/download-summary`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(badUuidResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'admin',
        userId: 'admin-1',
      });

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/download-summary`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
