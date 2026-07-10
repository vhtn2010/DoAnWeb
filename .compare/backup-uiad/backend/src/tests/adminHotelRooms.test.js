const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const adminHotelRoomService = require('../services/adminHotelRoomService');

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

test('adminHotelRoomService.listRooms validates parent hotel and optional status filter', async () => {
  const service = adminHotelRoomService.createAdminHotelRoomService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
      listRoomsByHotel: async (payload) => {
        assert.deepEqual(payload, {
          hotelServiceId: '11111111-1111-4111-8111-111111111111',
          status: 'hidden',
        });
        return [
          {
            available_rooms: 3,
            base_price: 1500000,
            bed_type: 'King',
            created_at: '2026-07-01T01:00:00.000Z',
            description: 'Sea view room',
            hotel_service_id: '11111111-1111-4111-8111-111111111111',
            id: '22222222-2222-4222-8222-222222222222',
            max_adults: 2,
            max_children: 1,
            name: 'Deluxe',
            status: 'hidden',
            total_rooms: 5,
            updated_at: '2026-07-01T02:00:00.000Z',
          },
        ];
      },
    },
  });

  const result = await service.listRooms({
    auth: {
      role: 'staff',
    },
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
    status: 'hidden',
  });

  assert.equal(result[0].status, 'hidden');
  assert.equal(result[0].base_price, 1500000);
});

test('adminHotelRoomService.createRoom validates inventory consistency and defaults status active', async () => {
  let createCall = null;
  const service = adminHotelRoomService.createAdminHotelRoomService({
    repository: {
      createRoom: async (payload) => {
        createCall = payload;
        return {
          available_rooms: 5,
          base_price: 1500000,
          bed_type: 'King',
          created_at: '2026-07-01T01:00:00.000Z',
          description: 'Sea view room',
          hotel_service_id: payload.hotelServiceId,
          id: '22222222-2222-4222-8222-222222222222',
          max_adults: 2,
          max_children: 1,
          name: 'Deluxe',
          status: 'active',
          total_rooms: 5,
          updated_at: '2026-07-01T01:00:00.000Z',
        };
      },
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'draft',
      }),
    },
  });

  const result = await service.createRoom({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      base_price: 1500000,
      bed_type: 'King',
      max_adults: 2,
      max_children: 1,
      name: 'Deluxe',
      total_rooms: 5,
    },
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(createCall.payload.status, 'active');
  assert.equal(result.available_rooms, 5);

  await assert.rejects(
    () => service.createRoom({
      auth: {
        role: 'staff',
        userId: 'staff-1',
      },
      body: {
        available_rooms: 6,
        base_price: 1500000,
        max_adults: 2,
        name: 'Broken room',
        total_rooms: 5,
      },
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'available_rooms',
          message: 'available_rooms must be less than or equal to total_rooms',
        },
      ]);
      return true;
    },
  );
});

