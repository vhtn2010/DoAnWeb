const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createCartService } = require('../services/cartService');
const { calculatePricingSummary } = require('../utils/pricing');

const createTransactionStub = () => ({
  query: async () => {
    throw new Error('client.query should not be called directly in cart service tests');
  },
});

const expectCartSummary = (items = [], options = {}) => {
  const summary = calculatePricingSummary(items, options);
  const {
    cart_id: cartId,
    voucher,
    ...cartSummary
  } = summary;

  void cartId;
  void voucher;

  return cartSummary;
};

const createEnrichedCartItemRow = ({
  createdAt = '2026-07-01T08:05:00.000Z',
  id = 'item-1',
  options = null,
  primaryImage = 'https://cdn.example.com/service.jpg',
  quantity = 1,
  referenceId = null,
  salePrice = '2990000.00',
  serviceId = 'service-1',
  serviceType = 'tour',
  startAt = '2026-07-20T07:00:00.000Z',
  status = 'active',
  title = 'Sample Service',
  unitPriceSnapshot = '2990000.00',
} = {}) => ({
  address: serviceType === 'hotel' || serviceType === 'room' ? '1 Tran Phu' : null,
  airline_name: null,
  arrival_airport: null,
  arrival_at: null,
  base_price: '3290000.00',
  cabin_class: null,
  cancellation_policy: 'Policy',
  cart_id: 'cart-1',
  checkin_time:
    serviceType === 'hotel' || serviceType === 'room' ? '14:00:00' : null,
  checkout_time:
    serviceType === 'hotel' || serviceType === 'room' ? '12:00:00' : null,
  created_at: new Date(createdAt),
  current_price: salePrice,
  currency: 'VND',
  departure_airport: null,
  departure_at: null,
  departure_location: serviceType === 'tour' ? 'Ho Chi Minh City' : null,
  destination_location: serviceType === 'tour' ? 'Ha Long' : null,
  duration_days: serviceType === 'tour' ? 3 : null,
  duration_nights: serviceType === 'tour' ? 2 : null,
  end_at: null,
  fare_price: null,
  flight_detail_id: null,
  flight_number: null,
  flight_status: null,
  id,
  location_text: 'Da Nang',
  options,
  primary_image: primaryImage,
  quantity,
  reference_id: referenceId,
  room_type_available_rooms:
    serviceType === 'hotel' || serviceType === 'room' ? 4 : null,
  room_type_base_price:
    serviceType === 'hotel' || serviceType === 'room' ? '1500000.00' : null,
  room_type_bed_type:
    serviceType === 'hotel' || serviceType === 'room' ? 'King bed' : null,
  room_type_id:
    serviceType === 'hotel' || serviceType === 'room' ? referenceId : null,
  room_type_max_adults:
    serviceType === 'hotel' || serviceType === 'room' ? 2 : null,
  room_type_max_children:
    serviceType === 'hotel' || serviceType === 'room' ? 1 : null,
  room_type_name:
    serviceType === 'hotel' || serviceType === 'room'
      ? 'Deluxe Ocean View'
      : null,
  room_type_status:
    serviceType === 'hotel' || serviceType === 'room' ? 'active' : null,
  sale_price: salePrice,
  seat_class: null,
  seats_available: null,
  service_id: serviceId,
  service_status: status,
  service_type: serviceType,
  short_description: 'Short description',
  slug: 'sample-service',
  star_rating: serviceType === 'hotel' || serviceType === 'room' ? '4.5' : null,
  start_at: startAt ? new Date(startAt) : null,
  title,
  train_arrival_at: null,
  train_departure_at: null,
  train_detail_id: null,
  train_fare_price: null,
  train_number: null,
  train_seats_available: null,
  train_status: null,
  transport_type: serviceType === 'tour' ? 'bus' : null,
  unit_price_snapshot: unitPriceSnapshot,
});

