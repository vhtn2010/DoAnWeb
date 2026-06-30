const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminTrainDetailService = require('../services/adminTrainDetailService');

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

test('adminTrainDetailService.createTrainDetail validates parent train and defaults status open', async () => {
  let createCall = null;
  const service = adminTrainDetailService.createAdminTrainDetailService({
    repository: {
      createTrainDetail: async (payload) => {
        createCall = payload;
        return {
          arrival_at: '2026-08-01T03:00:00.000Z',
          arrival_station: 'Da Nang',
          departure_at: '2026-08-01T01:00:00.000Z',
          departure_station: 'Ha Noi',
          fare_price: 900000,
          id: '22222222-2222-4222-8222-222222222222',
          seat_class: 'sleeper',
          seats_available: 80,
          seats_total: 100,
          service_id: payload.serviceId,
          status: 'open',
          train_number: 'SE1',
        };
      },
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'train',
        status: 'draft',
      }),
    },
  });

  const result = await service.createTrainDetail({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      arrival_at: '2026-08-01T10:00:00+07:00',
      arrival_station: 'Da Nang',
      departure_at: '2026-08-01T08:00:00+07:00',
      departure_station: 'Ha Noi',
      fare_price: 900000,
      seat_class: 'sleeper',
      seats_available: 80,
      seats_total: 100,
      train_number: 'SE1',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(createCall.payload.status, 'open');
  assert.equal(result.status, 'open');
  assert.equal(result.fare_price, 900000);

  await assert.rejects(
    () => service.createTrainDetail({
      auth: {
        role: 'staff',
        userId: 'staff-1',
      },
      body: {
        arrival_at: '2026-08-01T10:00:00+07:00',
        arrival_station: 'Ha Noi',
        departure_at: '2026-08-01T08:00:00+07:00',
        departure_station: 'Ha Noi',
        fare_price: 900000,
        seat_class: 'sleeper',
        seats_available: 80,
        seats_total: 100,
        train_number: 'SE1',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'arrival_station',
          message: 'arrival_station must be different from departure_station',
        },
      ]);
      return true;
    },
  );
});

test('adminTrainDetailService.updateTrainDetail blocks parent changes and route edits when bookings exist', async () => {
  let updateCall = null;
  const service = adminTrainDetailService.createAdminTrainDetailService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'train',
        status: 'active',
      }),
      getTrainDetailById: async () => ({
        arrival_at: '2026-08-01T03:00:00.000Z',
        arrival_station: 'Da Nang',
        departure_at: '2026-08-01T01:00:00.000Z',
        departure_station: 'Ha Noi',
        fare_price: 900000,
        id: '22222222-2222-4222-8222-222222222222',
        seat_class: 'sleeper',
        seats_available: 80,
        seats_total: 100,
        service_id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
        train_number: 'SE1',
      }),
      trainDetailHasBookings: async () => true,
      updateTrainDetail: async (payload) => {
        updateCall = payload;
        return {
          arrival_at: '2026-08-01T03:00:00.000Z',
          arrival_station: 'Da Nang',
          departure_at: '2026-08-01T01:00:00.000Z',
          departure_station: 'Ha Noi',
          fare_price: 1000000,
          id: '22222222-2222-4222-8222-222222222222',
          seat_class: 'vip',
          seats_available: 70,
          seats_total: 100,
          service_id: '11111111-1111-4111-8111-111111111111',
          status: 'full',
          train_number: 'SE1',
        };
      },
    },
  });

  const result = await service.updateTrainDetail({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      fare_price: 1000000,
      seat_class: 'vip',
      seats_available: 70,
      status: 'full',
    },
    train_detail_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(updateCall.payload.status, 'full');
  assert.equal(result.seat_class, 'vip');

  await assert.rejects(
    () => service.updateTrainDetail({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        service_id: '33333333-3333-4333-8333-333333333333',
      },
      train_detail_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateTrainDetail({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        departure_station: 'Sai Gon',
      },
      train_detail_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'departure_station',
          message: 'departure_station cannot be changed when the train detail already has bookings',
        },
      ]);
      return true;
    },
  );
});