test('adminHotelRoomService.updateRoom blocks hotel_service_id changes and preserves inventory consistency', async () => {
  let updateCall = null;
  const service = adminHotelRoomService.createAdminHotelRoomService({
    repository: {
      getRoomById: async () => ({
        available_rooms: 3,
        base_price: 1500000,
        bed_type: 'King',
        created_at: '2026-07-01T01:00:00.000Z',
        description: 'Sea view room',
        hotel_service_id: '11111111-1111-4111-8111-111111111111',
        id: '22222222-2222-4222-8222-222222222222',
        max_adults: 2,
        max_children: 1,
        name: 'Deluxe',
        status: 'active',
        total_rooms: 5,
        updated_at: '2026-07-01T02:00:00.000Z',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
      updateRoom: async (payload) => {
        updateCall = payload;
        return {
          available_rooms: 2,
          base_price: 1700000,
          bed_type: 'Twin',
          created_at: '2026-07-01T01:00:00.000Z',
          description: 'Updated room',
          hotel_service_id: '11111111-1111-4111-8111-111111111111',
          id: '22222222-2222-4222-8222-222222222222',
          max_adults: 2,
          max_children: 1,
          name: 'Deluxe Updated',
          status: 'hidden',
          total_rooms: 5,
          updated_at: '2026-07-01T03:00:00.000Z',
        };
      },
    },
  });

  const result = await service.updateRoom({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      available_rooms: 2,
      base_price: 1700000,
      bed_type: 'Twin',
      description: 'Updated room',
      name: 'Deluxe Updated',
      status: 'hidden',
    },
    room_type_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(updateCall.payload.status, 'hidden');
  assert.equal(result.status, 'hidden');

  await assert.rejects(
    () => service.updateRoom({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        hotel_service_id: '33333333-3333-4333-8333-333333333333',
      },
      room_type_id: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('adminHotelRoomService.deleteRoom switches to hidden when bookings exist and deleted otherwise', async () => {
  let deleteCalls = [];
  const repository = {
    getRoomById: async () => ({
      available_rooms: 3,
      base_price: 1500000,
      bed_type: 'King',
      created_at: '2026-07-01T01:00:00.000Z',
      description: 'Sea view room',
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
      id: '22222222-2222-4222-8222-222222222222',
      max_adults: 2,
      max_children: 1,
      name: 'Deluxe',
      status: 'active',
      total_rooms: 5,
      updated_at: '2026-07-01T02:00:00.000Z',
    }),
    getServiceById: async () => ({
      deleted_at: null,
      id: '11111111-1111-4111-8111-111111111111',
      service_type: 'hotel',
      status: 'active',
    }),
    roomHasBookings: async () => deleteCalls.length === 0,
    softDeleteRoom: async (payload) => {
      deleteCalls.push(payload);
      return {
        available_rooms: 3,
        base_price: 1500000,
        bed_type: 'King',
        created_at: '2026-07-01T01:00:00.000Z',
        description: 'Sea view room',
        hotel_service_id: '11111111-1111-4111-8111-111111111111',
        id: '22222222-2222-4222-8222-222222222222',
        max_adults: 2,
        max_children: 1,
        name: 'Deluxe',
        status: payload.nextStatus,
        total_rooms: 5,
        updated_at: '2026-07-01T04:00:00.000Z',
      };
    },
  };
  const service = adminHotelRoomService.createAdminHotelRoomService({
    repository,
  });

  const hiddenResult = await service.deleteRoom({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      reason: 'Room unavailable',
    },
    room_type_id: '22222222-2222-4222-8222-222222222222',
  });

  const deletedResult = await service.deleteRoom({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      reason: 'Cleanup unused room',
    },
    room_type_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(hiddenResult.status, 'hidden');
  assert.equal(deletedResult.status, 'deleted');
});

test('GET /api/admin/hotels/{hotel_service_id}/rooms requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/hotels/11111111-1111-4111-8111-111111111111/rooms`,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/hotels/{hotel_service_id}/rooms returns room list for staff', async () => {
  const originalListRooms = adminHotelRoomService.listRooms;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.read_all'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminHotelRoomService.listRooms = async () => [
    {
      available_rooms: 3,
      base_price: 1500000,
      bed_type: 'King',
      created_at: '2026-07-01T01:00:00.000Z',
      description: 'Sea view room',
      hotel_service_id: '11111111-1111-4111-8111-111111111111',
      id: '22222222-2222-4222-8222-222222222222',
      max_adults: 2,
      max_children: 1,
      name: 'Deluxe',
      status: 'active',
      total_rooms: 5,
      updated_at: '2026-07-01T02:00:00.000Z',
    },
  ];

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/hotels/11111111-1111-4111-8111-111111111111/rooms?status=active`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
  } finally {
    adminHotelRoomService.listRooms = originalListRooms;
    server.close();
  }
});

test('POST /api/admin/hotels/{hotel_service_id}/rooms returns 201 for created room', async () => {
  const originalCreateRoom = adminHotelRoomService.createRoom;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.create'],
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminHotelRoomService.createRoom = async () => ({
    available_rooms: 5,
    base_price: 1500000,
    bed_type: 'King',
    created_at: '2026-07-01T01:00:00.000Z',
    description: 'Sea view room',
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
    id: '22222222-2222-4222-8222-222222222222',
    max_adults: 2,
    max_children: 1,
    name: 'Deluxe',
    status: 'active',
    total_rooms: 5,
    updated_at: '2026-07-01T01:00:00.000Z',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/hotels/11111111-1111-4111-8111-111111111111/rooms`,
      {
        body: {
          base_price: 1500000,
          max_adults: 2,
          name: 'Deluxe',
          total_rooms: 5,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.name, 'Deluxe');
  } finally {
    adminHotelRoomService.createRoom = originalCreateRoom;
    server.close();
  }
});

test('PATCH /api/admin/rooms/{room_type_id} returns updated room', async () => {
  const originalUpdateRoom = adminHotelRoomService.updateRoom;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.update'],
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminHotelRoomService.updateRoom = async () => ({
    available_rooms: 2,
    base_price: 1700000,
    bed_type: 'Twin',
    created_at: '2026-07-01T01:00:00.000Z',
    description: 'Updated room',
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
    id: '22222222-2222-4222-8222-222222222222',
    max_adults: 2,
    max_children: 1,
    name: 'Deluxe Updated',
    status: 'hidden',
    total_rooms: 5,
    updated_at: '2026-07-01T03:00:00.000Z',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/rooms/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          name: 'Deluxe Updated',
          status: 'hidden',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'hidden');
  } finally {
    adminHotelRoomService.updateRoom = originalUpdateRoom;
    server.close();
  }
});

test('DELETE /api/admin/rooms/{room_type_id} blocks staff and allows admin', async () => {
  const server = app.listen(0);
  const staffToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/rooms/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Remove room',
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

  const originalDeleteRoom = adminHotelRoomService.deleteRoom;
  const successServer = app.listen(0);
  const adminToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['service.delete'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminHotelRoomService.deleteRoom = async () => ({
    available_rooms: 3,
    base_price: 1500000,
    bed_type: 'King',
    created_at: '2026-07-01T01:00:00.000Z',
    description: 'Sea view room',
    hotel_service_id: '11111111-1111-4111-8111-111111111111',
    id: '22222222-2222-4222-8222-222222222222',
    max_adults: 2,
    max_children: 1,
    name: 'Deluxe',
    status: 'hidden',
    total_rooms: 5,
    updated_at: '2026-07-01T04:00:00.000Z',
  });

  try {
    const response = await request(
      successServer,
      `${apiPrefix}/admin/rooms/22222222-2222-4222-8222-222222222222`,
      {
        body: {
          reason: 'Room unavailable',
        },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'hidden');
  } finally {
    adminHotelRoomService.deleteRoom = originalDeleteRoom;
    successServer.close();
  }
});
