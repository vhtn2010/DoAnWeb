const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');

const {
  AUTH_FORGOT_PASSWORD_REQUESTED_ACTION,
  AUTH_RESET_PASSWORD_ACTION,
  AUTH_RESET_PASSWORD_TEMPLATE_CODE,
  createAuthService,
} = require('../services/authService');
const {
  API_ERROR_CODES,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { buildPasswordVersion } = require('../utils/resetPasswordToken');

const fixedNow = new Date('2026-06-30T00:00:00.000Z');

const createService = (options = {}) =>
  createAuthService({
    bcryptCompareImpl: options.bcryptCompareImpl,
    buildPasswordVersionImpl:
      options.buildPasswordVersionImpl || buildPasswordVersion,
    buildSessionTokensImpl: options.buildSessionTokensImpl,
    createEmailVerificationTokenImpl: options.createEmailVerificationTokenImpl,
    createResetPasswordTokenImpl:
      options.createResetPasswordTokenImpl || (() => 'reset-token'),
    hashEmailVerificationTokenImpl: options.hashEmailVerificationTokenImpl,
    hashSessionTokenImpl: options.hashSessionTokenImpl,
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
    verifyEmailVerificationTokenImpl: options.verifyEmailVerificationTokenImpl,
    verifyRefreshTokenImpl: options.verifyRefreshTokenImpl,
    verifyResetPasswordTokenImpl:
      options.verifyResetPasswordTokenImpl ||
      (() => ({
        email: 'customer@example.com',
        exp: Math.floor(fixedNow.getTime() / 1000) + 1200,
        nonce: 'nonce-1',
        pwdv: buildPasswordVersion('old-password-hash'),
        sub: 'user-1',
        type: 'reset_password',
      })),
    withTransactionImpl:
      options.withTransactionImpl ||
      (async (callback) => callback(options.client)),
  });

test('forgotPassword returns a generic response for unknown emails', async () => {
  let sendAttempts = 0;
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
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
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.forgotPassword({
    email: 'customer@example.com',
  });

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a password reset email will be sent.',
  });
  assert.equal(sendAttempts, 0);
});

test('forgotPassword sends reset email and writes safe logs for eligible users', async () => {
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
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              password_hash: 'old-password-hash',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
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
    createResetPasswordTokenImpl: () => 'reset-token',
    sendEmailImpl: async (payload) => {
      capturedEmailPayload = payload;

      return {
        accepted: true,
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.forgotPassword(
    {
      email: 'Customer@Example.com',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'forgot-password-test',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a password reset email will be sent.',
  });

  const insertEmailLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO email_logs'),
  );

  assert.ok(insertEmailLogQuery);
  assert.equal(insertEmailLogQuery.params[1], 'customer@example.com');
  assert.equal(insertEmailLogQuery.params[3], AUTH_RESET_PASSWORD_TEMPLATE_CODE);
  assert.equal(insertEmailLogQuery.params[4], EMAIL_STATUS.QUEUED);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const forgotMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_FORGOT_PASSWORD_REQUESTED_ACTION);
  assert.equal(forgotMetadata.email, 'customer@example.com');
  assert.equal(forgotMetadata.outcome, 'reset_email_queued');
  assert.equal(forgotMetadata.status, USER_STATUS.ACTIVE);
  assert.equal(Object.hasOwn(forgotMetadata, 'token'), false);
  assert.equal(Object.hasOwn(forgotMetadata, 'reset_token'), false);
  assert.equal(Object.hasOwn(forgotMetadata, 'password'), false);
  assert.equal(capturedEmailPayload.to.email, 'customer@example.com');
  assert.match(capturedEmailPayload.text, /reset-password\?token=reset-token/);
  assert.doesNotMatch(capturedEmailPayload.html, /Thong tin ky thuat|POST \/auth|API:/);
  assert.doesNotMatch(capturedEmailPayload.text, /POST \/auth|API:/);
});

test('forgotPassword skips suspended users but still writes audit log', async () => {
  const queries = [];
  let sendAttempts = 0;
  const service = createService({
    client: {
      query: async (sql, params = []) => {
        queries.push({
          params,
          sql,
        });

        if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'customer@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                password_hash: 'old-password-hash',
                role_code: 'customer',
                role_id: 'role-customer-1',
                status: USER_STATUS.SUSPENDED,
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
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.forgotPassword({
    email: 'customer@example.com',
  });

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a password reset email will be sent.',
  });
  assert.equal(sendAttempts, 0);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const forgotMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_FORGOT_PASSWORD_REQUESTED_ACTION);
  assert.equal(forgotMetadata.outcome, 'skipped_ineligible_status');
  assert.equal(forgotMetadata.status, USER_STATUS.SUSPENDED);
});

test('resetPassword updates password hash without changing status or issuing tokens', async () => {
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              password_hash: 'old-password-hash',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.LOCKED,
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
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
    verifyResetPasswordTokenImpl: () => ({
      email: 'customer@example.com',
      exp: Math.floor(fixedNow.getTime() / 1000) + 1200,
      nonce: 'nonce-1',
      pwdv: buildPasswordVersion('old-password-hash'),
      sub: 'user-1',
      type: 'reset_password',
    }),
  });

  const result = await service.resetPassword(
    {
      new_password: 'NewStrong123',
      token: 'reset-token',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'reset-password-test',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'Password reset successful.',
  });

  const updateUserQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE users'),
  );

  assert.ok(updateUserQuery);
  assert.equal(updateUserQuery.params[0], 'user-1');
  assert.notEqual(updateUserQuery.params[1], 'NewStrong123');
  assert.equal(await bcrypt.compare('NewStrong123', updateUserQuery.params[1]), true);
  assert.equal(updateUserQuery.params[2], fixedNow);
  assert.equal(updateUserQuery.sql.includes('status ='), false);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const resetMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_RESET_PASSWORD_ACTION);
  assert.equal(resetMetadata.email, 'customer@example.com');
  assert.equal(resetMetadata.sessions_revoked, true);
  assert.equal(resetMetadata.status, USER_STATUS.LOCKED);
  assert.equal(Object.hasOwn(resetMetadata, 'token'), false);
  assert.equal(Object.hasOwn(resetMetadata, 'password'), false);
});

test('resetPassword rejects suspended or disabled users', async () => {
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'customer@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                password_hash: 'old-password-hash',
                role_code: 'customer',
                role_id: 'role-customer-1',
                status: USER_STATUS.DISABLED,
              },
            ],
          };
        }

        throw new Error(`Unexpected SQL in test: ${sql}`);
      },
    },
    verifyResetPasswordTokenImpl: () => ({
      email: 'customer@example.com',
      exp: Math.floor(fixedNow.getTime() / 1000) + 1200,
      nonce: 'nonce-1',
      pwdv: buildPasswordVersion('old-password-hash'),
      sub: 'user-1',
      type: 'reset_password',
    }),
  });

  await assert.rejects(
    () =>
      service.resetPassword({
        new_password: 'NewStrong123',
        token: 'reset-token',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});
