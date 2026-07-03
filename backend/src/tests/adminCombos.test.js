const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminComboService = require('../services/adminComboService');

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body == null
      ? null
      : (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body));
    const headers = {
      ...(options.headers || {}),
    };

    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        headers,
      },
      (res) => {
        let responseBody = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(responseBody),
            headers: res.headers,
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end(body);
  });

const createAccessToken = (payload, secret = process.env.JWT_ACCESS_SECRET) => {
  const encodedHeader = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

test('adminComboService.createCombo creates draft combo with sanitized combo_items', async () => {
  let createCall = null;
  const service = adminComboService.createAdminComboService({
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'draft',
      }),
    },
    repository: {
      createCombo: async (payload) => {
        createCall = payload;
        return {
          id: '11111111-1111-4111-8111-111111111111',
        };
      },
      getServiceByCode: async () => null,
      getServiceBySlug: async () => null,
      getServicesByIds: async () => [
        {
          base_price: '2000000',
          deleted_at: null,
          id: '22222222-2222-4222-8222-222222222222',
          location_text: 'Phu Quoc',
          sale_price: '1800000',
          short_description: 'Beach hotel',
          slug: 'hotel-phu-quoc',
          status: 'active',
          title: 'Hotel Phu Quoc',
          service_type: 'hotel',
        },
      ],
    },
  });

  const result = await service.createCombo({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      base_price: 3500000,
      combo_items: [
        {
          admin_note: 'must not persist',
          quantity: 2,
          service_id: '22222222-2222-4222-8222-222222222222',
          service_type: 'hotel',
        },
      ],
      metadata: {
        season: 'summer',
      },
      title: 'Combo Phu Quoc',
    },
  });

  assert.equal(createCall.servicePayload.title, 'Combo Phu Quoc');
  assert.equal(createCall.servicePayload.currency, 'VND');
  assert.equal(createCall.servicePayload.metadata.season, 'summer');
  assert.deepEqual(createCall.servicePayload.metadata.combo_items, [
    {
      base_price: 2000000,
      location_text: 'Phu Quoc',
      public_price: 1800000,
      quantity: 2,
      sale_price: 1800000,
      service_id: '22222222-2222-4222-8222-222222222222',
      service_type: 'hotel',
      short_description: 'Beach hotel',
      slug: 'hotel-phu-quoc',
      title: 'Hotel Phu Quoc',
    },
  ]);
  assert.deepEqual(result, {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'draft',
  });
});

test('adminComboService.createCombo rejects deleted or nested combo items', async () => {
  const service = adminComboService.createAdminComboService({
    repository: {
      getServiceByCode: async () => null,
      getServiceBySlug: async () => null,
      getServicesByIds: async () => [
        {
          base_price: '2000000',
          deleted_at: '2026-06-30T01:00:00.000Z',
          id: '22222222-2222-4222-8222-222222222222',
          location_text: 'Phu Quoc',
          sale_price: null,
          short_description: 'Beach hotel',
          slug: 'hotel-phu-quoc',
          status: 'deleted',
          title: 'Hotel Phu Quoc',
          service_type: 'hotel',
        },
      ],
    },
  });

  await assert.rejects(
    () => service.createCombo({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        base_price: 3500000,
        combo_items: [
          {
            quantity: 1,
            service_id: '22222222-2222-4222-8222-222222222222',
            service_type: 'hotel',
          },
        ],
        title: 'Invalid combo',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'combo_items[0].service_id',
          message: 'combo item service must not be deleted',
        },
      ]);
      return true;
    },
  );

  const nestedComboService = adminComboService.createAdminComboService({
    repository: {
      getServiceByCode: async () => null,
      getServiceBySlug: async () => null,
      getServicesByIds: async () => [
        {
          base_price: '2000000',
          deleted_at: null,
          id: '33333333-3333-4333-8333-333333333333',
          location_text: 'Da Nang',
          sale_price: null,
          short_description: 'Nested combo',
          slug: 'combo-da-nang',
          status: 'draft',
          title: 'Combo Da Nang',
          service_type: 'combo',
        },
      ],
    },
  });

  await assert.rejects(
    () => nestedComboService.createCombo({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        base_price: 3500000,
        combo_items: [
          {
            quantity: 1,
            service_id: '33333333-3333-4333-8333-333333333333',
            service_type: 'combo',
          },
        ],
        title: 'Nested combo',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'combo_items[0].service_id',
          message: 'nested combo items are not supported',
        },
      ]);
      return true;
    },
  );
});

test('adminComboService.updateCombo validates self reference and returns updated detail', async () => {
  let updateCall = null;
  const service = adminComboService.createAdminComboService({
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'draft',
      }),
    },
    repository: {
      getServiceByCode: async () => null,
      getServiceById: async () => ({
        base_price: '3500000',
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        metadata: {
          combo_items: [
            {
              quantity: 1,
              service_id: '22222222-2222-4222-8222-222222222222',
              service_type: 'hotel',
            },
          ],
        },
        sale_price: '3200000',
        service_type: 'combo',
        title: 'Combo Phu Quoc',
      }),
      getServiceBySlug: async () => null,
      getServicesByIds: async () => [
        {
          base_price: '2000000',
          deleted_at: null,
          id: '22222222-2222-4222-8222-222222222222',
          location_text: 'Phu Quoc',
          sale_price: '1800000',
          short_description: 'Beach hotel',
          slug: 'hotel-phu-quoc',
          status: 'active',
          title: 'Hotel Phu Quoc',
          service_type: 'hotel',
        },
      ],
      updateCombo: async (payload) => {
        updateCall = payload;
        return {
          id: payload.serviceId,
        };
      },
    },
  });

  const result = await service.updateCombo({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      title: 'Combo Phu Quoc Updated',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(updateCall.servicePayload.title, 'Combo Phu Quoc Updated');
  assert.equal(updateCall.servicePayload.metadata.combo_items.length, 1);
  assert.deepEqual(result, {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'draft',
  });

  await assert.rejects(
    () => service.updateCombo({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        combo_items: [
          {
            quantity: 1,
            service_id: '11111111-1111-4111-8111-111111111111',
            service_type: 'combo',
          },
        ],
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'combo_items[0].service_id',
          message: 'combo cannot reference itself',
        },
      ]);
      return true;
    },
  );
});

test('POST /api/admin/services/combos requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/services/combos`, {
      body: {
        title: 'Combo test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/admin/services/combos returns 201 for created combo', async () => {
  const originalCreateCombo = adminComboService.createCombo;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  adminComboService.createCombo = async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    status: 'draft',
    title: 'Combo test',
  });

  try {
    const response = await request(server, `${apiPrefix}/admin/services/combos`, {
      body: {
        base_price: 3500000,
        combo_items: [
          {
            quantity: 1,
            service_id: '22222222-2222-4222-8222-222222222222',
            service_type: 'hotel',
          },
        ],
        title: 'Combo test',
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'draft');
  } finally {
    adminComboService.createCombo = originalCreateCombo;
    server.close();
  }
});

test('PATCH /api/admin/services/combos/{service_id} returns updated combo', async () => {
  const originalUpdateCombo = adminComboService.updateCombo;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminComboService.updateCombo = async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Combo test updated',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/combos/11111111-1111-4111-8111-111111111111`,
      {
        body: {
          title: 'Combo test updated',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.title, 'Combo test updated');
  } finally {
    adminComboService.updateCombo = originalUpdateCombo;
    server.close();
  }
});
