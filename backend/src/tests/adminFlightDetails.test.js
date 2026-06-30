const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminFlightDetailService = require('../services/adminFlightDetailService');

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

test('adminFlightDetailService.createFlightDetail validates parent flight and defaults status open', async () => {
  let createCall = null;
  const service = adminFlightDetailService.createAdminFlightDetailService({
    repository: {
      createFlightDetail: async (payload) => {
        createCall = payload;
        return {
          airline_name: 'Vietnam Airlines',
          arrival_airport: 'DAD',
          arrival_at: '2026-08-01T03:00:00.000Z',
          cabin_class: 'economy',
          departure_airport: 'SGN',
          departure_at: '2026-08-01T01:00:00.000Z',
          fare_price: 1900000,
          flight_number: 'VN123',
          id: '22222222-2222-4222-8222-222222222222',
          seats_available: 25,
          seats_total: 30,
          service_id: payload.serviceId,
          status: 'open',
        };
      },
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'flight',
        status: 'draft',
      }),
    },
  });

  const result = await service.createFlightDetail({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      airline_name: 'Vietnam Airlines',
      arrival_airport: 'DAD',
      arrival_at: '2026-08-01T10:00:00+07:00',
      cabin_class: 'economy',
      departure_airport: 'SGN',
      departure_at: '2026-08-01T08:00:00+07:00',
      fare_price: 1900000,
      flight_number: 'VN123',
      seats_available: 25,
      seats_total: 30,
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(createCall.payload.status, 'open');
  assert.equal(result.status, 'open');
  assert.equal(result.fare_price, 1900000);

  await assert.rejects(
    () => service.createFlightDetail({
      auth: {
        role: 'staff',
        userId: 'staff-1',
      },
      body: {
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'SGN',
        arrival_at: '2026-08-01T10:00:00+07:00',
        cabin_class: 'economy',
        departure_airport: 'SGN',
        departure_at: '2026-08-01T08:00:00+07:00',
        fare_price: 1900000,
        flight_number: 'VN123',
        seats_available: 25,
        seats_total: 30,
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'arrival_airport',
          message: 'arrival_airport must be different from departure_airport',
        },
      ]);
      return true;
    },
  );
});

test('adminFlightDetailService.updateFlightDetail blocks parent changes and route edits when bookings exist', async () => {
  let updateCall = null;
  const service = adminFlightDetailService.createAdminFlightDetailService({
    repository: {
      flightDetailHasBookings: async () => true,
      getFlightDetailById: async () => ({
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'DAD',
        arrival_at: '2026-08-01T03:00:00.000Z',
        cabin_class: 'economy',
        departure_airport: 'SGN',
        departure_at: '2026-08-01T01:00:00.000Z',
        fare_price: 1900000,
        flight_number: 'VN123',
        id: '22222222-2222-4222-8222-222222222222',
        seats_available: 25,
        seats_total: 30,
        service_id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'flight',
        status: 'active',
      }),
      updateFlightDetail: async (payload) => {
        updateCall = payload;
        return {
          airline_name: 'Vietnam Airlines',
          arrival_airport: 'DAD',
          arrival_at: '2026-08-01T03:00:00.000Z',
          cabin_class: 'business',
          departure_airport: 'SGN',
          departure_at: '2026-08-01T01:00:00.000Z',
          fare_price: 2200000,
          flight_number: 'VN123',
          id: '22222222-2222-4222-8222-222222222222',
          seats_available: 20,
          seats_total: 30,
          service_id: '11111111-1111-4111-8111-111111111111',
          status: 'full',
        };
      },
    },
  });

  const result = await service.updateFlightDetail({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      cabin_class: 'business',
      fare_price: 2200000,
      seats_available: 20,
      status: 'full',
    },
    flight_detail_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(updateCall.payload.status, 'full');
  assert.equal(result.cabin_class, 'business');

  await assert.rejects(
    () => service.updateFlightDetail({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        service_id: '33333333-3333-4333-8333-333333333333',
      },
      flight_detail_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateFlightDetail({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        departure_airport: 'HAN',
      },
      flight_detail_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'departure_airport',
          message: 'departure_airport cannot be changed when the flight detail already has bookings',
        },
      ]);
      return true;
    },
  );
});

