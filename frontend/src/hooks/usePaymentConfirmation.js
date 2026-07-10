import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import { PAYMENT_METHOD_CODES } from '../constants/payments.js'
import {
  buildPaymentConfirmationViewModel,
  buildPaymentSummary,
  normalizePhoneDisplay,
  validatePaymentConfirmationForm,
} from '../mappers/paymentMappers.js'
import {
  createCustomerDirectPayment,
  getPaymentByBookingCode,
  getPaymentByCode,
  uploadCustomerPaymentProof,
} from '../repositories/paymentRepository.js'
import { updateMyBookingContact } from '../repositories/bookingRepository.js'
import { uploadPaymentProofAsset } from '../adapters/api/uploadApiAdapter.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const SUCCESS_PAYMENT_STATUSES = new Set([
  PAYMENT_STATUSES.success,
  PAYMENT_STATUSES.reconciled,
])

function buildMethodDescription(method = {}) {
  if (method.code === PAYMENT_METHOD_CODES.manualBankTransfer) {
    return method.bank_name ?? method.instructions ?? 'Chuyển khoản ngân hàng'
  }

  if (method.code === PAYMENT_METHOD_CODES.cashAtOffice) {
    return method.office_address ?? method.instructions ?? 'Thanh toán tại văn phòng'
  }

  return method.hotline ?? method.instructions ?? 'Thanh toán trực tiếp với nhân viên'
}

function buildMethodDetails(method = {}) {
  const details = []

  if (method.bank_name) {
    details.push({
      label: 'Ngân hàng',
      value: method.bank_name,
    })
  }

  if (method.account_holder) {
    details.push({
      label: 'Chủ tài khoản',
      value: method.account_holder,
    })
  }

  if (method.account_number) {
    details.push({
      label: 'Số tài khoản',
      value: method.account_number,
    })
  }

  if (method.transfer_content_template) {
    details.push({
      label: 'Nội dung CK',
      value: method.transfer_content_template,
    })
  }

  if (method.office_address) {
    details.push({
      label: 'Địa chỉ',
      value: method.office_address,
    })
  }

  if (method.office_hours) {
    details.push({
      label: 'Giờ làm việc',
      value: method.office_hours,
    })
  }

  if (method.hotline) {
    details.push({
      label: 'Hotline',
      value: method.hotline,
    })
  }

  if (method.instructions) {
    details.push({
      label: 'Hướng dẫn',
      value: method.instructions,
    })
  }

  return details
}

