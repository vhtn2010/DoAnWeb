import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import { PAYMENT_METHOD_CODES } from '../constants/payments.js'
import {
  buildPaymentConfirmationViewModel,
  buildPaymentSummary,
  normalizePaymentMethod,
  normalizePhoneDisplay,
  validatePaymentConfirmationForm,
} from '../mappers/paymentMappers.js'
import {
  cancelCustomerPayment,
  createCustomerDirectPayment,
  getPaymentByBookingCode,
  getPaymentByCode,
} from '../repositories/paymentRepository.js'
import { updateMyBookingContact } from '../repositories/bookingRepository.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const SUCCESS_PAYMENT_STATUSES = new Set([
  PAYMENT_STATUSES.success,
  PAYMENT_STATUSES.reconciled,
])
const OFFLINE_ASSISTED_METHOD_CODES = new Set([
  PAYMENT_METHOD_CODES.cashAtOffice,
  PAYMENT_METHOD_CODES.staffCollect,
])

function isBankTransferMethod(methodCode) {
  return normalizePaymentMethod(methodCode) === PAYMENT_METHOD_CODES.manualBankTransfer
}

function isCashAtOfficeMethod(methodCode) {
  return normalizePaymentMethod(methodCode) === PAYMENT_METHOD_CODES.cashAtOffice
}

function arePaymentMethodsEquivalent(leftMethodCode, rightMethodCode) {
  const normalizedLeft = normalizePaymentMethod(leftMethodCode)
  const normalizedRight = normalizePaymentMethod(rightMethodCode)

  if (!normalizedLeft || !normalizedRight) {
    return false
  }

  if (normalizedLeft === normalizedRight) {
    return true
  }

  return (
    OFFLINE_ASSISTED_METHOD_CODES.has(normalizedLeft) &&
    OFFLINE_ASSISTED_METHOD_CODES.has(normalizedRight)
  )
}

function resolveSelectedMethodCode(methodCode, methods = []) {
  const normalizedMethodCode = normalizePaymentMethod(methodCode)

  if (!normalizedMethodCode) {
    return methods[0]?.code ?? ''
  }

  const exactMatch =
    methods.find((method) => method.code === methodCode || method.code === normalizedMethodCode) ?? null

  if (exactMatch) {
    return exactMatch.code
  }

  if (normalizedMethodCode === PAYMENT_METHOD_CODES.manualBankTransfer) {
    return (
      methods.find((method) => normalizePaymentMethod(method.code) === PAYMENT_METHOD_CODES.manualBankTransfer)
        ?.code ?? normalizedMethodCode
    )
  }

  if (OFFLINE_ASSISTED_METHOD_CODES.has(normalizedMethodCode)) {
    return (
      methods.find((method) => normalizePaymentMethod(method.code) === PAYMENT_METHOD_CODES.cashAtOffice)?.code ??
      methods.find((method) => OFFLINE_ASSISTED_METHOD_CODES.has(normalizePaymentMethod(method.code)))?.code ??
      normalizedMethodCode
    )
  }

  return normalizedMethodCode
}