test('getActiveCart returns newest active cart items with safe summary data', async () => {
  const repositoryCalls = [];
  const service = createCartService({
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
          createEnrichedCartItemRow({
            id: 'item-1',
            options: {
              adults: 2,
            },
            quantity: 2,
          }),
        ];
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
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
  assert.equal(result.id, 'cart-2');
  assert.deepEqual(result.summary, expectCartSummary([
    {
      id: 'item-1',
      options: { adults: 2 },
      quantity: 2,
      service_type: 'tour',
      unit_price_snapshot: 2990000,
    },
  ]));
});

test('addCartItem creates active cart, inserts item, and returns fresh summary', async () => {
  const fixedNow = new Date('2026-07-01T10:00:00.000Z');
  const calls = [];
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      createActiveCart: async (queryExecutor, payload) => {
        calls.push({
          method: 'createActiveCart',
          payload,
        });

        return {
          created_at: fixedNow,
          id: 'cart-new',
          status: 'active',
          updated_at: fixedNow,
        };
      },
      findActiveCartsByUser: async () => [],
      getServiceById: async (queryExecutor, serviceId) => {
        calls.push({
          method: 'getServiceById',
          serviceId,
        });

        return {
          base_price: '3290000.00',
          currency: 'VND',
          deleted_at: null,
          id: serviceId,
          metadata: null,
          sale_price: '2990000.00',
          service_type: 'tour',
          status: 'active',
          title: 'Ha Long 3N2D',
        };
      },
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 10,
            date: '2026-07-20',
          },
        ],
      }),
      insertCartItem: async (queryExecutor, payload) => {
        calls.push({
          method: 'insertCartItem',
          payload,
        });

        return {
          id: 'item-new',
        };
      },
      listCartItemRecords: async () => [],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-new',
          options: {
            adults: 2,
          },
          quantity: 2,
          serviceId: '11111111-1111-4111-8111-111111111111',
          startAt: '2026-07-20T07:00:00.000Z',
        }),
      ],
      touchCart: async (queryExecutor, payload) => {
        calls.push({
          method: 'touchCart',
          payload,
        });

        return {
          created_at: fixedNow,
          id: 'cart-new',
          status: 'active',
          updated_at: fixedNow,
        };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.addCartItem({
    payload: {
      options: {
        adults: 2,
      },
      quantity: 2,
      service_id: '11111111-1111-4111-8111-111111111111',
      service_type: 'tour',
      start_at: '2026-07-20T07:00:00.000Z',
    },
    userId: 'user-2',
  });

  assert.deepEqual(result, {
    cart_id: 'cart-new',
    cart_item_id: 'item-new',
    summary: expectCartSummary([
      {
        id: 'item-new',
        options: { adults: 2 },
        quantity: 2,
        service_type: 'tour',
        unit_price_snapshot: 2990000,
      },
    ]),
  });
  assert.equal(calls.find((entry) => entry.method === 'insertCartItem').payload.unitPriceSnapshot, 2990000);
});

test('addCartItem accepts tour max group size when available slot field is missing', async () => {
  const fixedNow = new Date('2026-07-01T10:00:00.000Z');
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      createActiveCart: async () => ({
        created_at: fixedNow,
        id: 'cart-new',
        status: 'active',
        updated_at: fixedNow,
      }),
      findActiveCartsByUser: async () => [],
      getServiceById: async (queryExecutor, serviceId) => ({
        base_price: '3290000.00',
        currency: 'VND',
        deleted_at: null,
        id: serviceId,
        metadata: null,
        sale_price: '2990000.00',
        service_type: 'tour',
        status: 'active',
        title: 'Ha Long 3N2D',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            date: '2026-07-20',
          },
        ],
        max_group_size: 12,
      }),
      insertCartItem: async () => ({
        id: 'item-new',
      }),
      listCartItemRecords: async () => [],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-new',
          quantity: 2,
          serviceId: '11111111-1111-4111-8111-111111111111',
          startAt: '2026-07-20T07:00:00.000Z',
        }),
      ],
      touchCart: async () => ({
        created_at: fixedNow,
        id: 'cart-new',
        status: 'active',
        updated_at: fixedNow,
      }),
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.addCartItem({
    payload: {
      quantity: 2,
      service_id: '11111111-1111-4111-8111-111111111111',
      service_type: 'tour',
      start_at: '2026-07-20T07:00:00.000Z',
    },
    userId: 'user-2',
  });

  assert.equal(result.cart_item_id, 'item-new');
});

