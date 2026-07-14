const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAdminServiceCrudRepository,
} = require('../database/adminServiceCrudRepository');

function createMockClient(queryLog) {
  return {
    query: async (sql, params = []) => {
      queryLog.push({ params, sql });
      return { rows: [] };
    },
    release() {},
  };
}

test('adminServiceCrudRepository.updateService stringifies tour jsonb detail fields', async () => {
  const queryLog = [];
  const client = createMockClient(queryLog);
  const repository = createAdminServiceCrudRepository({
    getPoolImpl: () => ({
      connect: async () => client,
    }),
  });

  const departureSchedule = [
    { date: '2026-08-20', available_quantity: 12 },
  ];
  const itinerary = [
    {
      actions: [
        {
          description: 'Khởi hành từ TP.HCM',
          time: '08:00',
          title: 'Khởi hành',
        },
      ],
      day_number: 1,
      summary: 'Ngày đầu tiên',
      title: 'Ngày 1',
    },
  ];

  await repository.updateService({
    actorUserId: 'admin-1',
    detailPayload: {
      departure_location: 'TP.HCM',
      departure_schedule: departureSchedule,
      destination_location: 'Đà Lạt',
      duration_days: 3,
      duration_nights: 2,
      excluded_services: 'Chi tiêu cá nhân',
      included_services: 'Xe đưa đón',
      itinerary,
      max_group_size: 20,
      terms: 'Điều khoản tour',
      transport_type: 'bus',
    },
    serviceId: '11111111-1111-4111-8111-111111111111',
    servicePayload: {
      title: 'UAT Tour 20260704',
    },
    serviceType: 'tour',
  });

  const tourUpsertQuery = queryLog.find((entry) =>
    entry.sql.includes('INSERT INTO tour_details'),
  );

  assert.ok(tourUpsertQuery);
  assert.equal(tourUpsertQuery.params[7], JSON.stringify(departureSchedule));
  assert.equal(tourUpsertQuery.params[8], JSON.stringify(itinerary));
});

test('adminServiceCrudRepository.updateService stringifies hotel amenities jsonb field', async () => {
  const queryLog = [];
  const client = createMockClient(queryLog);
  const repository = createAdminServiceCrudRepository({
    getPoolImpl: () => ({
      connect: async () => client,
    }),
  });

  const amenities = ['Hồ bơi', 'Buffet sáng', 'Xe đưa đón'];

  await repository.updateService({
    actorUserId: 'admin-1',
    detailPayload: {
      address: '123 Trần Hưng Đạo',
      amenities,
      checkin_time: '14:00',
      checkout_time: '12:00',
      hotel_policy: 'Không hút thuốc',
      star_rating: 5,
    },
    serviceId: '22222222-2222-4222-8222-222222222222',
    servicePayload: {
      title: 'Khách sạn UAT',
    },
    serviceType: 'hotel',
  });

  const hotelUpsertQuery = queryLog.find((entry) =>
    entry.sql.includes('INSERT INTO hotel_details'),
  );

  assert.ok(hotelUpsertQuery);
  assert.equal(hotelUpsertQuery.params[5], JSON.stringify(amenities));
});