function normalizePaymentMethods(methods = []) {
  return methods.map((method) => ({
    code: method.code,
    description: buildMethodDescription(method),
    details: buildMethodDetails(method),
    id: `payment-method-${method.code}`,
    label: method.name ?? method.code,
  }))
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

function buildResultMessage(payment, proof) {
  if (!payment) {
    return ''
  }

  if (SUCCESS_PAYMENT_STATUSES.has(payment.status)) {
    return 'Thanh toán đã được xác nhận thành công.'
  }

  if (payment.status === PAYMENT_STATUSES.pending && proof?.proof_image_url) {
    return 'Chứng từ thanh toán đã được gửi. Hệ thống đang chờ xác nhận từ bộ phận vận hành.'
  }

  if (payment.status === PAYMENT_STATUSES.pending) {
    return 'Yêu cầu thanh toán đã được tạo. Bạn có thể bổ sung chứng từ ngay trên màn hình này hoặc quay lại sau.'
  }

  return ''
}

function buildActionLabel({
  isPaid,
  payment,
  paymentProof,
  selectedPaymentMethod,
}) {
  if (isPaid) {
    return 'Đã xác nhận thanh toán'
  }

  if (
    payment?.status === PAYMENT_STATUSES.pending &&
    selectedPaymentMethod === PAYMENT_METHOD_CODES.manualBankTransfer
  ) {
    return paymentProof?.proof_image_url ? 'Theo dõi thanh toán' : 'Gửi chứng từ / theo dõi'
  }

  if (payment?.status === PAYMENT_STATUSES.pending) {
    return 'Theo dõi thanh toán'
  }

  return 'Tạo thanh toán'
}

export default function usePaymentConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { paymentCode } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const [payment, setPayment] = useState(null)
  const [paymentProof, setPaymentProof] = useState(null)
  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [paymentSummary, setPaymentSummary] = useState(null)
  const [contactForm, setContactForm] = useState({
    contact_email: '',
    contact_name: '',
    contact_phone: '',
  })
  const [cardNumber, setCardNumber] = useState('')
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

    async function loadPaymentConfirmation() {
      setLoading(true)
      setError('')
      setFeedback('')
      setFieldErrors({})

      try {
        const bookingCodeFromState =
          location.state?.bookingCode ?? location.state?.booking?.booking_code ?? ''
        const response = paymentCode
          ? await getPaymentByCode(paymentCode, {
              authState,
              booking: location.state?.booking,
              bookingItems: location.state?.bookingItems,
            })
          : await getPaymentByBookingCode(bookingCodeFromState, {
              authState,
              booking: location.state?.booking,
              bookingItems: location.state?.bookingItems,
            })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.booking) {
          setPayment(null)
          setPaymentProof(null)
          setBooking(null)
          setBookingItems([])
          setPaymentMethods([])
          setPaymentSummary(null)
          setError(response.message ?? 'Không thể tải thông tin thanh toán lúc này.')
          return
        }

        const nextBooking = response.data.booking
        const nextBookingItems = normalizeBookingItems(
          response.data.booking_items ?? location.state?.bookingItems ?? [],
        )
        const nextPaymentMethods = normalizePaymentMethods(response.data.payment_methods ?? [])
        const nextPayment = response.data.payment ?? null
        const nextProof = response.data.payment_proof ?? null

        setBooking(nextBooking)
        setBookingItems(nextBookingItems)
        setPaymentMethods(nextPaymentMethods)
        setPayment(nextPayment)
        setPaymentProof(nextProof)
        setSelectedPaymentMethod(
          nextPayment?.payment_method ?? nextPaymentMethods[0]?.code ?? '',
        )
        setVoucherCode(nextBooking.voucher_code ?? '')
        setPaymentSummary(buildSummaryFromBooking(nextBooking))
        setContactForm({
          contact_email: nextBooking.contact_email ?? '',
          contact_name: nextBooking.contact_name ?? '',
          contact_phone: normalizePhoneDisplay(nextBooking.contact_phone ?? ''),
        })
        setProofForm({
          bank_transaction_code: nextProof?.bank_transaction_code ?? '',
          file: null,
          transfer_note: nextProof?.transfer_note ?? '',
        })
        setFeedback(buildResultMessage(nextPayment, nextProof))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPayment(null)
        setPaymentProof(null)
        setBooking(null)
        setBookingItems([])
        setPaymentMethods([])
        setPaymentSummary(null)
        setError(loadError?.message ?? 'Không thể tải thông tin thanh toán lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadPaymentConfirmation()

    return () => {
      isActive = false
    }
  }, [
    authState,
    location.state?.booking,
    location.state?.bookingCode,
    location.state?.bookingItems,
    paymentCode,
    reloadToken,
  ])

  const viewModel = useMemo(
    () =>
      buildPaymentConfirmationViewModel({
        bookingItems,
        paymentSummary,
      }),
    [bookingItems, paymentSummary],
  )

  const selectedMethodMeta = useMemo(
    () => paymentMethods.find((method) => method.code === selectedPaymentMethod) ?? null,
    [paymentMethods, selectedPaymentMethod],
  )

  const isPaid = SUCCESS_PAYMENT_STATUSES.has(payment?.status)
  const voucherEditingLocked = isCustomer
  const payActionLabel = buildActionLabel({
    isPaid,
    payment,
    paymentProof,
    selectedPaymentMethod,
  })

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function selectPaymentMethod(methodCode) {
    setSelectedPaymentMethod(methodCode)
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.card_number
      delete nextErrors.proof_file
      delete nextErrors.selected_payment_method
      return nextErrors
    })
    setFeedback('')
  }

  function updateVoucherCode(event) {
    setVoucherCode(event.target.value)
  }

  function updateContactField(event) {
    const { name, value } = event.target

    setContactForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'contact_phone' ? normalizePhoneDisplay(value) : value,
    }))
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
  }

  function updateCardNumber(event) {
    setCardNumber(event.target.value)
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.card_number
      return nextErrors
    })
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

  function goBackToBookingConfirmation() {
    const nextRoute = booking?.booking_code
      ? `/booking-confirmation/${booking.booking_code}`
      : '/booking-confirmation'

    navigate(buildPublicAuthPath(nextRoute, isCustomer))
  }

  function goHome() {
    navigate(buildPublicAuthPath('/', isCustomer))
  }

  function navigateToSuccess(nextBooking, nextPayment, nextProof) {
    navigate(buildPublicAuthPath(`/payment-success/${nextPayment.payment_code}`, isCustomer), {
      state: {
        booking: nextBooking,
        bookingItems,
        payment: nextPayment,
        paymentProof: nextProof ?? null,
      },
    })
  }

  function removePaymentItem() {
    setFeedback(
      'Đơn hàng đã được tạo trên backend. Nếu cần thay đổi dịch vụ, vui lòng liên hệ chăm sóc khách hàng để được hỗ trợ.',
    )
  }

  function applyVoucherLocked() {
    setFeedback('Mã ưu đãi chỉ có thể áp dụng ở bước checkout trước khi tạo đơn hàng.')
  }

  async function persistBookingContactChanges() {
    if (!booking?.id) {
      return booking
    }

    const updates = {}

    if (contactForm.contact_name.trim() !== String(booking.contact_name ?? '').trim()) {
      updates.contact_name = contactForm.contact_name.trim()
    }

    if (contactForm.contact_phone.trim() !== String(booking.contact_phone ?? '').trim()) {
      updates.contact_phone = contactForm.contact_phone.trim()
    }

    if (Object.keys(updates).length === 0) {
      return booking
    }

    const response = await updateMyBookingContact(booking.id, updates)
    return {
      ...booking,
      ...response.data,
    }
  }

  async function uploadProofForPayment(paymentId) {
    if (!proofForm.file || selectedPaymentMethod !== PAYMENT_METHOD_CODES.manualBankTransfer) {
      return paymentProof
    }

    setUploadingProof(true)

    try {
      const uploadedAsset = await uploadPaymentProofAsset(proofForm.file)
      const proofResponse = await uploadCustomerPaymentProof(paymentId, {
        bank_transaction_code: proofForm.bank_transaction_code.trim() || undefined,
        proof_image_url: uploadedAsset.data.asset_url,
        transfer_note: proofForm.transfer_note.trim() || undefined,
      })

      return proofResponse.data.proof
    } finally {
      setUploadingProof(false)
    }
  }

  async function confirmPaymentAction() {
    const nextErrors = validatePaymentConfirmationForm({
      contactForm,
      cardNumber,
      selectedPaymentMethod,
    })

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFeedback('Vui lòng hoàn thiện đầy đủ thông tin thanh toán trước khi tiếp tục.')
      return
    }

    if (!booking?.id) {
      setFeedback('Không tìm thấy đơn hàng để tạo thanh toán.')
      return
    }

    if (isPaid && payment?.payment_code) {
      navigateToSuccess(booking, payment, paymentProof)
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    try {
      const nextBooking = await persistBookingContactChanges()

      if (
        payment?.id &&
        payment?.status === PAYMENT_STATUSES.pending &&
        payment.payment_method === selectedPaymentMethod
      ) {
        const nextProof = await uploadProofForPayment(payment.id)
        setBooking(nextBooking)
        setPaymentProof(nextProof ?? paymentProof)
        setFeedback(buildResultMessage(payment, nextProof ?? paymentProof))
        navigateToSuccess(nextBooking, payment, nextProof ?? paymentProof)
        return
      }

      const paymentResponse = await createCustomerDirectPayment(booking.id, {
        note: proofForm.transfer_note.trim() || undefined,
        payer_name: contactForm.contact_name.trim(),
        payer_phone: contactForm.contact_phone.trim() || undefined,
        payment_method: selectedPaymentMethod,
      })
      const nextPayment = paymentResponse.data
      const nextProof = await uploadProofForPayment(nextPayment.id)

      setBooking(nextBooking)
      setPayment(nextPayment)
      setPaymentProof(nextProof ?? paymentProof)
      setFeedback(buildResultMessage(nextPayment, nextProof ?? paymentProof))

      navigateToSuccess(nextBooking, nextPayment, nextProof ?? paymentProof)
    } catch (confirmError) {
      setFeedback(confirmError?.message ?? 'Không thể ghi nhận thanh toán lúc này.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    authState,
    booking,
    bookingItems,
    cardNumber,
    contactForm,
    error,
    feedback,
    fieldErrors,
    isPaid,
    loading,
    payActionLabel,
    payment,
    paymentMethods,
    paymentProof,
    paymentSummary,
    preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
    proofForm,
    selectedMethodMeta,
    selectedPaymentMethod,
    submitting,
    uploadingProof,
    viewModel,
    voucherCode,
    voucherEditingLocked,
    actions: {
      applyVoucher: applyVoucherLocked,
      applyVoucherMock: applyVoucherLocked,
      confirmPayment: confirmPaymentAction,
      confirmPaymentMock: confirmPaymentAction,
      goBackToBookingConfirmation,
      goHome,
      removePaymentItem,
      removePaymentItemMock: removePaymentItem,
      retry,
      selectPaymentMethod,
      updateCardNumber,
      updateContactField,
      updateProofField,
      updateProofFile,
      updateVoucherCode,
    },
  }
}
