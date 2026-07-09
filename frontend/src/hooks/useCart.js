import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  getActiveCart,
  removeCartItem,
  updateCartItem,
  validateCart,
} from '../repositories/cartRepository.js'
import { getAuthSession } from '../services/authSession.js'
import {
  createCartSummaryFromItems,
  createCartSummaryPayload,
  mapCartResponseToView,
} from '../mappers/cartMappers.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

const EMPTY_SUMMARY = Object.freeze({
  subtotal_amount: 0,
  discount_amount: 0,
  total_amount: 0,
  currency: 'VND',
  selected_item_count: 0,
})

function buildCheckoutPath(isCustomer) {
  return isCustomer ? '/checkout?auth=customer' : '/checkout'
}

function buildServicesPath(isCustomer) {
  return isCustomer ? '/services?auth=customer' : '/services'
}

function getCartAuthState(searchParams) {
  if (getAuthSession().isAuthenticated) {
    return ROLES.customer
  }

  return searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

export default function useCart() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authState = getCartAuthState(searchParams)
  const isCustomer = authState === ROLES.customer

  const [cart, setCart] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())

  function buildSummary(nextCartItems, nextSelectedItemIds = []) {
    return createCartSummaryFromItems(nextCartItems, nextSelectedItemIds)
  }

  async function fetchCartState(currentAuthState) {
    const response = await getActiveCart({ authState: currentAuthState })
    const nextCartState = mapCartResponseToView(response.data)

    return {
      cart: nextCartState.cart,
      cartItems: nextCartState.cart_items,
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadCart() {
      setLoading(true)
      setError('')
      setFeedback(createFeedbackState())

      try {
        const nextCartState = await fetchCartState(authState)

        if (!isActive) {
          return
        }

        setCart(nextCartState.cart)
        setCartItems(nextCartState.cartItems)
        setSelectedItemIds([])
        setSummary(buildSummary(nextCartState.cartItems, []))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setCart(null)
        setCartItems([])
        setSelectedItemIds([])
        setSummary(EMPTY_SUMMARY)
        setError(loadError?.message ?? 'Không thể tải giỏ hàng lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadCart()

    return () => {
      isActive = false
    }
  }, [authState])

  async function reloadCart() {
    setLoading(true)
    setError('')

    try {
      const nextCartState = await fetchCartState(authState)
      setCart(nextCartState.cart)
      setCartItems(nextCartState.cartItems)
      setSelectedItemIds([])
      setSummary(buildSummary(nextCartState.cartItems, []))
      setFeedback(createFeedbackState())
    } catch (loadError) {
      setCart(null)
      setCartItems([])
      setSelectedItemIds([])
      setSummary(EMPTY_SUMMARY)
      setError(loadError?.message ?? 'Không thể tải giỏ hàng lúc này.')
    } finally {
      setLoading(false)
    }
  }

  function handleToggleItem(itemId) {
    if (!cart?.id) {
      return
    }

    const nextSelectedItemIds = selectedItemIds.includes(itemId)
      ? selectedItemIds.filter((currentItemId) => currentItemId !== itemId)
      : [...selectedItemIds, itemId]

    setSelectedItemIds(nextSelectedItemIds)
    setSummary(buildSummary(cartItems, nextSelectedItemIds))
    setFeedback(createFeedbackState())
    setError('')
  }

  async function handleRemoveItem(itemId) {
    if (!cart?.id) {
      return
    }

    setError('')

    try {
      const response = await removeCartItem(itemId, { authState })
      const nextSelectedItemIds = selectedItemIds.filter((currentItemId) => currentItemId !== itemId)
      const nextCartItems = cartItems.filter((item) => item.id !== itemId)

      setCartItems(nextCartItems)
      setSelectedItemIds(nextSelectedItemIds)
      setSummary(buildSummary(nextCartItems, nextSelectedItemIds))
      setFeedback(createFeedbackState('success', response.message))
    } catch (removeError) {
      const nextMessage = removeError?.message ?? 'Không thể xóa dịch vụ khỏi giỏ hàng.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    }
  }

  async function handleEditItem(item) {
    setError('')

    try {
      const response = await updateCartItem(
        item.id,
        {
          options: item.options,
        },
        {
          authState,
        },
      )
      const nextCartItem = response.data?.cart_item ?? null

      if (nextCartItem) {
        setCartItems((currentItems) => {
          const nextCartItems = currentItems.map((currentItem) =>
            currentItem.id === nextCartItem.id ? nextCartItem : currentItem,
          )

          setSummary(buildSummary(nextCartItems, selectedItemIds))
          return nextCartItems
        })
      }

      setFeedback(createFeedbackState('info', response.message))
    } catch (updateError) {
      const nextMessage = updateError?.message ?? 'Không thể cập nhật dịch vụ trong giỏ hàng.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    }
  }

  async function handleContinueCheckout() {
    if (!cart?.id) {
      return
    }

    if (selectedItemIds.length === 0) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn ít nhất một dịch vụ để tiếp tục.'))
      return
    }

    setError('')

    try {
      const response = await validateCart(cart.id, selectedItemIds, {
        authState,
      })
      const isValid = response.data?.valid ?? response.data?.is_valid ?? false
      const resolvedSelectedItemIds = Array.isArray(response.data?.selected_item_ids)
        ? response.data.selected_item_ids
        : selectedItemIds

      if (!isValid) {
        setFeedback(
          createFeedbackState(
            'error',
            'Một hoặc nhiều dịch vụ đang chọn không còn hợp lệ. Vui lòng kiểm tra lại.',
          ),
        )
        return
      }

      navigate(buildCheckoutPath(isCustomer), {
        state: {
          selectedCartItemIds: resolvedSelectedItemIds,
          cartSummaryPayload: createCartSummaryPayload(
            cart,
            buildSummary(cartItems, resolvedSelectedItemIds),
            resolvedSelectedItemIds,
          ),
        },
      })
    } catch (validateError) {
      const nextMessage =
        validateError?.message ?? 'Không thể kiểm tra giỏ hàng trước khi tiếp tục.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    }
  }

  function handleGoBack() {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(buildServicesPath(isCustomer))
  }

  const formattedSummary = useMemo(
    () => ({
      ...summary,
      subtotal_amount: formatCurrencyVND(summary.subtotal_amount),
      total_amount: formatCurrencyVND(summary.total_amount),
    }),
    [summary],
  )

  const canContinue = selectedItemIds.length > 0

  return {
    authState,
    canContinue,
    cart,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleRemoveItem,
    handleToggleItem,
    isCustomer,
    loading,
    reloadCart,
    selectedItemIds,
  }
}
