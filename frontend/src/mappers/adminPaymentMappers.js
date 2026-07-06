import {
  ADMIN_PAYMENT_STATUS_META,
  ADMIN_PAYMENT_STATUSES,
} from '../constants/adminPayments.js'

const METHOD_LABELS = Object.freeze({
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  cash_at_office: 'Tiền mặt tại văn phòng',
  e_wallet: 'Ví điện tử',
  manual_bank_transfer: 'Chuyển khoản thủ công',
  qr: 'QR',
  staff_collect: 'Nhân viên thu hộ',
})

const PROVIDER_LABELS = Object.freeze({
  bank_transfer: 'Ngân hàng',
  direct: 'Thanh toán trực tiếp',
  mastercard: 'Mastercard',
  momo: 'Momo',
  visa: 'Visa',
  vnpay: 'VNPay',
})

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getDisplayValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? ''
}

export function getPaymentMethodLabel(payment = {}) {
  const method = payment.payment_method
  const provider = payment.provider

  if (METHOD_LABELS[method] && PROVIDER_LABELS[provider]) {
    return `${METHOD_LABELS[method]} / ${PROVIDER_LABELS[provider]}`
  }

  return METHOD_LABELS[method] || PROVIDER_LABELS[provider] || method || provider || 'Chưa rõ'
}

export function mapAdminPayment(payment = {}) {
  const bookingCode = payment.booking?.booking_code ?? ''
  const customerName = getDisplayValue(
    payment.customer?.full_name,
    payment.customer?.email,
    payment.booking?.contact_name,
    payment.booking?.contact_email,
    'Khách chưa có tên',
  )
  const timestamp = getDisplayValue(payment.paid_at, payment.updated_at, payment.created_at)

  return {
    actionLabel: payment.has_proof ? 'Xem chứng từ' : 'Chi tiết',
    amount: Number(payment.amount || 0),
    bookingCode,
    code: payment.payment_code || payment.id,
    currency: payment.currency || 'VND',
    customerEmail: payment.customer?.email || payment.booking?.contact_email || '',
    customerName,
    hasProof: Boolean(payment.has_proof || payment.proof_summary),
    id: payment.id,
    method: getPaymentMethodLabel(payment),
    raw: payment,
    serviceName: bookingCode ? `Đơn ${bookingCode}` : 'Thanh toán dịch vụ',
    status: payment.status,
    timestamp,
  }
}

export function mapAdminPaymentDetail(payment = {}, proofResponse = null) {
  const mappedPayment = mapAdminPayment(payment)
  const proof = proofResponse?.proof ?? payment.proof_summary ?? null

  return {
    ...mappedPayment,
    bookingStatus: payment.booking?.status || '',
    bookingTotal: Number(payment.booking?.total_amount || payment.amount || 0),
    confirmation: payment.confirmation ?? null,
    expiredAt: payment.expired_at ?? null,
    internalNote: payment.internal_note?.note || '',
    proof,
    reconciliation: payment.reconciliation ?? null,
  }
}

export function matchesAdminPaymentSearch(payment, query = '') {
  const normalizedQuery = normalizeText(query.trim())

  if (!normalizedQuery) {
    return true
  }

  return normalizeText(
    [
      payment.code,
      payment.bookingCode,
      payment.customerName,
      payment.customerEmail,
      payment.method,
      payment.serviceName,
    ].join(' '),
  ).includes(normalizedQuery)
}

export function createAdminPaymentPageNumbers(totalPages = 1) {
  return Array.from({ length: Math.max(Number(totalPages) || 1, 1) }, (_, index) => index + 1)
}

export function getAdminPaymentStatusMeta(status) {
  return ADMIN_PAYMENT_STATUS_META[status] ?? {
    label: status || ADMIN_PAYMENT_STATUSES.pending,
    tone: 'neutral',
  }
}