test('addCartItem merges duplicate items and updates quantity with current snapshot', async () => {
  const calls = [];
  const serviceId = '22222222-2222-4222-8222-222222222222';
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      createActiveCart: async () => {
        throw new Error('createActiveCart should not be called');
      },
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T09:00:00.000Z'),
          id: 'cart-merge',
          status: 'active',
          updated_at: new Date('2026-07-01T09:30:00.000Z'),
        },
      ],
      getServiceById: async () => ({
        base_price: '3500000.00',
        currency: 'VND',
        deleted_at: null,
        id: serviceId,
        metadata: null,
        sale_price: '3000000.00',
        service_type: 'tour',
        status: 'active',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 5,
            date: '2026-07-20',
          },
        ],
      }),
      listCartItemRecords: async () => [
        {
          cart_id: 'cart-merge',
          created_at: new Date('2026-07-01T09:05:00.000Z'),
          end_at: null,
          id: 'item-existing',
          options: {
            adults: 2,
          },
          quantity: 2,
          reference_id: null,
          service_id: serviceId,
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2800000.00',
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-existing',
          options: {
            adults: 2,
          },
          quantity: 4,
          serviceId,
          unitPriceSnapshot: '3000000.00',
        }),
      ],
      touchCart: async () => ({
        created_at: new Date('2026-07-01T09:00:00.000Z'),
        id: 'cart-merge',
        status: 'active',
        updated_at: new Date('2026-07-01T09:40:00.000Z'),
      }),
      updateCartItem: async (queryExecutor, payload) => {
        calls.push(payload);
        return {
          id: payload.cartItemId,
        };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.addCartItem({
    payload: {
      options: {
        adults: 2,
      },
      quantity: 2,
      service_id: serviceId,
      service_type: 'tour',
      start_at: '2026-07-20T07:00:00.000Z',
    },
    userId: 'user-3',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].cartItemId, 'item-existing');
  assert.equal(calls[0].quantity, 4);
  assert.equal(calls[0].unitPriceSnapshot, 3000000);
  assert.deepEqual(result.summary, expectCartSummary([
    {
      id: 'item-existing',
      options: { adults: 2 },
      quantity: 4,
      service_type: 'tour',
      unit_price_snapshot: 3000000,
    },
  ]));
});

test('addCartItem rejects inactive service with CART_ITEM_NOT_AVAILABLE', async () => {
  const service = createCartService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: 'service-hidden',
        service_type: 'tour',
        status: 'hidden',
      }),
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.addCartItem({
        payload: {
          quantity: 1,
          service_id: '11111111-1111-4111-8111-111111111111',
          service_type: 'tour',
        },
        userId: 'user-4',
      }),
    (error) =>
      error.code === API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE &&
      error.statusCode === 400,
  );
});

