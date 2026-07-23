const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const reviewService = require('../services/reviewService');
const authService = require('../services/authService');
const { apiPrefix } = require('../config');
const { createAccessToken } = require('../utils/sessionToken');

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body;
    const headers = {
      Connection: 'close',
      ...(options.headers || {}),
    };

    if (
      typeof body === 'string' &&
      !Object.keys(headers).some((key) => key.toLowerCase() === 'content-length')
    ) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        agent: false,
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

    if (body) {
      req.write(body);
    }

    req.on('error', reject);
    req.end();
  });

const originalListServiceReviews = reviewService.listServiceReviews;
const originalCompleteBooking = reviewService.completeBooking;
const originalCreateBookingReview = reviewService.createBookingReview;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const serviceId = '33333333-3333-4333-8333-333333333333';
const bookingId = '11111111-1111-4111-8111-111111111111';

test.afterEach(() => {
  reviewService.completeBooking = originalCompleteBooking;
  reviewService.createBookingReview = originalCreateBookingReview;
  reviewService.listServiceReviews = originalListServiceReviews;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test('GET /api/services/{service_id}/reviews returns public review summary', async () => {
  reviewService.listServiceReviews = async () => ({
    items: [{ id: 'review-1', rating_value: 5 }],
    meta: {
      has_next: false,
      limit: 12,
      page: 1,
      total: 1,
      total_pages: 1,
    },
    summary: {
      average_rating: 5,
      review_count: 1,
    },
  });
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/${serviceId}/reviews`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data[0].rating_value, 5);
    assert.equal(response.body.meta.summary.review_count, 1);
  } finally {
    server.close();
  }
});

test('POST review and completion routes require customer authentication', async () => {
  const server = app.listen(0);

  try {
    const [completeResponse, reviewResponse] = await Promise.all([
      request(server, `${apiPrefix}/bookings/${bookingId}/complete`, {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      request(server, `${apiPrefix}/bookings/${bookingId}/reviews`, {
        body: JSON.stringify({
          booking_item_id: '22222222-2222-4222-8222-222222222222',
          comment: 'Một chuyến đi rất đáng nhớ.',
          rating: 5,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    ]);

    assert.equal(completeResponse.statusCode, 401);
    assert.equal(reviewResponse.statusCode, 401);
  } finally {
    server.close();
  }
});

test('POST completion and review routes accept an authenticated customer', async () => {
  const userId = '44444444-4444-4444-8444-444444444444';
  const bookingItemId = '22222222-2222-4222-8222-222222222222';
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId,
  });
  let completionContext;
  let reviewContext;

  authService.resolveAuthenticatedUser = async () => ({
    permissions: ['booking.read_self'],
    roleCode: 'customer',
    tokenId: 'review-route-token',
    user: {
      email: 'customer@example.com',
      id: userId,
      role_code: 'customer',
      status: 'active',
    },
    userId,
  });
  reviewService.completeBooking = async (context) => {
    completionContext = context;
    return {
      booking_code: 'BK-REVIEW',
      id: bookingId,
      status: 'completed',
    };
  };
  reviewService.createBookingReview = async (context) => {
    reviewContext = context;
    return {
      booking_item_id: bookingItemId,
      id: '55555555-5555-4555-8555-555555555555',
      rating: 5,
    };
  };

  const server = app.listen(0);

  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
    const completeResponse = await request(
      server,
      `${apiPrefix}/bookings/${bookingId}/complete`,
      {
        body: '{}',
        headers,
        method: 'POST',
      },
    );
    const reviewResponse = await request(
      server,
      `${apiPrefix}/bookings/${bookingId}/reviews`,
      {
        body: JSON.stringify({
          booking_item_id: bookingItemId,
          comment: 'Một chuyến đi rất đáng nhớ.',
          rating: 5,
        }),
        headers,
        method: 'POST',
      },
    );

    assert.equal(completeResponse.statusCode, 200);
    assert.equal(completeResponse.body.data.status, 'completed');
    assert.equal(reviewResponse.statusCode, 201);
    assert.equal(reviewResponse.body.data.rating, 5);
    assert.equal(completionContext.auth.userId, userId);
    assert.equal(reviewContext.body.booking_item_id, bookingItemId);
  } finally {
    server.close();
  }
});
