import BookingChoiceCard from '../../components/booking/BookingChoiceCard.jsx'
import BookingDetailSummary from '../../components/booking/BookingDetailSummary.jsx'
import BookingStepper from '../../components/booking/BookingStepper.jsx'
import useBookingConfirmation from '../../hooks/useBookingConfirmation.js'

function BookingConfirmationPage() {
  const {
    actions,
    booking,
    error,
    feedback,
    loading,
    viewModel,
  } = useBookingConfirmation()

  return (
    <div className="booking-confirmation-page">
      <div className="booking-confirmation-shell">
        <BookingStepper activeStep={1} />

        <header className="booking-confirmation-page__hero">
          <div>
            <h1 className="booking-confirmation-page__title">Xác nhận đơn hàng của bạn</h1>
          </div>

          {viewModel.bookingCode ? (
            <button
              className="booking-confirmation-page__code-button"
              type="button"
              onClick={actions.copyBookingCode}
            >
              Mã đơn: {viewModel.bookingCode}
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
            role="status"
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
                itemCountLabel={viewModel.itemCountLabel}
                items={viewModel.items}
                onEdit={actions.editBookingItem}
                onReturnToCart={actions.goBackToCart}
                onRemove={actions.removeBookingItem}
              />
            </div>

            <aside className="booking-confirmation-page__sidebar">
              <BookingDetailSummary
                bookingCode={viewModel.bookingCode}
                feedback={feedback}
                isDisabled={viewModel.items.length === 0 || !actions.canContinueToPayment}
                onConfirm={actions.confirmBooking}
                onCopyBookingCode={actions.copyBookingCode}
                summary={viewModel.summary}
              />
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default BookingConfirmationPage
