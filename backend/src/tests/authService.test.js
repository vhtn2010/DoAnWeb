const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');

const {
  AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
  createAuthService,
} = require('../services/authService');
const {
  API_ERROR_CODES,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');

const fixedNow = new Date('2026-06-30T00:00:00.000Z');

const createService = (options = {}) =>
  createAuthService({
    createEmailVerificationTokenImpl:
      options.createEmailVerificationTokenImpl ||
      (() => 'verify-token'),
    now: options.now || (() => fixedNow),
    sendEmailImpl:
      options.sendEmailImpl ||
      (async () => ({
        accepted: true,
        messageId: 'sg-message-1',
      })),
    withTransactionImpl:
      options.withTransactionImpl ||
      (async (callback) => callback(options.client)),
  });

test('register creates a pending customer account and writes email and user logs', async () => {
  const queries = [];
  let capturedEmailPayload;
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users') && sql.includes('WHERE email = $1')) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'customer',
              id: 'role-customer-1',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO users')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              phone: '0909000000',
              status: USER_STATUS.PENDING_VERIFICATION,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO email_logs')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 'email-log-1',
            },
          ],
        };
      }

      if (sql.includes('UPDATE email_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createService({
    client,
    sendEmailImpl: async (payload) => {
      capturedEmailPayload = payload;

      return {
        accepted: true,
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.register(
    {
      email: ' Customer@Example.com ',
      full_name: ' Nguyen Van A ',
      password: 'Secret123',
      phone: ' 0909000000 ',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'node-test',
    },
  );

  assert.deepEqual(result, {
    email: 'customer@example.com',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    phone: '0909000000',
    role: 'customer',
    status: USER_STATUS.PENDING_VERIFICATION,
  });

  const insertUserQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO users'),
  );

  assert.ok(insertUserQuery);
  assert.equal(insertUserQuery.params[1], 'customer@example.com');
  assert.equal(insertUserQuery.params[2], '0909000000');
  assert.equal(insertUserQuery.params[4], 'Nguyen Van A');
  assert.equal(insertUserQuery.params[5], USER_STATUS.PENDING_VERIFICATION);
  assert.notEqual(insertUserQuery.params[3], 'Secret123');
  assert.equal(
    await bcrypt.compare('Secret123', insertUserQuery.params[3]),
    true,
  );

  const insertEmailLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO email_logs'),
  );

  assert.ok(insertEmailLogQuery);
  assert.equal(insertEmailLogQuery.params[1], 'customer@example.com');
  assert.equal(
    insertEmailLogQuery.params[3],
    AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
  );
  assert.equal(insertEmailLogQuery.params[4], EMAIL_STATUS.QUEUED);

  const updateEmailLogQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE email_logs'),
  );

  assert.ok(updateEmailLogQuery);
  assert.equal(updateEmailLogQuery.params[1], EMAIL_STATUS.SENT);
  assert.equal(updateEmailLogQuery.params[2], 'sg-message-1');

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );

  assert.ok(insertUserLogQuery);
  assert.equal(insertUserLogQuery.params[1], 'auth.register');
  assert.equal(insertUserLogQuery.params[4], '127.0.0.1');
  assert.equal(insertUserLogQuery.params[5], 'node-test');
  assert.match(insertUserLogQuery.params[6], /customer@example\.com/);

  assert.equal(capturedEmailPayload.to.email, 'customer@example.com');
  assert.equal(capturedEmailPayload.to.name, 'Nguyen Van A');
  assert.match(capturedEmailPayload.text, /verify-token/);
  assert.equal(Object.hasOwn(result, 'password_hash'), false);
  assert.equal(Object.hasOwn(result, 'token'), false);
});

test('register rejects invalid payloads with validation details', async () => {
  const service = createService({
    client: {
      query: async () => {
        throw new Error('query should not run for invalid input');
      },
    },
  });

  await assert.rejects(
    () =>
      service.register({
        email: 'invalid-email',
        full_name: ' ',
        password: '123',
        role_code: 'admin',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.statusCode === 400 &&
      error.details.some((detail) => detail.field === 'email') &&
      error.details.some((detail) => detail.field === 'password') &&
      error.details.some((detail) => detail.field === 'full_name') &&
      error.details.some((detail) => detail.field === 'role_code'),
  );
});

test('register blocks duplicate emails before creating the user', async () => {
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users') && sql.includes('WHERE email = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'existing-user',
              },
            ],
          };
        }

        throw new Error('No other query should run after duplicate email check');
      },
    },
  });

  await assert.rejects(
    () =>
      service.register({
        email: 'customer@example.com',
        full_name: 'Customer',
        password: 'Secret123',
      }),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});
