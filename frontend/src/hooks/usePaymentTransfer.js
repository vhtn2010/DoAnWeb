import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import { PAYMENT_METHOD_CODES } from '../constants/payments.js'
import {
  buildPaymentConfirmationViewModel,
  buildPaymentSummary,
  normalizePaymentMethod,
} from '../mappers/paymentMappers.js'
import {
  getPaymentByCode,
  uploadCustomerPaymentProof,
} from '../repositories/paymentRepository.js'
import { uploadPaymentProofAsset } from '../adapters/api/uploadApiAdapter.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const SUCCESS_PAYMENT_STATUSES = new Set([
  PAYMENT_STATUSES.success,
  PAYMENT_STATUSES.reconciled,
])

function buildMethodDetails(method = {}) {
  const details = []

  if (method.bank_name) {
    details.push({ label: 'Ngân hàng', value: method.bank_name })
  }

  if (method.account_holder) {
    details.push({ label: 'Chủ tài khoản', value: method.account_holder })
  }

  if (method.account_number) {
    details.push({ label: 'Số tài khoản', value: method.account_number })
  }

  if (method.transfer_content_template) {
    details.push({ label: 'Nội dung chuyển khoản', value: method.transfer_content_template })
  }

  if (method.instructions) {
    details.push({ label: 'Hướng dẫn', value: method.instructions })
  }

  if (method.hotline) {
    details.push({ label: 'Hotline', value: method.hotline })
  }

  return details
}

function normalizeBookingItems(items = []) {
  return items.map((item) => {
    const snapshot = item.service_snapshot ?? {}

    return {
      ...item,
      image_url:
        snapshot.image_url ?? '/assets/template/service/detail/ha-long-gallery-main.png',
      service_title:
        snapshot.title ??
        item.title_snapshot ??
        item.title ??
        'Dịch vụ đang được cập nhật',
      total_amount: Number(item.total_amount ?? 0),
    }
  })
}

function buildSummaryFromBooking(booking = {}) {
  return buildPaymentSummary({
    currency: booking.currency,
    discount_amount: booking.discount_amount,
    subtotal_amount: booking.subtotal_amount,
    tax_and_fee_amount:
      Number(booking.tax_amount ?? 0) + Number(booking.service_fee_amount ?? 0),
    total_amount: booking.total_amount,
    voucher_code: booking.voucher_code,
  })
}

function normalizeBankTransferMethod(methods = []) {
  const bankMethod =
    methods.find((method) => method.code === PAYMENT_METHOD_CODES.manualBankTransfer) ?? null

  if (!bankMethod) {
    return null
  }

  return {
    accountHolder: bankMethod.account_holder,
    accountNumber: bankMethod.account_number,
    bankName: bankMethod.bank_name,
    code: bankMethod.code,
    description:
      'Hoàn tất chuyển khoản theo thông tin bên dưới rồi tải bill để gửi admin duyệt.',
    details: buildMethodDetails(bankMethod),
    id: `payment-method-${bankMethod.code}`,
    label: 'Chuyển khoản ngân hàng',
    qrCodeUrl: bankMethod.qr_code_url,
    transferContentTemplate: bankMethod.transfer_content_template,
  }
}

function buildFeedback(payment, paymentProof) {
  if (!payment) {
    return ''
  }

  if (SUCCESS_PAYMENT_STATUSES.has(payment.status)) {
    return 'Thanh toán đã được xác nhận thành công.'
  }

  if (payment.status === PAYMENT_STATUSES.pending && paymentProof?.proof_image_url) {
    return 'Bill chuyển khoản đã được gửi đến admin. Vui lòng chờ kiểm tra và duyệt thủ công.'
  }

  if (payment.status === PAYMENT_STATUSES.pending) {
    return ''
  }

  if (payment.status === PAYMENT_STATUSES.cancelled) {
    return 'Yêu cầu thanh toán này đã bị hủy. Vui lòng quay lại bước trước để tạo yêu cầu mới.'
  }

  return ''
}

