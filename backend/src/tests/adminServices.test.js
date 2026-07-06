const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminServiceCatalogService = require('../services/adminServiceCatalogService');
const adminServiceCrudService = require('../services/adminServiceCrudService');
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;

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

const getDefaultPermissionsForRole = (roleCode) => {
  switch (roleCode) {
    case 'staff':
      return [
        'service.read_all',
        'service.create',
        'service.update',
        'service.inventory_update',
      ];
    case 'admin':
    case 'system_admin':
      return [
        'service.read_all',
        'service.create',
        'service.update',
        'service.delete',
        'service.approve',
        'service.hide',
        'service.inventory_update',
      ];
    default:
      return [];
  }
};

const createAuthContext = ({
  permissions,
  roleCode = 'admin',
  serviceScopeIds = [],
  userId = 'admin-user-1',
} = {}) => ({
  permissions:
    permissions == null
      ? getDefaultPermissionsForRole(roleCode)
      : permissions,
  roleCode,
  serviceScopeIds,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    password_hash: '$2b$10$hash',
    role_code: roleCode,
    role_id: 'role-1',
    status: 'active',
  },
  userId,
});

test.beforeEach(() => {
  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions:
        tokenPayload.permissions ||
        tokenPayload.permission_codes,
      roleCode:
        tokenPayload.roleCode ||
        tokenPayload.role_code ||
        tokenPayload.role ||
        'admin',
      serviceScopeIds:
        tokenPayload.serviceScopeIds ||
        tokenPayload.service_scope_ids ||
        [],
      userId: tokenPayload.userId || tokenPayload.sub || 'admin-user-1',
    });
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

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
          serviceSort: 'price_asc',
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
    sort: 'price_asc',
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

  await assert.rejects(
    () => service.listServices({ sort: 'title_asc' }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'sort',
          message: 'sort must be one of: newest, oldest, price_asc, price_desc',
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

test('adminServiceCrudService.createService creates a draft service with generated slug and code', async () => {
  const service = adminServiceCrudService.createAdminServiceCrudService({
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'draft',
      }),
    },
    repository: {
      createService: async ({ actorUserId, detailPayload, servicePayload }) => {
        assert.equal(actorUserId, 'staff-1');
        assert.equal(servicePayload.service_type, 'hotel');
        assert.equal(servicePayload.status, 'draft');
        assert.equal(servicePayload.currency, 'VND');
        assert.equal(servicePayload.slug, 'khach-san-da-lat');
        assert.match(servicePayload.service_code, /^SVC-[A-F0-9]{8}$/);
        assert.deepEqual(detailPayload, {
          address: '12 Ho Xuan Huong',
          amenities: ['pool'],
          checkin_time: '14:00',
          checkout_time: '12:00',
          hotel_policy: 'No smoking',
          star_rating: 4,
        });

        return {
          id: '33333333-3333-4333-8333-333333333333',
        };
      },
      getServiceByCode: async () => null,
      getServiceBySlug: async () => null,
    },
  });

  const result = await service.createService({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      base_price: 2500000,
      details: {
        address: '12 Ho Xuan Huong',
        amenities: ['pool'],
        checkin_time: '14:00',
        checkout_time: '12:00',
        hotel_policy: 'No smoking',
        star_rating: 4,
      },
      service_type: 'hotel',
      title: 'Khach san Da Lat',
    },
  });

  assert.deepEqual(result, {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'draft',
  });
});

test('adminServiceCrudService rejects service_type=room on create', async () => {
  const service = adminServiceCrudService.createAdminServiceCrudService({
    repository: {
      createService: async () => {
        throw new Error('should not reach repository');
      },
      getServiceByCode: async () => null,
      getServiceBySlug: async () => null,
    },
  });

  await assert.rejects(
    () => service.createService({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        base_price: 1000000,
        service_type: 'room',
        title: 'Room only',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'service_type',
          message:
            'service_type must be one of: tour, hotel, flight, train, combo',
        },
      ]);
      return true;
    },
  );
});

