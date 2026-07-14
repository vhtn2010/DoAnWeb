import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHECKOUT_VALID_VOUCHER_CODES } from '../constants/checkout.js'
import {
  applyVoucher,
  buildCheckoutPayload,
  calculateCheckoutSummary,
  getCheckoutDraft,
  submitCheckout,
  validateCheckoutForm,
} from '../repositories/checkoutRepository.js'
import {
  getCheckoutBaggageFeeAmount,
  syncCheckoutDraftTravellers,
} from '../mappers/checkoutMappers.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'
import { createIdempotencyKey } from '../utils/idempotency.js'

function clearFieldError(currentErrors, fieldName) {
  if (!currentErrors[fieldName]) {
    return currentErrors
  }

  const nextErrors = { ...currentErrors }
  delete nextErrors[fieldName]
  return nextErrors
}

function resolveCheckoutSubmitError(error) {
  if (error?.code === 'CART_ITEM_NOT_AVAILABLE') {
    return 'Dịch vụ trong giỏ hàng vừa được cập nhật trạng thái. Vui lòng quay lại giỏ hàng kiểm tra lại số lượng hoặc ngày đi rồi thanh toán lại.'
  }

  if (error?.code === 'CART_EMPTY') {
    return 'Giỏ hàng hiện không còn dịch vụ nào để thanh toán.'
  }

  return error?.message ?? 'Không thể chuẩn bị thông tin đặt đơn lúc này.'
}

function resolveReadableCheckoutSubmitError(error) {
  const fallbackMessage = resolveCheckoutSubmitError(error)

  if (!error?.code && !error?.message) {
    return fallbackMessage
  }

  if (error?.code === 'CART_ITEM_NOT_AVAILABLE') {
    return 'Dịch vụ trong giỏ hàng hiện không còn đủ điều kiện thanh toán. Vui lòng kiểm tra lại số lượng hoặc ngày đi trong giỏ hàng rồi thử lại.'
  }

  if (error?.code === 'CART_EMPTY') {
    return 'Giỏ hàng hiện không còn dịch vụ nào để thanh toán.'
  }

  return error?.message ?? 'Không thể chuẩn bị thông tin đặt đơn lúc này.'
}

