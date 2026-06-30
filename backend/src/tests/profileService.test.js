const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  PROFILE_UPDATE_ACTION,
  createProfileService,
} = require('../services/profileService');

test('getCurrentProfile returns safe profile data with role and permissions', async () => {
  let capturedParams;
  const service = createProfileService({
    queryImpl: async (sql, params = []) => {
      capturedParams = params;

      assert.match(sql, /FROM users u/);
      assert.match(sql, /JOIN roles r/);
      assert.match(sql, /LEFT JOIN role_permissions rp/);

      return {
        rowCount: 1,
        rows: [
          {
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            created_at: new Date('2026-06-28T00:00:00.000Z'),
            deleted_at: null,
            email: 'customer@example.com',
            email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
            full_name: 'Nguyen Van A',
            id: 'user-1',
            last_login_at: new Date('2026-06-30T00:00:00.000Z'),
            permissions: ['profile.read_self', 'booking.read_self'],
            phone: '0909000000',
            role_code: 'customer',
            role_name: 'Customer',
            status: 'active',
            updated_at: new Date('2026-06-30T01:00:00.000Z'),
          },
        ],
      };
    },
  });

  const profile = await service.getCurrentProfile({
    userId: 'user-1',
  });

  assert.deepEqual(capturedParams, ['user-1']);
  assert.deepEqual(profile, {
    avatar_url: 'https://cdn.example.com/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'booking.read_self'],
    phone: '0909000000',
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T01:00:00.000Z',
  });
  assert.equal(Object.hasOwn(profile, 'password_hash'), false);
  assert.equal(Object.hasOwn(profile, 'deleted_at'), false);
  assert.equal(Object.hasOwn(profile, 'is_system_protected'), false);
});

test('getCurrentProfile returns 404 when user does not exist', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 0,
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'missing-user',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('getCurrentProfile returns 403 when current user is not active', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 1,
      rows: [
        {
          deleted_at: null,
          permissions: [],
          role_code: 'staff',
          role_name: 'Staff',
          status: 'locked',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('getCurrentProfile returns 403 when current user was soft deleted', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 1,
      rows: [
        {
          deleted_at: new Date('2026-06-30T00:00:00.000Z'),
          permissions: [],
          role_code: 'admin',
          role_name: 'Admin',
          status: 'deleted',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('updateCurrentProfile updates full_name and phone, sets updated_at, and returns latest profile', async () => {
  const fixedNow = new Date('2026-06-30T02:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return {
          rowCount: null,
          rows: [],
        };
      }

      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              full_name: 'Nguyen Van A',
              id: 'user-1',
              phone: '0909000000',
              status: 'active',
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

      if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: 'https://cdn.example.com/avatar.jpg',
              created_at: new Date('2026-06-28T00:00:00.000Z'),
              deleted_at: null,
              email: 'customer@example.com',
              email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
              full_name: 'Nguyen Van B',
              id: 'user-1',
              last_login_at: new Date('2026-06-30T00:00:00.000Z'),
              permissions: ['profile.read_self', 'profile.update_self'],
              phone: null,
              role_code: 'customer',
              role_name: 'Customer',
              status: 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const profile = await service.updateCurrentProfile({
    ipAddress: '127.0.0.1',
    payload: {
      full_name: '  Nguyen Van B  ',
      phone: '   ',
    },
    userAgent: 'profile-update-service-test',
    userId: 'user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const logQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const logMetadata = JSON.parse(logQuery.params[6]);

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[0], 'user-1');
  assert.equal(updateQuery.params[1], 'Nguyen Van B');
  assert.equal(updateQuery.params[2], null);
  assert.equal(updateQuery.params[3], fixedNow);
  assert.equal(logQuery.params[1], PROFILE_UPDATE_ACTION);
  assert.deepEqual(logMetadata, {
    changed_fields: ['full_name', 'phone'],
  });
  assert.deepEqual(profile, {
    avatar_url: 'https://cdn.example.com/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van B',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'profile.update_self'],
    phone: null,
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T02:00:00.000Z',
  });
});

test('updateCurrentProfile rejects body without allowed fields', async () => {
  const service = createProfileService();

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {},
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.statusCode === 400,
  );
});

test('updateCurrentProfile rejects forbidden fields', async () => {
  const service = createProfileService();

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          email: 'new@example.com',
          full_name: 'Nguyen Van B',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'email' &&
          detail.message === 'email is not allowed in PATCH /me',
      ),
  );
});

test('updateCurrentProfile rejects empty full_name after trim', async () => {
  const service = createProfileService();

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          full_name: '   ',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'full_name' &&
          detail.message === 'full_name must not be empty',
      ),
  );
});

test('updateCurrentProfile rejects current user with non-active status', async () => {
  const client = {
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              status: 'suspended',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    withTransactionImpl: async (callback) => callback(client),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          phone: '0909000000',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});