export default function usePaymentTransfer() {
  const location = useLocation()
  const navigate = useNavigate()
  const { paymentCode } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentProof, setPaymentProof] = useState(null)
  const [paymentSummary, setPaymentSummary] = useState(null)
  const [proofForm, setProofForm] = useState({
    bank_transaction_code: '',
    file: null,
    transfer_note: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadTransferPage() {
      setLoading(true)
      setError('')
      setFeedback('')
      setFieldErrors({})

      try {
        if (!paymentCode) {
          throw new Error('Không tìm thấy mã giao dịch chuyển khoản.')
        }

        const response = await getPaymentByCode(paymentCode, {
          authState,
          booking: location.state?.booking,
          bookingItems: location.state?.bookingItems,
        })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.booking) {
          setError(response.message ?? 'Không thể tải thông tin chuyển khoản lúc này.')
          return
        }

        const nextPayment = response.data.payment ?? null
        const nextPaymentProof = response.data.payment_proof ?? null
        const nextMethod = normalizeBankTransferMethod(response.data.payment_methods ?? [])

        if (
          !nextPayment ||
          normalizePaymentMethod(nextPayment.payment_method) !== PAYMENT_METHOD_CODES.manualBankTransfer
        ) {
          setError('Giao dịch này không phải thanh toán chuyển khoản ngân hàng.')
          return
        }

        if (!nextMethod) {
          setError('Không tìm thấy cấu hình chuyển khoản ngân hàng để hiển thị.')
          return
        }

        const nextBooking = response.data.booking

        setBooking(nextBooking)
        setBookingItems(normalizeBookingItems(response.data.booking_items ?? []))
        setPayment(nextPayment)
        setPaymentMethod(nextMethod)
        setPaymentProof(nextPaymentProof)
        setPaymentSummary(buildSummaryFromBooking(nextBooking))
        setProofForm({
          bank_transaction_code: nextPaymentProof?.bank_transaction_code ?? '',
          file: null,
          transfer_note: nextPaymentProof?.transfer_note ?? '',
        })
        setFeedback(buildFeedback(nextPayment, nextPaymentProof))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError?.message ?? 'Không thể tải thông tin chuyển khoản lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadTransferPage()

    return () => {
      isActive = false
    }
  }, [authState, location.state?.booking, location.state?.bookingItems, paymentCode, reloadToken])

  const viewModel = useMemo(
    () =>
      buildPaymentConfirmationViewModel({
        bookingItems,
        paymentSummary,
      }),
    [bookingItems, paymentSummary],
  )

  const isPaid = SUCCESS_PAYMENT_STATUSES.has(payment?.status)

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function updateProofField(event) {
    const { name, value } = event.target

    setProofForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.proof_file
      return nextErrors
    })
  }

  function updateProofFile(event) {
    const nextFile = event.target.files?.[0] ?? null

    setProofForm((currentForm) => ({
      ...currentForm,
      file: nextFile,
    }))
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.proof_file
      return nextErrors
    })
  }

  function goBackToConfirmation() {
    if (payment?.payment_code) {
      navigate(buildPublicAuthPath(`/payment-confirmation/${payment.payment_code}`, isCustomer))
      return
    }

    navigate(buildPublicAuthPath('/payment-confirmation', isCustomer))
  }

  function goToSuccess() {
    if (!payment?.payment_code) {
      return
    }

    navigate(buildPublicAuthPath(`/payment-success/${payment.payment_code}`, isCustomer), {
      state: {
        booking,
        bookingItems,
        payment,
        paymentProof,
      },
    })
  }

  async function submitProof() {
    if (!payment?.id) {
      setFeedback('Không tìm thấy giao dịch để gửi bill.')
      return
    }

    if (isPaid) {
      goToSuccess()
      return
    }

    if (!proofForm.file) {
      setFieldErrors({
        proof_file: 'Vui lòng tải bill chuyển khoản trước khi gửi admin.',
      })
      setFeedback('Bạn cần tải bill chuyển khoản lên trước khi gửi.')
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    try {
      setUploadingProof(true)
      const uploadedAsset = await uploadPaymentProofAsset(proofForm.file)
      const proofResponse = await uploadCustomerPaymentProof(payment.id, {
        bank_transaction_code: proofForm.bank_transaction_code.trim() || undefined,
        proof_image_url: uploadedAsset.data.asset_url,
        transfer_note: proofForm.transfer_note.trim() || undefined,
      })
      const nextProof = proofResponse.data.proof ?? null

      setPayment((currentPayment) =>
        currentPayment
          ? {
              ...currentPayment,
              proof_summary: nextProof
                ? {
                    bank_transaction_code: nextProof.bank_transaction_code ?? null,
                    proof_image_url: nextProof.proof_image_url ?? null,
                    transfer_note: nextProof.transfer_note ?? null,
                    uploaded_at: nextProof.submitted_at ?? null,
                  }
                : currentPayment.proof_summary,
            }
          : currentPayment,
      )
      setPaymentProof(nextProof)
      setProofForm((currentForm) => ({
        ...currentForm,
        file: null,
      }))
      setFeedback('Bill chuyển khoản đã được gửi đến admin. Vui lòng chờ kiểm tra và duyệt thủ công.')
    } catch (submitError) {
      setFeedback(submitError?.message ?? 'Không thể gửi bill chuyển khoản lúc này.')
    } finally {
      setUploadingProof(false)
      setSubmitting(false)
    }
  }

  return {
    actions: {
      goBackToConfirmation,
      goToSuccess,
      retry,
      submitProof,
      updateProofField,
      updateProofFile,
    },
    booking,
    error,
    feedback,
    fieldErrors,
    isPaid,
    loading,
    payment,
    paymentMethod,
    paymentProof,
    proofForm,
    submitting,
    uploadingProof,
    viewModel,
  }
}
