const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  createAdminPromotionService,
} = require('../services/adminPromotionService');

const createTransactionStub = ({
  queryImpl,
} = {}) => ({
  query: async (sql, params) => queryImpl(sql, params),
});

const createPromotionRow = ({
  activeVoucherCount = 1,
  createdAt = new Date('2026-07-01T09:00:00.000Z'),
  createdBy = '11111111-1111-4111-8111-111111111111',
  creatorEmail = 'staff@example.com',
  creatorFullName = 'Staff User',
  description = 'Summer promotion',
  id = '22222222-2222-4222-8222-222222222222',
  name = 'Summer Sale',
  status = 'draft',
  targetServiceType = 'tour',
  updatedAt = new Date('2026-07-01T09:00:00.000Z'),
  validFrom = new Date('2026-07-05T00:00:00.000Z'),
  validTo = new Date('2026-08-01T00:00:00.000Z'),
  voucherCount = 2,
} = {}) => ({
  active_voucher_count: activeVoucherCount,
  created_at: createdAt,
  created_by: createdBy,
  creator_email: creatorEmail,
  creator_full_name: creatorFullName,
  description,
  id,
  name,
  status,
  target_service_type: targetServiceType,
  updated_at: updatedAt,
  valid_from: validFrom,
  valid_to: validTo,
  voucher_count: voucherCount,
});

test('getPromotions rejects actor without promotion permissions', async () => {
  const service = createAdminPromotionService({
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
      service.getPromotions({
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

test('getPromotions validates status filter', async () => {
  const service = createAdminPromotionService({
    queryImpl: async () => ({
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getPromotions({
        actor: {
          permissions: ['promotion.update'],
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

test('getPromotions returns all promotion statuses with pagination meta', async () => {
  const queries = [];
  const service = createAdminPromotionService({
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

      if (sql.includes('FROM promotions p') && sql.includes('ORDER BY p.created_at DESC')) {
        return {
          rows: [
            createPromotionRow({
              id: '22222222-2222-4222-8222-222222222222',
              status: 'active',
            }),
            createPromotionRow({
              id: '33333333-3333-4333-8333-333333333333',
              status: 'cancelled',
            }),
          ],
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  });

  const result = await service.getPromotions({
    actor: {
      permissions: ['promotion.update'],
    },
    query: {
      limit: '2',
      page: '1',
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
  assert.equal(result.data[0].status, 'active');
  assert.equal(result.data[1].status, 'cancelled');
  assert.deepEqual(queries[0].params, ['active']);
});

test('getPromotionById returns RESOURCE_NOT_FOUND when promotion does not exist', async () => {
  const service = createAdminPromotionService({
    queryImpl: async () => ({
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getPromotionById({
        actor: {
          permissions: ['promotion.create'],
        },
        promotionId: '44444444-4444-4444-8444-444444444444',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('createPromotion inserts record and writes user log', async () => {
  const queries = [];
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql, params) => {
            queries.push({
              params,
              sql,
            });

            if (sql.includes('INSERT INTO promotions')) {
              return {
                rows: [
                  {
                    id: '55555555-5555-4555-8555-555555555555',
                  },
                ],
              };
            }

            if (sql.includes('INSERT INTO user_logs')) {
              return {
                rows: [],
              };
            }

            if (sql.includes('FROM promotions p') && sql.includes('voucher_count')) {
              return {
                rows: [
                  createPromotionRow({
                    createdBy: '99999999-9999-4999-8999-999999999999',
                    id: '55555555-5555-4555-8555-555555555555',
                    status: 'draft',
                  }),
                ],
              };
            }

            throw new Error(`Unexpected SQL: ${sql}`);
          },
        }),
      ),
  });

  const result = await service.createPromotion({
    actor: {
      permissions: ['promotion.create'],
    },
    actorUserId: '99999999-9999-4999-8999-999999999999',
    ipAddress: '127.0.0.1',
    payload: {
      description: '  Summer promotion  ',
      name: '  Summer Sale  ',
      status: 'draft',
      target_service_type: 'tour',
      valid_from: '2026-07-05T00:00:00.000Z',
      valid_to: '2026-08-01T00:00:00.000Z',
    },
    userAgent: 'node-test',
  });

  assert.equal(result.id, '55555555-5555-4555-8555-555555555555');
  assert.equal(result.name, 'Summer Sale');
  assert.equal(result.created_by, '99999999-9999-4999-8999-999999999999');
  assert.equal(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
    true,
  );
});

test('createPromotion rejects expired or cancelled create status', async () => {
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async () => ({
            rows: [],
          }),
        }),
      ),
  });

  await assert.rejects(
    () =>
      service.createPromotion({
        actor: {
          permissions: ['promotion.create'],
        },
        actorUserId: '11111111-1111-4111-8111-111111111111',
        payload: {
          name: 'Summer Sale',
          status: 'expired',
          valid_from: '2026-07-05T00:00:00.000Z',
          valid_to: '2026-08-01T00:00:00.000Z',
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'status'),
  );
});

test('updatePromotion rejects cancelled promotion updates', async () => {
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql) => {
            if (sql.includes('FROM promotions p') && sql.includes('FOR UPDATE OF p')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'cancelled',
                  }),
                ],
              };
            }

            throw new Error(`Unexpected SQL: ${sql}`);
          },
        }),
      ),
  });

  await assert.rejects(
    () =>
      service.updatePromotion({
        actor: {
          permissions: ['promotion.update'],
        },
        actorUserId: '11111111-1111-4111-8111-111111111111',
        payload: {
          name: 'Updated Sale',
        },
        promotionId: '22222222-2222-4222-8222-222222222222',
      }),
    (error) =>
      error.code === API_ERROR_CODES.INVALID_STATE_TRANSITION &&
      error.statusCode === 400,
  );
});

test('updatePromotion rejects narrowing window when active vouchers fall outside', async () => {
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql) => {
            if (sql.includes('FROM promotions p') && sql.includes('FOR UPDATE OF p')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'active',
                    validFrom: new Date('2026-07-01T00:00:00.000Z'),
                    validTo: new Date('2026-08-01T00:00:00.000Z'),
                  }),
                ],
              };
            }

            if (sql.includes('FROM vouchers') && sql.includes("status = 'active'")) {
              return {
                rows: [
                  {
                    code: 'SAVE10',
                    id: '66666666-6666-4666-8666-666666666666',
                    valid_from: new Date('2026-07-01T00:00:00.000Z'),
                    valid_to: new Date('2026-08-01T00:00:00.000Z'),
                  },
                ],
              };
            }

            throw new Error(`Unexpected SQL: ${sql}`);
          },
        }),
      ),
  });

  await assert.rejects(
    () =>
      service.updatePromotion({
        actor: {
          permissions: ['promotion.update'],
        },
        actorUserId: '11111111-1111-4111-8111-111111111111',
        payload: {
          valid_to: '2026-07-15T00:00:00.000Z',
        },
        promotionId: '22222222-2222-4222-8222-222222222222',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'valid_from'),
  );
});

