const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAdminSettingsService,
} = require('../services/adminSettingsService');

const createAuthContext = ({
  roleCode = 'admin',
  status = 'active',
  userId = 'admin-user-1',
} = {}) => ({
  roleCode,
  user: {
    id: userId,
    role_id: 'role-1',
    status,
  },
  userId,
});

test('adminSettingsService.getPublicSettings rejects inactive admin users', async () => {
  const service = createAdminSettingsService({
    repository: {
      getAdminPublicSettings: async () => ({
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        settings: {
          site_name: 'Net Viet Travel',
        },
      }),
      listPermissionCodesByRoleId: async () => ['settings.read'],
    },
  });

  await assert.rejects(
    service.getPublicSettings({
      auth: createAuthContext({
        status: 'suspended',
      }),
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test('adminSettingsService.getPublicSettings accepts system_setting.manage and returns sanitized admin payload', async () => {
  const service = createAdminSettingsService({
    repository: {
      getAdminPublicSettings: async () => ({
        metadata: {
          updated_at: '2026-07-02T03:00:00.000Z',
          updated_by: 'admin-user-9',
        },
        settings: {
          address: '12 Nguyen Hue, Quan 1, TP.HCM',
          business_hours: {
            weekdays: '08:00 - 17:30',
          },
          business_info_public: {
            company_name: 'Net Viet Travel Co., Ltd.',
            secret_key: 'do-not-expose',
          },
          footer_text: 'Explore Vietnam with confidence.',
          hotline: '1900 8080',
          logo_url: 'https://cdn.netviet.test/logo.png',
          seo_description: 'Travel smarter with Net Viet Travel.',
          seo_title: 'Net Viet Travel',
          secret_key: 'do-not-expose',
          site_name: 'Net Viet Travel',
          social_links: {
            facebook: 'https://facebook.com/netviettravel',
            internal_note: 'javascript:alert(1)',
          },
          support_email: 'support@netviet.test',
        },
      }),
      listPermissionCodesByRoleId: async () => ['system_setting.manage'],
    },
  });

  const result = await service.getPublicSettings({
    auth: createAuthContext(),
  });

  assert.deepEqual(result, {
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_hours: {
      weekdays: '08:00 - 17:30',
    },
    business_info_public: null,
    footer_text: 'Explore Vietnam with confidence.',
    hotline: '1900 8080',
    logo_url: 'https://cdn.netviet.test/logo.png',
    seo_description: 'Travel smarter with Net Viet Travel.',
    seo_title: 'Net Viet Travel',
    site_name: 'Net Viet Travel',
    social_links: {
      facebook: 'https://facebook.com/netviettravel',
    },
    support_email: 'support@netviet.test',
    updated_at: '2026-07-02T03:00:00.000Z',
    updated_by: 'admin-user-9',
  });
});

test('adminSettingsService.updatePublicSettings rejects unknown fields and forbidden nested data', async () => {
  const service = createAdminSettingsService({
    repository: {
      getAdminPublicSettings: async () => ({
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        settings: {
          site_name: 'Net Viet Travel',
        },
      }),
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updatePublicSettings({
      auth: createAuthContext(),
      body: {
        bank_account_no: '0123456789',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.statusCode, 400);
      return true;
    },
  );

  await assert.rejects(
    service.updatePublicSettings({
      auth: createAuthContext(),
      body: {
        social_links: {
          facebook: {
            token: 'do-not-store',
            url: 'https://facebook.com/netviettravel',
          },
        },
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('adminSettingsService.updatePublicSettings merges partial update, writes safe change list, and invalidates public cache', async () => {
  let invalidateCount = 0;
  let capturedSavePayload;

  const service = createAdminSettingsService({
    invalidatePublicSettingsCache: () => {
      invalidateCount += 1;
    },
    repository: {
      getAdminPublicSettings: async () => ({
        metadata: {
          updated_at: '2026-07-02T02:00:00.000Z',
          updated_by: 'admin-user-0',
        },
        settings: {
          business_info_public: {
            company_name: 'Net Viet Travel Co., Ltd.',
          },
          hotline: '1900 8080',
          site_name: 'Old Site Name',
          social_links: {
            facebook: 'https://facebook.com/netviettravel',
          },
          support_email: null,
        },
      }),
      listPermissionCodesByRoleId: async () => ['settings.update'],
      saveAdminPublicSettings: async (payload) => {
        capturedSavePayload = payload;

        return {
          metadata: {
            updated_at: '2026-07-02T04:00:00.000Z',
            updated_by: payload.actorUserId,
          },
          settings: payload.settings,
        };
      },
    },
  });

  const result = await service.updatePublicSettings({
    auth: createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-admin-1',
    }),
    body: {
      site_name: 'New Site Name',
      support_email: 'support@netviet.test',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'admin-settings-service-test',
  });

  assert.deepEqual(capturedSavePayload.changedFields, [
    'site_name',
    'support_email',
  ]);
  assert.equal(capturedSavePayload.actorUserId, 'sys-admin-1');
  assert.equal(capturedSavePayload.ipAddress, '127.0.0.1');
  assert.equal(capturedSavePayload.userAgent, 'admin-settings-service-test');
  assert.deepEqual(capturedSavePayload.settings, {
    address: null,
    business_hours: null,
    business_info_public: {
      company_name: 'Net Viet Travel Co., Ltd.',
    },
    footer_text: null,
    hotline: '1900 8080',
    logo_url: null,
    seo_description: null,
    seo_title: null,
    site_name: 'New Site Name',
    social_links: {
      facebook: 'https://facebook.com/netviettravel',
    },
    support_email: 'support@netviet.test',
  });
  assert.equal(invalidateCount, 1);
  assert.equal(result.site_name, 'New Site Name');
  assert.equal(result.support_email, 'support@netviet.test');
  assert.equal(result.updated_at, '2026-07-02T04:00:00.000Z');
  assert.equal(result.updated_by, 'sys-admin-1');
});
