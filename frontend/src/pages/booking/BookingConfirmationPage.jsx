import { Component } from 'react'
import BookingChoiceCard from '../../components/booking/BookingChoiceCard.jsx'
import BookingDetailSummary from '../../components/booking/BookingDetailSummary.jsx'
import BookingStepper from '../../components/booking/BookingStepper.jsx'
import useBookingConfirmation from '../../hooks/useBookingConfirmation.js'

function createEmptySummary() {
  return {
    subtotal_amount: '0₫',
    tax_and_fee_amount: '0₫',
    discount_amount: '0₫',
    total_amount: '0₫',
  }
}

class BookingConfirmationErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
    }
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error) {
    console.error('Trang xác nhận đơn hàng bị lỗi khi render:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="booking-confirmation-page">
          <div className="booking-confirmation-shell">
            <div
              className="booking-confirmation-page__status booking-confirmation-page__status--error"
              role="alert"
            >
              <p>Không thể hiển thị trang xác nhận đơn hàng lúc này.</p>
              <button type="button" onClick={() => window.location.assign('/cart')}>
                Quay lại giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function BookingConfirmationPageContent() {
  const {
    actions,
    booking,
    error,
    feedback,
    loading,
    viewModel,
  } = useBookingConfirmation()

  const safeItems = Array.isArray(viewModel?.items) ? viewModel.items : []
  const safeSummary = viewModel?.summary ?? createEmptySummary()
  const safeBookingCode = viewModel?.bookingCode ?? ''
  const safeItemCountLabel = viewModel?.itemCountLabel ?? '0 Mục'
  const isAwaitingAdminReview = Boolean(actions?.isAwaitingAdminReview)
  const canContinueToPayment = Boolean(actions?.canContinueToPayment)

  return (
    <div className="booking-confirmation-page">
      <div className="booking-confirmation-shell">
        <BookingStepper activeStep={1} />

        <header className="booking-confirmation-page__hero">
          <div>
            <h1 className="booking-confirmation-page__title">Xác nhận đơn hàng của bạn</h1>
          </div>

          {safeBookingCode ? (
            <button
              className="booking-confirmation-page__code-button"
              type="button"
              onClick={actions.copyBookingCode}
            >
              Mã đơn: {safeBookingCode}
            </button>
          ) : null}
        </header>

        {loading ? (
          <p className="booking-confirmation-page__status" role="status">
            Đang chuẩn bị thông tin xác nhận đơn hàng...
          </p>
        ) : null}

        {error ? (
          <div
            className="booking-confirmation-page__status booking-confirmation-page__status--error"
            role="alert"
          >
            <p>{error}</p>
            <button type="button" onClick={actions.retry}>
              Thử lại
            </button>
          </div>
        ) : null}

        {!loading && !error && booking ? (
          <div className="booking-confirmation-page__layout">
            <div className="booking-confirmation-page__main">
              <BookingChoiceCard
                feedback={feedback}
                itemCountLabel={safeItemCountLabel}
                items={safeItems}
                onEdit={actions.editBookingItem}
                onReturnToCart={actions.goBackToCart}
                onRemove={actions.removeBookingItem}
              />
            </div>

            <aside className="booking-confirmation-page__sidebar">
              <BookingDetailSummary
                bookingCode={safeBookingCode}
                confirmLabel={isAwaitingAdminReview ? 'Đang chờ admin duyệt' : 'Xác nhận'}
                feedback={feedback}
                isDisabled={safeItems.length === 0 || !canContinueToPayment}
                onConfirm={actions.confirmBooking}
                onCopyBookingCode={actions.copyBookingCode}
                summary={safeSummary}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function BookingConfirmationPage() {
  return (
    <BookingConfirmationErrorBoundary>
      <BookingConfirmationPageContent />
    </BookingConfirmationErrorBoundary>
  )
}

export default BookingConfirmationPage
