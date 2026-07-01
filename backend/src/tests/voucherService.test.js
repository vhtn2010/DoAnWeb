const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createVoucherService } = require('../services/voucherService');

const createTransactionStub = () => ({
  query: async () => {
    throw new Error('client.query should not be called directly in voucher service tests');
  },
});

const createCartItemRow = ({
  id = 'item-1',
  quantity = 1,
  serviceId = 'service-1',
  serviceType = 'tour',
  unitPriceSnapshot = '2000000.00',
} = {}) => ({
  id,
  quantity,
  service_id: serviceId,
  service_type: serviceType,
  unit_price_snapshot: unitPriceSnapshot,
});

test('validateVoucher uses current active cart when cart_id is omitted', async () => {
  const service = createVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: 'cart-active-1',
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
          user_id: 'user-1',
        },
      ],
      getVoucherByCode: async () => ({
        code: 'TOUR10',
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
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createCartItemRow(),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateVoucher({
    payload: {
      code: ' tour10 ',
    },
    userId: 'user-1',
  });

  assert.deepEqual(result, {
    cart_id: 'cart-active-1',
    code: 'TOUR10',
    currency: 'VND',
    discount_amount: 200000,
    discount_type: 'percent',
    discount_value: 10,
    eligible_subtotal_amount: 2000000,
    final_total_amount: 1800000,
    max_discount_amount: 500000,
    min_order_amount: 1000000,
    promotion_id: 'promotion-1',
    subtotal_amount: 2000000,
    target_service_type: 'tour',
    valid: true,
    voucher_id: 'voucher-1',
  });
});

test('validateVoucher accepts explicit cart_id that belongs to current customer', async () => {
  const calls = [];
  const service = createVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      getCartById: async (queryExecutor, cartId) => {
        calls.push({
          cartId,
          method: 'getCartById',
        });

        return {
          created_at: new Date('2026-07-01T08:00:00.000Z'),
          id: cartId,
          status: 'active',
          updated_at: new Date('2026-07-01T08:30:00.000Z'),
          user_id: 'user-2',
        };
      },
      getVoucherByCode: async () => ({
        code: 'SAVE300',
        discount_type: 'fixed_amount',
        discount_value: '300000.00',
        id: 'voucher-2',
        max_discount_amount: null,
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-2',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 5,
        usage_limit_total: 100,
        used_count: 1,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createCartItemRow({
          quantity: 2,
          serviceType: 'hotel',
          unitPriceSnapshot: '1000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateVoucher({
    payload: {
      cart_id: '22222222-2222-4222-8222-222222222222',
      code: 'save300',
    },
    userId: 'user-2',
  });

  assert.equal(result.cart_id, '22222222-2222-4222-8222-222222222222');
  assert.equal(result.discount_amount, 300000);
  assert.deepEqual(calls, [
    {
      cartId: '22222222-2222-4222-8222-222222222222',
      method: 'getCartById',
    },
  ]);
});

test('validateVoucher returns CART_EMPTY when customer has no active cart items', async () => {
  const service = createVoucherService({
    repository: {
      findActiveCartsByUser: async () => [],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.validateVoucher({
        payload: {
          code: 'SAVE10',
        },
        userId: 'user-empty',
      }),
    (error) =>
      error.code === API_ERROR_CODES.CART_EMPTY &&
      error.statusCode === 400,
  );
});

test('validateVoucher returns RESOURCE_NOT_FOUND for cart owned by another customer', async () => {
  const service = createVoucherService({
    repository: {
      getCartById: async () => ({
        id: 'cart-foreign',
        status: 'active',
        user_id: 'other-user',
      }),
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.validateVoucher({
        payload: {
          cart_id: '33333333-3333-4333-8333-333333333333',
          code: 'SAVE10',
        },
        userId: 'user-3',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('validateVoucher returns VOUCHER_EXPIRED when voucher is past valid_to', async () => {
  const service = createVoucherService({
    now: () => new Date('2026-07-20T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          id: 'cart-expired',
          status: 'active',
          user_id: 'user-4',
        },
      ],
      getVoucherByCode: async () => ({
        code: 'SAVE10',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-expired',
        max_discount_amount: null,
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-expired',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-07-10T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createCartItemRow(),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.validateVoucher({
        payload: {
          code: 'SAVE10',
        },
        userId: 'user-4',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VOUCHER_EXPIRED &&
      error.statusCode === 400,
  );
});

test('validateVoucher returns VOUCHER_USAGE_LIMIT_REACHED when per-user limit is reached', async () => {
  const service = createVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 1,
      findActiveCartsByUser: async () => [
        {
          id: 'cart-limit',
          status: 'active',
          user_id: 'user-5',
        },
      ],
      getVoucherByCode: async () => ({
        code: 'SAVE10',
        discount_type: 'percent',
        discount_value: '10.00',
        id: 'voucher-limit',
        max_discount_amount: null,
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-limit',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: null,
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createCartItemRow(),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  await assert.rejects(
    () =>
      service.validateVoucher({
        payload: {
          code: 'SAVE10',
        },
        userId: 'user-5',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED &&
      error.statusCode === 400,
  );
});

test('validateVoucher applies target_service_type subtotal and max_discount_amount cap', async () => {
  const service = createVoucherService({
    now: () => new Date('2026-07-01T09:00:00.000Z'),
    repository: {
      countUserVoucherUsages: async () => 0,
      findActiveCartsByUser: async () => [
        {
          id: 'cart-targeted',
          status: 'active',
          user_id: 'user-6',
        },
      ],
      getVoucherByCode: async () => ({
        code: 'TOUR25',
        discount_type: 'percent',
        discount_value: '25.00',
        id: 'voucher-targeted',
        max_discount_amount: '200000.00',
        min_order_amount: '1000000.00',
        promotion_id: 'promotion-targeted',
        promotion_status: 'active',
        promotion_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        promotion_valid_to: new Date('2026-08-01T00:00:00.000Z'),
        target_service_type: 'tour',
        usage_limit_per_user: 2,
        usage_limit_total: 100,
        used_count: 0,
        voucher_status: 'active',
        voucher_valid_from: new Date('2026-06-01T00:00:00.000Z'),
        voucher_valid_to: new Date('2026-08-01T00:00:00.000Z'),
      }),
      listCartItems: async () => [
        createCartItemRow({
          serviceType: 'tour',
          unitPriceSnapshot: '1500000.00',
        }),
        createCartItemRow({
          id: 'item-2',
          serviceId: 'service-2',
          serviceType: 'hotel',
          unitPriceSnapshot: '2000000.00',
        }),
      ],
    },
    withTransactionImpl: async (callback) => callback(createTransactionStub()),
  });

  const result = await service.validateVoucher({
    payload: {
      code: 'TOUR25',
    },
    userId: 'user-6',
  });

  assert.equal(result.subtotal_amount, 3500000);
  assert.equal(result.eligible_subtotal_amount, 1500000);
  assert.equal(result.discount_amount, 200000);
  assert.equal(result.final_total_amount, 3300000);
});
