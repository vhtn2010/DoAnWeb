const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createAdminVoucherService } = require('../services/adminVoucherService');

const createTransactionStub = ({
  queryImpl,
} = {}) => ({
  query: async (sql, params) => queryImpl(sql, params),
});

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

test('createVoucher inserts normalized voucher and writes user log', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql, params) => {
          queries.push({
            params,
            sql,
          });

          if (sql.includes('FROM promotions')) {
            return {
              rows: [
                {
                  id: '22222222-2222-4222-8222-222222222222',
                  name: 'Summer Sale',
                  status: 'draft',
                  target_service_type: 'tour',
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-08-01T00:00:00.000Z'),
                },
              ],
            };
          }

          if (sql.includes('FROM vouchers') && sql.includes('WHERE code = $1')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('INSERT INTO vouchers')) {
            return {
              rows: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO user_logs')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('FROM vouchers v') && sql.includes('booking_usage_count')) {
            return {
              rows: [
                {
                  booking_usage_count: 0,
                  code: 'SAVE30',
                  created_at: new Date('2026-07-01T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '30.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: null,
                  min_order_amount: '0.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'draft',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'disabled',
                  usage_limit_per_user: 1,
                  usage_limit_total: null,
                  used_count: 0,
                  valid_from: new Date('2026-07-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-31T23:59:59.000Z'),
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  const result = await service.createVoucher({
    actor: {
      permissions: ['voucher.create'],
    },
    actorUserId: 'admin-10',
    ipAddress: '127.0.0.1',
    payload: {
      code: 'save30',
      discount_type: 'percent',
      discount_value: 30,
      promotion_id: '22222222-2222-4222-8222-222222222222',
      valid_from: '2026-07-01T00:00:00.000Z',
      valid_to: '2026-07-31T23:59:59.000Z',
    },
    userAgent: 'admin-test',
  });

  assert.equal(result.code, 'SAVE30');
  assert.equal(result.status, 'disabled');
  assert.ok(
    queries.some((entry) =>
      entry.sql.includes('INSERT INTO vouchers') &&
      entry.params[1] === 'SAVE30' &&
      entry.params[8] === 0 &&
      entry.params[9] === 'disabled',
    ),
  );
  assert.ok(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
  );
});

test('updateVoucher rejects status field in PATCH payload', async () => {
  const service = createAdminVoucherService({
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async () => ({
          rows: [],
        }),
      })),
  });

  await assert.rejects(
    () =>
      service.updateVoucher({
        actor: {
          permissions: ['voucher.update'],
        },
        actorUserId: 'admin-11',
        payload: {
          status: 'disabled',
        },
        voucherId: '11111111-1111-4111-8111-111111111111',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'status'),
  );
});

test('updateVoucher updates editable fields and writes user log', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-15T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql, params) => {
          queries.push({
            params,
            sql,
          });

          if (sql.includes('FROM vouchers v') && sql.includes('FOR UPDATE OF v')) {
            return {
              rows: [
                {
                  booking_usage_count: 2,
                  code: 'SAVE10',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: null,
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'active',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 2,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-31T23:59:59.000Z'),
                },
              ],
            };
          }

          if (sql.includes('FROM promotions')) {
            return {
              rows: [
                {
                  id: '22222222-2222-4222-8222-222222222222',
                  name: 'Summer Sale',
                  status: 'active',
                  target_service_type: 'tour',
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-08-01T00:00:00.000Z'),
                },
              ],
            };
          }

          if (sql.includes('FROM vouchers') && sql.includes('WHERE code = $1')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('UPDATE vouchers')) {
            return {
              rows: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO user_logs')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('FROM vouchers v') && sql.includes('booking_usage_count')) {
            return {
              rows: [
                {
                  booking_usage_count: 2,
                  code: 'SAVE15',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '15.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: null,
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'active',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 2,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-31T23:59:59.000Z'),
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  const result = await service.updateVoucher({
    actor: {
      permissions: ['voucher.update'],
    },
    actorUserId: 'admin-12',
    ipAddress: '127.0.0.1',
    payload: {
      code: 'save15',
      discount_value: 15,
    },
    userAgent: 'admin-test',
    voucherId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.code, 'SAVE15');
  assert.ok(
    queries.some((entry) =>
      entry.sql.includes('UPDATE vouchers') &&
      entry.params[2] === 'SAVE15' &&
      entry.params[4] === 15,
    ),
  );
  assert.ok(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
  );
});

test('duplicateVoucher creates disabled copy with reset used_count', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-20T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql, params) => {
          queries.push({
            params,
            sql,
          });

          if (sql.includes('FROM vouchers v') && sql.includes('FOR UPDATE OF v')) {
            return {
              rows: [
                {
                  booking_usage_count: 7,
                  code: 'SAVE10',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: '500000.00',
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'active',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 7,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-31T23:59:59.000Z'),
                },
              ],
            };
          }

          if (sql.includes('FROM vouchers') && sql.includes('WHERE code = $1')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('FROM promotions')) {
            return {
              rows: [
                {
                  id: '22222222-2222-4222-8222-222222222222',
                  name: 'Summer Sale',
                  status: 'active',
                  target_service_type: 'tour',
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-08-01T00:00:00.000Z'),
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO vouchers')) {
            return {
              rows: [
                {
                  id: '33333333-3333-4333-8333-333333333333',
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO user_logs')) {
            return {
              rows: [],
            };
          }

          if (sql.includes('FROM vouchers v') && sql.includes('booking_usage_count')) {
            return {
              rows: [
                {
                  booking_usage_count: 0,
                  code: 'SAVE10COPY',
                  created_at: new Date('2026-07-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '33333333-3333-4333-8333-333333333333',
                  max_discount_amount: '500000.00',
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'disabled',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 0,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-31T23:59:59.000Z'),
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  const result = await service.duplicateVoucher({
    actor: {
      permissions: ['voucher.create'],
    },
    actorUserId: 'admin-13',
    ipAddress: '127.0.0.1',
    payload: {
      new_code: 'save10copy',
    },
    userAgent: 'admin-test',
    voucherId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.code, 'SAVE10COPY');
  assert.equal(result.status, 'disabled');
  assert.ok(
    queries.some((entry) =>
      entry.sql.includes('INSERT INTO vouchers') &&
      entry.params[1] === 'SAVE10COPY' &&
      entry.params[8] === 0 &&
      entry.params[9] === 'disabled',
    ),
  );
});

test('changeVoucherStatus rejects actor without update permission', async () => {
  const service = createAdminVoucherService({
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql) => {
          if (sql.includes('FROM role_permissions rp')) {
            return {
              rows: [
                {
                  code: 'voucher.read_all',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  await assert.rejects(
    () =>
      service.changeVoucherStatus({
        actor: {
          role_id: '11111111-1111-4111-8111-111111111111',
        },
        actorUserId: 'admin-1',
        payload: {
          status: 'disabled',
        },
        voucherId: '11111111-1111-4111-8111-111111111111',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('changeVoucherStatus rejects activation when voucher is expired', async () => {
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-20T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql) => {
          if (sql.includes('FROM vouchers v')) {
            return {
              rows: [
                {
                  booking_usage_count: 0,
                  code: 'SAVE10',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: '500000.00',
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'disabled',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 0,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-07-10T00:00:00.000Z'),
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  await assert.rejects(
    () =>
      service.changeVoucherStatus({
        actor: {
          permissions: ['voucher.update'],
        },
        actorUserId: 'admin-2',
        payload: {
          status: 'active',
        },
        voucherId: '11111111-1111-4111-8111-111111111111',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VOUCHER_EXPIRED &&
      error.statusCode === 400,
  );
});

test('changeVoucherStatus updates voucher status and writes user log', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql, params) => {
          queries.push({
            params,
            sql,
          });

          if (sql.includes('FROM vouchers v')) {
            if (sql.includes('FOR UPDATE OF v')) {
              return {
                rows: [
                  {
                    booking_usage_count: 0,
                    code: 'SAVE10',
                    created_at: new Date('2026-06-20T09:00:00.000Z'),
                    discount_type: 'percent',
                    discount_value: '10.00',
                    id: '11111111-1111-4111-8111-111111111111',
                    max_discount_amount: '500000.00',
                    min_order_amount: '1000000.00',
                    promotion_id: '22222222-2222-4222-8222-222222222222',
                    promotion_name: 'Summer Sale',
                    promotion_status: 'active',
                    promotion_target_service_type: 'tour',
                    promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                    promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                    status: 'disabled',
                    usage_limit_per_user: 1,
                    usage_limit_total: 100,
                    used_count: 0,
                    valid_from: new Date('2026-06-01T00:00:00.000Z'),
                    valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  },
                ],
              };
            }

            return {
              rows: [
                {
                  booking_usage_count: 0,
                  code: 'SAVE10',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: '500000.00',
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'active',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 0,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-08-01T00:00:00.000Z'),
                },
              ],
            };
          }

          if (sql.includes('UPDATE vouchers')) {
            return {
              rows: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO user_logs')) {
            return {
              rows: [],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  const result = await service.changeVoucherStatus({
    actor: {
      permissions: ['voucher.update'],
    },
    actorUserId: 'admin-3',
    ipAddress: '127.0.0.1',
    payload: {
      status: 'active',
    },
    userAgent: 'admin-test',
    voucherId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.status, 'active');
  assert.ok(
    queries.some((entry) => entry.sql.includes('UPDATE vouchers')),
  );
  assert.ok(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
  );
});

test('deleteVoucher validates required reason and disables voucher', async () => {
  const queries = [];
  const service = createAdminVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(createTransactionStub({
        queryImpl: async (sql, params) => {
          queries.push({
            params,
            sql,
          });

          if (sql.includes('FROM vouchers v')) {
            if (sql.includes('FOR UPDATE OF v')) {
              return {
                rows: [
                  {
                    booking_usage_count: 5,
                    code: 'SAVE10',
                    created_at: new Date('2026-06-20T09:00:00.000Z'),
                    discount_type: 'percent',
                    discount_value: '10.00',
                    id: '11111111-1111-4111-8111-111111111111',
                    max_discount_amount: '500000.00',
                    min_order_amount: '1000000.00',
                    promotion_id: '22222222-2222-4222-8222-222222222222',
                    promotion_name: 'Summer Sale',
                    promotion_status: 'active',
                    promotion_target_service_type: 'tour',
                    promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                    promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                    status: 'active',
                    usage_limit_per_user: 1,
                    usage_limit_total: 100,
                    used_count: 25,
                    valid_from: new Date('2026-06-01T00:00:00.000Z'),
                    valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  },
                ],
              };
            }

            return {
              rows: [
                {
                  booking_usage_count: 5,
                  code: 'SAVE10',
                  created_at: new Date('2026-06-20T09:00:00.000Z'),
                  discount_type: 'percent',
                  discount_value: '10.00',
                  id: '11111111-1111-4111-8111-111111111111',
                  max_discount_amount: '500000.00',
                  min_order_amount: '1000000.00',
                  promotion_id: '22222222-2222-4222-8222-222222222222',
                  promotion_name: 'Summer Sale',
                  promotion_status: 'active',
                  promotion_target_service_type: 'tour',
                  promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  status: 'disabled',
                  usage_limit_per_user: 1,
                  usage_limit_total: 100,
                  used_count: 25,
                  valid_from: new Date('2026-06-01T00:00:00.000Z'),
                  valid_to: new Date('2026-08-01T00:00:00.000Z'),
                },
              ],
            };
          }

          if (sql.includes('UPDATE vouchers')) {
            return {
              rows: [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                },
              ],
            };
          }

          if (sql.includes('INSERT INTO user_logs')) {
            return {
              rows: [],
            };
          }

          throw new Error(`Unexpected SQL: ${sql}`);
        },
      })),
  });

  const result = await service.deleteVoucher({
    actor: {
      permissions: ['voucher.delete'],
    },
    actorUserId: 'admin-4',
    ipAddress: '127.0.0.1',
    payload: {
      reason: 'Campaign ended early',
    },
    userAgent: 'admin-test',
    voucherId: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    code: 'SAVE10',
    id: '11111111-1111-4111-8111-111111111111',
    reason: 'Campaign ended early',
    status: 'disabled',
  });
  assert.ok(
    queries.some((entry) => entry.sql.includes('UPDATE vouchers')),
  );
  assert.ok(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
  );
});
