import { PAYMENT_METHOD_CODES } from '../../constants/payments.js'
import { PAYMENT_STATUSES } from '../../constants/bookings.js'
import { normalizePaymentMethod } from '../../mappers/paymentMappers.js'

function LockIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <rect
        height="8.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        width="10"
        x="5"
        y="8.5"
      />
      <path
        d="M7.5 8.5V6.8A2.5 2.5 0 0 1 10 4.3a2.5 2.5 0 0 1 2.5 2.5v1.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return 'Chưa có'
  }

  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Chưa có'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate)
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case PAYMENT_STATUSES.success:
    case PAYMENT_STATUSES.reconciled:
      return 'Đã xác nhận'
    case PAYMENT_STATUSES.pending:
      return 'Chờ xác nhận'
    case PAYMENT_STATUSES.processing:
      return 'Đang xử lý'
    case PAYMENT_STATUSES.cancelled:
      return 'Đã hủy'
    case PAYMENT_STATUSES.failed:
      return 'Thất bại'
    case PAYMENT_STATUSES.expired:
      return 'Hết hạn'
    default:
      return 'Chưa tạo'
  }
}

function buildPaymentHint(payment, selectedMethodMeta) {
  if (!payment) {
    return 'Yêu cầu thanh toán sẽ được tạo sau khi bạn xác nhận ở bước này.'
  }

  if (
    payment.status === PAYMENT_STATUSES.pending &&
    normalizePaymentMethod(payment.payment_method) ===
      PAYMENT_METHOD_CODES.manualBankTransfer
  ) {
    return payment.proof_summary?.proof_image_url
      ? 'Chứng từ chuyển khoản đã được gửi. Bộ phận vận hành sẽ đối soát và xác nhận sớm.'
      : 'Đây là yêu cầu chuyển khoản thủ công. Hãy tải chứng từ sau khi hoàn tất chuyển khoản.'
  }

  if (payment.status === PAYMENT_STATUSES.pending) {
    return 'Đây là yêu cầu thanh toán trực tiếp đang chờ nhân viên xác nhận theo quy trình nội bộ.'
  }

  if (payment.status === PAYMENT_STATUSES.cancelled) {
    return 'Yêu cầu trước đó đã bị hủy. Bạn có thể tạo một yêu cầu mới với phương thức hiện tại.'
  }

  if (payment.status === PAYMENT_STATUSES.success || payment.status === PAYMENT_STATUSES.reconciled) {
    return 'Thanh toán đã được xác nhận thành công. Bạn có thể xem lại kết quả chi tiết.'
  }

  return selectedMethodMeta
    ? `Phương thức hiện tại: ${selectedMethodMeta.label}.`
    : 'Kiểm tra thông tin trước khi tiếp tục.'
}

function PaymentOrderSummary({
  canCancelPayment = false,
  feedback,
  isCancellingPayment = false,
  isDisabled,
  isPaid,
  isSubmitting = false,
  onCancelPayment,
  onPay,
  payLabel,
  payment,
  selectedMethodMeta,
  showPrimaryAction = true,
  summary,
}) {
  return (
    <section className="payment-order-summary">
      <div className="payment-order-summary__accent" aria-hidden="true" />
      <h2 className="payment-order-summary__title">Chi tiết đơn hàng</h2>

      <div className="payment-order-summary__rows">
        <div className="payment-order-summary__row">
          <span>Tạm tính</span>
          <strong>{summary.subtotal_amount}</strong>
        </div>
        <div className="payment-order-summary__row">
          <span>Thuế & Phí</span>
          <strong>{summary.tax_and_fee_amount}</strong>
        </div>
        <div className="payment-order-summary__row payment-order-summary__row--discount">
          <span>Giảm giá</span>
          <strong>-{summary.discount_amount}</strong>
        </div>
      </div>

      <div className="payment-order-summary__total">
        <div>
          <span className="payment-order-summary__total-label">Tổng cộng</span>
          <strong className="payment-order-summary__total-amount">{summary.total_amount}</strong>
        </div>
        <span className="payment-order-summary__vat-note">Đã bao gồm VAT</span>
      </div>

      <div className="payment-order-summary__payment-info">
        <div className="payment-order-summary__info-row">
          <span className="payment-order-summary__info-label">Trạng thái</span>
          <strong className="payment-order-summary__info-value">
            {getPaymentStatusLabel(payment?.status)}
          </strong>
        </div>
        <div className="payment-order-summary__info-row">
          <span className="payment-order-summary__info-label">Phương thức</span>
          <strong className="payment-order-summary__info-value">
            {selectedMethodMeta?.label ?? payment?.payment_method ?? 'Chưa chọn'}
          </strong>
        </div>
        <div className="payment-order-summary__info-row">
          <span className="payment-order-summary__info-label">Mã giao dịch</span>
          <strong className="payment-order-summary__info-value">
            {payment?.payment_code ?? 'Sẽ tạo sau khi xác nhận'}
          </strong>
        </div>
        <div className="payment-order-summary__info-row">
          <span className="payment-order-summary__info-label">Tạo lúc</span>
          <strong className="payment-order-summary__info-value">
            {formatDateTime(payment?.created_at)}
          </strong>
        </div>
      </div>

      <p className="payment-order-summary__helper">{buildPaymentHint(payment, selectedMethodMeta)}</p>

      {showPrimaryAction ? (
        <button
          className="payment-order-summary__button"
          disabled={isDisabled || isSubmitting || isCancellingPayment}
          type="button"
          onClick={onPay}
        >
          {isSubmitting
            ? 'Đang xử lý...'
            : payLabel ?? (isPaid ? 'Xem kết quả thanh toán' : 'Tạo yêu cầu thanh toán')}
        </button>
      ) : null}

      {canCancelPayment && showPrimaryAction ? (
        <button
          className="payment-order-summary__secondary-button"
          disabled={isSubmitting || isCancellingPayment}
          type="button"
          onClick={onCancelPayment}
        >
          {isCancellingPayment ? 'Đang hủy yêu cầu...' : 'Hủy yêu cầu thanh toán'}
        </button>
      ) : null}

      <p className="payment-order-summary__security-note">
        <span aria-hidden="true">
          <LockIcon />
        </span>
        Mã hóa SSL và bảo vệ thông tin khách hàng
      </p>

      {feedback ? (
        <p className="payment-order-summary__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}

export default PaymentOrderSummary
