const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAdminDirectPaymentSettingsService,
} = require('../services/adminDirectPaymentSettingsService');

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

test('adminDirectPaymentSettingsService.getDirectPaymentSettings returns disabled defaults when store is empty', async () => {
  const service = createAdminDirectPaymentSettingsService({
    repository: {
      getDirectPaymentSettings: async () => ({
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        settings: null,
      }),
      listPermissionCodesByRoleId: async () => ['settings.read'],
    },
  });

  const result = await service.getDirectPaymentSettings({
    auth: createAuthContext(),
  });

  assert.deepEqual(result, {
    methods: [
      {
        account_holder: null,
        account_number: null,
        bank_name: null,
        branch: null,
        code: 'cash_at_office',
        conditions: null,
        display_name: 'Cash at office',
        enabled: false,
        hotline: null,
        instructions: null,
        office_address: null,
        qr_code_url: null,
        sort_order: 0,
        transfer_content_template: null,
        working_hours: null,
      },
      {
        account_holder: null,
        account_number: null,
        bank_name: null,
        branch: null,
        code: 'manual_bank_transfer',
        conditions: null,
        display_name: 'Manual bank transfer',
        enabled: false,
        hotline: null,
        instructions: null,
        office_address: null,
        qr_code_url: null,
        sort_order: 0,
        transfer_content_template: null,
        working_hours: null,
      },
      {
        account_holder: null,
        account_number: null,
        bank_name: null,
        branch: null,
        code: 'staff_collect',
        conditions: null,
        display_name: 'Staff collect',
        enabled: false,
        hotline: null,
        instructions: null,
        office_address: null,
        qr_code_url: null,
        sort_order: 0,
        transfer_content_template: null,
        working_hours: null,
      },
    ],
    updated_at: null,
    updated_by: null,
  });
});

test('adminDirectPaymentSettingsService.getDirectPaymentSettings falls back to defaults when storage is unavailable', async () => {
  const service = createAdminDirectPaymentSettingsService({
    repository: {
      getDirectPaymentSettings: async () => {
        throw new Error('settings_store is not available');
      },
      listPermissionCodesByRoleId: async () => ['settings.read'],
    },
  });

  const result = await service.getDirectPaymentSettings({
    auth: createAuthContext(),
  });

  assert.equal(result.updated_at, null);
  assert.equal(result.updated_by, null);
  assert.equal(result.methods.length, 3);
  assert.equal(result.methods.every((entry) => entry.enabled === false), true);
});

test('adminDirectPaymentSettingsService rejects duplicate codes and gateway-like config', async () => {
  const service = createAdminDirectPaymentSettingsService({
    repository: {
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updateDirectPaymentSettings({
      auth: createAuthContext(),
      body: {
        methods: [
          {
            code: 'cash_at_office',
            display_name: 'Office',
            enabled: false,
          },
          {
            code: 'cash_at_office',
            display_name: 'Office 2',
            enabled: false,
          },
        ],
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.updateDirectPaymentSettings({
      auth: createAuthContext(),
      body: {
        methods: [
          {
            api_key: 'forbidden',
            code: 'manual_bank_transfer',
            display_name: 'Bank transfer',
            enabled: true,
          },
        ],
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('adminDirectPaymentSettingsService validates required fields for enabled methods', async () => {
  const service = createAdminDirectPaymentSettingsService({
    repository: {
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updateDirectPaymentSettings({
      auth: createAuthContext(),
      body: {
        methods: [
          {
            code: 'manual_bank_transfer',
            display_name: 'Bank transfer',
            enabled: true,
          },
        ],
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.updateDirectPaymentSettings({
      auth: createAuthContext(),
      body: {
        methods: [
          {
            code: 'cash_at_office',
            display_name: 'Office payment',
            enabled: true,
            office_address: '12 Nguyen Hue',
          },
        ],
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('adminDirectPaymentSettingsService updates settings, logs changed codes, and invalidates payment cache', async () => {
  let invalidateCount = 0;
  let capturedSavePayload;

  const service = createAdminDirectPaymentSettingsService({
    invalidateDirectPaymentCache: () => {
      invalidateCount += 1;
    },
    repository: {
      getDirectPaymentSettings: async () => ({
        metadata: {
          updated_at: '2026-07-02T06:00:00.000Z',
          updated_by: 'admin-user-0',
        },
        settings: {
          methods: [
            {
              code: 'cash_at_office',
              display_name: 'Office payment',
              enabled: false,
              sort_order: 0,
            },
            {
              account_holder: 'NET VIET TRAVEL',
              account_number: '0123456789',
              bank_name: 'Vietcombank',
              code: 'manual_bank_transfer',
              display_name: 'Bank transfer',
              enabled: true,
              sort_order: 1,
              transfer_content_template: 'NVT {booking_code}',
            },
          ],
        },
      }),
      listPermissionCodesByRoleId: async () => ['settings.update'],
      saveDirectPaymentSettings: async (payload) => {
        capturedSavePayload = payload;

        return {
          metadata: {
            updated_at: '2026-07-02T07:00:00.000Z',
            updated_by: payload.actorUserId,
          },
          settings: payload.settings,
        };
      },
    },
  });

  const result = await service.updateDirectPaymentSettings({
    auth: createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-admin-1',
    }),
    body: {
      methods: [
        {
          code: 'cash_at_office',
          display_name: 'Office payment',
          enabled: true,
          instructions: 'Mang theo ma booking khi thanh toan.',
          office_address: '12 Nguyen Hue, Quan 1, TP.HCM',
          sort_order: 0,
          working_hours: '08:00 - 17:30',
        },
        {
          account_holder: 'NET VIET TRAVEL',
          account_number: '0123456789',
          bank_name: 'Vietcombank',
          code: 'manual_bank_transfer',
          display_name: 'Bank transfer',
          enabled: true,
          qr_code_url: 'https://cdn.netviet.test/qr.png',
          sort_order: 1,
          transfer_content_template: 'NVT {booking_code}',
        },
      ],
    },
    ipAddress: '127.0.0.1',
    userAgent: 'admin-direct-payment-settings-test',
  });

  assert.deepEqual(capturedSavePayload.changedMethodCodes, [
    'cash_at_office',
    'manual_bank_transfer',
    'staff_collect',
  ]);
  assert.equal(capturedSavePayload.actorUserId, 'sys-admin-1');
  assert.equal(invalidateCount, 1);
  assert.equal(result.updated_by, 'sys-admin-1');
  assert.equal(result.methods[0].code, 'cash_at_office');
  assert.equal(result.methods[0].enabled, true);
});

test('adminDirectPaymentSettingsService.updateDirectPaymentSettings returns SETTINGS_STORAGE_UNAVAILABLE when storage is missing', async () => {
  const service = createAdminDirectPaymentSettingsService({
    repository: {
      getDirectPaymentSettings: async () => {
        throw new Error('settings_store is not available');
      },
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updateDirectPaymentSettings({
      auth: createAuthContext(),
      body: {
        methods: [],
      },
    }),
    (error) => {
      assert.equal(error.code, 'SETTINGS_STORAGE_UNAVAILABLE');
      assert.equal(error.statusCode, 503);
      return true;
    },
  );
});
