const assert = require('node:assert/strict');
const test = require('node:test');

const settingsService = require('../services/settingsService');

test('settingsService.getPublicSettings returns safe defaults when store is empty', async () => {
  const service = settingsService.createSettingsService({
    directPaymentConfig: {
      hotline: '1900 8080',
    },
    repository: {
      getPublicSettings: async () => null,
    },
    sendgridConfig: {
      fromEmail: 'support@netviet.test',
      fromName: 'Net Viet Travel Demo',
    },
  });

  assert.deepEqual(await service.getPublicSettings(), {
    address: null,
    business_hours: null,
    business_info_public: null,
    hotline: '1900 8080',
    logo_url: null,
    site_name: 'Net Viet Travel Demo',
    social_links: {},
    support_email: 'support@netviet.test',
  });
});

test('settingsService.getPublicSettings strips forbidden fields and invalid public values', async () => {
  const service = settingsService.createSettingsService({
    directPaymentConfig: {
      hotline: '1900 8080',
    },
    repository: {
      getPublicSettings: async () => ({
        address: '12 Nguyen Hue, Quan 1, TP.HCM',
        bank_account_no: '0123456789',
        business_hours: {
          weekdays: '08:00 - 17:30',
        },
        business_info_public: {
          company_name: 'Net Viet Travel Co., Ltd.',
          internal_note: 'do-not-expose',
          tax_code: '0312345678',
          website_url: 'https://netviet.test/about',
        },
        direct_payment: {
          methods: ['manual_bank_transfer'],
        },
        hotline: '1900 8080',
        logo_url: 'javascript:alert(1)',
        secret_key: 'do-not-expose',
        site_name: '  Net Viet Travel  ',
        social_links: {
          facebook: 'https://facebook.com/netviettravel',
          internal_portal: 'javascript:alert(1)',
          zalo: 'http://zalo.me/netviettravel',
        },
        support_email: 'support@netviet.test',
      }),
    },
    sendgridConfig: {
      fromEmail: 'fallback@netviet.test',
      fromName: 'Fallback Site Name',
    },
  });

  assert.deepEqual(await service.getPublicSettings(), {
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_hours: {
      weekdays: '08:00 - 17:30',
    },
    business_info_public: {
      company_name: 'Net Viet Travel Co., Ltd.',
      tax_code: '0312345678',
      website_url: 'https://netviet.test/about',
    },
    hotline: '1900 8080',
    logo_url: null,
    site_name: 'Net Viet Travel',
    social_links: {
      facebook: 'https://facebook.com/netviettravel',
      zalo: 'http://zalo.me/netviettravel',
    },
    support_email: 'support@netviet.test',
  });
});

test('settingsService caches public settings and supports invalidation', async () => {
  let readCount = 0;

  const service = settingsService.createSettingsService({
    repository: {
      getPublicSettings: async () => {
        readCount += 1;

        return {
          site_name: readCount === 1 ? 'First config' : 'Second config',
        };
      },
    },
    sendgridConfig: {
      fromName: 'Fallback Site Name',
    },
  });

  const firstRead = await service.getPublicSettings();
  const secondRead = await service.getPublicSettings();

  service.invalidatePublicSettingsCache();

  const thirdRead = await service.getPublicSettings();

  assert.equal(readCount, 2);
  assert.equal(firstRead.site_name, 'First config');
  assert.equal(secondRead.site_name, 'First config');
  assert.equal(thirdRead.site_name, 'Second config');
});

test('settingsService returns INTERNAL_ERROR when repository fails', async () => {
  const service = settingsService.createSettingsService({
    repository: {
      getPublicSettings: async () => {
        throw new Error('database exploded');
      },
    },
  });

  await assert.rejects(service.getPublicSettings(), (error) => {
    assert.equal(error.code, 'INTERNAL_ERROR');
    assert.equal(error.statusCode, 500);
    assert.equal(error.message, 'Internal server error');
    return true;
  });
});
