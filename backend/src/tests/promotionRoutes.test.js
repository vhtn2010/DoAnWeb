const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const promotionService = require('../services/promotionService');
const AppError = require('../utils/AppError');

const originalGetPublicPromotionById = promotionService.getPublicPromotionById;
const originalListPublicPromotions = promotionService.listPublicPromotions;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body: JSON.parse(body),
          statusCode: res.statusCode,
        });
      });
    });

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore('promotion-public');
  promotionService.getPublicPromotionById = originalGetPublicPromotionById;
  promotionService.listPublicPromotions = originalListPublicPromotions;
});

test.afterEach(() => {
  clearRateLimitStore('promotion-public');
  promotionService.getPublicPromotionById = originalGetPublicPromotionById;
  promotionService.listPublicPromotions = originalListPublicPromotions;
});

test('GET /api/promotions returns paginated public promotions without requiring a token', async () => {
  const server = app.listen(0);
  let capturedQuery;

  promotionService.listPublicPromotions = async (query) => {
    capturedQuery = query;

    return {
      meta: {
        has_next: false,
        limit: 10,
        page: 1,
        total: 1,
        total_pages: 1,
      },
      promotions: [
        {
          description: 'Tour promotion',
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Summer Escape',
          target_service_type: 'tour',
          valid_from: '2026-06-01T00:00:00.000Z',
          valid_to: '2026-07-31T23:59:59.000Z',
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/promotions?service_type=tour&active_only=true&page=1&limit=10`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Public promotions retrieved successfully',
    );
    assert.equal(response.body.meta.total, 1);
    assert.deepEqual({ ...capturedQuery }, {
      active_only: 'true',
      limit: '10',
      page: '1',
      service_type: 'tour',
    });
  } finally {
    server.close();
  }
});

test('GET /api/promotions validates service_type without requiring a token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/promotions?service_type=cruise`,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Validation failed');
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'service_type',
        message:
          'service_type must be one of: tour, hotel, room, flight, train, combo',
      },
    ]);
  } finally {
    server.close();
  }
});

test('GET /api/promotions/:promotion_id returns promotion detail without requiring a token', async () => {
  const server = app.listen(0);
  let capturedParams;

  promotionService.getPublicPromotionById = async (params) => {
    capturedParams = params;

    return {
      description: null,
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Summer Escape',
      target_service_type: null,
      valid_from: '2026-06-01T00:00:00.000Z',
      valid_to: '2026-07-31T23:59:59.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/promotions/22222222-2222-4222-8222-222222222222`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Promotion retrieved successfully');
    assert.deepEqual({ ...capturedParams }, {
      promotion_id: '22222222-2222-4222-8222-222222222222',
    });
  } finally {
    server.close();
  }
});

test('GET /api/promotions/:promotion_id returns RESOURCE_NOT_FOUND when promotion is not public', async () => {
  const server = app.listen(0);

  promotionService.getPublicPromotionById = async () => {
    throw new AppError('Promotion not found', {
      code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/promotions/33333333-3333-4333-8333-333333333333`,
    );

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
  } finally {
    server.close();
  }
});

test('GET /api/promotions returns 429 when public rate limit is exceeded', async () => {
  const server = app.listen(0);

  promotionService.listPublicPromotions = async () => ({
    meta: {
      has_next: false,
      limit: 20,
      page: 1,
      total: 0,
      total_pages: 0,
    },
    promotions: [],
  });

  try {
    let lastResponse;

    for (let index = 0; index < 61; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/promotions`);
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(
      lastResponse.body.message,
      'Too many promotion requests. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});
