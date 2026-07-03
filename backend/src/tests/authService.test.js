const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');

const {
  AUTH_REGISTER_ACTION,
  AUTH_RESEND_VERIFICATION_ACTION,
  AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  AUTH_VERIFY_EMAIL_ACTION,
  AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
  createAuthService,
} = require('../services/authService');
const {
  API_ERROR_CODES,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');
const {
  hashEmailVerificationToken,
} = require('../utils/emailVerificationToken');

const fixedNow = new Date('2026-06-30T00:00:00.000Z');

const createService = (options = {}) =>
  createAuthService({
    createEmailVerificationTokenImpl:
      options.createEmailVerificationTokenImpl ||
      (() => 'verify-token'),
    hashEmailVerificationTokenImpl:
      options.hashEmailVerificationTokenImpl ||
      hashEmailVerificationToken,
    now: options.now || (() => fixedNow),
    schedulePostCommitTaskImpl:
      options.schedulePostCommitTaskImpl ||
      (async (task) => task()),
    sendEmailImpl:
      options.sendEmailImpl ||
      (async () => ({
        accepted: true,
        messageId: 'sg-message-1',
      })),
    verifyEmailVerificationTokenImpl:
      options.verifyEmailVerificationTokenImpl ||
      (() => ({
        email: 'customer@example.com',
        exp: Math.floor(fixedNow.getTime() / 1000) + 3600,
        nonce: 'nonce-1',
        sub: 'user-1',
        type: 'verify_email',
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

      if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
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
  assert.equal(insertUserLogQuery.params[1], AUTH_REGISTER_ACTION);
  assert.equal(insertUserLogQuery.params[4], '127.0.0.1');
  assert.equal(insertUserLogQuery.params[5], 'node-test');

  const registerMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(registerMetadata.email, 'customer@example.com');
  assert.equal(registerMetadata.role_code, 'customer');
  assert.equal(
    registerMetadata.verification_token_hash,
    hashEmailVerificationToken('verify-token'),
  );

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
        if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
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

test('verifyEmail activates a pending account and writes audit log', async () => {
  const queries = [];
  const token = 'verify-token';
  const tokenHash = hashEmailVerificationToken(token);
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users') && sql.includes('WHERE id = $1 AND email = $2')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              email_verified_at: null,
              full_name: 'Nguyen Van A',
              id: 'user-1',
              status: USER_STATUS.PENDING_VERIFICATION,
            },
          ],
        };
      }

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("metadata ->> 'verification_token_hash' IS NOT NULL")
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              metadata: {
                verification_token_hash: tokenHash,
              },
            },
          ],
        };
      }

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("metadata ->> 'verification_token_hash' = $3")
      ) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('UPDATE users')) {
        return {
          rowCount: 1,
          rows: [
            {
              email_verified_at: fixedNow,
              status: USER_STATUS.ACTIVE,
            },
          ],
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
    verifyEmailVerificationTokenImpl: () => ({
      email: 'customer@example.com',
      exp: Math.floor(fixedNow.getTime() / 1000) + 3600,
      nonce: 'nonce-1',
      sub: 'user-1',
      type: 'verify_email',
    }),
  });

  const result = await service.verifyEmail(
    {
      token,
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'verify-email-test',
    },
  );

  assert.deepEqual(result, {
    already_verified: false,
    email_verified_at: fixedNow.toISOString(),
    message: 'Email verified successfully.',
    status: USER_STATUS.ACTIVE,
  });

  const updateUserQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE users'),
  );

  assert.ok(updateUserQuery);
  assert.equal(updateUserQuery.params[2], USER_STATUS.ACTIVE);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );

  assert.ok(insertUserLogQuery);
  assert.equal(insertUserLogQuery.params[1], AUTH_VERIFY_EMAIL_ACTION);
  assert.equal(insertUserLogQuery.params[4], '127.0.0.1');
  assert.equal(insertUserLogQuery.params[5], 'verify-email-test');

  const verifyMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(verifyMetadata.email, 'customer@example.com');
  assert.equal(verifyMetadata.outcome, 'verified');
  assert.equal(verifyMetadata.status, USER_STATUS.ACTIVE);
  assert.equal(verifyMetadata.verification_token_hash, tokenHash);
});

test('verifyEmail returns idempotent success for an already active account', async () => {
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users') && sql.includes('WHERE id = $1 AND email = $2')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              email_verified_at: fixedNow,
              full_name: 'Nguyen Van A',
              id: 'user-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
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
  });

  const result = await service.verifyEmail({
    token: 'verify-token',
  });

  assert.deepEqual(result, {
    already_verified: true,
    email_verified_at: fixedNow.toISOString(),
    message: 'Email already verified.',
    status: USER_STATUS.ACTIVE,
  });
  assert.equal(
    queries.some((entry) => entry.sql.includes('UPDATE users')),
    false,
  );
});

