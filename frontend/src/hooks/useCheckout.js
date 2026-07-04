import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CHECKOUT_VALID_VOUCHER_CODES } from '../constants/checkout.js'
import { ROLES } from '../constants/roles.js'
import {
  applyVoucher,
  buildCheckoutPayload,
  getCheckoutDraft,
  submitCheckout,
  validateCheckoutForm,
} from '../repositories/checkoutRepository.js'
import { syncCheckoutDraftTravellers } from '../mappers/checkoutMappers.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function clearFieldError(currentErrors, fieldName) {
  if (!currentErrors[fieldName]) {
    return currentErrors
  }

  const nextErrors = { ...currentErrors }
  delete nextErrors[fieldName]
  return nextErrors
}

export default function useCheckout() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest

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

        setCheckoutDraft(response.data)
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
      subtotal_amount: formatCurrencyVND(checkoutDraft.summary.subtotal_amount),
      service_fee_amount: formatCurrencyVND(checkoutDraft.summary.service_fee_amount),
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

      return {
        ...currentDraft,
        special_requests: {
          ...currentDraft.special_requests,
          [baggageKey]: !currentDraft.special_requests?.[baggageKey],
        },
      }
    })
    setSubmitFeedback('Đã cập nhật lựa chọn hành lý mock cho bước checkout.')
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
        summary: shouldResetSummary ? baseSummary : currentDraft.summary,
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
      const response = await applyVoucher(normalizedVoucher, baseSummary ?? checkoutDraft.summary)

      if (!response.success || !response.data) {
        setVoucherFeedback(response.message ?? 'Mã ưu đãi không hợp lệ trong dữ liệu mock.')
        return
      }

      setCheckoutDraft((currentDraft) => {
        if (!currentDraft) {
          return currentDraft
        }

        return {
          ...currentDraft,
          voucher_code: response.data.voucher_code,
          summary: response.data.summary,
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

    // TODO: replace mock checkout submit with POST /bookings/checkout in API integration phase.
    const checkoutPayload = buildCheckoutPayload(checkoutDraft)

    try {
      const response = await submitCheckout(checkoutPayload)

      setSubmitFeedback(
        `${response.message} Màn xác nhận đơn hàng/thanh toán sẽ làm ở task tiếp theo.`,
      )
    } catch (submitError) {
      setSubmitFeedback(submitError?.message ?? 'Không thể chuẩn bị thông tin đặt đơn lúc này.')
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
    submitFeedback,
    summaryService: checkoutDraft?.summary_service ?? null,
    voucherFeedback,
  }
}
