const assert = require('node:assert/strict');
const test = require('node:test');

const { createCartService } = require('../services/cartService');

test('getActiveCart returns newest active cart items with safe summary data', async () => {
  const fixedNow = new Date('2026-07-01T09:00:00.000Z');
  const repositoryCalls = [];
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      createActiveCart: async () => {
        throw new Error('createActiveCart should not be called');
      },
      findActiveCartsByUser: async (queryExecutor, userId) => {
        repositoryCalls.push({
          method: 'findActiveCartsByUser',
          queryExecutorType: typeof queryExecutor,
          userId,
        });

        return [
          {
            created_at: new Date('2026-07-01T08:00:00.000Z'),
            id: 'cart-2',
            status: 'active',
            updated_at: new Date('2026-07-01T08:30:00.000Z'),
          },
        ];
      },
      listCartItems: async (queryExecutor, cartId) => {
        repositoryCalls.push({
          cartId,
          method: 'listCartItems',
          queryExecutorType: typeof queryExecutor,
        });

        return [
          {
            address: null,
            airline_name: null,
            arrival_airport: null,
            arrival_at: null,
            base_price: '3290000.00',
            cabin_class: null,
            cancellation_policy: 'Free cancellation within 24h',
            cart_id: 'cart-2',
            checkin_time: null,
            checkout_time: null,
            created_at: new Date('2026-07-01T08:05:00.000Z'),
            current_price: '2990000.00',
            currency: 'VND',
            departure_airport: null,
            departure_at: null,
            departure_location: 'Ho Chi Minh City',
            destination_location: 'Ha Long',
            duration_days: 3,
            duration_nights: 2,
            end_at: new Date('2026-07-22T11:00:00.000Z'),
            fare_price: null,
            flight_detail_id: null,
            flight_number: null,
            flight_status: null,
            id: 'item-1',
            location_text: 'Quang Ninh',
            options: {
              adults: 2,
            },
            primary_image: 'https://cdn.example.com/tour.jpg',
            quantity: 2,
            reference_id: null,
            room_type_available_rooms: null,
            room_type_base_price: null,
            room_type_bed_type: null,
            room_type_id: null,
            room_type_max_adults: null,
            room_type_max_children: null,
            room_type_name: null,
            room_type_status: null,
            sale_price: '2990000.00',
            seat_class: null,
            seats_available: null,
            service_id: 'service-tour-1',
            service_status: 'active',
            service_type: 'tour',
            short_description: 'Tour 3N2D',
            slug: 'ha-long-3n2d',
            star_rating: null,
            start_at: new Date('2026-07-20T07:00:00.000Z'),
            title: 'Ha Long 3N2D',
            train_arrival_at: null,
            train_departure_at: null,
            train_detail_id: null,
            train_fare_price: null,
            train_number: null,
            train_seats_available: null,
            train_status: null,
            transport_type: 'bus',
            unit_price_snapshot: '2990000.00',
          },
          {
            address: '1 Tran Phu, Da Nang',
            airline_name: null,
            arrival_airport: null,
            arrival_at: null,
            base_price: '1800000.00',
            cabin_class: null,
            cancellation_policy: 'Non-refundable',
            cart_id: 'cart-2',
            checkin_time: '14:00:00',
            checkout_time: '12:00:00',
            created_at: new Date('2026-07-01T08:06:00.000Z'),
            current_price: '1500000.00',
            currency: 'VND',
            departure_airport: null,
            departure_at: null,
            departure_location: null,
            destination_location: null,
            duration_days: null,
            duration_nights: null,
            end_at: new Date('2026-07-24T12:00:00.000Z'),
            fare_price: null,
            flight_detail_id: null,
            flight_number: null,
            flight_status: null,
            id: 'item-2',
            location_text: 'Da Nang',
            options: {
              adults: 2,
              children: 1,
            },
            primary_image: 'https://cdn.example.com/hotel.jpg',
            quantity: 1,
            reference_id: 'room-1',
            room_type_available_rooms: 4,
            room_type_base_price: '1500000.00',
            room_type_bed_type: 'King bed',
            room_type_id: 'room-1',
            room_type_max_adults: 2,
            room_type_max_children: 1,
            room_type_name: 'Deluxe Ocean View',
            room_type_status: 'active',
            sale_price: '1500000.00',
            seat_class: null,
            seats_available: null,
            service_id: 'service-hotel-1',
            service_status: 'active',
            service_type: 'hotel',
            short_description: 'Beachfront hotel',
            slug: 'da-nang-beach-hotel',
            star_rating: '4.5',
            start_at: new Date('2026-07-22T14:00:00.000Z'),
            title: 'Da Nang Beach Hotel',
            train_arrival_at: null,
            train_departure_at: null,
            train_detail_id: null,
            train_fare_price: null,
            train_number: null,
            train_seats_available: null,
            train_status: null,
            transport_type: null,
            unit_price_snapshot: '1500000.00',
          },
        ];
      },
    },
    withTransactionImpl: async (callback) =>
      callback({
        query: async () => {
          throw new Error('client.query should not be called directly in service test');
        },
      }),
  });

  const result = await service.getActiveCart({
    userId: 'user-1',
  });

  assert.deepEqual(repositoryCalls, [
    {
      method: 'findActiveCartsByUser',
      queryExecutorType: 'function',
      userId: 'user-1',
    },
    {
      cartId: 'cart-2',
      method: 'listCartItems',
      queryExecutorType: 'function',
    },
  ]);
  assert.deepEqual(result, {
    created_at: '2026-07-01T08:00:00.000Z',
    id: 'cart-2',
    items: [
      {
        created_at: '2026-07-01T08:05:00.000Z',
        end_at: '2026-07-22T11:00:00.000Z',
        id: 'item-1',
        options: {
          adults: 2,
        },
        quantity: 2,
        reference_id: null,
        selection: null,
        service: {
          base_price: 3290000,
          cancellation_policy: 'Free cancellation within 24h',
          currency: 'VND',
          current_price: 2990000,
          details: {
            departure_location: 'Ho Chi Minh City',
            destination_location: 'Ha Long',
            duration_days: 3,
            duration_nights: 2,
            transport_type: 'bus',
          },
          id: 'service-tour-1',
          location_text: 'Quang Ninh',
          primary_image: 'https://cdn.example.com/tour.jpg',
          sale_price: 2990000,
          service_type: 'tour',
          short_description: 'Tour 3N2D',
          slug: 'ha-long-3n2d',
          status: 'active',
          title: 'Ha Long 3N2D',
        },
        service_id: 'service-tour-1',
        service_type: 'tour',
        start_at: '2026-07-20T07:00:00.000Z',
        total_amount: 5980000,
        unit_price_snapshot: 2990000,
      },
      {
        created_at: '2026-07-01T08:06:00.000Z',
        end_at: '2026-07-24T12:00:00.000Z',
        id: 'item-2',
        options: {
          adults: 2,
          children: 1,
        },
        quantity: 1,
        reference_id: 'room-1',
        selection: {
          available_rooms: 4,
          base_price: 1500000,
          bed_type: 'King bed',
          id: 'room-1',
          max_adults: 2,
          max_children: 1,
          name: 'Deluxe Ocean View',
          status: 'active',
          type: 'room_type',
        },
        service: {
          base_price: 1800000,
          cancellation_policy: 'Non-refundable',
          currency: 'VND',
          current_price: 1500000,
          details: {
            address: '1 Tran Phu, Da Nang',
            checkin_time: '14:00:00',
            checkout_time: '12:00:00',
            star_rating: 4.5,
          },
          id: 'service-hotel-1',
          location_text: 'Da Nang',
          primary_image: 'https://cdn.example.com/hotel.jpg',
          sale_price: 1500000,
          service_type: 'hotel',
          short_description: 'Beachfront hotel',
          slug: 'da-nang-beach-hotel',
          status: 'active',
          title: 'Da Nang Beach Hotel',
        },
        service_id: 'service-hotel-1',
        service_type: 'hotel',
        start_at: '2026-07-22T14:00:00.000Z',
        total_amount: 1500000,
        unit_price_snapshot: 1500000,
      },
    ],
    status: 'active',
    summary: {
      currency: 'VND',
      item_count: 2,
      quantity_total: 3,
      subtotal_amount: 7480000,
      total_amount: 7480000,
    },
    updated_at: '2026-07-01T08:30:00.000Z',
  });
});

