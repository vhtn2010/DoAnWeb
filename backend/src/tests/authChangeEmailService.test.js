const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AUTH_CHANGE_EMAIL_CONFIRMED_ACTION,
  AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE,
  AUTH_CHANGE_EMAIL_REQUESTED_ACTION,
  createAuthService,
} = require('../services/authService');
const {
  API_ERROR_CODES,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { buildEmailVersion } = require('../utils/sessionToken');

const fixedNow = new Date('2026-06-30T00:00:00.000Z');

const createService = (options = {}) =>
  createAuthService({
    bcryptCompareImpl: options.bcryptCompareImpl,
    buildSessionTokensImpl: options.buildSessionTokensImpl,
    createChangeEmailTokenImpl:
      options.createChangeEmailTokenImpl || (() => 'change-email-token'),
    createEmailVerificationTokenImpl: options.createEmailVerificationTokenImpl,
    createResetPasswordTokenImpl: options.createResetPasswordTokenImpl,
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
    verifyChangeEmailTokenImpl:
      options.verifyChangeEmailTokenImpl ||
      (() => ({
        current_email: 'current@example.com',
        emlv: buildEmailVersion('current@example.com'),
        exp: Math.floor(fixedNow.getTime() / 1000) + 1200,
        new_email: 'new@example.com',
        sub: 'user-1',
        type: 'change_email',
      })),
    verifyEmailVerificationTokenImpl: options.verifyEmailVerificationTokenImpl,
    verifyRefreshTokenImpl: options.verifyRefreshTokenImpl,
    verifyResetPasswordTokenImpl: options.verifyResetPasswordTokenImpl,
    withTransactionImpl:
      options.withTransactionImpl ||
      (async (callback) => callback(options.client)),
  });

test('changeEmailRequest sends confirmation to new email and does not update users.email yet', async () => {
  const queries = [];
  let capturedEmailPayload;
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
              email: 'current@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              password_hash: 'hashed-password',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
        };
      }

      if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
        return {
          rowCount: 0,
          rows: [],
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
    bcryptCompareImpl: async (plainTextPassword, hashedPassword) => {
      assert.equal(plainTextPassword, 'CurrentPassword123')
      assert.equal(hashedPassword, 'hashed-password')
      return true
    },
    client,
    sendEmailImpl: async (payload) => {
      capturedEmailPayload = payload;

      return {
        accepted: true,
        messageId: 'sg-message-1',
      };
    },
  });

  const result = await service.changeEmailRequest(
    {
      current_password: 'CurrentPassword123',
      new_email: 'New@Example.com',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'change-email-request-service-test',
      userId: 'user-1',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'Change email confirmation has been queued for delivery.',
  });

  const insertEmailLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO email_logs'),
  );

  assert.ok(insertEmailLogQuery);
  assert.equal(insertEmailLogQuery.params[1], 'new@example.com');
  assert.equal(insertEmailLogQuery.params[3], AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE);
  assert.equal(insertEmailLogQuery.params[4], EMAIL_STATUS.QUEUED);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const requestMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_CHANGE_EMAIL_REQUESTED_ACTION);
  assert.equal(requestMetadata.current_email, 'current@example.com');
  assert.equal(requestMetadata.new_email, 'new@example.com');
  assert.equal(requestMetadata.outcome, 'confirmation_queued');
  assert.equal(requestMetadata.sessions_revoked, false);
  assert.equal(capturedEmailPayload.to.email, 'new@example.com');
  assert.match(capturedEmailPayload.text, /change-email\/confirm\?token=change-email-token/);
  assert.doesNotMatch(capturedEmailPayload.html, /Thong tin ky thuat|POST \/auth|API:/);
  assert.doesNotMatch(capturedEmailPayload.text, /POST \/auth|API:/);
  assert.equal(
    queries.some((entry) => entry.sql.includes('UPDATE users')),
    false,
  );
});

test('changeEmailRequest rejects duplicate new_email', async () => {
  const service = createService({
    bcryptCompareImpl: async () => true,
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'current@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                password_hash: 'hashed-password',
                role_code: 'customer',
                role_id: 'role-customer-1',
                status: USER_STATUS.ACTIVE,
              },
            ],
          };
        }

        if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'new@example.com',
                id: 'user-2',
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
      service.changeEmailRequest(
        {
          current_password: 'CurrentPassword123',
          new_email: 'new@example.com',
        },
        {
          userId: 'user-1',
        },
      ),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});

test('changeEmailRequest rejects incorrect current_password', async () => {
  const service = createService({
    bcryptCompareImpl: async () => false,
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'current@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                password_hash: 'hashed-password',
                role_code: 'customer',
                role_id: 'role-customer-1',
                status: USER_STATUS.ACTIVE,
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
      service.changeEmailRequest(
        {
          current_password: 'WrongPassword123',
          new_email: 'new@example.com',
        },
        {
          userId: 'user-1',
        },
      ),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_INVALID_CREDENTIALS &&
      error.statusCode === 401,
  );
});

test('changeEmailConfirm updates email, email_verified_at, and records safe audit log', async () => {
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
              email: 'current@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              password_hash: 'hashed-password',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
        };
      }

      if (sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
        return {
          rowCount: 0,
          rows: [],
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
  });

  const result = await service.changeEmailConfirm(
    {
      token: 'change-email-token',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'change-email-confirm-service-test',
      userId: 'user-1',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
      email: 'new@example.com',
    },
    message: 'Email changed successfully.',
  });

  const updateUserQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE users'),
  );

  assert.ok(updateUserQuery);
  assert.equal(updateUserQuery.params[0], 'user-1');
  assert.equal(updateUserQuery.params[1], 'new@example.com');
  assert.equal(updateUserQuery.params[2], fixedNow);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const confirmMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_CHANGE_EMAIL_CONFIRMED_ACTION);
  assert.equal(confirmMetadata.current_email, 'current@example.com');
  assert.equal(confirmMetadata.new_email, 'new@example.com');
  assert.equal(confirmMetadata.outcome, 'confirmed');
  assert.equal(confirmMetadata.sessions_revoked, true);
  assert.equal(Object.hasOwn(confirmMetadata, 'token'), false);
});

test('changeEmailConfirm rejects tokens that belong to another authenticated user', async () => {
  const service = createService({
    client: {
      query: async () => {
        throw new Error('Database should not be called for mismatched token owner');
      },
    },
    verifyChangeEmailTokenImpl: () => ({
      current_email: 'current@example.com',
      emlv: buildEmailVersion('current@example.com'),
      exp: Math.floor(fixedNow.getTime() / 1000) + 1200,
      new_email: 'new@example.com',
      sub: 'user-2',
      type: 'change_email',
    }),
  });

  await assert.rejects(
    () =>
      service.changeEmailConfirm(
        {
          token: 'other-user-token',
        },
        {
          userId: 'user-1',
        },
      ),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('changeEmailConfirm rejects stale token after current email has changed', async () => {
  const service = createService({
    client: {
      query: async (sql) => {
        if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
          return {
            rowCount: 1,
            rows: [
              {
                email: 'already-changed@example.com',
                full_name: 'Nguyen Van A',
                id: 'user-1',
                password_hash: 'hashed-password',
                role_code: 'customer',
                role_id: 'role-customer-1',
                status: USER_STATUS.ACTIVE,
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
      service.changeEmailConfirm(
        {
          token: 'stale-change-email-token',
        },
        {
          userId: 'user-1',
        },
      ),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED &&
      error.statusCode === 401,
  );
});
