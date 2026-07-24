const assert = require('node:assert/strict');
const test = require('node:test');
const {
  WELCOME_PROMOTION_CODE,
  WELCOME_VOUCHER_CODE,
  createCustomerSurveyService,
} = require('../services/customerSurveyService');

const FIXED_NOW = new Date('2026-07-24T08:00:00.000Z');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROMOTION_ID = '4e6bf0ba-0000-4000-8000-000000000000';
const TEMPLATE_VOUCHER_ID = '22222222-2222-4222-8222-222222222222';
const SURVEY_ID = '44444444-4444-4444-8444-444444444444';

function createValidSurveyPayload() {
  return {
    budget_range: '5m_10m',
    discovery_source: 'social_media',
    favorite_destinations: ['beach', 'heritage_city'],
    loyalty_intent: 'likely',
    nationality: 'Việt Nam',
    preferred_contact_channel: 'zalo',
    residence_location: 'TP. Hồ Chí Minh',
    travel_forms: ['family'],
    travel_styles: ['relaxing', 'food'],
  };
}

function createCustomerSurveyTransactionStub({ existingSurvey = false } = {}) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ params, sql });
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();

      if (normalizedSql.includes('FROM users')) {
        return {
          rows: [
            {
              deleted_at: null,
              id: USER_ID,
              status: 'active',
            },
          ],
        };
      }

      if (normalizedSql.includes('FROM customer_surveys')) {
        if (!existingSurvey) {
          return { rows: [] };
        }

        return {
          rows: [
            {
              code: WELCOME_VOUCHER_CODE,
              completed_at: FIXED_NOW,
              discount_type: 'fixed',
              discount_value: '150000',
              max_discount_amount: null,
              min_order_amount: '0',
              promotion_id: PROMOTION_ID,
              promotion_name: 'Chào Mừng Thành Viên Mới',
              status: 'active',
              survey_id: SURVEY_ID,
              valid_from: FIXED_NOW,
              valid_to: new Date('2045-12-31T16:59:59.000Z'),
              voucher_id: TEMPLATE_VOUCHER_ID,
            },
          ],
        };
      }

      if (normalizedSql.includes('FROM promotions')) {
        return {
          rows: [
            {
              id: PROMOTION_ID,
              name: 'Chào Mừng Thành Viên Mới',
              status: 'active',
              target_service_type: 'all',
              valid_from: FIXED_NOW,
              valid_to: new Date('2045-12-31T16:59:59.000Z'),
            },
          ],
        };
      }

      if (normalizedSql.includes('FROM vouchers')) {
        return {
          rows: [
            {
              code: WELCOME_VOUCHER_CODE,
              discount_type: 'percent',
              discount_value: '15',
              id: TEMPLATE_VOUCHER_ID,
              max_discount_amount: '100000',
              min_order_amount: '100000',
              promotion_id: PROMOTION_ID,
              status: 'active',
              valid_from: FIXED_NOW,
              valid_to: new Date('2045-12-31T16:59:59.000Z'),
            },
          ],
        };
      }

      if (normalizedSql.includes('INSERT INTO customer_surveys')) {
        return {
          rows: [
            {
              completed_at: params[17],
              id: SURVEY_ID,
              promotion_id: params[1],
            },
          ],
        };
      }

      if (
        normalizedSql.includes('INSERT INTO user_saved_vouchers') ||
        normalizedSql.includes('INSERT INTO user_logs')
      ) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${normalizedSql}`);
    },
  };

  return { calls, client };
}

test('submitCurrentSurvey stores structured survey data and saves the active welcome voucher', async () => {
  const transaction = createCustomerSurveyTransactionStub();
  const service = createCustomerSurveyService({
    now: () => FIXED_NOW,
    withTransactionImpl: async (callback) => callback(transaction.client),
  });

  const result = await service.submitCurrentSurvey({
    ipAddress: '127.0.0.1',
    payload: createValidSurveyPayload(),
    userAgent: 'node:test',
    userId: USER_ID,
  });

  assert.equal(result.completed, true);
  assert.equal(result.promotion.code, WELCOME_PROMOTION_CODE);
  assert.equal(result.promotion.id, PROMOTION_ID);
  assert.equal(result.voucher.id, TEMPLATE_VOUCHER_ID);
  assert.equal(result.voucher.code, WELCOME_VOUCHER_CODE);

  const insertVoucherCall = transaction.calls.find((call) =>
    call.sql.includes('INSERT INTO vouchers'),
  );
  const insertSurveyCall = transaction.calls.find((call) =>
    call.sql.includes('INSERT INTO customer_surveys'),
  );
  const saveVoucherCall = transaction.calls.find((call) =>
    call.sql.includes('INSERT INTO user_saved_vouchers'),
  );
  const logCall = transaction.calls.find((call) =>
    call.sql.includes('INSERT INTO user_logs'),
  );

  assert.equal(insertVoucherCall, undefined);
  assert.equal(insertSurveyCall.params[0], USER_ID);
  assert.equal(insertSurveyCall.params[1], PROMOTION_ID);
  assert.equal(insertSurveyCall.params[2], TEMPLATE_VOUCHER_ID);
  assert.deepEqual(insertSurveyCall.params[7], ['relaxing', 'food']);
  assert.deepEqual(insertSurveyCall.params[9], ['beach', 'heritage_city']);
  assert.deepEqual(insertSurveyCall.params[12], ['family']);
  assert.equal(saveVoucherCall.params[0], USER_ID);
  assert.equal(saveVoucherCall.params[1], TEMPLATE_VOUCHER_ID);
  assert.equal(logCall.params[1], 'customer.survey.complete');
});

test('submitCurrentSurvey rejects a second completion before creating another voucher', async () => {
  const transaction = createCustomerSurveyTransactionStub({ existingSurvey: true });
  const service = createCustomerSurveyService({
    now: () => FIXED_NOW,
    withTransactionImpl: async (callback) => callback(transaction.client),
  });

  await assert.rejects(
    () =>
      service.submitCurrentSurvey({
        payload: createValidSurveyPayload(),
        userId: USER_ID,
      }),
    {
      code: 'DUPLICATE_RESOURCE',
    },
  );

  assert.equal(
    transaction.calls.some((call) => call.sql.includes('INSERT INTO vouchers')),
    false,
  );
});