test('getActiveCart creates a new active cart when customer has none', async () => {
  const fixedNow = new Date('2026-07-01T10:00:00.000Z');
  const repositoryCalls = [];
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      createActiveCart: async (queryExecutor, payload) => {
        repositoryCalls.push({
          method: 'createActiveCart',
          payload,
          queryExecutorType: typeof queryExecutor,
        });

        return {
          created_at: fixedNow,
          id: 'cart-new',
          status: 'active',
          updated_at: fixedNow,
        };
      },
      findActiveCartsByUser: async (queryExecutor, userId) => {
        repositoryCalls.push({
          method: 'findActiveCartsByUser',
          queryExecutorType: typeof queryExecutor,
          userId,
        });

        return [];
      },
      listCartItems: async (queryExecutor, cartId) => {
        repositoryCalls.push({
          cartId,
          method: 'listCartItems',
          queryExecutorType: typeof queryExecutor,
        });

        return [];
      },
    },
    withTransactionImpl: async (callback) =>
      callback({
        query: async () => {
          throw new Error('client.query should not be called directly in service test');
        },
      }),
  });

  const result = await service.getActiveCart({
    userId: 'user-2',
  });

  assert.deepEqual(repositoryCalls, [
    {
      method: 'findActiveCartsByUser',
      queryExecutorType: 'function',
      userId: 'user-2',
    },
    {
      method: 'createActiveCart',
      payload: {
        createdAt: fixedNow,
        userId: 'user-2',
      },
      queryExecutorType: 'function',
    },
    {
      cartId: 'cart-new',
      method: 'listCartItems',
      queryExecutorType: 'function',
    },
  ]);
  assert.deepEqual(result, {
    created_at: '2026-07-01T10:00:00.000Z',
    id: 'cart-new',
    items: [],
    status: 'active',
    summary: {
      currency: 'VND',
      item_count: 0,
      quantity_total: 0,
      subtotal_amount: 0,
      total_amount: 0,
    },
    updated_at: '2026-07-01T10:00:00.000Z',
  });
});

