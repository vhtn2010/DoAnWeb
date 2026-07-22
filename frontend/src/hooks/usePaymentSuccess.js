import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  buildInvoiceDownloadPayload,
  getPaymentSuccess,
  getPaymentSuccessByCode,
} from '../repositories/paymentRepository.js'
import { downloadMyBookingSummary } from '../repositories/bookingRepository.js'
import {
  buildPaymentSuccessData,
  buildPaymentSuccessViewModel,
  clonePaymentValue,
} from '../mappers/paymentMappers.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

function downloadBlob(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function formatLoadErrorMessage(message, fallbackMessage) {
  const normalizedMessage = String(message ?? '').trim()
  return normalizedMessage || fallbackMessage
}

export default function usePaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { paymentCode } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const bookingState = useMemo(
    () => (location.state?.booking ? clonePaymentValue(location.state.booking) : undefined),
    [location.state?.booking],
  )
  const bookingItemsState = useMemo(
    () =>
      Array.isArray(location.state?.bookingItems)
        ? clonePaymentValue(location.state.bookingItems)
        : undefined,
    [location.state?.bookingItems],
  )
  const paymentState = useMemo(
    () => (location.state?.payment ? clonePaymentValue(location.state.payment) : undefined),
    [location.state?.payment],
  )
  const paymentResultPayloadState = useMemo(
    () =>
      location.state?.paymentResultPayload
        ? clonePaymentValue(location.state.paymentResultPayload)
        : undefined,
    [location.state?.paymentResultPayload],
  )

  const [paymentSuccess, setPaymentSuccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadPaymentSuccess() {
      setLoading(true)
      setError('')
      setFeedback('')

      try {
        const sharedParams = {
          authState,
          booking: bookingState,
          bookingItems: bookingItemsState,
          payment: paymentState,
          paymentResultPayload: paymentResultPayloadState,
        }
        const response = paymentCode
          ? await getPaymentSuccessByCode(paymentCode, sharedParams)
          : await getPaymentSuccess(sharedParams)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          setPaymentSuccess(null)
          setError(
            formatLoadErrorMessage(
              response.message,
              'Không thể tải thông tin trạng thái thanh toán lúc này.',
            ),
          )
          return
        }

        if (response.data.payment_success) {
          setPaymentSuccess(response.data.payment_success)
          return
        }

        if (response.data.booking) {
          setPaymentSuccess(
            buildPaymentSuccessData({
              booking: response.data.booking,
              bookingItems: response.data.booking_items ?? bookingItemsState,
              payment: response.data.payment ?? paymentState,
              paymentResultPayload: paymentResultPayloadState,
            }),
          )
          return
        }

        setPaymentSuccess(null)
        setError('Không thể tải thông tin trạng thái thanh toán lúc này.')
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPaymentSuccess(null)
        setError(
          formatLoadErrorMessage(
            loadError?.message,
            'Không thể tải thông tin trạng thái thanh toán lúc này.',
          ),
        )
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadPaymentSuccess()

    return () => {
      isActive = false
    }
  }, [
    authState,
    bookingItemsState,
    bookingState,
    paymentCode,
    paymentResultPayloadState,
    paymentState,
    reloadToken,
  ])

  const { viewModel, viewModelError } = useMemo(() => {
    try {
      return {
        viewModel: buildPaymentSuccessViewModel(paymentSuccess ?? {}),
        viewModelError: '',
      }
    } catch (viewError) {
      return {
        viewModel: buildPaymentSuccessViewModel({}),
        viewModelError: formatLoadErrorMessage(
          viewError?.message,
          'Không thể dựng giao diện trạng thái thanh toán.',
        ),
      }
    }
  }, [paymentSuccess])

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  async function downloadInvoiceMock() {
    if (!paymentSuccess) {
      return
    }

    try {
      if (isCustomer && paymentSuccess.booking_id) {
        const result = await downloadMyBookingSummary(paymentSuccess.booking_id)
        downloadBlob(result.blob, result.filename)
        setFeedback('Tệp tóm tắt đơn hàng đang được tải xuống.')
        return
      }

      if (isCustomer) {
        setFeedback('Không tìm thấy mã đơn hàng hợp lệ để tải tệp tóm tắt.')
        return
      }

      const response = await buildInvoiceDownloadPayload(paymentSuccess)
      setFeedback(
        response.success
          ? 'Hóa đơn điện tử sẽ được tải xuống trong phiên bản tích hợp.'
          : (response.message ?? 'Không thể chuẩn bị hóa đơn điện tử lúc này.'),
      )
    } catch (downloadError) {
      setFeedback(downloadError?.message ?? 'Không thể chuẩn bị tệp tóm tắt đơn hàng lúc này.')
    }
  }

  function continueExploreTours() {
    navigate(buildPublicAuthPath('/services', isCustomer))
  }

  function goHome() {
    navigate(buildPublicAuthPath('/', isCustomer))
  }

  function goToOrderHistory() {
    navigate(buildPublicAuthPath('/profile/orders', isCustomer))
  }

  return {
    authState,
    error: error || viewModelError,
    feedback,
    loading,
    paymentCode,
    paymentSuccess,
    preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
    viewModel,
    actions: {
      continueExploreTours,
      downloadInvoiceMock,
      goHome,
      goToOrderHistory,
      retry,
    },
  }
}
