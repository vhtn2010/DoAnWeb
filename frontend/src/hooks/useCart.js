import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  applyCartVoucher,
  clearCartItems,
  getActiveCart,
  removeCartItem,
  removeCartVoucher,
  updateCartItem,
  validateCart,
} from '../repositories/cartRepository.js'
import {
  createCartSummaryFromItems,
  createCartSummaryPayload,
  mapCartItemToView,
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

function normalizeServerSummary(summary = {}, fallbackItemCount = 0) {
  return {
    currency: summary.currency ?? 'VND',
    discount_amount: Number(summary.discount_amount ?? 0),
    selected_item_count: Number(summary.item_count ?? fallbackItemCount),
    subtotal_amount: Number(summary.subtotal_amount ?? 0),
    total_amount: Number(summary.total_amount ?? 0),
  }
}

export default function useCart() {
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()

  const [cart, setCart] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [summaryOverride, setSummaryOverride] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [updatingItemIds, setUpdatingItemIds] = useState([])

  function buildSummary(nextCartItems, nextSelectedItemIds = []) {
    return createCartSummaryFromItems(nextCartItems, nextSelectedItemIds)
  }

  function resetVoucherState() {
    setSummaryOverride(null)
    setAppliedVoucher(null)
    setVoucherCode('')
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
        resetVoucherState()
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setCart(null)
        setCartItems([])
        setSelectedItemIds([])
        setSummary(EMPTY_SUMMARY)
        resetVoucherState()
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
      resetVoucherState()
      setFeedback(createFeedbackState())
    } catch (loadError) {
      setCart(null)
      setCartItems([])
      setSelectedItemIds([])
      setSummary(EMPTY_SUMMARY)
      resetVoucherState()
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
    setSummaryOverride(null)
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
    setSummaryOverride(null)
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
      setSummaryOverride(null)
      setFeedback(createFeedbackState('success', response.message))
    } catch (removeError) {
      const nextMessage = removeError?.message ?? 'Không thể xóa dịch vụ khỏi giỏ hàng.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    }
  }

  async function handleQuantityChange(item, nextQuantity) {
    if (!cart?.id || !item?.id) {
      return
    }

    const normalizedQuantity = Math.max(Number(nextQuantity) || 1, 1)

    if (normalizedQuantity === Number(item.quantity)) {
      return
    }

    setError('')
    setUpdatingItemIds((currentIds) =>
      currentIds.includes(item.id) ? currentIds : [...currentIds, item.id],
    )

    try {
      const response = await updateCartItem(
        item.id,
        {
          quantity: normalizedQuantity,
        },
        { authState },
      )
      const responseItem = response.data?.cart_item
      const fallbackItem = {
        ...item,
        quantity: normalizedQuantity,
        total_amount: Number(item.unit_price_snapshot) * normalizedQuantity,
      }
      const nextItem = mapCartItemToView(responseItem ?? fallbackItem)
      const nextCartItems = cartItems.map((cartItem) =>
        cartItem.id === item.id ? nextItem : cartItem,
      )

      setCartItems(nextCartItems)
      setSummary(buildSummary(nextCartItems, selectedItemIds))
      resetVoucherState()
      setFeedback(createFeedbackState('success', 'Đã cập nhật số lượng trong giỏ hàng.'))
    } catch (updateError) {
      const nextMessage =
        updateError?.message ?? 'Không thể cập nhật số lượng dịch vụ trong giỏ hàng.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    } finally {
      setUpdatingItemIds((currentIds) => currentIds.filter((itemId) => itemId !== item.id))
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

      navigate(buildPublicAuthPath('/booking-confirmation', isCustomer), {
        state: {
          selectedCartItemIds: resolvedSelectedItemIds,
          cartSummaryPayload: createCartSummaryPayload(
            cart,
            summaryOverride ?? buildSummary(cartItems, resolvedSelectedItemIds),
            resolvedSelectedItemIds,
            appliedVoucher?.code ?? voucherCode,
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

  async function handleApplyVoucher() {
    const normalizedCode = voucherCode.trim().toUpperCase()

    if (!normalizedCode) {
      setFeedback(createFeedbackState('error', 'Vui lòng nhập mã voucher để áp dụng.'))
      return
    }

    setVoucherLoading(true)

    try {
      const response = await applyCartVoucher({
        code: normalizedCode,
        selected_cart_item_ids: selectedItemIds,
      }, { authState })
      const nextSummary = response.data?.summary ?? null

      setSummaryOverride(
        nextSummary ? normalizeServerSummary(nextSummary, cartItems.length) : null,
      )
      setAppliedVoucher(response.data?.voucher ?? nextSummary?.voucher ?? null)
      setVoucherCode(normalizedCode)
      setFeedback(createFeedbackState('success', response.message || 'Đã áp dụng voucher.'))
    } catch (applyError) {
      setFeedback(
        createFeedbackState(
          'error',
          applyError?.message || 'Không thể áp dụng voucher cho giỏ hàng lúc này.',
        ),
      )
    } finally {
      setVoucherLoading(false)
    }
  }

  async function handleRemoveVoucher() {
    setVoucherLoading(true)

    try {
      const response = await removeCartVoucher({ authState })

      setSummaryOverride(null)
      setAppliedVoucher(null)
      setVoucherCode('')
      setFeedback(createFeedbackState('success', response.message || 'Đã gỡ voucher khỏi giỏ hàng.'))
    } catch (removeError) {
      setFeedback(
        createFeedbackState(
          'error',
          removeError?.message || 'Không thể gỡ voucher khỏi giỏ hàng.',
        ),
      )
    } finally {
      setVoucherLoading(false)
    }
  }

  async function handleClearCart() {
    setVoucherLoading(true)
    setError('')

    try {
      const response = await clearCartItems({ authState })

      setCartItems([])
      setSelectedItemIds([])
      setSummary(EMPTY_SUMMARY)
      setSummaryOverride(null)
      setAppliedVoucher(null)
      setVoucherCode('')
      setFeedback(createFeedbackState('success', response.message || 'Đã xóa toàn bộ giỏ hàng.'))
    } catch (clearError) {
      const nextMessage = clearError?.message || 'Không thể xóa toàn bộ giỏ hàng lúc này.'
      setError(nextMessage)
      setFeedback(createFeedbackState('error', nextMessage))
    } finally {
      setVoucherLoading(false)
    }
  }

  const effectiveSummary = summaryOverride ?? summary

  const formattedSummary = useMemo(
    () => ({
      ...effectiveSummary,
      discount_amount: formatCurrencyVND(effectiveSummary.discount_amount),
      subtotal_amount: formatCurrencyVND(effectiveSummary.subtotal_amount),
      total_amount: formatCurrencyVND(effectiveSummary.total_amount),
    }),
    [effectiveSummary],
  )

  const canContinue = selectedItemIds.length > 0
  const isAllSelected = cartItems.length > 0 && selectedItemIds.length === cartItems.length

  return {
    appliedVoucher,
    authState,
    canContinue,
    cart,
    cartItems,
    error,
    feedback,
    formattedSummary,
    handleApplyVoucher,
    handleClearCart,
    handleContinueCheckout,
    handleEditItem,
    handleGoBack,
    handleQuantityChange,
    handleRemoveItem,
    handleRemoveVoucher,
    handleToggleAll,
    handleToggleItem,
    isAllSelected,
    isCustomer,
    isVoucherLoading: voucherLoading,
    loading,
    reloadCart,
    selectedItemIds,
    setVoucherCode,
    updatingItemIds,
    voucherCode,
  }
}
