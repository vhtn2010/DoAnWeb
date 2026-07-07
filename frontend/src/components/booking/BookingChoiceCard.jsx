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

function BookingChoiceCard({
  feedback,
  itemCountLabel,
  items,
  onEdit,
  onGoBack,
  onRemove,
}) {
  const hasItems = items.length > 0

  return (
    <section className="booking-choice-card">
      <header className="booking-choice-card__header">
        <div className="booking-choice-card__heading">
          <span className="booking-choice-card__icon" aria-hidden="true">
            <ChoiceIcon />
          </span>
          <div>
            <h2 className="booking-choice-card__title">Lựa chọn của bạn</h2>
            <p className="booking-choice-card__subtitle">Kiểm tra nhanh dịch vụ trước khi sang bước thanh toán.</p>
          </div>
        </div>
        <span className="booking-choice-card__badge">{itemCountLabel}</span>
      </header>

      {hasItems ? (
        <div className="booking-choice-card__list">
          {items.map((item) => (
            <article className="booking-choice-card__item" key={item.id}>
              <label className="booking-choice-card__check">
                <input aria-label="Mục đã được chọn" checked readOnly type="checkbox" />
              </label>

              <img
                alt={item.service_title}
                className="booking-choice-card__image"
                src={item.image_url}
              />

              <div className="booking-choice-card__content">
                <h3 className="booking-choice-card__item-title">{item.service_title}</h3>
                <p className="booking-choice-card__item-meta">{item.duration_label}</p>
                <p className="booking-choice-card__item-date">{item.schedule_label}</p>
              </div>

              <div className="booking-choice-card__actions">
                <strong className="booking-choice-card__price">{item.total_amount_label}</strong>
                <div className="booking-choice-card__action-row">
                  <button type="button" onClick={() => onEdit(item.id)}>
                    Chỉnh sửa
                  </button>
                  <button type="button" onClick={() => onRemove(item.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="booking-choice-card__empty">
          <p>Đơn hàng hiện chưa có dịch vụ nào. Bạn có thể quay lại checkout để chọn lại.</p>
          <button type="button" onClick={onGoBack}>
            Quay lại checkout
          </button>
        </div>
      )}

      {feedback ? (
        <p className="booking-choice-card__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}

export default BookingChoiceCard