function buildMethodDescription(method = {}) {
  if (method.code === PAYMENT_METHOD_CODES.manualBankTransfer) {
    return method.bank_name ?? method.instructions ?? 'Chuyển khoản ngân hàng'
  }

  if (method.code === PAYMENT_METHOD_CODES.cashAtOffice) {
    return method.office_address ?? method.instructions ?? 'Thanh toán trực tiếp tại văn phòng'
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
      label: 'Nội dung chuyển khoản',
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
  const normalized = methods.map((method) => ({
    code: method.code,
    description: buildMethodDescription(method),
    details: buildMethodDetails(method),
    id: `payment-method-${method.code}`,
    label: method.name ?? method.code,
    rawMethod: method,
  }))
  const bankTransferMethod =
    normalized.find((method) => method.code === PAYMENT_METHOD_CODES.manualBankTransfer) ?? null
  const directOfficeMethod =
    normalized.find((method) => method.code === PAYMENT_METHOD_CODES.cashAtOffice) ??
    normalized.find((method) => method.code === PAYMENT_METHOD_CODES.staffCollect) ??
    null
  const nextMethods = []

  if (bankTransferMethod) {
    nextMethods.push({
      ...bankTransferMethod,
      description: 'Thanh toán thủ công qua chuyển khoản, sau đó xem QR và tải bill ở bước tiếp theo.',
      label: 'Chuyển khoản ngân hàng',
    })
  }

  if (directOfficeMethod) {
    nextMethods.push({
      ...directOfficeMethod,
      description: directOfficeMethod.code === PAYMENT_METHOD_CODES.cashAtOffice
        ? 'Đến văn phòng hoặc điểm giao dịch để thanh toán trực tiếp, không phát sinh phí xử lý thêm.'
        : 'Nhân viên sẽ liên hệ để hướng dẫn thanh toán trực tiếp và xác nhận thủ công.',
      label: directOfficeMethod.code === PAYMENT_METHOD_CODES.cashAtOffice
        ? 'Thanh toán trực tiếp tại văn phòng'
        : 'Nhân viên thu hộ',
    })
  }

  return nextMethods
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
    baggage_fee_amount: booking.baggage_fee_amount,
    currency: booking.currency,
    discount_amount: booking.discount_amount,
    subtotal_amount: booking.subtotal_amount,
    tax_and_fee_amount: booking.tax_and_fee_amount,
    vat_amount: booking.vat_amount ?? booking.tax_amount,
    service_fee_amount: booking.service_fee_amount,
    surcharge_amount: booking.surcharge_amount,
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

  if (payment.status === PAYMENT_STATUSES.cancelled) {
    return 'Yêu cầu thanh toán trước đó đã được hủy. Bạn có thể tạo lại khi sẵn sàng.'
  }

  if (payment.status === PAYMENT_STATUSES.pending && isBankTransferMethod(payment.payment_method)) {
    if (proof?.proof_image_url) {
      return 'Chứng từ thanh toán đã được gửi. Hệ thống đang chờ bộ phận vận hành xác nhận.'
    }

    return 'Yêu cầu chuyển khoản đã được tạo. Sau khi chuyển khoản, vui lòng tải ảnh chứng từ để hệ thống đối soát.'
  }

  if (payment.status === PAYMENT_STATUSES.pending && isCashAtOfficeMethod(payment.payment_method)) {
    return 'Yêu cầu thanh toán trực tiếp tại văn phòng đã được tạo và đang chờ bạn hoàn tất tại điểm giao dịch.'
  }

  if (payment.status === PAYMENT_STATUSES.pending) {
    return 'Yêu cầu thanh toán đã được tạo và đang chờ xác nhận từ bộ phận vận hành.'
  }

  return ''
}

function buildActionLabel({
  isPaid,
  payment,
  selectedPaymentMethod,
}) {
  if (isPaid) {
    return 'Xem kết quả thanh toán'
  }

  if (!selectedPaymentMethod) {
    return 'Chọn phương thức thanh toán'
  }

  const hasPendingPayment = payment?.status === PAYMENT_STATUSES.pending
  const isSamePendingMethod =
    hasPendingPayment &&
    arePaymentMethodsEquivalent(payment?.payment_method, selectedPaymentMethod)

  if (hasPendingPayment && !isSamePendingMethod) {
    return 'Hủy yêu cầu cũ để đổi phương thức'
  }

  if (isSamePendingMethod && isBankTransferMethod(selectedPaymentMethod)) {
    return 'Thanh toán'
  }

  if (isSamePendingMethod && isCashAtOfficeMethod(selectedPaymentMethod)) {
    return 'Xem yêu cầu tại văn phòng'
  }

  if (isSamePendingMethod) {
    return 'Theo dõi yêu cầu'
  }

  if (payment?.status === PAYMENT_STATUSES.cancelled) {
    if (isBankTransferMethod(selectedPaymentMethod)) {
      return 'Thanh toán'
    }

    if (isCashAtOfficeMethod(selectedPaymentMethod)) {
      return 'Tạo lại yêu cầu tại văn phòng'
    }

    return 'Tạo lại yêu cầu trực tiếp'
  }

  if (isBankTransferMethod(selectedPaymentMethod)) {
    return 'Thanh toán'
  }

  if (isCashAtOfficeMethod(selectedPaymentMethod)) {
    return 'Tạo yêu cầu tại văn phòng'
  }

  return 'Gửi yêu cầu cho nhân viên'
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
  const [paymentSummary, setPaymentSummary] = useState(null)
  const [contactForm, setContactForm] = useState({
    contact_email: '',
    contact_name: '',
    contact_phone: '',
  })
  const [proofForm, setProofForm] = useState({
    bank_transaction_code: '',
    file: null,
    transfer_note: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingProof] = useState(false)
  const [cancellingPayment, setCancellingPayment] = useState(false)
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
          resolveSelectedMethodCode(
            nextPayment?.payment_method ?? nextPaymentMethods[0]?.code ?? '',
            nextPaymentMethods,
          ),
        )
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
    () =>
      paymentMethods.find((method) =>
        arePaymentMethodsEquivalent(method.code, selectedPaymentMethod),
      ) ?? null,
    [paymentMethods, selectedPaymentMethod],
  )

  const isPaid = SUCCESS_PAYMENT_STATUSES.has(payment?.status)
  const canCancelPendingPayment =
    Boolean(payment?.id) && payment?.status === PAYMENT_STATUSES.pending
  const hasPendingPaymentMethodConflict =
    canCancelPendingPayment &&
    Boolean(payment?.payment_method) &&
    Boolean(selectedPaymentMethod) &&
    !arePaymentMethodsEquivalent(payment.payment_method, selectedPaymentMethod)
  const payActionLabel = buildActionLabel({
    isPaid,
    payment,
    paymentProof,
    selectedPaymentMethod,
  })
  const isPrimaryActionDisabled = isPaid
    ? false
    : viewModel.items.length === 0 ||
      paymentMethods.length === 0 ||
      !selectedPaymentMethod ||
      hasPendingPaymentMethodConflict

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function selectPaymentMethod(methodCode) {
    setSelectedPaymentMethod(methodCode)
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.selected_payment_method
      delete nextErrors.proof_file
      return nextErrors
    })
    setFeedback('')
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

  function navigateToBankTransfer(nextBooking, nextPayment, nextProof) {
    navigate(buildPublicAuthPath(`/payment-transfer/${nextPayment.payment_code}`, isCustomer), {
      state: {
        booking: nextBooking,
        bookingItems,
        payment: nextPayment,
        paymentProof: nextProof ?? null,
      },
    })
  }

  async function cancelPendingPaymentAction() {
    if (!canCancelPendingPayment || !payment?.id) {
      return
    }

    setCancellingPayment(true)
    setFieldErrors({})

    try {
      const response = await cancelCustomerPayment(payment.id, {
        reason: 'Khách hàng hủy yêu cầu thanh toán để điều chỉnh phương thức hoặc thao tác lại.',
      })
      const nextPayment = response?.data ?? null

      setPayment(nextPayment)
      setPaymentProof(null)
      setProofForm({
        bank_transaction_code: '',
        file: null,
        transfer_note: '',
      })
      setFeedback(
        response?.message ||
          'Yêu cầu thanh toán đã được hủy. Bạn có thể chọn lại phương thức và tạo yêu cầu mới.',
      )
    } catch (cancelError) {
      setFeedback(cancelError?.message ?? 'Không thể hủy yêu cầu thanh toán lúc này.')
    } finally {
      setCancellingPayment(false)
    }
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

  async function confirmPaymentAction() {
    const nextErrors = validatePaymentConfirmationForm({
      contactForm,
      selectedPaymentMethod,
    })

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFeedback('Vui lòng hoàn thiện đầy đủ thông tin trước khi tiếp tục.')
      return
    }

    if (!booking?.id) {
      setFeedback('Không tìm thấy đơn hàng để tạo yêu cầu thanh toán.')
      return
    }

    if (isPaid && payment?.payment_code) {
      navigateToSuccess(booking, payment, paymentProof)
      return
    }

    if (hasPendingPaymentMethodConflict) {
      setFeedback(
        'Bạn đang có một yêu cầu thanh toán chờ xử lý ở phương thức khác. Vui lòng hủy yêu cầu hiện tại trước khi đổi phương thức.',
      )
      return
    }

    setSubmitting(true)
    setFieldErrors({})

    try {
      const nextBooking = await persistBookingContactChanges()
      setBooking(nextBooking)

      if (
        payment?.id &&
        payment?.status === PAYMENT_STATUSES.pending &&
        arePaymentMethodsEquivalent(payment.payment_method, selectedPaymentMethod)
      ) {
        if (isBankTransferMethod(selectedPaymentMethod)) {
          navigateToBankTransfer(nextBooking, payment, paymentProof)
          return
        }

        navigateToSuccess(nextBooking, payment, paymentProof)
        return
      }

      const paymentResponse = await createCustomerDirectPayment(booking.id, {
        note: proofForm.transfer_note.trim() || undefined,
        payer_name: contactForm.contact_name.trim(),
        payer_phone: contactForm.contact_phone.trim() || undefined,
        payment_method: selectedPaymentMethod,
      })
      const nextPayment = paymentResponse.data

      setPayment(nextPayment)
      setPaymentProof(null)
      setSelectedPaymentMethod(
        resolveSelectedMethodCode(nextPayment.payment_method ?? selectedPaymentMethod, paymentMethods),
      )
      setFeedback(buildResultMessage(nextPayment, null) || paymentResponse.message || 'Yêu cầu thanh toán đã được tạo.')

      if (isBankTransferMethod(nextPayment.payment_method)) {
        navigateToBankTransfer(nextBooking, nextPayment, null)
        return
      }

      navigateToSuccess(nextBooking, nextPayment, null)
    } catch (confirmError) {
      setFeedback(confirmError?.message ?? 'Không thể tạo yêu cầu thanh toán lúc này.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    authState,
    booking,
    bookingItems,
    canCancelPendingPayment,
    cancellingPayment,
    contactForm,
    error,
    feedback,
    fieldErrors,
    isPaid,
    isPrimaryActionDisabled,
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
    actions: {
      cancelPendingPayment: cancelPendingPaymentAction,
      confirmPayment: confirmPaymentAction,
      goBackToBookingConfirmation,
      goHome,
      retry,
      selectPaymentMethod,
      updateContactField,
      updateProofField,
      updateProofFile,
    },
  }
}
