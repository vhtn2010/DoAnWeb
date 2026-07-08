function OrderInfoIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <rect
        width="16"
        height="14"
        x="4"
        y="5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 9.5h8M8 13h5.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentSuccessOrderInfo({ orderInfo }) {
  return (
    <section className="payment-success-order-box">
      <header className="payment-success-order-box__header">
        <span className="payment-success-order-box__icon" aria-hidden="true">
          <OrderInfoIcon />
        </span>
        <h2>{orderInfo.sectionTitle}</h2>
      </header>

      <div className="payment-success-order-box__grid">
        <div className="payment-success-order-box__column">
          {orderInfo.leftColumn.map((item) => (
            <div className="payment-success-order-box__item" key={item.label}>
              <span className="payment-success-order-box__label">{item.label}</span>
              <strong className="payment-success-order-box__value">{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="payment-success-order-box__column">
          {orderInfo.rightColumn.map((item) => (
            <div className="payment-success-order-box__item" key={item.label}>
              <span className="payment-success-order-box__label">{item.label}</span>
              <strong
                className={`payment-success-order-box__value ${
                  item.tone === 'brand' ? 'payment-success-order-box__value--brand' : ''
                }`}
              >
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="payment-success-order-box__total">
        <span>{orderInfo.totalLabel}</span>
        <strong>{orderInfo.totalAmount}</strong>
      </div>
    </section>
  )
}

export default PaymentSuccessOrderInfo
