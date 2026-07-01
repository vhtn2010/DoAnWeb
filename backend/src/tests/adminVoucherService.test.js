const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createAdminVoucherService } = require('../services/adminVoucherService');

test('getVouchers rejects actor without voucher.read_all permission', async () => {
  const service = createAdminVoucherService({
    queryImpl: async (sql) => {
      if (sql.includes('FROM role_permissions rp')) {
        return {
          rows: [
            {
              code: 'booking.read_all',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });

  await assert.rejects(
    () =>
      service.getVouchers({
        actor: {
          role_id: '11111111-1111-4111-8111-111111111111',
        },
        query: {},
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('getVouchers validates status filter', async () => {
  const service = createAdminVoucherService({
    queryImpl: async () => ({
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getVouchers({
        actor: {
          permissions: ['voucher.read_all'],
        },
        query: {
          status: 'pending',
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'status'),
  );
});

test('getVouchers returns filtered voucher list with pagination meta', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    queryImpl: async (sql, params) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('COUNT(*)::integer AS total')) {
        return {
          rows: [
            {
              total: 2,
            },
          ],
        };
      }

      if (sql.includes('FROM vouchers v') && sql.includes('ORDER BY v.created_at DESC')) {
        return {
          rows: [
            {
              code: 'SAVE10',
              created_at: new Date('2026-06-25T09:00:00.000Z'),
              discount_type: 'percent',
              discount_value: '10.00',
              id: '22222222-2222-4222-8222-222222222222',
              max_discount_amount: '500000.00',
              min_order_amount: '1000000.00',
              promotion_id: '33333333-3333-4333-8333-333333333333',
              promotion_name: 'Summer Sale',
              promotion_status: 'active',
              status: 'active',
              usage_limit_per_user: 1,
              usage_limit_total: 100,
              used_count: 10,
              valid_from: new Date('2026-06-01T00:00:00.000Z'),
              valid_to: new Date('2026-08-01T00:00:00.000Z'),
            },
            {
              code: 'SAVE20',
              created_at: new Date('2026-06-20T09:00:00.000Z'),
              discount_type: 'fixed_amount',
              discount_value: '200000.00',
              id: '44444444-4444-4444-8444-444444444444',
              max_discount_amount: null,
              min_order_amount: '1500000.00',
              promotion_id: '33333333-3333-4333-8333-333333333333',
              promotion_name: 'Summer Sale',
              promotion_status: 'active',
              status: 'disabled',
              usage_limit_per_user: 2,
              usage_limit_total: 50,
              used_count: 50,
              valid_from: new Date('2026-06-01T00:00:00.000Z'),
              valid_to: new Date('2026-06-30T00:00:00.000Z'),
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });

  const result = await service.getVouchers({
    actor: {
      permissions: ['voucher.read_all'],
    },
    query: {
      limit: '2',
      page: '1',
      q: 'save',
      status: 'active',
    },
  });

  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 2,
    page: 1,
    total: 2,
    total_pages: 1,
  });
  assert.equal(result.data[0].promotion.name, 'Summer Sale');
  assert.equal(result.data[0].is_expired, false);
  assert.equal(result.data[1].status, 'disabled');
  assert.deepEqual(queries[0].params, ['active', '%save%']);
});

test('getVoucherById validates voucher UUID', async () => {
  const service = createAdminVoucherService({
    queryImpl: async () => ({
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getVoucherById({
        actor: {
          permissions: ['voucher.read_all'],
        },
        voucherId: 'bad-id',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'voucher_id'),
  );
});

test('getVoucherById returns voucher detail with promotion and usage stats', async () => {
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-15T09:00:00.000Z'),
    queryImpl: async (sql, params) => {
      if (sql.includes('FROM vouchers v') && sql.includes('booking_usage_count')) {
        assert.deepEqual(params, ['55555555-5555-4555-8555-555555555555']);

        return {
          rows: [
            {
              booking_usage_count: 8,
              code: 'SAVE10',
              created_at: new Date('2026-06-20T09:00:00.000Z'),
              discount_type: 'percent',
              discount_value: '10.00',
              id: '55555555-5555-4555-8555-555555555555',
              max_discount_amount: '500000.00',
              min_order_amount: '1000000.00',
              promotion_id: '66666666-6666-4666-8666-666666666666',
              promotion_name: 'Summer Sale',
              promotion_status: 'active',
              promotion_target_service_type: 'tour',
              promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
              promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
              status: 'active',
              usage_limit_per_user: 1,
              usage_limit_total: 100,
              used_count: 100,
              valid_from: new Date('2026-06-01T00:00:00.000Z'),
              valid_to: new Date('2026-07-10T00:00:00.000Z'),
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });

  const result = await service.getVoucherById({
    actor: {
      permissions: ['voucher.read_all'],
    },
    voucherId: '55555555-5555-4555-8555-555555555555',
  });

  assert.equal(result.code, 'SAVE10');
  assert.equal(result.booking_usage_count, 8);
  assert.equal(result.is_expired, true);
  assert.equal(result.is_used_up, true);
  assert.equal(result.promotion.name, 'Summer Sale');
});

test('getVoucherById returns RESOURCE_NOT_FOUND when voucher does not exist', async () => {
  const service = createAdminVoucherService({
    queryImpl: async () => ({
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getVoucherById({
        actor: {
          permissions: ['voucher.read_all'],
        },
        voucherId: '77777777-7777-4777-8777-777777777777',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});
