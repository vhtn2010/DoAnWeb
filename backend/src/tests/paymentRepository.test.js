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
  const insertedAttempts = [];
  let loggedMetadata = null;
  let transactionAborted = false;
  let rolledBackToSavepoint = false;

  const client = {
    async query(text, params = []) {
      const sql = String(text);

      if (transactionAborted) {
        if (sql.startsWith('ROLLBACK TO SAVEPOINT ')) {
          transactionAborted = false;
          rolledBackToSavepoint = true;
          return { rows: [] };
        }

        if (sql === 'ROLLBACK') {
          transactionAborted = false;
          return { rows: [] };
        }

        throw new Error('current transaction is aborted, commands ignored until end of transaction block');
      }

      if (
        sql === 'BEGIN' ||
        sql === 'COMMIT' ||
        sql === 'ROLLBACK' ||
        sql.startsWith('SAVEPOINT ') ||
        sql.startsWith('RELEASE SAVEPOINT ') ||
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
        sql.includes("raw_response ? 'direct_payment'") &&
        sql.includes("status = 'pending'")
      ) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO payments')) {
        insertedAttempts.push({
          paymentMethod: params[3],
          provider: params[2],
        });

        if (params[2] === 'direct' && params[3] === 'manual_bank_transfer') {
          const error = new Error(
            'new row for relation "payments" violates check constraint "chk_payments_method"',
          );

          error.code = '23514';
          error.constraint = 'chk_payments_method';
          transactionAborted = true;
          throw error;
        }

        if (params[2] === 'direct' && params[3] === 'bank_transfer') {
          const error = new Error(
            'new row for relation "payments" violates check constraint "chk_payments_provider"',
          );

          error.code = '23514';
          error.constraint = 'chk_payments_provider';
          transactionAborted = true;
          throw error;
        }

        return {
          rows: [
            {
              amount: String(params[4]),
              booking_id: BOOKING_ID,
              created_at: '2026-07-13T08:00:00.000Z',
              currency: params[5],
              expired_at: params[7],
              id: PAYMENT_ID,
              paid_at: null,
              payment_code: params[1],
              payment_method: params[3],
              provider: params[2],
              raw_response: params[6],
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

  assert.deepEqual(insertedAttempts, [
    {
      paymentMethod: 'manual_bank_transfer',
      provider: 'direct',
    },
    {
      paymentMethod: 'bank_transfer',
      provider: 'direct',
    },
    {
      paymentMethod: 'manual_bank_transfer',
      provider: 'bank_transfer',
    },
  ]);
  assert.equal(rolledBackToSavepoint, true);
  assert.equal(result.created, true);
  assert.equal(result.payment.payment_method, 'manual_bank_transfer');
  assert.equal(result.payment.provider, 'bank_transfer');
  assert.equal(
    result.payment.raw_response.direct_payment.requested_method,
    'manual_bank_transfer',
  );
  assert.equal(
    result.payment.raw_response.direct_payment.stored_method,
    'manual_bank_transfer',
  );
  assert.equal(
    result.payment.raw_response.direct_payment.requested_provider,
    'direct',
  );
  assert.equal(
    result.payment.raw_response.direct_payment.stored_provider,
    'bank_transfer',
  );
  assert.equal(loggedMetadata.payment_method, 'manual_bank_transfer');
  assert.equal(loggedMetadata.stored_payment_method, 'manual_bank_transfer');
  assert.equal(loggedMetadata.payment_provider, 'direct');
  assert.equal(loggedMetadata.stored_provider, 'bank_transfer');
});
