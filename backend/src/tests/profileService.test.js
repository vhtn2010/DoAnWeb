const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createProfileService } = require('../services/profileService');

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
