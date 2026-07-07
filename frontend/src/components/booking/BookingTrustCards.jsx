import { BOOKING_TRUST_CARD_ITEMS } from '../../constants/bookings.js'

function BookingTrustCards() {
  return (
    <div className="booking-trust-cards" aria-label="Cam kết hỗ trợ khách hàng">
      {BOOKING_TRUST_CARD_ITEMS.map((item) => (
        <article className="booking-trust-card" key={item.id}>
          <span className="booking-trust-card__icon" aria-hidden="true">
            {item.iconLabel}
          </span>
          <div>
            <h3 className="booking-trust-card__title">{item.title}</h3>
            <p className="booking-trust-card__description">{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default BookingTrustCards
