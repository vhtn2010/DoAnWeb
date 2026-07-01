const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const cartService = require('../services/cartService');
const { createAccessToken } = require('../utils/sessionToken');

const originalAddCartItem = cartService.addCartItem;
const originalApplyCartVoucher = cartService.applyCartVoucher;
const originalClearCartItems = cartService.clearCartItems;
const originalDeleteCartItem = cartService.deleteCartItem;
const originalGetActiveCart = cartService.getActiveCart;
const originalGetCartSummary = cartService.getCartSummary;
const originalMergeGuestCart = cartService.mergeGuestCart;
const originalRemoveCartVoucher = cartService.removeCartVoucher;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalUpdateCartItem = cartService.updateCartItem;
const originalValidateCart = cartService.validateCart;

const createAuthContext = ({
  roleCode = 'customer',
  userId = 'user-1',
} = {}) => ({
  roleCode,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_code: roleCode,
  },
  userId,
});

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body: JSON.parse(body),
          statusCode: res.statusCode,
        });
      });
    });

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  cartService.addCartItem = originalAddCartItem;
  cartService.applyCartVoucher = originalApplyCartVoucher;
  cartService.clearCartItems = originalClearCartItems;
  cartService.deleteCartItem = originalDeleteCartItem;
  cartService.getActiveCart = originalGetActiveCart;
  cartService.getCartSummary = originalGetCartSummary;
  cartService.mergeGuestCart = originalMergeGuestCart;
  cartService.removeCartVoucher = originalRemoveCartVoucher;
  cartService.updateCartItem = originalUpdateCartItem;
  cartService.validateCart = originalValidateCart;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  cartService.addCartItem = originalAddCartItem;
  cartService.applyCartVoucher = originalApplyCartVoucher;
  cartService.clearCartItems = originalClearCartItems;
  cartService.deleteCartItem = originalDeleteCartItem;
  cartService.getActiveCart = originalGetActiveCart;
  cartService.getCartSummary = originalGetCartSummary;
  cartService.mergeGuestCart = originalMergeGuestCart;
  cartService.removeCartVoucher = originalRemoveCartVoucher;
  cartService.updateCartItem = originalUpdateCartItem;
  cartService.validateCart = originalValidateCart;
});

test('GET /api/cart requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
      method: 'GET',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/cart returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-2',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-2',
    });

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/cart returns active cart for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-3',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-3',
    });
  cartService.getActiveCart = async (context) => {
    capturedContext = context;

    return {
      created_at: '2026-07-01T08:00:00.000Z',
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
        },
      ],
      status: 'active',
      summary: {
        currency: 'VND',
        item_count: 1,
        quantity_total: 2,
        subtotal_amount: 2990000,
        total_amount: 2990000,
      },
      updated_at: '2026-07-01T08:10:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Active cart retrieved successfully');
    assert.equal(response.body.data.id, 'cart-1');
    assert.deepEqual(response.body.data.summary, {
      currency: 'VND',
      item_count: 1,
      quantity_total: 2,
      subtotal_amount: 2990000,
      total_amount: 2990000,
    });
    assert.deepEqual(capturedContext, {
      userId: 'user-3',
    });
  } finally {
    server.close();
  }
});

