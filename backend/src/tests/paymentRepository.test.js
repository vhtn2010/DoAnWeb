const assert = require('node:assert/strict');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const {
  createPaymentRepository,
} = require('../database/paymentRepository');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PAYMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('createPaymentRepository.createDirectPayment falls back to legacy bank_transfer for older payment constraints', async () => {
  const insertedMethods = [];
  let loggedMetadata = null;

  const client = {
    async query(text, params = []) {
      const sql = String(text);

      if (
        sql === 'BEGIN' ||
        sql === 'COMMIT' ||
        sql === 'ROLLBACK' ||
        sql.includes('SELECT set_config') ||
        sql.includes('SELECT pg_advisory_xact_lock')
      ) {
        return { rows: [] };
      }

      if (sql.includes('FROM bookings')) {
        return {
          rows: [
            {
              booking_code: 'BK202607130001',
              created_at: '2026-07-13T08:00:00.000Z',
              currency: 'VND',
              expires_at: '2099-07-14T08:00:00.000Z',
              id: BOOKING_ID,
              status: 'pending_payment',
              total_amount: '4500000',
              updated_at: '2026-07-13T08:00:00.000Z',
              user_id: USER_ID,
            },
          ],
        };
      }

      if (sql.includes('FROM user_logs ul')) {
        return { rows: [] };
      }

      if (
        sql.includes('FROM payments') &&
        sql.includes("provider = 'direct'") &&
        sql.includes("status = 'pending'")
      ) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO payments')) {
        insertedMethods.push(params[2]);

        if (params[2] === 'manual_bank_transfer') {
          const error = new Error(
            'new row for relation "payments" violates check constraint "chk_payments_method"',
          );

          error.code = '23514';
          error.constraint = 'chk_payments_method';
          throw error;
        }

        return {
          rows: [
            {
              amount: String(params[3]),
              booking_id: BOOKING_ID,
              created_at: '2026-07-13T08:00:00.000Z',
              currency: params[4],
              expired_at: params[6],
              id: PAYMENT_ID,
              paid_at: null,
              payment_code: params[1],
              payment_method: params[2],
              provider: 'direct',
              raw_response: params[5],
              status: 'pending',
              updated_at: '2026-07-13T08:00:00.000Z',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        loggedMetadata = params[4];
        return { rows: [] };
      }

      throw new Error(`Unexpected query in test: ${sql}`);
    },
    release() {
      return undefined;
    },
  };

  const repository = createPaymentRepository({
    getPoolImpl: () => ({
      connect: async () => client,
    }),
    queryImpl: async () => {
      throw new Error('queryImpl should not be used inside createDirectPayment transaction');
    },
  });

  const result = await repository.createDirectPayment({
    actorUserId: USER_ID,
    amount: 4500000,
    bookingCode: 'BK202607130001',
    bookingId: BOOKING_ID,
    currency: 'VND',
    expiredAt: '2099-07-14T08:00:00.000Z',
    idempotencyKey: 'direct-payment-001',
    note: 'Thanh toán chuyển khoản trong ngày',
    payerName: 'Nguyen Van A',
    payerPhone: '0909000000',
    paymentCode: 'PAY20260713ABCD1234',
    paymentMethod: 'manual_bank_transfer',
  });

  assert.deepEqual(insertedMethods, [
    'manual_bank_transfer',
    'bank_transfer',
  ]);
  assert.equal(result.created, true);
  assert.equal(result.payment.payment_method, 'bank_transfer');
  assert.equal(
    result.payment.raw_response.direct_payment.requested_method,
    'manual_bank_transfer',
  );
  assert.equal(
    result.payment.raw_response.direct_payment.stored_method,
    'bank_transfer',
  );
  assert.equal(loggedMetadata.payment_method, 'manual_bank_transfer');
  assert.equal(loggedMetadata.stored_payment_method, 'bank_transfer');
});
