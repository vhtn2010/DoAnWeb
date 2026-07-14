function formatPaymentAmount(value) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.max(Number(value) || 0, 0))
}

function FlightPaymentSummary({
  flight,
  formatCurrency,
  onAddToCart,
  onBookNow,
  pendingAction = '',
  selectedFare,
}) {
  const ticketPrice = Number(selectedFare?.price ?? flight.sale_price ?? 0)
  const taxes = Number(selectedFare?.taxes ?? 0)
  const addOns = Number(selectedFare?.add_ons ?? 0)
  const totalPrice = Number(selectedFare?.total_price ?? ticketPrice + taxes + addOns)
  const fareSubtitle =
    selectedFare?.summary_subtitle ??
    flight.payment_summary.fare_subtitle ??
    selectedFare?.included_baggage ??
    ''

  return (
    <aside className="flight-detail-sidebar flight-payment-summary" aria-label="Tóm tắt thanh toán">
      <div className="flight-detail-card flight-payment-summary__card">
        <div className="flight-payment-summary__header">
          <h2>Tóm tắt thanh toán</h2>
          {selectedFare ? <p className="flight-payment-summary__fare-name">{selectedFare.title}</p> : null}
          {fareSubtitle ? <p className="flight-payment-summary__fare-subtitle">{fareSubtitle}</p> : null}
        </div>

        <div className="flight-payment-summary__rows">
          <div>
            <span>{flight.payment_summary.passenger_label}</span>
            <strong>{formatCurrency(ticketPrice)}</strong>
          </div>
          <div>
            <span>{flight.payment_summary.taxes_label}</span>
            <strong>{formatCurrency(taxes)}</strong>
          </div>
          <div>
            <span>{flight.payment_summary.add_on_label}</span>
            <strong>{formatCurrency(addOns)}</strong>
          </div>
        </div>

        <div className="flight-payment-summary__total">
          <span>Tổng cộng</span>
          <div>
            <strong>{formatPaymentAmount(totalPrice)}</strong>
            <small>{selectedFare?.currency ?? flight.currency}</small>
          </div>
        </div>

        <button
          aria-busy={pendingAction === 'booking'}
          className="flight-payment-summary__button flight-payment-summary__button--primary"
          disabled={Boolean(pendingAction)}
          type="button"
          onClick={onBookNow}
        >
          {pendingAction === 'booking' ? 'Đang xử lý...' : flight.payment_summary.cta_primary}
        </button>
        <button
          aria-busy={pendingAction === 'cart'}
          className="flight-payment-summary__button flight-payment-summary__button--secondary"
          disabled={Boolean(pendingAction)}
          type="button"
          onClick={onAddToCart}
        >
          {pendingAction === 'cart' ? 'Đang thêm...' : flight.payment_summary.cta_secondary}
        </button>
      </div>
    </aside>
  )
}

export default FlightPaymentSummary