test('adminServiceCrudService.updateService keeps service_type immutable and passes serviceType separately', async () => {
  let updateCall = null;
  const service = adminServiceCrudService.createAdminServiceCrudService({
    catalogRepository: {
      getHotelDetail: async () => ({
        address: 'Old address',
        amenities: ['wifi'],
        checkin_time: '14:00',
        checkout_time: '12:00',
        hotel_policy: null,
        star_rating: '4',
      }),
    },
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'draft',
      }),
    },
    repository: {
      getServiceByCode: async () => null,
      getServiceById: async () => ({
        base_price: '2000000',
        currency: 'VND',
        id: '11111111-1111-4111-8111-111111111111',
        metadata: null,
        sale_price: null,
        service_type: 'hotel',
        title: 'Old title',
      }),
      getServiceBySlug: async () => null,
      updateService: async (payload) => {
        updateCall = payload;
        return { id: payload.serviceId };
      },
    },
  });

  const result = await service.updateService({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      base_price: 2200000,
      details: {
        address: 'New address',
      },
      title: 'New title',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'draft',
  });
  assert.equal(updateCall.serviceType, 'hotel');
  assert.equal(
    Object.prototype.hasOwnProperty.call(updateCall.servicePayload, 'service_type'),
    false,
  );
  assert.deepEqual(updateCall.detailPayload, {
    address: 'New address',
    amenities: ['wifi'],
    checkin_time: '14:00',
    checkout_time: '12:00',
    hotel_policy: null,
    star_rating: 4,
  });
});

test('adminServiceCrudService.deleteService blocks unfinished bookings', async () => {
  const service = adminServiceCrudService.createAdminServiceCrudService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        status: 'active',
      }),
      hasBlockingBookings: async () => true,
    },
  });

  await assert.rejects(
    () => service.deleteService({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        reason: 'No longer available',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      assert.deepEqual(error.details, [
        {
          field: 'service',
          message: 'service cannot be deleted while unfinished bookings exist',
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
    permissions: ['service.read_all'],
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
          permissions: ['service.read_all'],
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

test('POST /api/admin/services returns 201 with created service detail', async () => {
  const originalCreateService = adminServiceCrudService.createService;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.create'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminServiceCrudService.createService = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['service.create'],
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      body: {
        base_price: 3200000,
        details: {
          departure_location: 'Ho Chi Minh',
          destination_location: 'Da Nang',
          duration_days: 3,
          duration_nights: 2,
          transport_type: 'flight',
        },
        service_type: 'tour',
        title: 'Tour Da Nang',
      },
    });

    return {
      id: '44444444-4444-4444-8444-444444444444',
      status: 'draft',
      title: 'Tour Da Nang',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/services`, {
      body: {
        base_price: 3200000,
        details: {
          departure_location: 'Ho Chi Minh',
          destination_location: 'Da Nang',
          duration_days: 3,
          duration_nights: 2,
          transport_type: 'flight',
        },
        service_type: 'tour',
        title: 'Tour Da Nang',
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin service created successfully');
    assert.equal(response.body.data.status, 'draft');
  } finally {
    adminServiceCrudService.createService = originalCreateService;
    server.close();
  }
});

test('PATCH /api/admin/services/{service_id} returns updated service detail', async () => {
  const originalUpdateService = adminServiceCrudService.updateService;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.update'],
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminServiceCrudService.updateService = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['service.update'],
          role_code: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      body: {
        base_price: 3500000,
        title: 'Tour Da Nang Updated',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Tour Da Nang Updated',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111`,
      {
        body: {
          base_price: 3500000,
          title: 'Tour Da Nang Updated',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin service updated successfully');
    assert.equal(response.body.data.title, 'Tour Da Nang Updated');
  } finally {
    adminServiceCrudService.updateService = originalUpdateService;
    server.close();
  }
});

test('DELETE /api/admin/services/{service_id} blocks staff role with 403', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111`,
      {
        body: {
          reason: 'No longer used',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('DELETE /api/admin/services/{service_id} returns soft delete result for admin', async () => {
  const originalDeleteService = adminServiceCrudService.deleteService;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.delete'],
    role: 'system_admin',
    sub: 'sys-1',
  });

  adminServiceCrudService.deleteService = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'system_admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['service.delete'],
          role: 'system_admin',
          sub: 'sys-1',
        },
        userId: 'sys-1',
      },
      body: {
        reason: 'Legacy service cleanup',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      deleted_at: '2026-06-30T08:00:00.000Z',
      id: '11111111-1111-4111-8111-111111111111',
      status: 'deleted',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111`,
      {
        body: {
          reason: 'Legacy service cleanup',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin service deleted successfully');
    assert.equal(response.body.data.status, 'deleted');
  } finally {
    adminServiceCrudService.deleteService = originalDeleteService;
    server.close();
  }
});

test('GET /api/admin/services/{service_id} validates UUID and returns detail for admin role', async () => {
  const originalGetServiceDetail = adminServiceCatalogService.getServiceDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.read_all'],
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
          permissions: ['service.read_all'],
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
    permissions: ['service.read_all'],
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
