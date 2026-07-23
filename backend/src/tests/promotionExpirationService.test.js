const assert = require('node:assert/strict');
const test = require('node:test');

const {
  syncExpiredPromotionStatuses,
} = require('../services/promotionExpirationService');

test('syncExpiredPromotionStatuses expires ended promotions and their vouchers', async () => {
  const currentTime = new Date('2026-07-23T10:00:00.000Z');
  let capturedSql;
  let capturedParams;

  const result = await syncExpiredPromotionStatuses({
    currentTime,
    queryImpl: async (sql, params) => {
      capturedSql = sql;
      capturedParams = params;

      return {
        rows: [
          {
            promotion_count: 2,
            voucher_count: 5,
          },
        ],
      };
    },
  });

  assert.match(capturedSql, /UPDATE promotions/);
  assert.match(capturedSql, /status IN \('draft', 'active', 'paused'\)/);
  assert.match(capturedSql, /valid_to <= \$1/);
  assert.match(capturedSql, /UPDATE vouchers/);
  assert.deepEqual(capturedParams, [currentTime]);
  assert.deepEqual(result, {
    promotionCount: 2,
    voucherCount: 5,
  });
});
