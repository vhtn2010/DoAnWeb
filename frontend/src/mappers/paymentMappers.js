import { formatBookingDateRange } from './bookingMappers.js'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import {
  PAYMENT_DEFAULT_CARD_NUMBER,
  PAYMENT_DEFAULT_CURRENCY,
  PAYMENT_METHOD_CODES,
  PAYMENT_PROVIDER_BY_METHOD,
  PAYMENT_VALID_VOUCHERS,
} from '../constants/payments.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveNumber(...values) {
  const numericValue = values.find((value) => typeof value === 'number' && Number.isFinite(value))
  return numericValue ?? 0
}

function formatDurationLabel(item) {
  if (item?.options?.duration_label) {
    return item.options.duration_label
  }

  const startDate = new Date(item?.start_at)
  const endDate = new Date(item?.end_at)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '2 ngày 1 đêm'
  }

  const diffMs = Math.max(endDate.getTime() - startDate.getTime(), 0)
  const diffDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1)

  return diffDays <= 1 ? '1 ngày' : `${diffDays} ngày ${Math.max(diffDays - 1, 1)} đêm`
}

export function clonePaymentValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export function normalizePaymentMethod(methodCode) {
  const normalizedMethod = String(methodCode ?? '').trim().toLowerCase()

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.card ||
    normalizedMethod === 'credit_card' ||
    normalizedMethod === 'card'
  ) {
    return PAYMENT_METHOD_CODES.card
  }

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.wallet ||
    normalizedMethod === 'wallet' ||
    normalizedMethod === 'bank_transfer' ||
    normalizedMethod === 'momo' ||
    normalizedMethod === 'vnpay'
  ) {
    return PAYMENT_METHOD_CODES.wallet
  }

  return PAYMENT_METHOD_CODES.card
}

