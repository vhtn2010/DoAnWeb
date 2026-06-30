const assert = require('node:assert/strict');
const test = require('node:test');

const {
  AUTH_LOGIN_FAILED_ACTION,
  AUTH_LOGIN_SUCCESS_ACTION,
  AUTH_LOGOUT_ACTION,
  AUTH_REFRESH_TOKEN_ACTION,
  createAuthService,
} = require('../services/authService');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { buildPasswordVersion } = require('../utils/resetPasswordToken');
const { hashSessionToken } = require('../utils/sessionToken');

const fixedNow = new Date('2026-06-30T00:00:00.000Z');

const createService = (options = {}) =>
  createAuthService({
    bcryptCompareImpl:
      options.bcryptCompareImpl ||
      (async () => true),
    buildSessionTokensImpl:
      options.buildSessionTokensImpl ||
      (() => ({
        accessToken: 'access-token',
        expiresIn: 1800,
        refreshExpiresIn: 604800,
        refreshToken: 'refresh-token',
      })),
    createEmailVerificationTokenImpl:
      options.createEmailVerificationTokenImpl ||
      (() => 'verify-token'),
    hashEmailVerificationTokenImpl:
      options.hashEmailVerificationTokenImpl,
    hashSessionTokenImpl:
      options.hashSessionTokenImpl ||
      hashSessionToken,
    now: options.now || (() => fixedNow),
    sendEmailImpl: options.sendEmailImpl,
    verifyEmailVerificationTokenImpl:
      options.verifyEmailVerificationTokenImpl,
    verifyRefreshTokenImpl:
      options.verifyRefreshTokenImpl ||
      (() => ({
        exp: Math.floor(fixedNow.getTime() / 1000) + 3600,
        jti: 'refresh-jti-1',
        pwdv: buildPasswordVersion('hashed-password'),
        role_code: 'customer',
        sub: 'user-1',
        type: 'refresh',
      })),
    withTransactionImpl:
      options.withTransactionImpl ||
      (async (callback) => callback(options.client)),
  });

test('login authenticates active users, updates last_login_at, and returns permissions', async () => {
  const queries = [];
  const refreshTokenHash = hashSessionToken('refresh-token');
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
              password_hash: 'hashed-password',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
        };
      }

      if (sql.includes('FROM role_permissions rp')) {
        return {
          rowCount: 2,
          rows: [
            { code: 'booking.create' },
            { code: 'booking.read_self' },
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
  });

  const result = await service.login(
    {
      email: 'customer@example.com',
      password: 'Secret123',
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'login-service-test',
    },
  );

  assert.deepEqual(result, {
    access_token: 'access-token',
    expires_in: 1800,
    permissions: ['booking.create', 'booking.read_self'],
    refresh_expires_in: 604800,
    refresh_token: 'refresh-token',
    user: {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      role: 'customer',
    },
  });

  const updateUserQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE users'),
  );

  assert.ok(updateUserQuery);
  assert.equal(updateUserQuery.params[0], 'user-1');
  assert.equal(updateUserQuery.params[1], fixedNow);

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const loginMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_LOGIN_SUCCESS_ACTION);
  assert.equal(loginMetadata.email, 'customer@example.com');
  assert.equal(loginMetadata.outcome, 'login_success');
  assert.equal(loginMetadata.role_code, 'customer');
  assert.equal(loginMetadata.refresh_token_hash, refreshTokenHash);
});

