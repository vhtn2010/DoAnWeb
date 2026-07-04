import { ROLES } from '../../constants/roles.js'
import {
  customerActiveCartFixture,
  guestActiveCartFixture,
} from '../../fixtures/cart.fixtures.js'
import { createCartSummaryFromItems } from '../../mappers/cartMappers.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function createInitialCartState() {
  return {
    guest: cloneValue(guestActiveCartFixture),
    customer: cloneValue(customerActiveCartFixture),
  }
}

function getAuthKey(authState = ROLES.guest) {
  return authState === ROLES.customer ? ROLES.customer : ROLES.guest
}

function touchCart(snapshot) {
  snapshot.cart.updated_at = new Date().toISOString()
}

function findSnapshotByCartId(cartId) {
  return Object.values(mockCartState).find((snapshot) => snapshot.cart.id === cartId) ?? null
}

function findSnapshotByCartItemId(cartItemId) {
  return (
    Object.values(mockCartState).find((snapshot) =>
      snapshot.cart_items.some((cartItem) => cartItem.id === cartItemId),
    ) ?? null
  )
}

let mockCartState = createInitialCartState()

export async function getActiveCart({ authState = ROLES.guest } = {}) {
  const authKey = getAuthKey(authState)
  const snapshot = mockCartState[authKey]

  return {
    success: true,
    message: 'OK',
    data: cloneValue(snapshot),
  }
}

export async function getCartSummary(cartId, selectedItemIds = []) {
  // TODO: replace mock summary with GET /cart/summary in API integration phase.
  const snapshot = findSnapshotByCartId(cartId)

  if (!snapshot) {
    throw new Error('Không tìm thấy giỏ hàng đang hoạt động.')
  }

  return {
    success: true,
    message: 'OK',
    data: createCartSummaryFromItems(snapshot.cart_items, selectedItemIds),
  }
}

export async function removeCartItem(cartItemId) {
  // TODO: replace mock remove with DELETE /cart/items/{cart_item_id} in API integration phase.
  const snapshot = findSnapshotByCartItemId(cartItemId)

  if (!snapshot) {
    throw new Error('Không tìm thấy dịch vụ trong giỏ hàng.')
  }

  snapshot.cart_items = snapshot.cart_items.filter((item) => item.id !== cartItemId)
  touchCart(snapshot)

  return {
    success: true,
    message: 'Đã xóa dịch vụ khỏi giỏ hàng.',
    data: {
      cart_item_id: cartItemId,
    },
  }
}

export async function updateCartItem(cartItemId, payload = {}) {
  // TODO: replace mock update with PATCH /cart/items/{cart_item_id} in API integration phase.
  const snapshot = findSnapshotByCartItemId(cartItemId)

  if (!snapshot) {
    throw new Error('Không tìm thấy dịch vụ cần chỉnh sửa.')
  }

  snapshot.cart_items = snapshot.cart_items.map((item) =>
    item.id === cartItemId
      ? {
          ...item,
          options: {
            ...item.options,
            ...(payload.options ?? {}),
          },
        }
      : item,
  )
  touchCart(snapshot)

  return {
    success: true,
    message:
      'Chỉnh sửa chi tiết giỏ hàng sẽ được nối API PATCH /cart/items/{cart_item_id} ở phase integration.',
    data: {
      cart_item_id: cartItemId,
    },
  }
}

export async function validateCart(cartId, selectedItemIds = []) {
  // TODO: replace mock validation with POST /cart/validate before checkout integration.
  const snapshot = findSnapshotByCartId(cartId)

  if (!snapshot) {
    throw new Error('Không tìm thấy giỏ hàng để kiểm tra.')
  }

  const availableItemIds = snapshot.cart_items.map((item) => item.id)
  const validSelectedItemIds = selectedItemIds.filter((itemId) => availableItemIds.includes(itemId))
  const isValid =
    validSelectedItemIds.length > 0 && validSelectedItemIds.length === selectedItemIds.length

  return {
    success: true,
    message: 'OK',
    data: {
      is_valid: isValid,
      selected_item_ids: validSelectedItemIds,
    },
  }
}