test('adminTrainDetailService.deleteTrainDetail cancels detail and keeps audit reason', async () => {
  let deleteCall = null;
  const service = adminTrainDetailService.createAdminTrainDetailService({
    repository: {
      cancelTrainDetail: async (payload) => {
        deleteCall = payload;
        return {
          arrival_at: '2026-08-01T03:00:00.000Z',
          arrival_station: 'Da Nang',
          departure_at: '2026-08-01T01:00:00.000Z',
          departure_station: 'Ha Noi',
          fare_price: 900000,
          id: '22222222-2222-4222-8222-222222222222',
          seat_class: 'sleeper',
          seats_available: 80,
          seats_total: 100,
          service_id: '11111111-1111-4111-8111-111111111111',
          status: 'cancelled',
          train_number: 'SE1',
        };
      },
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'train',
        status: 'active',
      }),
      getTrainDetailById: async () => ({
        arrival_at: '2026-08-01T03:00:00.000Z',
        arrival_station: 'Da Nang',
        departure_at: '2026-08-01T01:00:00.000Z',
        departure_station: 'Ha Noi',
        fare_price: 900000,
        id: '22222222-2222-4222-8222-222222222222',
        seat_class: 'sleeper',
        seats_available: 80,
        seats_total: 100,
        service_id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
        train_number: 'SE1',
      }),
      trainDetailHasBookings: async () => true,
    },
  });

  const result = await service.deleteTrainDetail({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      reason: 'Cancel by admin policy',
    },
    train_detail_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(deleteCall.logMetadata.reason, 'Cancel by admin policy');
  assert.equal(deleteCall.logMetadata.has_bookings, true);
  assert.equal(result.status, 'cancelled');
});

test('POST /api/admin/services/{service_id}/train-details requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/train-details`,
      {
        body: {
          train_number: 'SE1',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/admin/services/{service_id}/train-details returns 201 for created detail', async () => {
  const originalCreateTrainDetail = adminTrainDetailService.createTrainDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminTrainDetailService.createTrainDetail = async () => ({
    arrival_at: '2026-08-01T03:00:00.000Z',
    arrival_station: 'Da Nang',
    departure_at: '2026-08-01T01:00:00.000Z',
    departure_station: 'Ha Noi',
    fare_price: 900000,
    id: '22222222-2222-4222-8222-222222222222',
    seat_class: 'sleeper',
    seats_available: 80,
    seats_total: 100,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'open',
    train_number: 'SE1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/train-details`,
      {
        body: {
          arrival_at: '2026-08-01T10:00:00+07:00',
          arrival_station: 'Da Nang',
          departure_at: '2026-08-01T08:00:00+07:00',
          departure_station: 'Ha Noi',
          fare_price: 900000,
          seat_class: 'sleeper',
          seats_available: 80,
          seats_total: 100,
          train_number: 'SE1',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.train_number, 'SE1');
  } finally {
    adminTrainDetailService.createTrainDetail = originalCreateTrainDetail;
    server.close();
  }
});

test('PATCH /api/admin/train-details/{train_detail_id} returns updated detail', async () => {
  const originalUpdateTrainDetail = adminTrainDetailService.updateTrainDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminTrainDetailService.updateTrainDetail = async () => ({
    arrival_at: '2026-08-01T03:00:00.000Z',
    arrival_station: 'Da Nang',
    departure_at: '2026-08-01T01:00:00.000Z',
    departure_station: 'Ha Noi',
    fare_price: 1000000,
    id: '22222222-2222-4222-8222-222222222222',
    seat_class: 'vip',
    seats_available: 70,
    seats_total: 100,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'full',
    train_number: 'SE1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/train-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          fare_price: 1000000,
          status: 'full',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'full');
  } finally {
    adminTrainDetailService.updateTrainDetail = originalUpdateTrainDetail;
    server.close();
  }
});

test('DELETE /api/admin/train-details/{train_detail_id} blocks staff and allows admin', async () => {
  const server = app.listen(0);
  const staffToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/train-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Cancel train',
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }

  const originalDeleteTrainDetail = adminTrainDetailService.deleteTrainDetail;
  const successServer = app.listen(0);
  const adminToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'admin',
    sub: 'admin-1',
  });

  adminTrainDetailService.deleteTrainDetail = async () => ({
    arrival_at: '2026-08-01T03:00:00.000Z',
    arrival_station: 'Da Nang',
    departure_at: '2026-08-01T01:00:00.000Z',
    departure_station: 'Ha Noi',
    fare_price: 900000,
    id: '22222222-2222-4222-8222-222222222222',
    seat_class: 'sleeper',
    seats_available: 80,
    seats_total: 100,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'cancelled',
    train_number: 'SE1',
  });

  try {
    const response = await request(
      successServer,
      `${apiPrefix}/admin/train-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Cancel train',
        },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'cancelled');
  } finally {
    adminTrainDetailService.deleteTrainDetail = originalDeleteTrainDetail;
    successServer.close();
  }
});
