import { formatBookingDateRange } from './bookingMappers.js'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import {
  PAYMENT_DEFAULT_CARD_NUMBER,
  PAYMENT_DEFAULT_CURRENCY,
  PAYMENT_METHOD_CODES,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_PROVIDER_BY_METHOD,
  PAYMENT_VALID_VOUCHERS,
} from '../constants/payments.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function resolveNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }

  return 0
}

function sumPricingAmounts(source = {}) {
  const hasAnyPricingAmount = [
    source.vat_amount,
    source.tax_amount,
    source.service_fee_amount,
    source.surcharge_amount,
  ].some((value) => (
    typeof value === 'number' ||
    (typeof value === 'string' && value.trim() !== '')
  ))

  if (!hasAnyPricingAmount) {
    return undefined
  }

  return (
    resolveNumber(source.vat_amount, source.tax_amount) +
    resolveNumber(source.service_fee_amount) +
    resolveNumber(source.surcharge_amount)
  )
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

function formatCurrencyVndSuffix(amount = 0, currency = PAYMENT_DEFAULT_CURRENCY) {
  const formattedNumber = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(resolveNumber(amount))

  return `${formattedNumber} ${currency}`
}

function formatLongVietnameseDate(dateValue) {
  if (!dateValue) {
    return '12 tháng 10, 2024'
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return '12 tháng 10, 2024'
  }

  return `${parsedDate.getDate()} tháng ${parsedDate.getMonth() + 1}, ${parsedDate.getFullYear()}`
}

export function clonePaymentValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export function normalizePaymentMethod(methodCode) {
  const normalizedMethod = String(methodCode ?? '').trim().toLowerCase()

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.card ||
    normalizedMethod === 'credit_card'
  ) {
    return PAYMENT_METHOD_CODES.card
  }

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.wallet ||
    normalizedMethod === 'momo' ||
    normalizedMethod === 'vnpay'
  ) {
    return PAYMENT_METHOD_CODES.wallet
  }

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.manualBankTransfer ||
    normalizedMethod === 'bank_transfer' ||
    normalizedMethod === 'manual-bank-transfer' ||
    normalizedMethod === 'manual transfer'
  ) {
    return PAYMENT_METHOD_CODES.manualBankTransfer
  }

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.cashAtOffice ||
    normalizedMethod === 'cash_at_branch' ||
    normalizedMethod === 'cash'
  ) {
    return PAYMENT_METHOD_CODES.cashAtOffice
  }

  if (
    normalizedMethod === PAYMENT_METHOD_CODES.staffCollect ||
    normalizedMethod === 'staff_collecting'
  ) {
    return PAYMENT_METHOD_CODES.staffCollect
  }

  return ''
}

export function isDirectPaymentMethod(methodCode) {
  const normalizedMethod = normalizePaymentMethod(methodCode)

  return [
    PAYMENT_METHOD_CODES.manualBankTransfer,
    PAYMENT_METHOD_CODES.cashAtOffice,
    PAYMENT_METHOD_CODES.staffCollect,
  ].includes(normalizedMethod)
}