test('getActiveCart logs and uses newest cart when data contains multiple active carts', async () => {
  const loggerCalls = [];
  const service = createCartService({
    logger: {
      error: (message) => {
        loggerCalls.push(message);
      },
    },
    repository: {
      createActiveCart: async () => {
        throw new Error('createActiveCart should not be called');
      },
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T10:00:00.000Z'),
          id: 'cart-newest',
          status: 'active',
          updated_at: new Date('2026-07-01T10:10:00.000Z'),
        },
        {
          created_at: new Date('2026-07-01T09:00:00.000Z'),
          id: 'cart-older',
          status: 'active',
          updated_at: new Date('2026-07-01T09:10:00.000Z'),
        },
      ],
      listCartItems: async () => [],
    },
    withTransactionImpl: async (callback) =>
      callback({
        query: async () => {
          throw new Error('client.query should not be called directly in service test');
        },
      }),
  });

  const result = await service.getActiveCart({
    userId: 'user-3',
  });

  assert.equal(loggerCalls.length, 1);
  assert.match(
    loggerCalls[0],
    /Detected multiple active carts for user user-3\. Using newest cart cart-newest\./,
  );
  assert.equal(result.id, 'cart-newest');
  assert.deepEqual(result.summary, {
    currency: 'VND',
    item_count: 0,
    quantity_total: 0,
    subtotal_amount: 0,
    total_amount: 0,
  });
});

test('getActiveCart reloads active cart after unique constraint conflict on create', async () => {
  const repositoryCalls = [];
  let findAttempt = 0;
  const service = createCartService({
    repository: {
      createActiveCart: async () => {
        repositoryCalls.push('create');
        const error = new Error('duplicate key value violates unique constraint');
        error.code = '23505';
        throw error;
      },
      findActiveCartsByUser: async () => {
        findAttempt += 1;
        repositoryCalls.push(`find:${findAttempt}`);

        if (findAttempt === 1) {
          return [];
        }

        return [
          {
            created_at: new Date('2026-07-01T11:00:00.000Z'),
            id: 'cart-from-race',
            status: 'active',
            updated_at: new Date('2026-07-01T11:00:00.000Z'),
          },
        ];
      },
      listCartItems: async () => {
        repositoryCalls.push('list');
        return [];
      },
    },
    withTransactionImpl: async (callback) =>
      callback({
        query: async () => {
          throw new Error('client.query should not be called directly in service test');
        },
      }),
  });

  const result = await service.getActiveCart({
    userId: 'user-4',
  });

  assert.deepEqual(repositoryCalls, ['find:1', 'create', 'find:2', 'list']);
  assert.equal(result.id, 'cart-from-race');
});