test('updateCartItem rejects forbidden fields in PATCH payload', async () => {
  const service = createCartService({
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.updateCartItem({
        cartItemId: '11111111-1111-4111-8111-111111111111',
        payload: {
          service_id: 'another-service',
        },
        userId: 'user-5',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'service_id'),
  );
});

test('updateCartItem keeps previous snapshot when only quantity changes', async () => {
  const calls = [];
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T09:00:00.000Z'),
          id: 'cart-qty',
          status: 'active',
          updated_at: new Date('2026-07-01T09:30:00.000Z'),
        },
      ],
      getCartItemById: async () => ({
        cart_id: 'cart-qty',
        created_at: new Date('2026-07-01T09:05:00.000Z'),
        end_at: null,
        id: 'item-qty',
        options: {
          adults: 2,
        },
        quantity: 2,
        reference_id: null,
        service_id: 'service-tour-qty',
        service_type: 'tour',
        start_at: new Date('2026-07-20T07:00:00.000Z'),
        unit_price_snapshot: '2800000.00',
      }),
      getServiceById: async () => ({
        base_price: '3500000.00',
        currency: 'VND',
        deleted_at: null,
        id: 'service-tour-qty',
        metadata: null,
        sale_price: '3000000.00',
        service_type: 'tour',
        status: 'active',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 5,
            date: '2026-07-20',
          },
        ],
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-qty',
          options: {
            adults: 2,
          },
          quantity: 3,
          serviceId: 'service-tour-qty',
          unitPriceSnapshot: '2800000.00',
        }),
      ],
      touchCart: async () => ({
        created_at: new Date('2026-07-01T09:00:00.000Z'),
        id: 'cart-qty',
        status: 'active',
        updated_at: new Date('2026-07-01T09:40:00.000Z'),
      }),
      updateCartItem: async (queryExecutor, payload) => {
        calls.push(payload);
        return {
          id: payload.cartItemId,
        };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.updateCartItem({
    cartItemId: '11111111-1111-4111-8111-111111111111',
    payload: {
      quantity: 3,
    },
    userId: 'user-6',
  });

  assert.equal(calls[0].unitPriceSnapshot, 2800000);
  assert.equal(result.cart_item.unit_price_snapshot, 2800000);
  assert.deepEqual(result.summary, expectCartSummary([
    {
      id: 'item-qty',
      options: { adults: 2 },
      quantity: 3,
      service_type: 'tour',
      unit_price_snapshot: 2800000,
    },
  ]));
});

test('updateCartItem refreshes snapshot when options change', async () => {
  const calls = [];
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T09:00:00.000Z'),
          id: 'cart-opt',
          status: 'active',
          updated_at: new Date('2026-07-01T09:30:00.000Z'),
        },
      ],
      getCartItemById: async () => ({
        cart_id: 'cart-opt',
        created_at: new Date('2026-07-01T09:05:00.000Z'),
        end_at: null,
        id: 'item-opt',
        options: {
          adults: 1,
        },
        quantity: 1,
        reference_id: 'room-type-1',
        service_id: 'service-hotel-1',
        service_type: 'hotel',
        start_at: new Date('2026-07-22T14:00:00.000Z'),
        unit_price_snapshot: '1200000.00',
      }),
      getRoomTypeById: async () => ({
        available_rooms: 4,
        base_price: '1500000.00',
        hotel_service_id: 'service-hotel-1',
        id: 'room-type-1',
        max_adults: 2,
        max_children: 1,
        status: 'active',
      }),
      getServiceById: async () => ({
        base_price: '1800000.00',
        currency: 'VND',
        deleted_at: null,
        id: 'service-hotel-1',
        metadata: null,
        sale_price: '1500000.00',
        service_type: 'hotel',
        status: 'active',
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-opt',
          options: {
            adults: 2,
          },
          quantity: 1,
          referenceId: 'room-type-1',
          serviceId: 'service-hotel-1',
          serviceType: 'hotel',
          unitPriceSnapshot: '1500000.00',
        }),
      ],
      touchCart: async () => ({
        created_at: new Date('2026-07-01T09:00:00.000Z'),
        id: 'cart-opt',
        status: 'active',
        updated_at: new Date('2026-07-01T09:40:00.000Z'),
      }),
      updateCartItem: async (queryExecutor, payload) => {
        calls.push(payload);
        return {
          id: payload.cartItemId,
        };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.updateCartItem({
    cartItemId: '22222222-2222-4222-8222-222222222222',
    payload: {
      options: {
        adults: 2,
      },
    },
    userId: 'user-7',
  });

  assert.equal(calls[0].unitPriceSnapshot, 1500000);
  assert.equal(result.cart_item.unit_price_snapshot, 1500000);
});

