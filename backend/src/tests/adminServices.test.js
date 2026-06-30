const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminServiceCatalogService = require('../services/adminServiceCatalogService');

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

test('adminServiceCatalogService.listServices validates filters and applies staff scope', async () => {
  const service = adminServiceCatalogService.createAdminServiceCatalogService({
    repository: {
      listServices: async (filters) => {
        assert.deepEqual(filters, {
          allowedServiceIds: ['service-1', 'service-2'],
          keyword: 'Da Nang',
          limit: 2,
          offset: 2,
          serviceStatus: 'hidden',
          serviceType: 'hotel',
        });

        return {
          rows: [
            {
              approved_at: null,
              approved_by: null,
              base_price: '3200000',
              created_at: '2026-06-30T01:00:00.000Z',
              created_by: 'user-1',
              currency: 'VND',
              deleted_at: null,
              id: 'service-1',
              location_text: 'Da Nang',
              primary_image: 'https://example.com/primary.jpg',
              provider_name: 'Net Viet Travel',
              public_price: '2890000',
              sale_price: '2890000',
              service_code: 'SVC001',
              service_type: 'hotel',
              short_description: 'Admin card',
              slug: 'hotel-da-nang',
              status: 'hidden',
              title: 'Hotel Da Nang',
              updated_at: '2026-06-30T02:00:00.000Z',
              updated_by: 'user-2',
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listServices({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1', 'service-2'],
    },
    limit: '2',
    page: '2',
    q: '  Da Nang ',
    status: 'hidden',
    type: 'hotel',
  });

  assert.deepEqual(result, {
    meta: {
      has_next: false,
      limit: 2,
      page: 2,
      total: 3,
      total_pages: 2,
    },
    services: [
      {
        approved_at: null,
        approved_by: null,
        base_price: 3200000,
        created_at: '2026-06-30T01:00:00.000Z',
        created_by: 'user-1',
        currency: 'VND',
        deleted_at: null,
        id: 'service-1',
        location_text: 'Da Nang',
        primary_image: 'https://example.com/primary.jpg',
        provider_name: 'Net Viet Travel',
        public_price: 2890000,
        sale_price: 2890000,
        service_code: 'SVC001',
        service_type: 'hotel',
        short_description: 'Admin card',
        slug: 'hotel-da-nang',
        status: 'hidden',
        title: 'Hotel Da Nang',
        updated_at: '2026-06-30T02:00:00.000Z',
        updated_by: 'user-2',
      },
    ],
  });
});

test('adminServiceCatalogService.listServices rejects invalid status and limit', async () => {
  const service = adminServiceCatalogService.createAdminServiceCatalogService({
    repository: {
      listServices: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listServices({ status: 'open' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'status',
          message:
            'status must be one of: draft, pending_review, active, hidden, sold_out, expired, archived, deleted',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.listServices({ limit: '101' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'limit',
          message: 'limit must be less than or equal to 100',
        },
      ]);
      return true;
    },
  );
});

test('adminServiceCatalogService.getServiceDetail joins hotel details, room types, and images', async () => {
  const service = adminServiceCatalogService.createAdminServiceCatalogService({
    repository: {
      getHotelDetail: async (serviceId) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');

        return {
          address: '123 Beach Road',
          amenities: ['pool'],
          checkin_time: '14:00:00',
          checkout_time: '12:00:00',
          hotel_policy: 'No smoking',
          star_rating: '4.5',
        };
      },
      getServiceById: async ({ allowedServiceIds, serviceId }) => {
        assert.equal(serviceId, '11111111-1111-4111-8111-111111111111');
        assert.equal(allowedServiceIds, null);

        return {
          approved_at: '2026-06-30T03:00:00.000Z',
          approved_by: 'admin-1',
          base_price: '3200000',
          cancellation_policy: '48h notice',
          created_at: '2026-06-29T01:00:00.000Z',
          created_by: 'staff-1',
          currency: 'VND',
          deleted_at: null,
          description: 'Admin hotel detail',
          id: serviceId,
          location_text: 'Da Nang',
          metadata: {
            internal_flags: ['featured'],
          },
          provider_name: 'Net Viet Travel',
          public_price: '2890000',
          sale_price: '2890000',
          service_code: 'SVC002',
          service_type: 'hotel',
          short_description: 'Admin short',
          slug: 'hotel-da-nang',
          status: 'draft',
          title: 'Hotel Da Nang',
          updated_at: '2026-06-30T02:00:00.000Z',
          updated_by: 'staff-2',
        };
      },
      listRoomTypesByHotel: async () => [
        {
          available_rooms: 3,
          base_price: '1500000',
          bed_type: 'King',
          created_at: '2026-06-29T05:00:00.000Z',
          description: 'Large room',
          id: 'room-1',
          max_adults: 2,
          max_children: 1,
          name: 'Deluxe',
          status: 'active',
          total_rooms: 5,
          updated_at: '2026-06-30T05:00:00.000Z',
        },
      ],
      listServiceImages: async () => [
        {
          alt_text: 'Main image',
          cloudinary_public_id: 'admin-image-1',
          created_at: '2026-06-30T06:00:00.000Z',
          id: 'image-1',
          image_url: 'https://example.com/image.jpg',
          is_primary: true,
          sort_order: '0',
        },
      ],
    },
  });

  const result = await service.getServiceDetail({
    auth: {
      role: 'admin',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.service_type, 'hotel');
  assert.equal(result.details.star_rating, 4.5);
  assert.equal(result.details.room_types[0].base_price, 1500000);
  assert.equal(result.images[0].cloudinary_public_id, 'admin-image-1');
  assert.equal(result.created_by, 'staff-1');
});

test('adminServiceCatalogService.getServiceDetail sanitizes combo items and rejects bad UUID', async () => {
  const service = adminServiceCatalogService.createAdminServiceCatalogService({
    repository: {
      getServiceById: async () => ({
        approved_at: null,
        approved_by: null,
        base_price: '4000000',
        cancellation_policy: null,
        created_at: '2026-06-29T01:00:00.000Z',
        created_by: 'staff-1',
        currency: 'VND',
        deleted_at: null,
        description: 'Combo admin detail',
        id: '22222222-2222-4222-8222-222222222222',
        location_text: 'Phu Quoc',
        metadata: {
          combo_items: [
            {
              admin_note: 'remove me',
              base_price: '2000000',
              public_price: '1800000',
              quantity: '2',
              service_id: 'child-1',
              service_type: 'hotel',
              slug: 'hotel-phu-quoc',
              supplier_cost: '1000000',
              title: 'Hotel Phu Quoc',
            },
          ],
        },
        provider_name: 'Net Viet Travel',
        public_price: '3600000',
        sale_price: '3600000',
        service_code: 'CB001',
        service_type: 'combo',
        short_description: 'Combo short',
        slug: 'combo-phu-quoc',
        status: 'hidden',
        title: 'Combo Phu Quoc',
        updated_at: '2026-06-30T02:00:00.000Z',
        updated_by: 'staff-2',
      }),
      listServiceImages: async () => [],
    },
  });

  const result = await service.getServiceDetail({
    auth: {
      role: 'admin',
    },
    service_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.deepEqual(result.combo_items, [
    {
      base_price: 2000000,
      public_price: 1800000,
      quantity: 2,
      service_id: 'child-1',
      service_type: 'hotel',
      slug: 'hotel-phu-quoc',
      title: 'Hotel Phu Quoc',
    },
  ]);

  await assert.rejects(
    () => service.getServiceDetail({ service_id: 'bad-id' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'service_id',
          message: 'service_id must be a valid UUID',
        },
      ]);
      return true;
    },
  );
});

test('GET /api/admin/services requires a bearer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/services`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/services blocks customer role with 403', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'customer',
    sub: 'user-1',
  });

  try {
    const response = await request(server, `${apiPrefix}/admin/services`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/services returns admin catalog list with filters and meta', async () => {
  const originalListServices = adminServiceCatalogService.listServices;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    service_scope_ids: ['service-1'],
    sub: 'staff-1',
  });

  adminServiceCatalogService.listServices = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: ['service-1'],
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          role: 'staff',
          service_scope_ids: ['service-1'],
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      limit: '2',
      page: '1',
      q: 'tour',
      status: 'draft',
      type: 'tour',
    });

    return {
      meta: {
        has_next: false,
        limit: 2,
        page: 1,
        total: 1,
        total_pages: 1,
      },
      services: [
        {
          id: 'service-1',
          service_code: 'SVC003',
          service_type: 'tour',
          title: 'Tour Admin',
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services?type=tour&status=draft&q=tour&page=1&limit=2`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin services retrieved successfully');
    assert.deepEqual(response.body.data, [
      {
        id: 'service-1',
        service_code: 'SVC003',
        service_type: 'tour',
        title: 'Tour Admin',
      },
    ]);
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 2,
      page: 1,
      total: 1,
      total_pages: 1,
    });
  } finally {
    adminServiceCatalogService.listServices = originalListServices;
    server.close();
  }
});

test('GET /api/admin/services/{service_id} validates UUID and returns detail for admin role', async () => {
  const originalGetServiceDetail = adminServiceCatalogService.getServiceDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminServiceCatalogService.getServiceDetail = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          role_code: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      id: '11111111-1111-4111-8111-111111111111',
      service_type: 'hotel',
      title: 'Hotel Admin Detail',
      details: {
        address: '123 Beach Road',
      },
      images: [],
    };
  };

  try {
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(
      successResponse.body.message,
      'Admin service detail retrieved successfully',
    );
    assert.equal(successResponse.body.data.details.address, '123 Beach Road');
  } finally {
    adminServiceCatalogService.getServiceDetail = originalGetServiceDetail;
    server.close();
  }
});

test('GET /api/admin/services/{service_id} validates bad UUID before service lookup', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/not-a-uuid`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'service_id',
        message: 'service_id must be a valid UUID',
      },
    ]);
  } finally {
    server.close();
  }
});
