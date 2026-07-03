const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const paymentService = require('../services/paymentService');

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      options,
      (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(body),
            headers: res.headers,
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });

test('paymentService.getDirectPaymentMethods returns enabled public methods only', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      hotline: '1900 8080',
      methods: {
        cash_at_office: {
          enabled: true,
          office_address: '12 Nguyen Hue, Quan 1, TP.HCM',
          office_hours: '08:00 - 17:30',
          hotline: '',
          instructions: 'Mang theo ma booking khi thanh toan.',
          internal_note: 'do-not-expose',
        },
        manual_bank_transfer: {
          enabled: true,
          bank_name: 'Vietcombank',
          account_number: '0123456789',
          account_holder: 'CONG TY NET VIET TRAVEL',
          branch: 'Chi nhanh Sai Gon',
          transfer_content_template: 'NVT {booking_code}',
          instructions: 'Gui bien lai cho nhan vien sau khi chuyen khoan.',
          secret_key: 'do-not-expose',
        },
        staff_collect: {
          enabled: false,
          hotline: '0909000000',
          instructions: 'Khong hien thi vi dang tat.',
        },
      },
    },
  });

  assert.deepEqual(await service.getDirectPaymentMethods(), {
    hotline: '1900 8080',
    methods: [
      {
        code: 'cash_at_office',
        name: 'Cash at office',
        office_address: '12 Nguyen Hue, Quan 1, TP.HCM',
        office_hours: '08:00 - 17:30',
        hotline: '1900 8080',
        instructions: 'Mang theo ma booking khi thanh toan.',
      },
      {
        code: 'manual_bank_transfer',
        name: 'Manual bank transfer',
        bank_name: 'Vietcombank',
        account_number: '0123456789',
        account_holder: 'CONG TY NET VIET TRAVEL',
        branch: 'Chi nhanh Sai Gon',
        transfer_content_template: 'NVT {booking_code}',
        instructions: 'Gui bien lai cho nhan vien sau khi chuyen khoan.',
      },
    ],
  });
});

test('paymentService.getDirectPaymentMethods returns an empty list when no config exists', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {},
  });

  assert.deepEqual(await service.getDirectPaymentMethods(), {
    hotline: null,
    methods: [],
  });
});

test('paymentService.getDirectPaymentMethods throws 404 when an enabled method lacks required public config', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      hotline: '1900 8080',
      methods: {
        manual_bank_transfer: {
          enabled: true,
          bank_name: 'Vietcombank',
          account_number: '',
          account_holder: 'CONG TY NET VIET TRAVEL',
          transfer_content_template: '',
        },
      },
    },
  });

  await assert.rejects(service.getDirectPaymentMethods(), (error) => {
    assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
    assert.equal(error.statusCode, 404);
    assert.deepEqual(error.details, [
      {
        field: 'direct_payment',
        message:
          'Enabled direct payment method manual_bank_transfer is missing required public configuration: account_number, transfer_content_template',
      },
    ]);
    return true;
  });
});

test('GET /api/payment-methods/direct is public and returns cacheable direct payment data', async () => {
  const originalGetDirectPaymentMethods = paymentService.getDirectPaymentMethods;
  const server = app.listen(0);

  paymentService.getDirectPaymentMethods = async () => ({
    hotline: '1900 8080',
    methods: [
      {
        code: 'staff_collect',
        name: 'Staff collect',
        hotline: '1900 8080',
        conditions: 'Ap dung cho noi thanh TP.HCM.',
        instructions: 'Lien he hotline de xep lich thu tien.',
      },
    ],
  });

  try {
    const anonymousResponse = await request(
      server,
      `${apiPrefix}/payment-methods/direct`,
    );
    const customerResponse = await request(
      server,
      `${apiPrefix}/payment-methods/direct`,
      {
        headers: {
          Authorization: 'Bearer invalid-but-ignored-for-public-route',
        },
      },
    );

    assert.equal(anonymousResponse.statusCode, 200);
    assert.equal(anonymousResponse.body.success, true);
    assert.equal(
      anonymousResponse.body.message,
      'Direct payment methods retrieved successfully',
    );
    assert.deepEqual(anonymousResponse.body.data, {
      hotline: '1900 8080',
      methods: [
        {
          code: 'staff_collect',
          name: 'Staff collect',
          hotline: '1900 8080',
          conditions: 'Ap dung cho noi thanh TP.HCM.',
          instructions: 'Lien he hotline de xep lich thu tien.',
        },
      ],
    });
    assert.match(anonymousResponse.headers['cache-control'], /max-age=300/);

    assert.equal(customerResponse.statusCode, 200);
    assert.equal(customerResponse.body.success, true);
  } finally {
    paymentService.getDirectPaymentMethods = originalGetDirectPaymentMethods;
    server.close();
  }
});

test('GET /api/payment-methods/direct returns 200 with an empty list when config is absent', async () => {
  const originalGetDirectPaymentMethods = paymentService.getDirectPaymentMethods;
  const server = app.listen(0);

  paymentService.getDirectPaymentMethods = async () => ({
    hotline: null,
    methods: [],
  });

  try {
    const response = await request(server, `${apiPrefix}/payment-methods/direct`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'No direct payment methods are currently available',
    );
    assert.deepEqual(response.body.data, {
      hotline: null,
      methods: [],
    });
  } finally {
    paymentService.getDirectPaymentMethods = originalGetDirectPaymentMethods;
    server.close();
  }
});

test('GET /api/payment-methods/direct propagates RESOURCE_NOT_FOUND for invalid enabled config', async () => {
  const originalGetDirectPaymentMethods = paymentService.getDirectPaymentMethods;
  const server = app.listen(0);

  paymentService.getDirectPaymentMethods = async () => {
    const error = new Error('Direct payment configuration not found');
    error.code = API_ERROR_CODES.RESOURCE_NOT_FOUND;
    error.statusCode = 404;
    throw error;
  };

  try {
    const response = await request(server, `${apiPrefix}/payment-methods/direct`);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      API_ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  } finally {
    paymentService.getDirectPaymentMethods = originalGetDirectPaymentMethods;
    server.close();
  }
});