test('deleteCartItem removes item from active cart and returns zeroed summary when cart becomes empty', async () => {
  const service = createCartService({
    repository: {
      deleteCartItem: async () => 1,
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T09:00:00.000Z'),
          id: 'cart-del',
          status: 'active',
          updated_at: new Date('2026-07-01T09:30:00.000Z'),
        },
      ],
      getCartItemById: async () => ({
        cart_id: 'cart-del',
        id: 'item-del',
      }),
      listCartItems: async () => [],
      touchCart: async () => ({
        created_at: new Date('2026-07-01T09:00:00.000Z'),
        id: 'cart-del',
        status: 'active',
        updated_at: new Date('2026-07-01T09:40:00.000Z'),
      }),
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.deleteCartItem({
    cartItemId: '33333333-3333-4333-8333-333333333333',
    userId: 'user-8',
  });

  assert.deepEqual(result, {
    cart_id: 'cart-del',
    deleted_item_id: 'item-del',
    summary: expectCartSummary(),
  });
});

test('clearCartItems returns idempotent success when customer has no active cart', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.clearCartItems({
    userId: 'user-9',
  });

  assert.deepEqual(result, {
    cart_id: null,
    summary: expectCartSummary(),
  });
});

test('getCartSummary returns zero summary when customer has no active cart', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.getCartSummary({
    query: {},
    userId: 'user-10',
  });

  assert.deepEqual(result, calculatePricingSummary([], {
    cartId: null,
    voucher: null,
  }));
});

test('getCartSummary applies percent voucher only to matching service type items', async () => {
  const fixedNow = new Date('2026-07-01T09:00:00.000Z');
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-summary-1',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getVoucherByCode: async () => ({
        code: ' TOUR10 ',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-1',
        max_discount_amount: '500000.00',
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-1',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: 'tour',
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-15T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-07-31T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-tour',
          quantity: 1,
          serviceId: 'service-tour-summary',
          serviceType: 'tour',
          unitPriceSnapshot: '2000000.00',
        }),
        createEnrichedCartItemRow({
          id: 'item-hotel',
          quantity: 1,
          referenceId: 'room-type-summary',
          salePrice: '1000000.00',
          serviceId: 'service-hotel-summary',
          serviceType: 'hotel',
          unitPriceSnapshot: '1000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.getCartSummary({
    query: {
      voucher_code: ' tour10 ',
    },
    userId: 'user-11',
  });

  assert.deepEqual(result, {
    ...calculatePricingSummary([
      {
        id: 'item-tour',
        quantity: 1,
        service_type: 'tour',
        unit_price_snapshot: 2000000,
      },
      {
        id: 'item-hotel',
        quantity: 1,
        service_type: 'hotel',
        unit_price_snapshot: 1000000,
      },
    ], {
      cartId: 'cart-summary-1',
      discountAmount: 200000,
    }),
    voucher: {
      applied: true,
      code: 'TOUR10',
      discount_amount: 200000,
      discount_type: 'percent',
      discount_value: 10,
      issue: null,
      max_discount_amount: 500000,
      min_order_amount: 1000000,
      promotion_id: 'promotion-1',
      target_service_type: 'tour',
    },
  });
});

test('getCartSummary returns voucher issue when voucher is expired', async () => {
  const fixedNow = new Date('2026-07-15T09:00:00.000Z');
  const service = createCartService({
    now: () => fixedNow,
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-summary-2',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getVoucherByCode: async () => ({
        code: 'SAVE50',
        discount_type: 'fixed_amount',
        discount_value: '500000.00',
        id: 'voucher-2',
        max_discount_amount: null,
        min_order_amount: '0.00',
        promotion_id: 'promotion-2',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 2,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-07-10T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-tour-expired',
          quantity: 1,
          serviceId: 'service-tour-expired',
          unitPriceSnapshot: '1500000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.getCartSummary({
    query: {
      voucher_code: 'save50',
    },
    userId: 'user-12',
  });

  assert.equal(result.discount_amount, 0);
  assert.equal(result.total_amount, 1720000);
  assert.deepEqual(result.voucher, {
    applied: false,
    code: 'SAVE50',
    discount_amount: 0,
    discount_type: 'fixed_amount',
    discount_value: 500000,
    issue: {
      code: 'VOUCHER_EXPIRED',
      message: 'Voucher is expired',
    },
    max_discount_amount: null,
    min_order_amount: 0,
    promotion_id: 'promotion-2',
    target_service_type: null,
  });
});