test('login returns a shared invalid-credentials error when email is unknown', async () => {
  const queries = [];
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

  await assert.rejects(
    () =>
      service.login({
        email: 'missing@example.com',
        password: 'Secret123',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_INVALID_CREDENTIALS &&
      error.statusCode === 401,
  );

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const loginFailedMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[0], null);
  assert.equal(insertUserLogQuery.params[1], AUTH_LOGIN_FAILED_ACTION);
  assert.equal(loginFailedMetadata.email, 'missing@example.com');
  assert.equal(loginFailedMetadata.outcome, 'invalid_credentials');
});

test('login blocks pending_verification users before issuing tokens', async () => {
  const queries = [];
  let tokenBuildAttempts = 0;
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
              password_hash: 'hashed-password',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.PENDING_VERIFICATION,
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
    buildSessionTokensImpl: () => {
      tokenBuildAttempts += 1;
      return {
        accessToken: 'should-not-be-created',
        expiresIn: 1800,
        refreshExpiresIn: 604800,
        refreshToken: 'should-not-be-created',
      };
    },
    client,
  });

  await assert.rejects(
    () =>
      service.login({
        email: 'customer@example.com',
        password: 'Secret123',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED &&
      error.statusCode === 401,
  );

  assert.equal(tokenBuildAttempts, 0);
});

test('refreshToken rotates refresh token for active users and logs the new hash', async () => {
  const queries = [];
  const incomingRefreshToken = 'incoming-refresh-token';
  const incomingRefreshTokenHash = hashSessionToken(incomingRefreshToken);
  const newRefreshTokenHash = hashSessionToken('rotated-refresh-token');
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
              password_hash: 'hashed-password',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
        };
      }

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("action IN ($2, $3)")
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              metadata: {
                refresh_token_hash: incomingRefreshTokenHash,
              },
            },
          ],
        };
      }

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("action = $2") &&
        sql.includes("metadata ->> 'refresh_token_hash' = $3")
      ) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('FROM role_permissions rp')) {
        return {
          rowCount: 1,
          rows: [
            { code: 'booking.create' },
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
    buildSessionTokensImpl: () => ({
      accessToken: 'new-access-token',
      expiresIn: 1800,
      refreshExpiresIn: 604800,
      refreshToken: 'rotated-refresh-token',
    }),
    client,
    verifyRefreshTokenImpl: () => ({
      exp: Math.floor(fixedNow.getTime() / 1000) + 3600,
      jti: 'refresh-jti-1',
      pwdv: buildPasswordVersion('hashed-password'),
      role_code: 'customer',
      sub: 'user-1',
      type: 'refresh',
    }),
  });

  const result = await service.refreshToken(
    {
      refresh_token: incomingRefreshToken,
    },
    {
      ipAddress: '127.0.0.1',
      userAgent: 'refresh-service-test',
    },
  );

  assert.deepEqual(result, {
    access_token: 'new-access-token',
    expires_in: 1800,
    permissions: ['booking.create'],
    refresh_expires_in: 604800,
    refresh_token: 'rotated-refresh-token',
    user: {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      role: 'customer',
    },
  });

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const refreshMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_REFRESH_TOKEN_ACTION);
  assert.equal(refreshMetadata.outcome, 'rotated');
  assert.equal(
    refreshMetadata.previous_refresh_token_hash,
    incomingRefreshTokenHash,
  );
  assert.equal(refreshMetadata.refresh_token_hash, newRefreshTokenHash);
});

test('refreshToken rejects tokens that are no longer the latest issued token', async () => {
  const client = {
    query: async (sql) => {
      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
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

      if (
        sql.includes('FROM user_logs') &&
        sql.includes("action IN ($2, $3)")
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              metadata: {
                refresh_token_hash: hashSessionToken('another-refresh-token'),
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
      service.refreshToken({
        refresh_token: 'incoming-refresh-token',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED &&
      error.statusCode === 401,
  );
});

test('refreshToken rejects tokens issued before the latest password reset', async () => {
  const client = {
    query: async (sql) => {
      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              email: 'customer@example.com',
              full_name: 'Nguyen Van A',
              id: 'user-1',
              password_hash: 'new-password-hash',
              role_code: 'customer',
              role_id: 'role-customer-1',
              status: USER_STATUS.ACTIVE,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createService({
    client,
    verifyRefreshTokenImpl: () => ({
      exp: Math.floor(fixedNow.getTime() / 1000) + 3600,
      jti: 'refresh-jti-1',
      pwdv: buildPasswordVersion('old-password-hash'),
      role_code: 'customer',
      sub: 'user-1',
      type: 'refresh',
    }),
  });

  await assert.rejects(
    () =>
      service.refreshToken({
        refresh_token: 'incoming-refresh-token',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED &&
      error.statusCode === 401,
  );
});

test('logout records an idempotent logout event and hashes refresh_token when provided', async () => {
  const queries = [];
  const refreshTokenHash = hashSessionToken('refresh-token');
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

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

  const result = await service.logout(
    {
      refresh_token: 'refresh-token',
    },
    {
      ipAddress: '127.0.0.1',
      roleCode: 'customer',
      tokenId: 'access-jti-1',
      userAgent: 'logout-service-test',
      userId: 'user-1',
    },
  );

  assert.deepEqual(result, {
    data: {
      acknowledged: true,
    },
    message: 'Logout successful.',
  });

  const insertUserLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const logoutMetadata = JSON.parse(insertUserLogQuery.params[6]);

  assert.equal(insertUserLogQuery.params[1], AUTH_LOGOUT_ACTION);
  assert.equal(logoutMetadata.outcome, 'logout');
  assert.equal(logoutMetadata.refresh_token_hash, refreshTokenHash);
  assert.equal(logoutMetadata.access_token_id, 'access-jti-1');
});
