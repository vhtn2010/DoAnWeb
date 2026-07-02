const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAdminBusinessSettingsService,
} = require('../services/adminBusinessSettingsService');

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

test('adminBusinessSettingsService.getBusinessSettings returns safe defaults when store is empty', async () => {
  const service = createAdminBusinessSettingsService({
    repository: {
      getBusinessSettings: async () => ({
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        settings: null,
      }),
      listPermissionCodesByRoleId: async () => ['settings.read'],
    },
  });

  const result = await service.getBusinessSettings({
    auth: createAuthContext(),
  });

  assert.deepEqual(result, {
    address: null,
    business_license_no: null,
    company_name: null,
    invoice_email: null,
    invoice_note: null,
    invoice_phone: null,
    legal_representative: null,
    tax_code: null,
    updated_at: null,
    updated_by: null,
  });
});

test('adminBusinessSettingsService.updateBusinessSettings rejects unknown fields and invalid formats', async () => {
  const service = createAdminBusinessSettingsService({
    repository: {
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updateBusinessSettings({
      auth: createAuthContext(),
      body: {
        bank_account_no: '0123456789',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.updateBusinessSettings({
      auth: createAuthContext(),
      body: {
        company_name: 'Net Viet Travel',
        tax_code: '12345',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('adminBusinessSettingsService.updateBusinessSettings requires address when invoice business info is configured', async () => {
  const service = createAdminBusinessSettingsService({
    repository: {
      getBusinessSettings: async () => ({
        metadata: {
          updated_at: null,
          updated_by: null,
        },
        settings: null,
      }),
      listPermissionCodesByRoleId: async () => ['settings.update'],
    },
  });

  await assert.rejects(
    service.updateBusinessSettings({
      auth: createAuthContext(),
      body: {
        company_name: 'Net Viet Travel',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.details[0].field, 'address');
      return true;
    },
  );
});

test('adminBusinessSettingsService.updateBusinessSettings merges partial update, logs changed fields, and invalidates template cache', async () => {
  let invalidateCount = 0;
  let capturedSavePayload;

  const service = createAdminBusinessSettingsService({
    invalidateBusinessTemplateCache: () => {
      invalidateCount += 1;
    },
    repository: {
      getBusinessSettings: async () => ({
        metadata: {
          updated_at: '2026-07-02T09:00:00.000Z',
          updated_by: 'admin-user-0',
        },
        settings: {
          address: '12 Nguyen Hue, Quan 1, TP.HCM',
          company_name: 'Net Viet Travel',
          invoice_email: 'billing@netviet.test',
          invoice_phone: '1900 8080',
          tax_code: '0312345678',
        },
      }),
      listPermissionCodesByRoleId: async () => ['settings.update'],
      saveBusinessSettings: async (payload) => {
        capturedSavePayload = payload;

        return {
          metadata: {
            updated_at: '2026-07-02T10:00:00.000Z',
            updated_by: payload.actorUserId,
          },
          settings: payload.settings,
        };
      },
    },
  });

  const result = await service.updateBusinessSettings({
    auth: createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-admin-1',
    }),
    body: {
      invoice_note: 'Xuat hoa don trong vong 3 ngay lam viec.',
      legal_representative: 'Nguyen Van A',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'admin-business-settings-test',
  });

  assert.deepEqual(capturedSavePayload.changedFields, [
    'legal_representative',
    'invoice_note',
  ]);
  assert.equal(capturedSavePayload.actorUserId, 'sys-admin-1');
  assert.equal(capturedSavePayload.ipAddress, '127.0.0.1');
  assert.equal(capturedSavePayload.userAgent, 'admin-business-settings-test');
  assert.deepEqual(capturedSavePayload.settings, {
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_license_no: null,
    company_name: 'Net Viet Travel',
    invoice_email: 'billing@netviet.test',
    invoice_note: 'Xuat hoa don trong vong 3 ngay lam viec.',
    invoice_phone: '1900 8080',
    legal_representative: 'Nguyen Van A',
    tax_code: '0312345678',
  });
  assert.equal(invalidateCount, 1);
  assert.equal(result.updated_by, 'sys-admin-1');
  assert.equal(result.legal_representative, 'Nguyen Van A');
  assert.equal(
    result.invoice_note,
    'Xuat hoa don trong vong 3 ngay lam viec.',
  );
});
