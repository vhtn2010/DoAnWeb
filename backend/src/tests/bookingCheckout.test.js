const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-customer-secret';

const app = require('../app');
const authService = require('../services/authService');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const bookingService = require('../services/bookingService');
const { createAccessToken } = require('../utils/sessionToken');

const CART_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CUSTOMER_ID = '99999999-9999-4999-8999-999999999999';
const TOUR_SERVICE_ID = '11111111-1111-4111-8111-111111111111';
const HOTEL_SERVICE_ID = '33333333-3333-4333-8333-333333333333';
const ROOM_TYPE_ID = '22222222-2222-4222-8222-222222222222';
const CART_ITEM_1_ID = '44444444-4444-4444-8444-444444444444';
const CART_ITEM_2_ID = '55555555-5555-4555-8555-555555555555';
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

test.after(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test('bookingService.checkout creates a pending_payment booking from an active cart', async () => {
  let createCheckoutPayload = null;
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async ({ body, service_id: serviceId }) => {
        if (serviceId === TOUR_SERVICE_ID) {
          assert.equal(body.service_type, 'tour');

          return {
            available: true,
            available_quantity: 6,
            currency: 'VND',
            issues: [],
            total_amount: 3600000,
            unit_price: 1800000,
          };
        }

        return {
          available: true,
          available_quantity: 3,
          currency: 'VND',
          issues: [],
          total_amount: 2400000,
          unit_price: 1200000,
        };
      },
    },
    repository: {
      countActiveBookingsByVoucherAndUser: async ({ userId, voucherId }) => {
        assert.equal(userId, CUSTOMER_ID);
        assert.equal(voucherId, 'voucher-1');
        return 0;
      },
      createCheckout: async (payload) => {
        createCheckoutPayload = payload;

        return {
          booking: {
            booking_code: payload.booking.booking_code,
            contact_email: payload.booking.contact_email,
            contact_name: payload.booking.contact_name,
            contact_phone: payload.booking.contact_phone,
            currency: payload.booking.currency,
            discount_amount: payload.booking.discount_amount,
            expires_at: payload.booking.expires_at,
            id: 'booking-1',
            note: payload.booking.note,
            status: payload.booking.status,
            subtotal_amount: payload.booking.subtotal_amount,
            total_amount: payload.booking.total_amount,
            voucher_id: payload.booking.voucher_id,
          },
          items: payload.bookingItems.map((item, index) => ({
            end_at: item.end_at,
            id: `booking-item-${index + 1}`,
            quantity: item.quantity,
            reference_id: item.reference_id,
            service_id: item.service_id,
            service_type: item.service_type,
            start_at: item.start_at,
            status: item.status,
            title_snapshot: item.title_snapshot,
            total_amount: item.total_amount,
            traveller_info: item.traveller_info,
            unit_price: item.unit_price,
          })),
        };
      },
      getCartById: async (cartId) => {
        assert.equal(cartId, CART_ID);

        return {
          id: cartId,
          status: 'active',
          user_id: CUSTOMER_ID,
        };
      },
      getPublicServiceById: async (serviceId) => {
        if (serviceId === TOUR_SERVICE_ID) {
          return {
            base_price: '2000000',
            cancellation_policy: 'Free cancellation',
            currency: 'VND',
            description: 'Tour description',
            id: serviceId,
            location_text: 'Da Nang',
            provider_name: 'Net Viet Travel',
            sale_price: '1800000',
            service_code: 'TOUR001',
            service_type: 'tour',
            short_description: 'Tour short',
            slug: 'tour-da-nang',
            title: 'Tour Da Nang',
          };
        }

        return {
          base_price: '1500000',
          cancellation_policy: null,
          currency: 'VND',
          description: 'Hotel description',
          id: serviceId,
          location_text: 'Hoi An',
          provider_name: 'Net Viet Travel',
          sale_price: null,
          service_code: 'HOTEL001',
          service_type: 'hotel',
          short_description: 'Hotel short',
          slug: 'hotel-hoi-an',
          title: 'Hotel Hoi An',
        };
      },
      getRoomTypeById: async (roomTypeId) => ({
        available_rooms: '3',
        base_price: '1200000',
        bed_type: 'queen',
        id: roomTypeId,
        max_adults: '2',
        max_children: '1',
        name: 'Deluxe Room',
      }),
      getVoucherByCode: async (code) => {
        assert.equal(code, 'SUMMER10');

        return {
          code,
          discount_type: 'percent',
          discount_value: '10',
          id: 'voucher-1',
          max_discount_amount: '1000000',
          min_order_amount: '1000000',
          status: 'active',
          usage_limit_per_user: 1,
          usage_limit_total: 10,
          used_count: 0,
          valid_from: '2026-01-01T00:00:00.000Z',
          valid_to: '2026-12-31T23:59:59.000Z',
        };
      },
      listCartItemsByCartId: async () => [
        {
          created_at: '2026-06-30T01:00:00.000Z',
          end_at: '2026-07-11T00:00:00.000Z',
          id: CART_ITEM_1_ID,
          options: null,
          quantity: 2,
          reference_id: null,
          service_id: TOUR_SERVICE_ID,
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          unit_price_snapshot: '1800000',
        },
        {
          created_at: '2026-06-30T01:05:00.000Z',
          end_at: '2026-08-03T10:00:00.000Z',
          id: CART_ITEM_2_ID,
          options: {
            adults: 2,
          },
          quantity: 1,
          reference_id: ROOM_TYPE_ID,
          service_id: HOTEL_SERVICE_ID,
          service_type: 'hotel',
          start_at: '2026-08-01T14:00:00.000Z',
          unit_price_snapshot: '1200000',
        },
      ],
    },
  });

  const result = await service.checkout({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      cart_id: CART_ID,
      contact_email: 'customer@example.com',
      contact_name: 'Nguyen Van A',
      contact_phone: '+84901234567',
      note: 'Please keep adjacent seats',
      travellers: [
        {
          cart_item_id: CART_ITEM_1_ID,
          travellers: [
            { full_name: 'Traveller 1' },
            { full_name: 'Traveller 2' },
          ],
        },
      ],
      voucher_code: 'SUMMER10',
    },
    headers: {
      'idempotency-key': 'checkout-001',
    },
  });

  assert.equal(createCheckoutPayload.cartId, CART_ID);
  assert.equal(createCheckoutPayload.idempotencyKey, 'checkout-001');
  assert.equal(createCheckoutPayload.booking.status, BOOKING_STATUS.PENDING_PAYMENT);
  assert.equal(createCheckoutPayload.booking.subtotal_amount, 4800000);
  assert.equal(createCheckoutPayload.booking.discount_amount, 480000);
  assert.equal(createCheckoutPayload.booking.total_amount, 4320000);
  assert.equal(createCheckoutPayload.bookingItems.length, 2);
  assert.equal(createCheckoutPayload.bookingItems[0].traveller_info.length, 2);
  assert.equal(result.status, 'pending_payment');
  assert.equal(result.subtotal_amount, 4800000);
  assert.equal(result.discount_amount, 480000);
  assert.equal(result.total_amount, 4320000);
  assert.equal(result.items.length, 2);
});

