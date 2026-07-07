import { PAYMENT_TRUST_CARD_ITEMS } from '../../constants/payments.js'

function PaymentTrustCards() {
  return (
    <div className="payment-trust-cards" aria-label="Cam kết hỗ trợ khách hàng">
      {PAYMENT_TRUST_CARD_ITEMS.map((item) => (
        <article className="payment-trust-card" key={item.id}>
          <span className="payment-trust-card__icon" aria-hidden="true">
            {item.iconLabel}
          </span>
          <div>
            <h3 className="payment-trust-card__title">{item.title}</h3>
            <p className="payment-trust-card__description">{item.description}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default PaymentTrustCards
