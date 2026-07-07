import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  buildInvoiceDownloadPayload,
  getPaymentSuccess,
  getPaymentSuccessByCode,
} from '../repositories/paymentRepository.js'
import {
  buildPaymentSuccessViewModel,
  clonePaymentValue,
} from '../mappers/paymentMappers.js'

function preserveAuthPath(pathname, authState) {
  if (authState !== ROLES.customer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

export default function usePaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { paymentCode } = useParams()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest

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
    navigate(preserveAuthPath('/services', authState))
  }

  function goHome() {
    navigate(preserveAuthPath('/', authState))
  }

  return {
    authState,
    error,
    feedback,
    loading,
    paymentSuccess,
    preserveAuthQuery: (pathname) => preserveAuthPath(pathname, authState),
    viewModel,
    actions: {
      continueExploreTours,
      downloadInvoiceMock,
      goHome,
      retry,
    },
  }
}
