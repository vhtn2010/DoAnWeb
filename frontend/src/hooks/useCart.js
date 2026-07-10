import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getActiveCart,
  removeCartItem,
  validateCart,
} from '../repositories/cartRepository.js'
import {
  createCartSummaryFromItems,
  createCartSummaryPayload,
  mapCartResponseToView,
} from '../mappers/cartMappers.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const EMPTY_SUMMARY = Object.freeze({
  subtotal_amount: 0,
  discount_amount: 0,
  total_amount: 0,
  currency: 'VND',
  selected_item_count: 0,
})

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function buildItemRoute(item) {
  const slug = item?.service?.slug
  const serviceType = item?.service_type

  if (!slug) {
    return ''
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return `/flights/${slug}`
  }

  if (serviceType === SERVICE_TYPES.train) {
    return `/trains/${slug}`
  }

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return `/hotels/${slug}`
  }

  return `/services/${slug}`
}

export default function useCart() {
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()

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

  function handleToggleAll() {
    if (!cart?.id || cartItems.length === 0) {
      return
    }

    const shouldSelectAll = selectedItemIds.length !== cartItems.length
    const nextSelectedItemIds = shouldSelectAll ? cartItems.map((item) => item.id) : []

    setSelectedItemIds(nextSelectedItemIds)
    setSummary(buildSummary(cartItems, nextSelectedItemIds))
    setFeedback(
      createFeedbackState(
        'info',
        shouldSelectAll
          ? 'Đã chọn toàn bộ dịch vụ trong giỏ hàng.'
          : 'Đã bỏ chọn toàn bộ dịch vụ trong giỏ hàng.',
      ),
    )
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

  function handleEditItem(item) {
    const nextRoute = buildItemRoute(item)

    if (!nextRoute) {
      setFeedback(
        createFeedbackState(
          'error',
          'Không tìm thấy trang dịch vụ tương ứng để chỉnh sửa lựa chọn này.',
        ),
      )
      return
    }

    setFeedback(
      createFeedbackState(
        'info',
        'Đang mở lại trang dịch vụ để bạn điều chỉnh ngày đi, hạng vé hoặc tùy chọn liên quan.',
      ),
    )
    navigate(buildPublicAuthPath(nextRoute, isCustomer))
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
      if (authState === 'customer' && selectedItemIds.length !== cartItems.length) {
        const nextMessage =
          'Backend hiện xử lý checkout theo toàn bộ giỏ hàng. Bạn có thể dùng nút "Chọn tất cả" rồi tiếp tục để đảm bảo đơn hàng khớp dữ liệu hệ thống.'
        setFeedback(createFeedbackState('error', nextMessage))
        return
      }

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

      navigate(buildPublicAuthPath('/checkout', isCustomer), {
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

    navigate(buildPublicAuthPath('/services', isCustomer))
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
  const isAllSelected = cartItems.length > 0 && selectedItemIds.length === cartItems.length

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
    handleToggleAll,
    handleToggleItem,
    isAllSelected,
    isCustomer,
    loading,
    reloadCart,
    selectedItemIds,
  }
}