export function normalizePhoneDisplay(phoneValue = '') {
  const digitsOnly = String(phoneValue ?? '').replace(/\D/g, '')

  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`
  }

  return String(phoneValue ?? '').trim()
}

export function buildPaymentSummary(summary = {}) {
  const subtotalAmount = resolveNumber(summary.subtotal_amount, summary.subtotalAmount)
  const taxAndFeeAmount = resolveNumber(summary.tax_and_fee_amount, summary.taxAndFeeAmount)
  const discountAmount = resolveNumber(summary.discount_amount, summary.discountAmount)

  return {
    subtotal_amount: subtotalAmount,
    tax_and_fee_amount: taxAndFeeAmount,
    discount_amount: discountAmount,
    total_amount: resolveNumber(
      summary.total_amount,
      summary.totalAmount,
      subtotalAmount + taxAndFeeAmount - discountAmount,
    ),
    currency: summary.currency ?? PAYMENT_DEFAULT_CURRENCY,
    voucher_code: normalizeText(summary.voucher_code),
  }
}

export function buildPaymentConfirmationFromBookingHandoff({
  basePaymentData,
  booking,
  bookingItems,
  paymentRedirectPayload,
} = {}) {
  const fallbackData = clonePaymentValue(basePaymentData ?? {})
  const fallbackBooking = fallbackData.booking ?? {}
  const fallbackPayment = fallbackData.payment ?? {}
  const fallbackSummary = fallbackData.payment_summary ?? {}
  const normalizedBooking = {
    ...fallbackBooking,
    ...(booking ?? {}),
    id: booking?.id ?? booking?.booking_id ?? fallbackBooking.id,
    booking_id: booking?.id ?? booking?.booking_id ?? fallbackBooking.booking_id,
    booking_code: booking?.booking_code ?? fallbackBooking.booking_code,
    contact_name: normalizeText(booking?.contact_name) || fallbackBooking.contact_name,
    contact_email: normalizeText(booking?.contact_email) || fallbackBooking.contact_email,
    contact_phone: normalizePhoneDisplay(booking?.contact_phone) || fallbackBooking.contact_phone,
    currency: booking?.currency ?? fallbackBooking.currency ?? PAYMENT_DEFAULT_CURRENCY,
  }
  const normalizedItems =
    Array.isArray(bookingItems) && bookingItems.length > 0
      ? bookingItems.map((item) => ({
          ...item,
          options: {
            ...(item.options ?? {}),
            duration_label: formatDurationLabel(item),
            schedule_label:
              item.options?.schedule_label ?? formatBookingDateRange(item.start_at, item.end_at),
          },
          total_amount: resolveNumber(
            item.total_amount,
            resolveNumber(item.unit_price_snapshot) * resolveNumber(item.quantity, 1),
          ),
        }))
      : clonePaymentValue(fallbackData.booking_items ?? [])

  const subtotalAmount = resolveNumber(
    normalizedBooking.subtotal_amount,
    normalizedItems.reduce(
      (totalAmount, item) => totalAmount + resolveNumber(item.total_amount),
      0,
    ),
    fallbackSummary.subtotal_amount,
  )
  const taxAndFeeAmount = resolveNumber(
    resolveNumber(normalizedBooking.tax_amount) + resolveNumber(normalizedBooking.service_fee_amount),
    fallbackSummary.tax_and_fee_amount,
  )
  const discountAmount = resolveNumber(
    normalizedBooking.discount_amount,
    fallbackSummary.discount_amount,
  )
  const summary = buildPaymentSummary({
    ...fallbackSummary,
    subtotal_amount: subtotalAmount,
    tax_and_fee_amount: taxAndFeeAmount,
    discount_amount: discountAmount,
    total_amount: resolveNumber(
      normalizedBooking.total_amount,
      paymentRedirectPayload?.total_amount,
      subtotalAmount + taxAndFeeAmount - discountAmount,
    ),
    currency: normalizedBooking.currency,
  })
  const paymentMethod = normalizePaymentMethod(paymentRedirectPayload?.payment_method)

  return {
    payment: {
      ...fallbackPayment,
      booking_id: normalizedBooking.id,
      booking_code: normalizedBooking.booking_code,
      payment_method: paymentMethod,
      payment_provider: PAYMENT_PROVIDER_BY_METHOD[paymentMethod],
      amount: summary.total_amount,
      currency: summary.currency,
      metadata: {
        ...(fallbackPayment.metadata ?? {}),
        preset_card_number:
          fallbackPayment.metadata?.preset_card_number ?? PAYMENT_DEFAULT_CARD_NUMBER,
      },
    },
    booking: {
      ...normalizedBooking,
      total_amount: summary.total_amount,
      discount_amount: summary.discount_amount,
      payment_status: booking?.payment_status ?? fallbackBooking.payment_status,
    },
    booking_items: normalizedItems,
    payment_methods: clonePaymentValue(fallbackData.payment_methods ?? []),
    payment_summary: summary,
  }
}

export function buildPaymentConfirmationViewModel({
  bookingItems = [],
  paymentSummary,
} = {}) {
  return {
    itemCountLabel: `${bookingItems.length} Mục`,
    items: bookingItems.map((item) => ({
      ...item,
      duration_label: formatDurationLabel(item),
      schedule_label:
        item.options?.schedule_label ?? formatBookingDateRange(item.start_at, item.end_at),
      total_amount_label: formatCurrencyVND(resolveNumber(item.total_amount)),
    })),
    summary: {
      subtotal_amount: formatCurrencyVND(resolveNumber(paymentSummary?.subtotal_amount)),
      tax_and_fee_amount: formatCurrencyVND(resolveNumber(paymentSummary?.tax_and_fee_amount)),
      discount_amount: formatCurrencyVND(resolveNumber(paymentSummary?.discount_amount)),
      total_amount: formatCurrencyVND(resolveNumber(paymentSummary?.total_amount)),
      currency: paymentSummary?.currency ?? PAYMENT_DEFAULT_CURRENCY,
      voucher_code: paymentSummary?.voucher_code ?? '',
    },
  }
}

export function validatePaymentConfirmationForm({
  contactForm,
  cardNumber,
  selectedPaymentMethod,
} = {}) {
  const errors = {}

  if (!normalizeText(contactForm?.contact_name)) {
    errors.contact_name = 'Vui lòng nhập họ và tên.'
  }

  if (!normalizeText(contactForm?.contact_email)) {
    errors.contact_email = 'Vui lòng nhập email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(contactForm.contact_email))) {
    errors.contact_email = 'Email chưa đúng định dạng.'
  }

  if (!normalizeText(contactForm?.contact_phone)) {
    errors.contact_phone = 'Vui lòng nhập số điện thoại.'
  }

  if (!normalizeText(selectedPaymentMethod)) {
    errors.selected_payment_method = 'Vui lòng chọn phương thức thanh toán.'
  }

  if (
    normalizePaymentMethod(selectedPaymentMethod) === PAYMENT_METHOD_CODES.card &&
    !normalizeText(cardNumber)
  ) {
    errors.card_number = 'Vui lòng nhập số thẻ mock.'
  }

  return errors
}

export function buildAppliedVoucherSummary(code, currentSummary = {}) {
  const normalizedCode = normalizeText(code).toUpperCase()
  const matchedVoucher =
    PAYMENT_VALID_VOUCHERS.find((voucher) => voucher.code === normalizedCode) ?? null

  if (!matchedVoucher) {
    return null
  }

  return {
    voucher_code: matchedVoucher.code,
    discount_amount: matchedVoucher.discount_amount,
    payment_summary: buildPaymentSummary({
      subtotal_amount: currentSummary.subtotal_amount,
      tax_and_fee_amount: currentSummary.tax_and_fee_amount,
      discount_amount: matchedVoucher.discount_amount,
      currency: currentSummary.currency ?? PAYMENT_DEFAULT_CURRENCY,
      voucher_code: matchedVoucher.code,
    }),
  }
}

export function buildPaymentResultPayload(payment) {
  return {
    payment_code: payment?.payment_code ?? '',
    booking_code: payment?.booking_code ?? '',
    payment_status: payment?.payment_status ?? PAYMENT_STATUSES.pending,
    amount: resolveNumber(payment?.amount),
    currency: payment?.currency ?? PAYMENT_DEFAULT_CURRENCY,
    paid_at: payment?.paid_at ?? null,
  }
}