test('verifyEmail rejects tokens that are no longer the latest issued token', async () => {
  const client = {
    query: async (sql) => {
      if (sql.includes('FROM users') && sql.includes('WHERE id = $1 AND email = $2')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              email_verified_at: null,
              full_name: 'Nguyen Van A',
              id: 'user-1',
              status: USER_STATUS.PENDING_VERIFICATION,
            },
          ],
        };
      }

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("metadata ->> 'verification_token_hash' IS NOT NULL")
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              metadata: {
                verification_token_hash: hashEmailVerificationToken('newer-token'),
              },
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createService({
    client,
  });

  await assert.rejects(
    () =>
      service.verifyEmail({
        token: 'verify-token',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED &&
      error.statusCode === 401,
  );
});

test('verifyEmail blocks locked or suspended style statuses from becoming active', async () => {
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users') && sql.includes('WHERE id = $1 AND email = $2')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'customer@example.com',
                email_verified_at: null,
                full_name: 'Nguyen Van A',
                id: 'user-1',
                status: USER_STATUS.SUSPENDED,
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in test: ${sql}`);
      },
    },
  });

  await assert.rejects(
    () =>
      service.verifyEmail({
        token: 'verify-token',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('resendVerification sends a fresh verification email for pending accounts', async () => {
  const queries = [];
  let capturedEmailPayload;
  const token = 'resend-token';
  const tokenHash = hashEmailVerificationToken(token);
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users') && sql.includes('WHERE email = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
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
              id: 'email-log-2',
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
    createEmailVerificationTokenImpl: () => token,
    sendEmailImpl: async (payload) => {
      capturedEmailPayload = payload;

      return {
        accepted: true,
        messageId: 'sg-message-2',
      };
    },
  });

  const result = await service.resendVerification(
    {
      email: ' Customer@Example.com ',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'resend-test',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a verification email will be sent.',
  });

  const insertEmailLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO email_logs'),
  );

  assert.ok(insertEmailLogQuery);
  assert.equal(insertEmailLogQuery.params[1], 'customer@example.com');
  assert.equal(
    insertEmailLogQuery.params[3],
    AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  );

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );

  assert.ok(insertUserLogQuery);
  assert.equal(insertUserLogQuery.params[1], AUTH_RESEND_VERIFICATION_ACTION);

  const resendMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(resendMetadata.email, 'customer@example.com');
  assert.equal(resendMetadata.outcome, 'queued');
  assert.equal(resendMetadata.status, USER_STATUS.PENDING_VERIFICATION);
  assert.equal(resendMetadata.verification_token_hash, tokenHash);
  assert.equal(capturedEmailPayload.to.email, 'customer@example.com');
  assert.match(capturedEmailPayload.text, /resend-token/);
});

test('resendVerification hides unknown emails and does not send mail', async () => {
  let sendAttempts = 0;
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users') && sql.includes('WHERE email = $1')) {
          return {
            rowCount: 0,
            rows: [],
          };
        }

        throw new Error(`Unexpected SQL in test: ${sql}`);
      },
    },
    sendEmailImpl: async () => {
      sendAttempts += 1;

      return {
        accepted: true,
        messageId: 'sg-message-3',
      };
    },
  });

  const result = await service.resendVerification({
    email: 'customer@example.com',
  });

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a verification email will be sent.',
  });
  assert.equal(sendAttempts, 0);
});

test('resendVerification skips ineligible statuses but still writes audit log when user is known', async () => {
  const queries = [];
  let sendAttempts = 0;
  const service = createService({
    client: {
      query: async (sql, params = []) => {
        queries.push({
          params,
          sql,
        });

        if (sql.includes('FROM users') && sql.includes('WHERE email = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'customer@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                status: USER_STATUS.ACTIVE,
              },
            ],
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
    },
    sendEmailImpl: async () => {
      sendAttempts += 1;

      return {
        accepted: true,
        messageId: 'sg-message-4',
      };
    },
  });

  const result = await service.resendVerification({
    email: 'customer@example.com',
  });

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a verification email will be sent.',
  });
  assert.equal(sendAttempts, 0);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const resendMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_RESEND_VERIFICATION_ACTION);
  assert.equal(resendMetadata.outcome, 'skipped_ineligible_status');
  assert.equal(resendMetadata.status, USER_STATUS.ACTIVE);
});
