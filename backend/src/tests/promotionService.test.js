const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createPromotionService } = require('../services/promotionService');

const createPromotionRow = ({
  description = 'Summer deals',
  id = '11111111-1111-4111-8111-111111111111',
  name = 'Summer Escape',
  status = 'active',
  targetServiceType = 'tour',
  validFrom = new Date('2026-06-01T00:00:00.000Z'),
  validTo = new Date('2026-07-31T23:59:59.000Z'),
} = {}) => ({
  description,
  id,
  name,
  status,
  target_service_type: targetServiceType,
  valid_from: validFrom,
  valid_to: validTo,
});

test('listPublicPromotions defaults active_only to true and returns paginated public promotions', async () => {
  const currentTime = new Date('2026-07-01T09:00:00.000Z');
  let capturedFilters;
  const service = createPromotionService({
    now: () => currentTime,
    repository: {
      listPublicPromotions: async (filters) => {
        capturedFilters = filters;

        return {
          rows: [
            createPromotionRow({
              targetServiceType: 'tour',
            }),
            createPromotionRow({
              id: '22222222-2222-4222-8222-222222222222',
              status: 'paused',
            }),
            createPromotionRow({
              id: '33333333-3333-4333-8333-333333333333',
              targetServiceType: 'hotel',
            }),
          ],
          total: 1,
        };
      },
    },
  });

  const result = await service.listPublicPromotions({
    limit: '10',
    page: '2',
    service_type: 'tour',
  });

  assert.equal(capturedFilters.currentTime, currentTime);
  assert.equal(capturedFilters.limit, 10);
  assert.equal(capturedFilters.offset, 10);
  assert.equal(capturedFilters.serviceType, 'tour');
  assert.deepEqual(result, {
    meta: {
      has_next: false,
      limit: 10,
      page: 2,
      total: 1,
      total_pages: 1,
    },
    promotions: [
      {
        description: 'Summer deals',
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Summer Escape',
        target_service_type: 'tour',
        valid_from: '2026-06-01T00:00:00.000Z',
        valid_to: '2026-07-31T23:59:59.000Z',
      },
    ],
  });
});

test('listPublicPromotions keeps public-only visibility even when active_only=false', async () => {
  const currentTime = new Date('2026-07-01T09:00:00.000Z');
  const service = createPromotionService({
    now: () => currentTime,
    repository: {
      listPublicPromotions: async () => ({
        rows: [
          createPromotionRow({
            id: '44444444-4444-4444-8444-444444444444',
            status: 'draft',
          }),
          createPromotionRow({
            id: '55555555-5555-4555-8555-555555555555',
            targetServiceType: null,
          }),
          createPromotionRow({
            id: '66666666-6666-4666-8666-666666666666',
            validTo: new Date('2026-06-30T23:59:59.000Z'),
          }),
        ],
        total: 1,
      }),
    },
  });

  const result = await service.listPublicPromotions({
    active_only: 'false',
    service_type: 'tour',
  });

  assert.deepEqual(result.promotions, [
    {
      description: 'Summer deals',
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Summer Escape',
      target_service_type: null,
      valid_from: '2026-06-01T00:00:00.000Z',
      valid_to: '2026-07-31T23:59:59.000Z',
    },
  ]);
});

test('listPublicPromotions rejects invalid service_type', async () => {
  const service = createPromotionService({
    repository: {
      listPublicPromotions: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.listPublicPromotions({
        service_type: 'cruise',
      }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'service_type',
          message:
            'service_type must be one of: tour, hotel, room, flight, train, combo',
        },
      ]);
      return true;
    },
  );
});

test('getPublicPromotionById returns mapped promotion detail', async () => {
  const currentTime = new Date('2026-07-01T09:00:00.000Z');
  let capturedPromotionId;
  const service = createPromotionService({
    now: () => currentTime,
    repository: {
      getPublicPromotionById: async ({ promotionId }) => {
        capturedPromotionId = promotionId;

        return createPromotionRow({
          description: null,
          id: promotionId,
          targetServiceType: null,
        });
      },
    },
  });

  const result = await service.getPublicPromotionById({
    promotion_id: '77777777-7777-4777-8777-777777777777',
  });

  assert.equal(capturedPromotionId, '77777777-7777-4777-8777-777777777777');
  assert.deepEqual(result, {
    description: null,
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Summer Escape',
    target_service_type: null,
    valid_from: '2026-06-01T00:00:00.000Z',
    valid_to: '2026-07-31T23:59:59.000Z',
  });
});

test('getPublicPromotionById returns RESOURCE_NOT_FOUND for missing or non-public promotions', async () => {
  const currentTime = new Date('2026-07-01T09:00:00.000Z');
  const service = createPromotionService({
    now: () => currentTime,
    repository: {
      getPublicPromotionById: async () =>
        createPromotionRow({
          status: 'paused',
        }),
    },
  });

  await assert.rejects(
    () =>
      service.getPublicPromotionById({
        promotion_id: '88888888-8888-4888-8888-888888888888',
      }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});