export function normalizePhoneDisplay(phoneValue = '') {
  const digitsOnly = String(phoneValue ?? '').replace(/\D/g, '')

  if (digitsOnly.length === 10) {
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`
  }

  return String(phoneValue ?? '').trim()
}

function resolvePaymentMethodLabel(methodCode, fallbackLabel = '') {
  if (fallbackLabel) {
    return fallbackLabel
  }

  const normalizedMethod = normalizePaymentMethod(methodCode)
  const matchedMethod = PAYMENT_METHOD_OPTIONS.find((method) => method.code === normalizedMethod)

  if (normalizedMethod === PAYMENT_METHOD_CODES.card) {
    return 'Thẻ tín dụng (Visa/Mastercard)'
  }

  if (normalizedMethod === PAYMENT_METHOD_CODES.wallet) {
    return matchedMethod?.label || 'Ví điện tử / Momo / VNPay'
  }

  if (normalizedMethod === PAYMENT_METHOD_CODES.manualBankTransfer) {
    return matchedMethod?.label || 'Chuyển khoản ngân hàng'
  }

  if (normalizedMethod === PAYMENT_METHOD_CODES.cashAtOffice) {
    return matchedMethod?.label || 'Thanh toán tại văn phòng'
  }

  if (normalizedMethod === PAYMENT_METHOD_CODES.staffCollect) {
    return matchedMethod?.label || 'Nhân viên hỗ trợ thu hộ'
  }

  return matchedMethod?.label || 'Thanh toán trực tiếp'
}

function buildPaymentStatusPresentation(paymentStatus = PAYMENT_STATUSES.pending) {
  if (
    paymentStatus === PAYMENT_STATUSES.success ||
    paymentStatus === PAYMENT_STATUSES.reconciled
  ) {
    return {
      description:
        'Cảm ơn bạn đã thanh toán. Hệ thống đã ghi nhận đơn hàng và sẽ tiếp tục gửi thông tin liên quan trong các bước tiếp theo.',
      title: 'Thanh toán thành công',
    }
  }

  if (
    paymentStatus === PAYMENT_STATUSES.pending ||
    paymentStatus === PAYMENT_STATUSES.processing ||
    paymentStatus === PAYMENT_STATUSES.initiated
  ) {
    return {
      description:
        'Yêu cầu thanh toán đã được tạo. Bộ phận vận hành sẽ xác nhận sau khi kiểm tra chứng từ hoặc hình thức thanh toán bạn đã chọn.',
      title: 'Đã ghi nhận yêu cầu thanh toán',
    }
  }

  if (
    paymentStatus === PAYMENT_STATUSES.failed ||
    paymentStatus === PAYMENT_STATUSES.cancelled ||
    paymentStatus === PAYMENT_STATUSES.expired
  ) {
    return {
      description:
        'Yêu cầu thanh toán này chưa hoàn tất. Bạn có thể quay lại bước thanh toán để tạo lại yêu cầu mới khi sẵn sàng.',
      title: 'Thanh toán chưa hoàn tất',
    }
  }

  return {
    description:
      'Trạng thái thanh toán đã được cập nhật. Bạn có thể tiếp tục theo dõi trong tài khoản của mình.',
    title: 'Trạng thái thanh toán đã được cập nhật',
  }
}

export function buildPaymentSummary(summary = {}) {
  const subtotalAmount = resolveNumber(summary.subtotal_amount, summary.subtotalAmount)
  const baggageFeeAmount = resolveNumber(
    summary.baggage_fee_amount,
    summary.baggageFeeAmount,
  )
  const taxAndFeeAmount = resolveNumber(
    summary.tax_and_fee_amount,
    summary.taxAndFeeAmount,
    sumPricingAmounts(summary),
  )
  const discountAmount = resolveNumber(summary.discount_amount, summary.discountAmount)

  return {
    subtotal_amount: subtotalAmount,
    baggage_fee_amount: baggageFeeAmount,
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
    customer_note: normalizeText(booking?.customer_note) || normalizeText(fallbackBooking.customer_note),
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
    normalizedBooking.tax_and_fee_amount,
    sumPricingAmounts(normalizedBooking),
    fallbackSummary.tax_and_fee_amount,
    sumPricingAmounts(fallbackSummary),
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
  const baggageFeeAmount = resolveNumber(paymentSummary?.baggage_fee_amount)
  const taxAndFeeAmount = resolveNumber(paymentSummary?.tax_and_fee_amount)

  return {
    itemCountLabel: `${bookingItems.length} mục`,
    items: bookingItems.map((item) => ({
      ...item,
      duration_label: formatDurationLabel(item),
      schedule_label:
        item.options?.schedule_label ?? formatBookingDateRange(item.start_at, item.end_at),
      total_amount_label: formatCurrencyVND(resolveNumber(item.total_amount)),
    })),
    summary: {
      subtotal_amount: formatCurrencyVND(resolveNumber(paymentSummary?.subtotal_amount)),
      baggage_fee_amount: baggageFeeAmount > 0
        ? formatCurrencyVND(baggageFeeAmount)
        : '',
      tax_and_fee_amount: formatCurrencyVND(taxAndFeeAmount),
      tax_and_fee_without_baggage_amount: formatCurrencyVND(
        Math.max(taxAndFeeAmount - baggageFeeAmount, 0),
      ),
      discount_amount: formatCurrencyVND(resolveNumber(paymentSummary?.discount_amount)),
      total_amount: formatCurrencyVND(resolveNumber(paymentSummary?.total_amount)),
      currency: paymentSummary?.currency ?? PAYMENT_DEFAULT_CURRENCY,
      voucher_code: paymentSummary?.voucher_code ?? '',
    },
  }
}

export function validatePaymentConfirmationForm({
  contactForm,
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

export function buildPaymentContactForm(booking = {}) {
  return {
    contact_name: normalizeText(booking?.contact_name),
    contact_email: normalizeText(booking?.contact_email),
    contact_phone: normalizePhoneDisplay(booking?.contact_phone),
  }
}

function resolveBookingItemServiceTitle(item = {}, fallbackTitle = '') {
  const safeItem = normalizeObject(item)
  const snapshot = normalizeObject(safeItem.service_snapshot)

  return (
    normalizeText(snapshot.title) ||
    normalizeText(safeItem.service_title) ||
    normalizeText(safeItem.title_snapshot) ||
    normalizeText(safeItem.title) ||
    normalizeText(fallbackTitle)
  )
}

function resolvePaymentSuccessServiceTitle(paymentSuccess = {}) {
  const primaryBookingItem = Array.isArray(paymentSuccess.booking_items)
    ? paymentSuccess.booking_items[0]
    : null

  return (
    normalizeText(paymentSuccess.booking?.service_title) ||
    resolveBookingItemServiceTitle(primaryBookingItem, 'Dịch vụ đang được cập nhật')
  )
}

export function buildPaymentSuccessData({
  basePaymentSuccessData,
  payment,
  booking,
  bookingItems,
  paymentResultPayload,
} = {}) {
  const fallbackPaymentSuccess = clonePaymentValue(basePaymentSuccessData?.payment_success ?? {})
  const fallbackBooking = fallbackPaymentSuccess.booking ?? {}
  const fallbackCustomer = fallbackPaymentSuccess.customer ?? {}
  const fallbackBookingItems = Array.isArray(fallbackPaymentSuccess.booking_items)
    ? fallbackPaymentSuccess.booking_items
    : []
  const normalizedBookingItems =
    Array.isArray(bookingItems) && bookingItems.length > 0 ? bookingItems : fallbackBookingItems
  const primaryBookingItem = normalizeObject(
    normalizedBookingItems[0] ?? fallbackBookingItems[0],
  )
  const resolvedCurrency =
    payment?.currency ??
    paymentResultPayload?.currency ??
    booking?.currency ??
    fallbackPaymentSuccess.currency ??
    fallbackBooking.currency ??
    PAYMENT_DEFAULT_CURRENCY
  const resolvedAmount = resolveNumber(
    payment?.amount,
    paymentResultPayload?.amount,
    booking?.total_amount,
    fallbackPaymentSuccess.amount,
    fallbackBooking.total_amount,
  )
  const resolvedBookingCode =
    booking?.booking_code ?? payment?.booking_code ?? fallbackPaymentSuccess.booking_code
  const resolvedPaymentCode =
    payment?.payment_code ??
    paymentResultPayload?.payment_code ??
    fallbackPaymentSuccess.payment_code
  const resolvedPaidAt =
    payment?.paid_at ?? paymentResultPayload?.paid_at ?? fallbackPaymentSuccess.paid_at ?? null
  const resolvedPaymentMethod = payment?.payment_method ?? fallbackPaymentSuccess.payment_method

  return {
    payment_id: payment?.id ?? fallbackPaymentSuccess.payment_id ?? '',
    payment_code: resolvedPaymentCode ?? '',
    booking_id: booking?.id ?? booking?.booking_id ?? fallbackPaymentSuccess.booking_id ?? '',
    booking_code: resolvedBookingCode ?? '',
    payment_status:
      payment?.payment_status ??
      payment?.status ??
      paymentResultPayload?.payment_status ??
      fallbackPaymentSuccess.payment_status ??
      PAYMENT_STATUSES.success,
    booking_status:
      booking?.booking_status ??
      booking?.status ??
      fallbackPaymentSuccess.booking_status ??
      'paid',
    amount: resolvedAmount,
    currency: resolvedCurrency,
    payment_method: resolvedPaymentMethod,
    paid_at: resolvedPaidAt,
    invoice_code: fallbackPaymentSuccess.invoice_code ?? null,
    customer: {
      contact_name: normalizeText(booking?.contact_name) || fallbackCustomer.contact_name,
      contact_email: normalizeText(booking?.contact_email) || fallbackCustomer.contact_email,
      contact_phone:
        normalizePhoneDisplay(booking?.contact_phone) || fallbackCustomer.contact_phone,
    },
    booking: {
      booking_code: resolvedBookingCode ?? '',
      service_title: resolveBookingItemServiceTitle(
        primaryBookingItem,
        fallbackBooking.service_title,
      ),
      departure_date: primaryBookingItem.start_at ?? fallbackBooking.departure_date ?? '',
      departure_date_label:
        fallbackBooking.departure_date_label ??
        formatLongVietnameseDate(primaryBookingItem.start_at ?? fallbackBooking.departure_date),
      traveller_summary:
        fallbackBooking.traveller_summary ??
        `${String(resolveNumber(primaryBookingItem.quantity, 1)).padStart(2, '0')} Người lớn`,
      payment_method_label: resolvePaymentMethodLabel(
        resolvedPaymentMethod,
        fallbackBooking.payment_method_label,
      ),
      total_amount: resolvedAmount,
      currency: resolvedCurrency,
    },
    booking_items: normalizedBookingItems.map((item) => {
      const safeItem = normalizeObject(item)

      return {
        ...safeItem,
        service_snapshot: normalizeObject(safeItem.service_snapshot),
        service_title: resolveBookingItemServiceTitle(safeItem),
        total_amount: resolveNumber(
          safeItem.total_amount,
          resolveNumber(safeItem.unit_price_snapshot) * resolveNumber(safeItem.quantity, 1),
        ),
      }
    }),
  }
}

export function buildPaymentSuccessViewModel(paymentSuccess = {}) {
  const presentation = buildPaymentStatusPresentation(
    paymentSuccess.payment_status ?? PAYMENT_STATUSES.pending,
  )

  return {
    title: presentation.title,
    description: presentation.description,
    orderInfo: {
      sectionTitle: 'Thông tin đơn đặt',
      leftColumn: [
        {
          label: 'Mã đơn hàng',
          value: paymentSuccess.booking?.booking_code ?? '',
        },
        {
          label: 'Ngày khởi hành',
          value:
            paymentSuccess.booking?.departure_date_label ??
            formatLongVietnameseDate(paymentSuccess.booking?.departure_date),
        },
        {
          label: 'Khách hàng',
          value: paymentSuccess.customer?.contact_name ?? '',
        },
      ],
      rightColumn: [
        {
          label: 'Tên dịch vụ',
          value: resolvePaymentSuccessServiceTitle(paymentSuccess),
          tone: 'brand',
        },
        {
          label: 'Số lượng khách',
          value: paymentSuccess.booking?.traveller_summary ?? '',
        },
        {
          label: 'Phương thức thanh toán',
          value: paymentSuccess.booking?.payment_method_label ?? '',
        },
      ],
      totalLabel: 'Tổng thanh toán',
      totalAmount: formatCurrencyVndSuffix(
        paymentSuccess.booking?.total_amount ?? paymentSuccess.amount,
        paymentSuccess.booking?.currency ?? paymentSuccess.currency,
      ),
    },
  }
}

export function buildInvoiceDownloadPayload(paymentSuccess = {}) {
  return {
    booking_code: paymentSuccess.booking_code ?? paymentSuccess.booking?.booking_code ?? '',
    payment_code: paymentSuccess.payment_code ?? '',
    invoice_code: paymentSuccess.invoice_code ?? null,
    download_url: null,
  }
}

export function buildMockQrPayload({
  amount,
  bookingCode,
  currency = PAYMENT_DEFAULT_CURRENCY,
  paymentCode,
} = {}) {
  return `NETVIET|PAYMENT|METHOD=EWALLET|AMOUNT=${resolveNumber(
    amount,
  )}|CURRENCY=${currency}|BOOKING=${bookingCode ?? ''}|PAYMENT=${paymentCode ?? ''}`
}