test('GET /api/cart/summary requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/cart/summary`, {
      method: 'GET',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/cart/summary returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-summary-2',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-summary-2',
    });

  try {
    const response = await request(server, `${apiPrefix}/cart/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/cart/summary returns pricing summary for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-summary-3',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-summary-3',
    });
  cartService.getCartSummary = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-summary-3',
      currency: 'VND',
      discount_amount: 200000,
      item_count: 2,
      quantity_total: 3,
      subtotal_amount: 3000000,
      total_amount: 2800000,
      voucher: {
        applied: true,
        code: 'SAVE10',
        discount_amount: 200000,
        discount_type: 'percent',
        discount_value: 10,
        issue: null,
        max_discount_amount: 500000,
        min_order_amount: 1000000,
        promotion_id: 'promotion-3',
        target_service_type: 'tour',
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/cart/summary?voucher_code=save10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart summary retrieved successfully');
    assert.equal(response.body.data.total_amount, 2800000);
    assert.equal(capturedContext.userId, 'user-summary-3');
    assert.equal(capturedContext.query.voucher_code, 'save10');
  } finally {
    server.close();
  }
});

test('POST /api/cart/validate requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/cart/validate`, {
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/cart/validate returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-validate-2',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-validate-2',
    });

  try {
    const response = await request(server, `${apiPrefix}/cart/validate`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('POST /api/cart/validate returns validation payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-validate-3',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-validate-3',
    });
  cartService.validateCart = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-validate-3',
      issues: [
        {
          cart_item_id: 'item-validate-3',
          code: 'PRICE_CHANGED',
          message: 'Current price is different from the price saved in cart',
          scope: 'item',
          service_id: 'service-validate-3',
          voucher_code: null,
        },
      ],
      items: [
        {
          current_total_amount: 3200000,
          current_unit_price: 3200000,
          id: 'item-validate-3',
          issues: [],
          price_changed: true,
          quantity: 1,
          service_id: 'service-validate-3',
          service_type: 'tour',
          snapshot_total_amount: 2990000,
          unit_price_snapshot: 2990000,
          valid: false,
        },
      ],
      summary: {
        cart_id: 'cart-validate-3',
        currency: 'VND',
        discount_amount: 0,
        item_count: 1,
        quantity_total: 1,
        snapshot_subtotal_amount: 2990000,
        subtotal_amount: 3200000,
        total_amount: 3200000,
        voucher: null,
      },
      valid: false,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/validate`, {
      body: JSON.stringify({
        voucher_code: 'save10',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart validated successfully');
    assert.equal(response.body.data.valid, false);
    assert.equal(response.body.data.summary.subtotal_amount, 3200000);
    assert.deepEqual(capturedContext, {
      payload: {
        voucher_code: 'save10',
      },
      userId: 'user-validate-3',
    });
  } finally {
    server.close();
  }
});

test('POST /api/cart/apply-voucher returns applied voucher payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-voucher-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-voucher-1',
    });
  cartService.applyCartVoucher = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-voucher-1',
      final_total_amount: 1800000,
      summary: {
        cart_id: 'cart-voucher-1',
        currency: 'VND',
        discount_amount: 200000,
        item_count: 1,
        quantity_total: 1,
        subtotal_amount: 2000000,
        total_amount: 1800000,
        voucher: {
          applied: true,
          code: 'TOUR10',
          discount_amount: 200000,
        },
      },
      voucher: {
        applied: true,
        code: 'TOUR10',
        discount_amount: 200000,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/apply-voucher`, {
      body: JSON.stringify({
        code: 'tour10',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher applied successfully');
    assert.equal(response.body.data.final_total_amount, 1800000);
    assert.deepEqual(capturedContext, {
      payload: {
        code: 'tour10',
      },
      userId: 'user-voucher-1',
    });
  } finally {
    server.close();
  }
});

test('DELETE /api/cart/voucher returns idempotent remove payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-voucher-2',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-voucher-2',
    });
  cartService.removeCartVoucher = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-voucher-2',
      removed: true,
      summary: {
        cart_id: 'cart-voucher-2',
        currency: 'VND',
        discount_amount: 0,
        item_count: 1,
        quantity_total: 1,
        subtotal_amount: 2000000,
        total_amount: 2000000,
        voucher: null,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/voucher`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher removed successfully');
    assert.equal(response.body.data.removed, true);
    assert.deepEqual(capturedContext, {
      userId: 'user-voucher-2',
    });
  } finally {
    server.close();
  }
});

test('POST /api/cart/merge returns merged cart payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-merge-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-merge-1',
    });
  cartService.mergeGuestCart = async (context) => {
    capturedContext = context;

    return {
      cart: {
        id: 'cart-merge-1',
        items: [
          {
            id: 'item-merge-1',
          },
        ],
        summary: {
          currency: 'VND',
          item_count: 1,
          quantity_total: 2,
          subtotal_amount: 5980000,
          total_amount: 5980000,
        },
      },
      merged_item_count: 1,
      summary: {
        currency: 'VND',
        item_count: 1,
        quantity_total: 2,
        subtotal_amount: 5980000,
        total_amount: 5980000,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/merge`, {
      body: JSON.stringify({
        guest_items: [
          {
            quantity: 2,
            service_id: '11111111-1111-4111-8111-111111111111',
            service_type: 'tour',
          },
        ],
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Guest cart merged successfully');
    assert.equal(response.body.data.merged_item_count, 1);
    assert.deepEqual(capturedContext, {
      payload: {
        guest_items: [
          {
            quantity: 2,
            service_id: '11111111-1111-4111-8111-111111111111',
            service_type: 'tour',
          },
        ],
      },
      userId: 'user-merge-1',
    });
  } finally {
    server.close();
  }
});

test('POST /api/cart/items returns add-item payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-4',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-4',
    });
  cartService.addCartItem = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-4',
      cart_item_id: 'item-4',
      summary: {
        currency: 'VND',
        item_count: 2,
        quantity_total: 3,
        subtotal_amount: 4490000,
        total_amount: 4490000,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/items`, {
      body: JSON.stringify({
        quantity: 2,
        service_id: '11111111-1111-4111-8111-111111111111',
        service_type: 'tour',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart item added successfully');
    assert.equal(response.body.data.cart_item_id, 'item-4');
    assert.deepEqual(capturedContext, {
      payload: {
        quantity: 2,
        service_id: '11111111-1111-4111-8111-111111111111',
        service_type: 'tour',
      },
      userId: 'user-4',
    });
  } finally {
    server.close();
  }
});

test('PATCH /api/cart/items/:cartItemId returns updated item payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-5',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-5',
    });
  cartService.updateCartItem = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-5',
      cart_item: {
        id: 'item-5',
        quantity: 3,
      },
      summary: {
        currency: 'VND',
        item_count: 1,
        quantity_total: 3,
        subtotal_amount: 3000000,
        total_amount: 3000000,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/cart/items/55555555-5555-4555-8555-555555555555`,
      {
        body: JSON.stringify({
          quantity: 3,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart item updated successfully');
    assert.equal(response.body.data.cart_item.quantity, 3);
    assert.deepEqual(capturedContext, {
      cartItemId: '55555555-5555-4555-8555-555555555555',
      payload: {
        quantity: 3,
      },
      userId: 'user-5',
    });
  } finally {
    server.close();
  }
});

test('DELETE /api/cart/items/:cartItemId returns delete payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-6',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-6',
    });
  cartService.deleteCartItem = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-6',
      deleted_item_id: 'item-6',
      summary: {
        currency: 'VND',
        item_count: 0,
        quantity_total: 0,
        subtotal_amount: 0,
        total_amount: 0,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/cart/items/66666666-6666-4666-8666-666666666666`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart item deleted successfully');
    assert.equal(response.body.data.deleted_item_id, 'item-6');
    assert.deepEqual(capturedContext, {
      cartItemId: '66666666-6666-4666-8666-666666666666',
      userId: 'user-6',
    });
  } finally {
    server.close();
  }
});

test('DELETE /api/cart/items returns clear-cart payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-7',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-7',
    });
  cartService.clearCartItems = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-7',
      summary: {
        currency: 'VND',
        item_count: 0,
        quantity_total: 0,
        subtotal_amount: 0,
        total_amount: 0,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart/items`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Cart cleared successfully');
    assert.equal(response.body.data.cart_id, 'cart-7');
    assert.deepEqual(capturedContext, {
      userId: 'user-7',
    });
  } finally {
    server.close();
  }
});