test('bookingService.checkout rejects a non-active or foreign cart', async () => {
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async () => ({
        available: true,
        issues: [],
        unit_price: 1,
      }),
    },
    repository: {
      getCartById: async () => ({
        id: CART_ID,
        status: 'active',
        user_id: 'other-user',
      }),
    },
  });

  await assert.rejects(
    () => service.checkout({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        cart_id: CART_ID,
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
      },
      headers: {
        'idempotency-key': 'checkout-empty-1',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test('bookingService.checkout returns CART_EMPTY when cart has no items', async () => {
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async () => ({
        available: true,
        issues: [],
        unit_price: 1,
      }),
    },
    repository: {
      getCartById: async () => ({
        id: CART_ID,
        status: 'active',
        user_id: CUSTOMER_ID,
      }),
      listCartItemsByCartId: async () => [],
    },
  });

  await assert.rejects(
    () => service.checkout({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        cart_id: CART_ID,
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
      },
      headers: {
        'idempotency-key': 'checkout-unavailable-1',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.CART_EMPTY);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('bookingService.checkout returns CART_ITEM_NOT_AVAILABLE when availability fails', async () => {
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async () => ({
        available: false,
        available_quantity: 0,
        currency: 'VND',
        issues: [
          {
            code: 'ROOM_TYPE_NOT_ACTIVE',
            message: 'The requested room type is not active.',
          },
        ],
        total_amount: 1200000,
        unit_price: 1200000,
      }),
    },
    repository: {
      getCartById: async () => ({
        id: CART_ID,
        status: 'active',
        user_id: CUSTOMER_ID,
      }),
      getPublicServiceById: async () => ({
        base_price: '1500000',
        currency: 'VND',
        id: HOTEL_SERVICE_ID,
        sale_price: null,
        service_code: 'HOTEL001',
        service_type: 'hotel',
        slug: 'hotel-hoi-an',
        title: 'Hotel Hoi An',
      }),
      listCartItemsByCartId: async () => [
        {
          id: CART_ITEM_2_ID,
          options: {
            adults: 2,
          },
          quantity: 1,
          reference_id: ROOM_TYPE_ID,
          service_id: HOTEL_SERVICE_ID,
          service_type: 'hotel',
          end_at: '2026-08-03T12:00:00.000Z',
          start_at: '2026-08-01T14:00:00.000Z',
        },
      ],
    },
  });

  await assert.rejects(
    () => service.checkout({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        cart_id: CART_ID,
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
      },
      headers: {
        'idempotency-key': 'checkout-unavailable-1',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE);
      assert.equal(error.statusCode, 400);
      assert.equal(error.details[0].cart_item_id, CART_ITEM_2_ID);
      return true;
    },
  );
});

test('bookingService.checkout rejects expired vouchers', async () => {
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async () => ({
        available: true,
        issues: [],
        total_amount: 2000000,
        unit_price: 2000000,
      }),
    },
    repository: {
      getCartById: async () => ({
        id: CART_ID,
        status: 'active',
        user_id: CUSTOMER_ID,
      }),
      getPublicServiceById: async () => ({
        base_price: '2000000',
        currency: 'VND',
        id: TOUR_SERVICE_ID,
        sale_price: null,
        service_code: 'TOUR001',
        service_type: 'tour',
        slug: 'tour-da-nang',
        title: 'Tour Da Nang',
      }),
      getVoucherByCode: async () => ({
        code: 'OLD',
        discount_type: 'fixed_amount',
        discount_value: '100000',
        id: 'voucher-1',
        max_discount_amount: null,
        min_order_amount: '100000',
        status: 'expired',
        usage_limit_per_user: 1,
        usage_limit_total: 10,
        used_count: 0,
        valid_from: '2025-01-01T00:00:00.000Z',
        valid_to: '2025-12-31T23:59:59.000Z',
      }),
      listCartItemsByCartId: async () => [
        {
          id: CART_ITEM_1_ID,
          options: null,
          quantity: 1,
          reference_id: null,
          service_id: TOUR_SERVICE_ID,
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
        },
      ],
    },
  });

  await assert.rejects(
    () => service.checkout({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        cart_id: CART_ID,
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
        voucher_code: 'OLD',
      },
      headers: {
        'idempotency-key': 'checkout-voucher-1',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VOUCHER_EXPIRED);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('bookingService.checkout requires Idempotency-Key', async () => {
  const service = bookingService.createBookingService({
    repository: {
      createCheckout: async () => {
        throw new Error('createCheckout should not be called');
      },
    },
  });

  await assert.rejects(
    () => service.checkout({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        cart_id: CART_ID,
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
      },
      headers: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('bookingService.checkout returns the repository replay result for a duplicate idempotency key', async () => {
  const service = bookingService.createBookingService({
    availabilityService: {
      getServiceAvailability: async () => ({
        available: true,
        available_quantity: 1,
        currency: 'VND',
        issues: [],
        total_amount: 1000000,
        unit_price: 1000000,
      }),
    },
    repository: {
      createCheckout: async () => ({
        booking: {
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '+84901234567',
          currency: 'VND',
          discount_amount: 0,
          booking_code: 'BK20260630AAAA',
          expires_at: '2026-07-01T01:00:00.000Z',
          id: 'booking-1',
          note: null,
          status: 'pending_payment',
          subtotal_amount: 1000000,
          total_amount: 1000000,
          voucher_id: null,
        },
        items: [
          {
            end_at: '2026-07-11T00:00:00.000Z',
            id: 'booking-item-1',
            quantity: 1,
            reference_id: null,
            service_id: TOUR_SERVICE_ID,
            service_type: 'tour',
            start_at: '2026-07-10T00:00:00.000Z',
            status: 'pending',
            title_snapshot: 'Tour Da Nang',
            total_amount: 1000000,
            unit_price: 1000000,
          },
        ],
      }),
      getCartById: async () => ({
        id: CART_ID,
        status: 'active',
        user_id: CUSTOMER_ID,
      }),
      getPublicServiceById: async () => ({
        currency: 'VND',
        id: TOUR_SERVICE_ID,
        provider_name: 'Net Viet Travel',
        service_code: 'TOUR001',
        service_type: 'tour',
        title: 'Tour Da Nang',
      }),
      listCartItemsByCartId: async () => ([
        {
          created_at: '2026-06-30T01:00:00.000Z',
          end_at: '2026-07-11T00:00:00.000Z',
          id: CART_ITEM_1_ID,
          options: null,
          quantity: 1,
          reference_id: null,
          service_id: TOUR_SERVICE_ID,
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          unit_price_snapshot: '1000000',
        },
      ]),
    },
  });

  const result = await service.checkout({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      cart_id: CART_ID,
      contact_email: 'customer@example.com',
      contact_name: 'Nguyen Van A',
    },
    headers: {
      'idempotency-key': 'checkout-001',
    },
  });

  assert.equal(result.id, 'booking-1');
  assert.equal(result.booking_code, 'BK20260630AAAA');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'booking-item-1');
});

test('POST /bookings/checkout requires a customer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/checkout`,
      {
        body: {
          cart_id: CART_ID,
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /bookings/checkout rejects non-customer roles', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'admin',
    tokenId: 'token-admin',
    user: { id: 'admin-1', role_code: 'admin' },
    userId: 'admin-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/checkout`,
      {
        body: {
          cart_id: CART_ID,
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /bookings/checkout returns 201 with the checkout payload', async () => {
  const originalCheckout = bookingService.checkout;
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });

  bookingService.checkout = async ({ auth, body, headers }) => {
    assert.equal(auth.roleCode, 'customer');
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(body.cart_id, CART_ID);
    assert.equal(headers['idempotency-key'], 'checkout-001');

    return {
      booking_code: 'BK20260630AAAA',
      currency: 'VND',
      discount_amount: 0,
      expires_at: '2026-07-01T01:00:00.000Z',
      id: 'booking-1',
      items: [],
      status: 'pending_payment',
      subtotal_amount: 1000000,
      total_amount: 1000000,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/checkout`,
      {
        body: {
          cart_id: CART_ID,
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
          'Idempotency-Key': 'checkout-001',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'pending_payment');
    assert.equal(response.body.data.booking_code, 'BK20260630AAAA');
  } finally {
    bookingService.checkout = originalCheckout;
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
