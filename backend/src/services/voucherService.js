const {
  API_ERROR_CODES,
  CART_STATUS,
  DISCOUNT_TYPE,
  DOMAIN_CONSTRAINTS,
  PROMOTION_STATUS,
  VOUCHER_STATUS,
} = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const { createCartRepository } = require('../database/cartRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALIDATE_ALLOWED_FIELDS = new Set(['cart_id', 'code']);
const MAX_VOUCHER_CODE_LENGTH = 50;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createCartEmptyError = (message = 'Cart is empty') =>
  new AppError(message, {
    code: API_ERROR_CODES.CART_EMPTY,
    statusCode: 400,
  });

const createResourceNotFoundError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createVoucherError = (code, message) =>
  new AppError(message, {
    code,
    statusCode: 400,
  });

const ensureObjectPayload = (payload) =>
  payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a valid UUID`,
      },
    ]);
  }

  return value.trim();
};

const roundMoney = (value) => Number(value.toFixed(2));

const logMultipleActiveCarts = (logger, userId, carts) => {
  if (carts.length <= 1) {
    return;
  }

  logger.error(
    `Detected multiple active carts for user ${userId}. Using newest cart ${carts[0].id}.`,
  );
};

const normalizeValidateVoucherPayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter(
    (field) => !VALIDATE_ALLOWED_FIELDS.has(field),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...disallowedKeys.map((field) => ({
        field,
        message: `${field} is not allowed in POST /vouchers/validate`,
      })),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'code')) {
    details.push({
      field: 'code',
      message: 'code is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  if (typeof body.code !== 'string') {
    throw createValidationError([
      {
        field: 'code',
        message: 'code must be a string',
      },
    ]);
  }

  const code = body.code.trim().toUpperCase();

  if (!code) {
    throw createValidationError([
      {
        field: 'code',
        message: 'code is required',
      },
    ]);
  }

  if (code.length > MAX_VOUCHER_CODE_LENGTH) {
    throw createValidationError([
      {
        field: 'code',
        message: `code must not exceed ${MAX_VOUCHER_CODE_LENGTH} characters`,
      },
    ]);
  }

  return {
    cartId:
      body.cart_id == null || body.cart_id === ''
        ? null
        : parseUuid('cart_id', body.cart_id),
    code,
  };
};

const mapPricingItem = (itemRow) => {
  const quantity = Number(itemRow.quantity);
  const unitPriceSnapshot = Number(itemRow.unit_price_snapshot);

  return {
    quantity,
    service_type: itemRow.service_type,
    total_amount: roundMoney(unitPriceSnapshot * Math.max(quantity, 0)),
    unit_price_snapshot: unitPriceSnapshot,
  };
};

const buildPricingSummary = (
  items,
  {
    cartId,
    discountAmount = 0,
  },
) => {
  const subtotalAmount = roundMoney(
    items.reduce((total, item) => total + item.total_amount, 0),
  );
  const safeDiscount = roundMoney(
    Math.min(
      Math.max(discountAmount, 0),
      subtotalAmount,
    ),
  );

  return {
    cart_id: cartId,
    currency: DOMAIN_CONSTRAINTS.defaultCurrency,
    discount_amount: safeDiscount,
    item_count: items.length,
    quantity_total: items.reduce((total, item) => total + item.quantity, 0),
    subtotal_amount: subtotalAmount,
    total_amount: roundMoney(Math.max(subtotalAmount - safeDiscount, 0)),
  };
};

const calculateEligibleSubtotal = (items, targetServiceType) => {
  if (!targetServiceType) {
    return roundMoney(items.reduce((total, item) => total + item.total_amount, 0));
  }

  return roundMoney(
    items.reduce((total, item) => {
      if (item.service_type !== targetServiceType) {
        return total;
      }

      return total + item.total_amount;
    }, 0),
  );
};

const calculateVoucherDiscount = (voucher, eligibleSubtotal) => {
  let discountAmount = 0;

  if (voucher.discount_type === DISCOUNT_TYPE.PERCENT) {
    discountAmount =
      (eligibleSubtotal * Number(voucher.discount_value)) /
      DOMAIN_CONSTRAINTS.discountPercentMaxValue;
  } else if (voucher.discount_type === DISCOUNT_TYPE.FIXED_AMOUNT) {
    discountAmount = Number(voucher.discount_value);
  }

  if (voucher.max_discount_amount != null) {
    discountAmount = Math.min(
      discountAmount,
      Number(voucher.max_discount_amount),
    );
  }

  return roundMoney(Math.min(Math.max(discountAmount, 0), eligibleSubtotal));
};

const resolveExplicitCart = async (queryExecutor, repository, cartId, userId) => {
  const cart = await repository.getCartById(queryExecutor, cartId);

  if (!cart || cart.user_id !== userId) {
    throw createResourceNotFoundError('Cart not found');
  }

  return cart;
};

const resolveActiveCart = async (queryExecutor, repository, logger, userId) => {
  const activeCarts = await repository.findActiveCartsByUser(queryExecutor, userId);

  logMultipleActiveCarts(logger, userId, activeCarts);

  return activeCarts[0] || null;
};

const assertVoucherStructure = (voucher) => {
  if (
    voucher.discount_type === DISCOUNT_TYPE.PERCENT &&
    (Number(voucher.discount_value) <= 0 ||
      Number(voucher.discount_value) >
        DOMAIN_CONSTRAINTS.discountPercentMaxValue)
  ) {
    throw createVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'Voucher discount percent is invalid',
    );
  }

  if (
    voucher.discount_type === DISCOUNT_TYPE.FIXED_AMOUNT &&
    Number(voucher.discount_value) <= 0
  ) {
    throw createVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'Voucher discount value is invalid',
    );
  }

  if (
    voucher.discount_type !== DISCOUNT_TYPE.PERCENT &&
    voucher.discount_type !== DISCOUNT_TYPE.FIXED_AMOUNT
  ) {
    throw createVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'Voucher discount type is invalid',
    );
  }
};

const createVoucherService = ({
  logger = console,
  now = () => new Date(),
  repository = createCartRepository(),
  withTransactionImpl = withTransaction,
} = {}) => {
  const validateVoucher = async ({
    payload,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const { cartId, code } = normalizeValidateVoucherPayload(payload);
      const cart = cartId
        ? await resolveExplicitCart(queryExecutor, repository, cartId, userId)
        : await resolveActiveCart(queryExecutor, repository, logger, userId);

      if (!cart) {
        throw createCartEmptyError();
      }

      if (cart.status !== CART_STATUS.ACTIVE) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Cart is not active',
        );
      }

      const itemRows = await repository.listCartItems(queryExecutor, cart.id);
      const items = itemRows.map(mapPricingItem);

      if (items.length === 0) {
        throw createCartEmptyError();
      }

      const cartSummary = buildPricingSummary(items, {
        cartId: cart.id,
      });
      const voucher = await repository.getVoucherByCode(queryExecutor, code);

      if (!voucher || voucher.voucher_status !== VOUCHER_STATUS.ACTIVE) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher is invalid',
        );
      }

      const currentTime = now();

      if (
        voucher.voucher_valid_from &&
        currentTime < new Date(voucher.voucher_valid_from)
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher is not active yet',
        );
      }

      if (
        voucher.voucher_valid_to &&
        currentTime > new Date(voucher.voucher_valid_to)
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_EXPIRED,
          'Voucher is expired',
        );
      }

      if (voucher.promotion_status !== PROMOTION_STATUS.ACTIVE) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher promotion is invalid',
        );
      }

      if (
        (voucher.promotion_valid_from &&
          currentTime < new Date(voucher.promotion_valid_from)) ||
        (voucher.promotion_valid_to &&
          currentTime > new Date(voucher.promotion_valid_to))
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher promotion is outside the valid time window',
        );
      }

      assertVoucherStructure(voucher);

      const eligibleSubtotal = calculateEligibleSubtotal(
        items,
        voucher.target_service_type,
      );

      if (eligibleSubtotal <= 0) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher does not apply to the current cart items',
        );
      }

      if (
        voucher.min_order_amount != null &&
        cartSummary.subtotal_amount < Number(voucher.min_order_amount)
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Cart subtotal does not meet the voucher minimum order amount',
        );
      }

      if (
        voucher.usage_limit_total != null &&
        Number(voucher.used_count) >= Number(voucher.usage_limit_total)
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
          'Voucher has reached the total usage limit',
        );
      }

      if (voucher.usage_limit_per_user != null) {
        const usageCount = await repository.countUserVoucherUsages(
          queryExecutor,
          {
            userId,
            voucherId: voucher.id,
          },
        );

        if (usageCount >= Number(voucher.usage_limit_per_user)) {
          throw createVoucherError(
            API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
            'User has reached the voucher usage limit',
          );
        }
      }

      const discountAmount = calculateVoucherDiscount(voucher, eligibleSubtotal);
      const summary = buildPricingSummary(items, {
        cartId: cart.id,
        discountAmount,
      });

      return {
        cart_id: cart.id,
        code,
        currency: summary.currency,
        discount_amount: discountAmount,
        discount_type: voucher.discount_type,
        discount_value: Number(voucher.discount_value),
        eligible_subtotal_amount: eligibleSubtotal,
        final_total_amount: summary.total_amount,
        max_discount_amount:
          voucher.max_discount_amount == null
            ? null
            : Number(voucher.max_discount_amount),
        min_order_amount:
          voucher.min_order_amount == null
            ? null
            : Number(voucher.min_order_amount),
        promotion_id: voucher.promotion_id,
        subtotal_amount: cartSummary.subtotal_amount,
        target_service_type: voucher.target_service_type || null,
        valid: true,
        voucher_id: voucher.id,
      };
    });

  return {
    validateVoucher,
  };
};

module.exports = createVoucherService();
module.exports.createVoucherService = createVoucherService;