test('getCartSummary rejects invalid voucher_code query', async () => {
  const service = createCartService({
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.getCartSummary({
        query: {
          voucher_code: 'A'.repeat(51),
        },
        userId: 'user-13',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'voucher_code'),
  );
});

test('validateCart rejects empty cart with CART_EMPTY', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.validateCart({
        payload: {},
        userId: 'user-14',
      }),
    (error) =>
      error.code === API_ERROR_CODES.CART_EMPTY &&
      error.statusCode === 400,
  );
});

test('validateCart returns invalid result for inactive service, availability issues, and invalid voucher', async () => {
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-validate-invalid',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getServiceById: async (queryExecutor, serviceId) => {
        if (serviceId === 'service-hidden') {
          return {
            currency: 'VND',
            deleted_at: null,
            id: serviceId,
            service_type: 'tour',
            status: 'hidden',
            title: 'Hidden Tour',
          };
        }

        return {
          base_price: '2990000.00',
          currency: 'VND',
          deleted_at: null,
          id: serviceId,
          sale_price: '2990000.00',
          service_type: 'tour',
          status: 'active',
          title: 'Available Tour',
        };
      },
      getTourDetail: async (queryExecutor, serviceId) => {
        if (serviceId === 'service-tour-low-slots') {
          return {
            departure_schedule: [
              {
                available_slots: 2,
                date: '2026-07-20',
              },
            ],
          };
        }

        return {
          departure_schedule: [
            {
              available_slots: 10,
              date: '2026-07-20',
            },
          ],
        };
      },
      getVoucherByCode: async () => ({
        code: 'SAVE10',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-invalid',
        max_discount_amount: '500000.00',
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-invalid',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 1,
        usage_limit_total: 10,
        used_count: 0,
        voucher_status: 'disabled',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItemRecords: async () => [
        {
          cart_id: 'cart-validate-invalid',
          created_at: new Date('2026-07-01T08:05:00.000Z'),
          end_at: null,
          id: 'item-hidden',
          options: null,
          quantity: 1,
          reference_id: null,
          service_id: 'service-hidden',
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2990000.00',
        },
        {
          cart_id: 'cart-validate-invalid',
          created_at: new Date('2026-07-01T08:06:00.000Z'),
          end_at: null,
          id: 'item-low-slots',
          options: null,
          quantity: 3,
          reference_id: null,
          service_id: 'service-tour-low-slots',
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2990000.00',
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-hidden',
          serviceId: 'service-hidden',
          status: 'hidden',
          unitPriceSnapshot: '2990000.00',
        }),
        createEnrichedCartItemRow({
          id: 'item-low-slots',
          quantity: 3,
          serviceId: 'service-tour-low-slots',
          unitPriceSnapshot: '2990000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateCart({
    payload: {
      voucher_code: 'save10',
    },
    userId: 'user-15',
  });

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    [
      'SERVICE_NOT_ACTIVE',
      API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE,
      API_ERROR_CODES.VOUCHER_INVALID,
    ],
  );
  assert.equal(result.summary.voucher.issue.code, API_ERROR_CODES.VOUCHER_INVALID);
});

test('validateCart reports PRICE_CHANGED without mutating snapshot totals', async () => {
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-validate-price',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getServiceById: async () => ({
        base_price: '3290000.00',
        currency: 'VND',
        deleted_at: null,
        id: 'service-price-change',
        sale_price: '3200000.00',
        service_type: 'tour',
        status: 'active',
        title: 'Price Changed Tour',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 10,
            date: '2026-07-20',
          },
        ],
      }),
      listCartItemRecords: async () => [
        {
          cart_id: 'cart-validate-price',
          created_at: new Date('2026-07-01T08:05:00.000Z'),
          end_at: null,
          id: 'item-price-change',
          options: null,
          quantity: 1,
          reference_id: null,
          service_id: 'service-price-change',
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2990000.00',
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-price-change',
          salePrice: '3200000.00',
          serviceId: 'service-price-change',
          unitPriceSnapshot: '2990000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateCart({
    payload: {},
    userId: 'user-16',
  });

  assert.equal(result.valid, false);
  assert.equal(result.items[0].current_unit_price, 3200000);
  assert.equal(result.items[0].unit_price_snapshot, 2990000);
  assert.equal(result.items[0].issues[0].code, 'PRICE_CHANGED');
  assert.equal(result.summary.snapshot_subtotal_amount, 2990000);
  assert.equal(result.summary.subtotal_amount, 3200000);
});