export default function useCheckout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()

  function preserveAuthQuery(pathname) {
    return buildPublicAuthPath(pathname, isCustomer)
  }

  const selectedCartItemIds = useMemo(() => {
    if (
      Array.isArray(location.state?.selectedCartItemIds) &&
      location.state.selectedCartItemIds.length > 0
    ) {
      return [...location.state.selectedCartItemIds]
    }

    return undefined
  }, [location.state?.selectedCartItemIds])

  const cartSummaryPayload = useMemo(() => {
    if (location.state?.cartSummaryPayload) {
      return {
        ...location.state.cartSummaryPayload,
      }
    }

    return undefined
  }, [location.state?.cartSummaryPayload])

  const [checkoutDraft, setCheckoutDraft] = useState(null)
  const [baseSummary, setBaseSummary] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [voucherFeedback, setVoucherFeedback] = useState('')
  const [submitFeedback, setSubmitFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function buildSummaryWithDraftValues(currentDraft, {
    discountAmount,
    specialRequests,
  } = {}) {
    return calculateCheckoutSummary({
      subtotal_amount: currentDraft?.summary?.subtotal_amount ?? baseSummary?.subtotal_amount ?? 0,
      vat_amount: currentDraft?.summary?.vat_amount ?? baseSummary?.vat_amount ?? 0,
      service_fee_amount:
        currentDraft?.summary?.service_fee_amount ?? baseSummary?.service_fee_amount ?? 0,
      surcharge_amount: getCheckoutBaggageFeeAmount(
        specialRequests ?? currentDraft?.special_requests ?? {},
      ),
      discount_amount:
        discountAmount ??
        currentDraft?.summary?.discount_amount ??
        baseSummary?.discount_amount ??
        0,
      special_requests: specialRequests ?? currentDraft?.special_requests ?? {},
    })
  }

  useEffect(() => {
    let isActive = true

    async function loadCheckoutDraft() {
      setLoading(true)
      setError('')
      setVoucherFeedback('')
      setSubmitFeedback('')
      setFormErrors({})

      try {
        const response = await getCheckoutDraft({
          authState,
          selectedCartItemIds,
          cartSummaryPayload,
        })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          setCheckoutDraft(null)
          setBaseSummary(null)
          setError(response.message ?? 'Không thể tải thông tin checkout lúc này.')
          return
        }

        setCheckoutDraft(syncCheckoutDraftTravellers(response.data))
        setBaseSummary(response.data.summary)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setCheckoutDraft(null)
        setBaseSummary(null)
        setError(loadError?.message ?? 'Không thể tải thông tin checkout lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadCheckoutDraft()

    return () => {
      isActive = false
    }
  }, [authState, cartSummaryPayload, selectedCartItemIds])

  const formattedSummary = useMemo(() => {
    if (!checkoutDraft?.summary) {
      return null
    }

    return {
      ...checkoutDraft.summary,
      has_baggage_fee: checkoutDraft.summary.baggage_fee_amount > 0,
      subtotal_amount: formatCurrencyVND(checkoutDraft.summary.subtotal_amount),
      vat_amount: formatCurrencyVND(checkoutDraft.summary.vat_amount),
      service_fee_amount: formatCurrencyVND(checkoutDraft.summary.service_fee_amount),
      baggage_fee_amount: formatCurrencyVND(checkoutDraft.summary.baggage_fee_amount),
      surcharge_amount: formatCurrencyVND(checkoutDraft.summary.surcharge_amount),
      tax_and_fee_amount: formatCurrencyVND(checkoutDraft.summary.tax_and_fee_amount),
      discount_amount: formatCurrencyVND(checkoutDraft.summary.discount_amount),
      total_amount: formatCurrencyVND(checkoutDraft.summary.total_amount),
    }
  }, [checkoutDraft])

  function handleFieldChange(event) {
    const { name, value } = event.target

    setCheckoutDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      return syncCheckoutDraftTravellers({
        ...currentDraft,
        [name]: value,
      })
    })
    setSubmitFeedback('')
    setFormErrors((currentErrors) => clearFieldError(currentErrors, name))
  }

  function handleCheckboxChange(event) {
    const { checked, name } = event.target

    setCheckoutDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      return {
        ...currentDraft,
        [name]: checked,
      }
    })
    setSubmitFeedback('')
    setFormErrors((currentErrors) => clearFieldError(currentErrors, name))
  }

  function handleNoteChange(event) {
    const { value } = event.target

    setCheckoutDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      return {
        ...currentDraft,
        note: value,
      }
    })
    setSubmitFeedback('')
  }

  function handleBaggageToggle(baggageKey) {
    setCheckoutDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      const nextSpecialRequests = {
        ...currentDraft.special_requests,
        [baggageKey]: !currentDraft.special_requests?.[baggageKey],
      }

      return {
        ...currentDraft,
        special_requests: nextSpecialRequests,
        summary: buildSummaryWithDraftValues(currentDraft, {
          specialRequests: nextSpecialRequests,
        }),
      }
    })
    setSubmitFeedback('Đã cập nhật yêu cầu hành lý ký gửi cho đơn hàng của bạn.')
  }

  function handleVoucherChange(event) {
    const { value } = event.target
    const normalizedValue = value.trim().toUpperCase()

    setCheckoutDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft
      }

      const shouldResetSummary =
        Boolean(baseSummary) &&
        currentDraft.summary.discount_amount > 0 &&
        !CHECKOUT_VALID_VOUCHER_CODES.includes(normalizedValue)

      return {
        ...currentDraft,
        voucher_code: value,
        summary: shouldResetSummary
          ? buildSummaryWithDraftValues(currentDraft, { discountAmount: 0 })
          : currentDraft.summary,
      }
    })
    setVoucherFeedback('')
  }

  async function handleApplyVoucher() {
    if (!checkoutDraft) {
      return
    }

    const normalizedVoucher = checkoutDraft.voucher_code.trim().toUpperCase()

    if (!normalizedVoucher) {
      setVoucherFeedback('Vui lòng nhập mã ưu đãi.')
      return
    }

    try {
      const summaryBeforeDiscount = buildSummaryWithDraftValues(checkoutDraft, {
        discountAmount: 0,
      })

      const response = await applyVoucher(normalizedVoucher, summaryBeforeDiscount, {
        authState,
        cartId: checkoutDraft.cart_id,
      })

      if (!response.success || !response.data) {
        setVoucherFeedback(response.message ?? 'Mã ưu đãi không hợp lệ hoặc chưa áp dụng được.')
        return
      }

      setCheckoutDraft((currentDraft) => {
        if (!currentDraft) {
          return currentDraft
        }

        return {
          ...currentDraft,
          voucher_code: response.data.voucher_code,
          summary: buildSummaryWithDraftValues(currentDraft, {
            discountAmount: response.data.summary?.discount_amount ?? 0,
          }),
        }
      })
      setVoucherFeedback(response.message)
    } catch (applyError) {
      setVoucherFeedback(applyError?.message ?? 'Không thể áp dụng mã ưu đãi lúc này.')
    }
  }

  async function handleSubmitCheckout() {
    if (!checkoutDraft) {
      return
    }

    const nextErrors = validateCheckoutForm(checkoutDraft)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      setSubmitFeedback('Vui lòng hoàn thiện đầy đủ thông tin bắt buộc trước khi tiếp tục.')
      return
    }

    setFormErrors({})

    const checkoutPayload = buildCheckoutPayload(checkoutDraft)

    try {
      const response = await submitCheckout(checkoutPayload, {
        authState,
        idempotencyKey: createIdempotencyKey(`checkout-${checkoutDraft.cart_id}`),
      })

      if (!response.success || !response.data) {
        setSubmitFeedback(response.message ?? 'Không thể chuẩn bị bước thanh toán lúc này.')
        return
      }

      setSubmitFeedback(response.message)
      navigate(preserveAuthQuery('/payment-confirmation'), {
        state: {
          booking: response.data,
          bookingCode: response.data.booking_code,
          bookingId: response.data.id,
          bookingItems: response.data.items ?? [],
          checkoutPayload: response.data.checkout_payload ?? checkoutPayload,
          selectedCartItemIds,
        },
      })
    } catch (submitError) {
      setSubmitFeedback(resolveReadableCheckoutSubmitError(submitError))
    }
  }

  return {
    checkoutDraft,
    error,
    formattedSummary,
    formErrors,
    handleApplyVoucher,
    handleBaggageToggle,
    handleCheckboxChange,
    handleFieldChange,
    handleNoteChange,
    handleSubmitCheckout,
    handleVoucherChange,
    loading,
    preserveAuthQuery,
    submitFeedback,
    summaryService: checkoutDraft?.summary_service ?? null,
    voucherFeedback,
  }
}
