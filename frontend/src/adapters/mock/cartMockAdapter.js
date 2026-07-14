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

export function getCartSnapshotByAuthState(authState = ROLES.guest) {
  return cloneValue(mockCartState[getAuthKey(authState)])
}

export async function getActiveCart({ authState = ROLES.guest } = {}) {
  return {
    success: true,
    message: 'OK',
    data: getCartSnapshotByAuthState(authState),
  }
}

export async function addCartItemPreview({ authState = ROLES.guest, item } = {}) {
  const authKey = getAuthKey(authState)
  const snapshot = mockCartState[authKey]

  if (!snapshot || !item) {
    throw new Error('Không thể thêm dữ liệu preview vào giỏ hàng mock.')
  }

  snapshot.cart_items = [
    {
      ...cloneValue(item),
      cart_id: snapshot.cart.id,
    },
    ...snapshot.cart_items,
  ]
  touchCart(snapshot)

  return {
    success: true,
    message: 'Đã thêm phòng vào giỏ hàng mock.',
    data: {
      cart_item: cloneValue(snapshot.cart_items[0]),
    },
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

  let updatedCartItem = null

  snapshot.cart_items = snapshot.cart_items.map((item) => {
    if (item.id !== cartItemId) {
      return item
    }

    const nextQuantity = Number(payload.quantity) > 0
      ? Number(payload.quantity)
      : Number(item.quantity) || 1
    const nextItem = {
      ...item,
      options: {
        ...item.options,
        ...(payload.options ?? {}),
      },
      quantity: nextQuantity,
      total_amount: Number(item.unit_price_snapshot || 0) * nextQuantity,
    }

    updatedCartItem = nextItem
    return nextItem
  })
  touchCart(snapshot)

  return {
    success: true,
    message:
      'Chỉnh sửa chi tiết giỏ hàng sẽ được nối API PATCH /cart/items/{cart_item_id} ở phase integration.',
    data: {
      cart_item_id: cartItemId,
      cart_item: cloneValue(updatedCartItem),
      summary: createCartSummaryFromItems(snapshot.cart_items, snapshot.cart_items.map((item) => item.id)),
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