test('validateCart returns valid true with current summary and applied voucher', async () => {
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-validate-valid',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getServiceById: async () => ({
        base_price: '2200000.00',
        currency: 'VND',
        deleted_at: null,
        id: 'service-valid-tour',
        sale_price: '2000000.00',
        service_type: 'tour',
        status: 'active',
        title: 'Valid Tour',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 10,
            date: '2026-07-20',
          },
        ],
      }),
      getVoucherByCode: async () => ({
        code: 'TOUR10',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-valid',
        max_discount_amount: '500000.00',
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-valid',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: 'tour',
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItemRecords: async () => [
        {
          cart_id: 'cart-validate-valid',
          created_at: new Date('2026-07-01T08:05:00.000Z'),
          end_at: null,
          id: 'item-valid-tour',
          options: null,
          quantity: 1,
          reference_id: null,
          service_id: 'service-valid-tour',
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2000000.00',
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-valid-tour',
          salePrice: '2000000.00',
          serviceId: 'service-valid-tour',
          unitPriceSnapshot: '2000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateCart({
    payload: {
      voucher_code: 'tour10',
    },
    userId: 'user-17',
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.subtotal_amount, 2000000);
  assert.equal(result.summary.discount_amount, 200000);
  assert.equal(result.summary.total_amount, 2044000);
  assert.equal(result.summary.voucher.applied, true);
});

test('applyCartVoucher rejects empty cart with CART_EMPTY', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.applyCartVoucher({
        payload: {
          code: 'SAVE10',
        },
        userId: 'user-18',
      }),
    (error) =>
      error.code === API_ERROR_CODES.CART_EMPTY &&
      error.statusCode === 400,
  );
});

test('applyCartVoucher returns strict applied voucher summary for valid cart', async () => {
  let savedVoucherContext;
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-apply-voucher',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getVoucherByCode: async () => ({
        code: 'TOUR10',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-apply',
        max_discount_amount: '500000.00',
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-apply',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: 'tour',
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-apply-voucher',
          salePrice: '2000000.00',
          serviceId: 'service-apply-voucher',
          unitPriceSnapshot: '2000000.00',
        }),
      ],
      saveUserVoucher: async (_queryExecutor, context) => {
        savedVoucherContext = context;
        return { voucher_id: context.voucherId };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.applyCartVoucher({
    payload: {
      code: 'tour10',
    },
    userId: 'user-19',
  });

  assert.equal(result.cart_id, 'cart-apply-voucher');
  assert.equal(result.final_total_amount, 2044000);
  assert.equal(result.summary.discount_amount, 200000);
  assert.equal(result.voucher.code, 'TOUR10');
  assert.equal(savedVoucherContext.userId, 'user-19');
  assert.equal(savedVoucherContext.voucherId, 'voucher-apply');
});

test('applyCartVoucher rejects invalid voucher with strict VOUCHER_INVALID error', async () => {
  const service = createCartService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-apply-invalid',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getVoucherByCode: async () => null,
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-apply-invalid',
          serviceId: 'service-apply-invalid',
          unitPriceSnapshot: '2000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.applyCartVoucher({
        payload: {
          code: 'missing',
        },
        userId: 'user-20',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VOUCHER_INVALID &&
      error.statusCode === 400,
  );
});

