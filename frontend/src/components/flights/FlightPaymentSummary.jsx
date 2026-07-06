function FlightPaymentSummary({ flight, selectedFare, formatCurrency, onAddToCart, onBookNow }) {
  const ticketPrice = Number(selectedFare?.price ?? flight.sale_price ?? 0)
  const taxes = Number(selectedFare?.taxes ?? 0)
  const addOns = Number(selectedFare?.add_ons ?? 0)
  const totalPrice = Number(selectedFare?.total_price ?? ticketPrice + taxes + addOns)

  return (
    <aside className="flight-detail-payment" aria-label="Tóm tắt thanh toán">
      <div className="flight-detail-payment__card">
        <div className="flight-detail-payment__header">
          <h2>Tóm tắt thanh toán</h2>
          {selectedFare ? (
            <p className="flight-detail-payment__fare-name">{selectedFare.title}</p>
          ) : null}
        </div>

        <div className="flight-detail-payment__rows">
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

        <div className="flight-detail-payment__total">
          <span>Tổng cộng</span>
          <div>
            <strong>{formatCurrency(totalPrice)}</strong>
            <small>{flight.currency}</small>
          </div>
        </div>

        <button
          className="flight-detail-payment__button flight-detail-payment__button--primary"
          type="button"
          onClick={onBookNow}
        >
          {flight.payment_summary.cta_primary}
        </button>
        <button
          className="flight-detail-payment__button flight-detail-payment__button--secondary"
          type="button"
          onClick={onAddToCart}
        >
          {flight.payment_summary.cta_secondary}
        </button>
      </div>
    </aside>
  )
}

export default FlightPaymentSummary
