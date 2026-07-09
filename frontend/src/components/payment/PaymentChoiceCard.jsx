function ChoiceIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M4 8.5a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentChoiceCard({
  itemCountLabel,
  items,
  onReturn,
}) {
  const hasItems = items.length > 0

  return (
    <section className="payment-choice-card">
      <header className="payment-choice-card__header">
        <div className="payment-choice-card__heading">
          <span className="payment-choice-card__icon" aria-hidden="true">
            <ChoiceIcon />
          </span>
          <div>
            <h2 className="payment-choice-card__title">Lựa chọn của bạn</h2>
            <p className="payment-choice-card__subtitle">Kiểm tra lại mục đã chọn trước khi thanh toán.</p>
          </div>
        </div>
        <span className="payment-choice-card__badge">{itemCountLabel}</span>
      </header>

      {hasItems ? (
        <div className="payment-choice-card__list">
          {items.map((item) => (
            <article className="payment-choice-card__item" key={item.id}>
              <img
                alt={item.service_title}
                className="payment-choice-card__image"
                src={item.image_url}
              />

              <div className="payment-choice-card__content">
                <h3 className="payment-choice-card__item-title">{item.service_title}</h3>
                <p className="payment-choice-card__item-meta">{item.duration_label}</p>
                <p className="payment-choice-card__item-date">{item.schedule_label}</p>
              </div>

              <div className="payment-choice-card__actions">
                <strong className="payment-choice-card__price">{item.total_amount_label}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="payment-choice-card__empty">
          <p>Chưa còn dịch vụ nào trong bước thanh toán. Bạn có thể quay lại xác nhận đơn hàng để chọn lại.</p>
          <button type="button" onClick={onReturn}>
            Quay lại xác nhận đơn hàng
          </button>
        </div>
      )}
    </section>
  )
}

export default PaymentChoiceCard