test('applyCartVoucher reports a future voucher as not active instead of expired', async () => {
  const service = createCartService({
    now: () => new Date('2026-07-01T09:57:00.000Z'),
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-apply-upcoming',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getVoucherByCode: async () => ({
        code: 'START10',
        discount_type: 'fixed_amount',
        discount_value: '100000.00',
        id: 'voucher-upcoming',
        max_discount_amount: null,
        min_order_amount: '0.00',
        promotion_id: 'promotion-upcoming',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-07-01T10:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 1,
        usage_limit_total: 10,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-07-01T10:00:00.000Z'),
        voucher_valid_to: new Date('2026-07-31T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-apply-upcoming',
          serviceId: 'service-apply-upcoming',
          unitPriceSnapshot: '2000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.applyCartVoucher({
        payload: {
          code: 'start10',
        },
        userId: 'user-upcoming',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VOUCHER_INVALID &&
      error.message === 'Voucher is not active yet' &&
      error.statusCode === 400,
  );
});

test('removeCartVoucher returns idempotent success when customer has no active cart', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.removeCartVoucher({
    userId: 'user-21',
  });

  assert.deepEqual(result, {
    cart_id: null,
    removed: true,
    summary: calculatePricingSummary([], {
      cartId: null,
      voucher: null,
    }),
  });
});

test('mergeGuestCart returns current cart unchanged when guest_items is empty', async () => {
  const service = createCartService({
    repository: {
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-merge-empty',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-merge-empty',
          quantity: 1,
          serviceId: 'service-merge-empty',
          unitPriceSnapshot: '2990000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.mergeGuestCart({
    payload: {
      guest_items: [],
    },
    userId: 'user-22',
  });

  assert.equal(result.merged_item_count, 0);
  assert.equal(result.cart.id, 'cart-merge-empty');
  assert.equal(result.summary.subtotal_amount, 2990000);
});

test('mergeGuestCart merges duplicate guest item with server-side snapshot pricing', async () => {
  const calls = [];
  const serviceId = '33333333-3333-4333-8333-333333333333';
  const service = createCartService({
    now: () => new Date('2026-07-01T10:00:00.000Z'),
    repository: {
      createActiveCart: async () => {
        throw new Error('createActiveCart should not be called');
      },
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-merge-server-price',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
        },
      ],
      getServiceById: async () => ({
        base_price: '3500000.00',
        currency: 'VND',
        deleted_at: null,
        id: serviceId,
        metadata: null,
        sale_price: '3000000.00',
        service_type: 'tour',
        status: 'active',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 6,
            date: '2026-07-20',
          },
        ],
      }),
      listCartItemRecords: async () => [
        {
          cart_id: 'cart-merge-server-price',
          created_at: new Date('2026-07-01T08:05:00.000Z'),
          end_at: null,
          id: 'item-existing-merge',
          options: {
            adults: 2,
          },
          quantity: 2,
          reference_id: null,
          service_id: serviceId,
          service_type: 'tour',
          start_at: new Date('2026-07-20T07:00:00.000Z'),
          unit_price_snapshot: '2800000.00',
        },
      ],
      listCartItems: async () => [
        createEnrichedCartItemRow({
          id: 'item-existing-merge',
          options: {
            adults: 2,
          },
          quantity: 4,
          serviceId,
          unitPriceSnapshot: '3000000.00',
        }),
      ],
      touchCart: async () => ({
        created_at: new Date('2026-07-01T08:00:00.000Z'),
        id: 'cart-merge-server-price',
        status: 'active',
        updated_at: new Date('2026-07-01T10:00:00.000Z'),
      }),
      updateCartItem: async (queryExecutor, payload) => {
        calls.push(payload);
        return {
          id: payload.cartItemId,
        };
      },
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.mergeGuestCart({
    payload: {
      guest_items: [
        {
          options: {
            adults: 2,
          },
          quantity: 2,
          service_id: serviceId,
          service_type: 'tour',
          start_at: '2026-07-20T07:00:00.000Z',
        },
      ],
    },
    userId: 'user-23',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].quantity, 4);
  assert.equal(calls[0].unitPriceSnapshot, 3000000);
  assert.equal(result.merged_item_count, 1);
  assert.equal(result.summary.subtotal_amount, 12000000);
});

test('mergeGuestCart rejects unit_price_snapshot sent by frontend', async () => {
  const service = createCartService({
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.mergeGuestCart({
        payload: {
          guest_items: [
            {
              quantity: 1,
              service_id: '11111111-1111-4111-8111-111111111111',
              service_type: 'tour',
              unit_price_snapshot: 1,
            },
          ],
        },
        userId: 'user-24',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'unit_price_snapshot'),
  );
});