test('deletePromotion is idempotent for already cancelled promotion', async () => {
  const queries = [];
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql, params) => {
            queries.push({
              params,
              sql,
            });

            if (sql.includes('FROM promotions p') && sql.includes('FOR UPDATE OF p')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'cancelled',
                  }),
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
        }),
      ),
  });

  const result = await service.deletePromotion({
    actor: {
      permissions: ['promotion.delete'],
    },
    actorUserId: '11111111-1111-4111-8111-111111111111',
    payload: {
      reason: 'No longer valid',
    },
    promotionId: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(result.status, 'cancelled');
  assert.equal(
    queries.some((entry) => entry.sql.includes('UPDATE promotions')),
    false,
  );
});

test('changePromotionStatus rejects invalid transition from cancelled to active', async () => {
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql) => {
            if (sql.includes('FROM promotions p') && sql.includes('FOR UPDATE OF p')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'cancelled',
                  }),
                ],
              };
            }

            throw new Error(`Unexpected SQL: ${sql}`);
          },
        }),
      ),
  });

  await assert.rejects(
    () =>
      service.changePromotionStatus({
        actor: {
          permissions: ['promotion.update'],
        },
        actorUserId: '11111111-1111-4111-8111-111111111111',
        payload: {
          status: 'active',
        },
        promotionId: '22222222-2222-4222-8222-222222222222',
      }),
    (error) =>
      error.code === API_ERROR_CODES.INVALID_STATE_TRANSITION &&
      error.statusCode === 400,
  );
});

test('changePromotionStatus updates status and writes audit log', async () => {
  const queries = [];
  const service = createAdminPromotionService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    withTransactionImpl: async (callback) =>
      callback(
        createTransactionStub({
          queryImpl: async (sql, params) => {
            queries.push({
              params,
              sql,
            });

            if (sql.includes('FROM promotions p') && sql.includes('FOR UPDATE OF p')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'paused',
                  }),
                ],
              };
            }

            if (sql.includes('UPDATE promotions') && sql.includes('status = $2')) {
              return {
                rows: [
                  {
                    id: '22222222-2222-4222-8222-222222222222',
                  },
                ],
              };
            }

            if (sql.includes('INSERT INTO user_logs')) {
              return {
                rows: [],
              };
            }

            if (sql.includes('FROM promotions p') && sql.includes('voucher_count')) {
              return {
                rows: [
                  createPromotionRow({
                    status: 'active',
                  }),
                ],
              };
            }

            throw new Error(`Unexpected SQL: ${sql}`);
          },
        }),
      ),
  });

  const result = await service.changePromotionStatus({
    actor: {
      permissions: ['promotion.update'],
    },
    actorUserId: '11111111-1111-4111-8111-111111111111',
    payload: {
      status: 'active',
    },
    promotionId: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(result.status, 'active');
  assert.equal(
    queries.some((entry) => entry.sql.includes('INSERT INTO user_logs')),
    true,
  );
});
