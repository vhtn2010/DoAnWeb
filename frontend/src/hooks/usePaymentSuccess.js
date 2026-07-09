import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  buildInvoiceDownloadPayload,
  getPaymentSuccess,
  getPaymentSuccessByCode,
} from '../repositories/paymentRepository.js'
import {
  buildPaymentSuccessViewModel,
  clonePaymentValue,
} from '../mappers/paymentMappers.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

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

        if (!response.success || !response.data?.payment_success) {
          setPaymentSuccess(null)
          setError(response.message ?? 'Không thể tải thông tin thanh toán thành công lúc này.')
          return
        }

        setPaymentSuccess(response.data.payment_success)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPaymentSuccess(null)
        setError(
          loadError?.message ?? 'Không thể tải thông tin thanh toán thành công lúc này.',
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

  const viewModel = useMemo(
    () => buildPaymentSuccessViewModel(paymentSuccess ?? {}),
    [paymentSuccess],
  )

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  async function downloadInvoiceMock() {
    if (!paymentSuccess) {
      return
    }

    try {
      const response = await buildInvoiceDownloadPayload(paymentSuccess)
      setFeedback(
        response.success
          ? 'Hóa đơn điện tử sẽ được tải xuống trong phiên bản tích hợp.'
          : (response.message ?? 'Không thể chuẩn bị hóa đơn điện tử lúc này.'),
      )
    } catch (downloadError) {
      setFeedback(
        downloadError?.message ?? 'Không thể chuẩn bị hóa đơn điện tử lúc này.',
      )
    }
  }

  function continueExploreTours() {
    navigate(buildPublicAuthPath('/services', isCustomer))
  }

  function goHome() {
    navigate(buildPublicAuthPath('/', isCustomer))
  }

  return {
    authState,
    error,
    feedback,
    loading,
    paymentSuccess,
    preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
    viewModel,
    actions: {
      continueExploreTours,
      downloadInvoiceMock,
      goHome,
      retry,
    },
  }
}
