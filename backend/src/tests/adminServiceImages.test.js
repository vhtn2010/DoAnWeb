const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminServiceImageService = require('../services/adminServiceImageService');

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

test('adminServiceImageService.addImage validates URL and creates image with primary support', async () => {
  let createCall = null;
  const service = adminServiceImageService.createAdminServiceImageService({
    repository: {
      createImage: async (payload) => {
        createCall = payload;
        return {
          alt_text: 'Hero image',
          cloudinary_public_id: 'service/hero',
          created_at: '2026-07-01T01:00:00.000Z',
          id: '22222222-2222-4222-8222-222222222222',
          image_url: 'https://example.com/hero.jpg',
          is_primary: true,
          service_id: payload.serviceId,
          sort_order: 1,
        };
      },
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'draft',
      }),
      listImagesByService: async () => [
        {
          id: 'existing-image',
        },
      ],
    },
  });

  const result = await service.addImage({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      alt_text: 'Hero image',
      cloudinary_public_id: 'service/hero',
      image_url: 'https://example.com/hero.jpg',
      is_primary: true,
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(createCall.payload.sort_order, 1);
  assert.equal(createCall.payload.is_primary, true);
  assert.equal(result.is_primary, true);
  assert.equal(result.sort_order, 1);
});

test('adminServiceImageService.updateImage rejects images belonging to another service', async () => {
  const service = adminServiceImageService.createAdminServiceImageService({
    repository: {
      getImageById: async () => ({
        id: '22222222-2222-4222-8222-222222222222',
        service_id: 'different-service-id',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
    },
  });

  await assert.rejects(
    () => service.updateImage({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        alt_text: 'New alt',
      },
      image_id: '22222222-2222-4222-8222-222222222222',
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'image_id',
          message: 'image_id does not belong to the target service',
        },
      ]);
      return true;
    },
  );
});

test('adminServiceImageService.deleteImage promotes next image when deleting the primary image', async () => {
  const service = adminServiceImageService.createAdminServiceImageService({
    repository: {
      deleteImage: async () => ({
        promotedImage: {
          alt_text: 'Next image',
          cloudinary_public_id: null,
          created_at: '2026-07-01T02:00:00.000Z',
          id: '33333333-3333-4333-8333-333333333333',
          image_url: 'https://example.com/next.jpg',
          is_primary: true,
          service_id: '11111111-1111-4111-8111-111111111111',
          sort_order: 1,
        },
      }),
      getImageById: async () => ({
        alt_text: 'Old primary',
        created_at: '2026-07-01T01:00:00.000Z',
        id: '22222222-2222-4222-8222-222222222222',
        image_url: 'https://example.com/old.jpg',
        is_primary: true,
        service_id: '11111111-1111-4111-8111-111111111111',
        sort_order: 0,
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
    },
  });

  const result = await service.deleteImage({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    image_id: '22222222-2222-4222-8222-222222222222',
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.deleted_image_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(result.promoted_primary_image.id, '33333333-3333-4333-8333-333333333333');
});

test('adminServiceImageService.reorderImages validates ownership for all image orders', async () => {
  const service = adminServiceImageService.createAdminServiceImageService({
    repository: {
      getImageById: async () => ({
        id: '33333333-3333-4333-8333-333333333333',
        service_id: 'different-service-id',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
      listImagesByService: async () => [
        {
          id: '22222222-2222-4222-8222-222222222222',
          service_id: '11111111-1111-4111-8111-111111111111',
        },
      ],
    },
  });

  await assert.rejects(
    () => service.reorderImages({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        image_orders: [
          {
            image_id: '33333333-3333-4333-8333-333333333333',
            sort_order: 0,
          },
        ],
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('POST /api/admin/services/{service_id}/images returns 201 with created image', async () => {
  const originalAddImage = adminServiceImageService.addImage;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  adminServiceImageService.addImage = async (payload) => {
    assert.equal(payload.body.image_url, 'https://example.com/hero.jpg');
    return {
      alt_text: 'Hero image',
      cloudinary_public_id: 'service/hero',
      created_at: '2026-07-01T01:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
      image_url: 'https://example.com/hero.jpg',
      is_primary: true,
      sort_order: 0,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/images`,
      {
        body: {
          alt_text: 'Hero image',
          image_url: 'https://example.com/hero.jpg',
          is_primary: true,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.image_url, 'https://example.com/hero.jpg');
  } finally {
    adminServiceImageService.addImage = originalAddImage;
    server.close();
  }
});

test('PATCH /api/admin/services/{service_id}/images/{image_id} returns updated image', async () => {
  const originalUpdateImage = adminServiceImageService.updateImage;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminServiceImageService.updateImage = async () => ({
    alt_text: 'Updated alt',
    cloudinary_public_id: 'service/hero',
    created_at: '2026-07-01T01:00:00.000Z',
    id: '22222222-2222-4222-8222-222222222222',
    image_url: 'https://example.com/hero.jpg',
    is_primary: false,
    sort_order: 2,
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/images/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          alt_text: 'Updated alt',
          sort_order: 2,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.alt_text, 'Updated alt');
  } finally {
    adminServiceImageService.updateImage = originalUpdateImage;
    server.close();
  }
});

test('DELETE /api/admin/services/{service_id}/images/{image_id} returns delete result', async () => {
  const originalDeleteImage = adminServiceImageService.deleteImage;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'system_admin',
    sub: 'sys-1',
  });

  adminServiceImageService.deleteImage = async () => ({
    deleted_image_id: '22222222-2222-4222-8222-222222222222',
    promoted_primary_image: null,
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/images/22222222-2222-4222-8222-222222222222`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.data.deleted_image_id,
      '22222222-2222-4222-8222-222222222222',
    );
  } finally {
    adminServiceImageService.deleteImage = originalDeleteImage;
    server.close();
  }
});

test('PUT /api/admin/services/{service_id}/images/reorder returns reordered images', async () => {
  const originalReorderImages = adminServiceImageService.reorderImages;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  adminServiceImageService.reorderImages = async () => [
    {
      alt_text: 'First image',
      cloudinary_public_id: null,
      created_at: '2026-07-01T01:00:00.000Z',
      id: '22222222-2222-4222-8222-222222222222',
      image_url: 'https://example.com/1.jpg',
      is_primary: true,
      sort_order: 0,
    },
    {
      alt_text: 'Second image',
      cloudinary_public_id: null,
      created_at: '2026-07-01T02:00:00.000Z',
      id: '33333333-3333-4333-8333-333333333333',
      image_url: 'https://example.com/2.jpg',
      is_primary: false,
      sort_order: 1,
    },
  ];

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/images/reorder`,
      {
        body: {
          image_orders: [
            {
              image_id: '22222222-2222-4222-8222-222222222222',
              sort_order: 0,
            },
            {
              image_id: '33333333-3333-4333-8333-333333333333',
              sort_order: 1,
            },
          ],
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PUT',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 2);
  } finally {
    adminServiceImageService.reorderImages = originalReorderImages;
    server.close();
  }
});