test('adminFlightDetailService.deleteFlightDetail cancels detail and keeps audit reason', async () => {
  let deleteCall = null;
  const service = adminFlightDetailService.createAdminFlightDetailService({
    repository: {
      cancelFlightDetail: async (payload) => {
        deleteCall = payload;
        return {
          airline_name: 'Vietnam Airlines',
          arrival_airport: 'DAD',
          arrival_at: '2026-08-01T03:00:00.000Z',
          cabin_class: 'economy',
          departure_airport: 'SGN',
          departure_at: '2026-08-01T01:00:00.000Z',
          fare_price: 1900000,
          flight_number: 'VN123',
          id: '22222222-2222-4222-8222-222222222222',
          seats_available: 25,
          seats_total: 30,
          service_id: '11111111-1111-4111-8111-111111111111',
          status: 'cancelled',
        };
      },
      flightDetailHasBookings: async () => true,
      getFlightDetailById: async () => ({
        airline_name: 'Vietnam Airlines',
        arrival_airport: 'DAD',
        arrival_at: '2026-08-01T03:00:00.000Z',
        cabin_class: 'economy',
        departure_airport: 'SGN',
        departure_at: '2026-08-01T01:00:00.000Z',
        fare_price: 1900000,
        flight_number: 'VN123',
        id: '22222222-2222-4222-8222-222222222222',
        seats_available: 25,
        seats_total: 30,
        service_id: '11111111-1111-4111-8111-111111111111',
        status: 'open',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'flight',
        status: 'active',
      }),
    },
  });

  const result = await service.deleteFlightDetail({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      reason: 'Cancel by admin policy',
    },
    flight_detail_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(deleteCall.logMetadata.reason, 'Cancel by admin policy');
  assert.equal(deleteCall.logMetadata.has_bookings, true);
  assert.equal(result.status, 'cancelled');
});

test('POST /api/admin/services/{service_id}/flight-details requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/flight-details`,
      {
        body: {
          airline_name: 'Vietnam Airlines',
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

test('POST /api/admin/services/{service_id}/flight-details returns 201 for created detail', async () => {
  const originalCreateFlightDetail = adminFlightDetailService.createFlightDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminFlightDetailService.createFlightDetail = async () => ({
    airline_name: 'Vietnam Airlines',
    arrival_airport: 'DAD',
    arrival_at: '2026-08-01T03:00:00.000Z',
    cabin_class: 'economy',
    departure_airport: 'SGN',
    departure_at: '2026-08-01T01:00:00.000Z',
    fare_price: 1900000,
    flight_number: 'VN123',
    id: '22222222-2222-4222-8222-222222222222',
    seats_available: 25,
    seats_total: 30,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'open',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/flight-details`,
      {
        body: {
          airline_name: 'Vietnam Airlines',
          arrival_airport: 'DAD',
          arrival_at: '2026-08-01T10:00:00+07:00',
          cabin_class: 'economy',
          departure_airport: 'SGN',
          departure_at: '2026-08-01T08:00:00+07:00',
          fare_price: 1900000,
          flight_number: 'VN123',
          seats_available: 25,
          seats_total: 30,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.flight_number, 'VN123');
  } finally {
    adminFlightDetailService.createFlightDetail = originalCreateFlightDetail;
    server.close();
  }
});

test('PATCH /api/admin/flight-details/{flight_detail_id} returns updated detail', async () => {
  const originalUpdateFlightDetail = adminFlightDetailService.updateFlightDetail;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminFlightDetailService.updateFlightDetail = async () => ({
    airline_name: 'Vietnam Airlines',
    arrival_airport: 'DAD',
    arrival_at: '2026-08-01T03:00:00.000Z',
    cabin_class: 'business',
    departure_airport: 'SGN',
    departure_at: '2026-08-01T01:00:00.000Z',
    fare_price: 2200000,
    flight_number: 'VN123',
    id: '22222222-2222-4222-8222-222222222222',
    seats_available: 20,
    seats_total: 30,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'full',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/flight-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          fare_price: 2200000,
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
    adminFlightDetailService.updateFlightDetail = originalUpdateFlightDetail;
    server.close();
  }
});

test('DELETE /api/admin/flight-details/{flight_detail_id} blocks staff and allows admin', async () => {
  const server = app.listen(0);
  const staffToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/flight-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Cancel flight',
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

  const originalDeleteFlightDetail = adminFlightDetailService.deleteFlightDetail;
  const successServer = app.listen(0);
  const adminToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'admin',
    sub: 'admin-1',
  });

  adminFlightDetailService.deleteFlightDetail = async () => ({
    airline_name: 'Vietnam Airlines',
    arrival_airport: 'DAD',
    arrival_at: '2026-08-01T03:00:00.000Z',
    cabin_class: 'economy',
    departure_airport: 'SGN',
    departure_at: '2026-08-01T01:00:00.000Z',
    fare_price: 1900000,
    flight_number: 'VN123',
    id: '22222222-2222-4222-8222-222222222222',
    seats_available: 25,
    seats_total: 30,
    service_id: '11111111-1111-4111-8111-111111111111',
    status: 'cancelled',
  });

  try {
    const response = await request(
      successServer,
      `${apiPrefix}/admin/flight-details/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Cancel flight',
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
    adminFlightDetailService.deleteFlightDetail = originalDeleteFlightDetail;
    successServer.close();
  }
});
