function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <rect
        height="12"
        rx="3"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
        width="14"
        x="3"
        y="5"
      />
      <path
        d="M6.5 3.5v3m7-3v3M3 8.5h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function CartItemCard({
  isSelected,
  item,
  onEdit,
  onRemove,
  onToggle,
  formatCurrency,
}) {
  return (
    <article className={isSelected ? 'cart-item-card cart-item-card--selected' : 'cart-item-card'}>
      <label className="cart-item-card__checkbox">
        <input checked={isSelected} type="checkbox" onChange={() => onToggle(item.id)} />
        <span aria-hidden="true" className="cart-item-card__checkbox-box" />
      </label>

      <div className="cart-item-card__body">
        <div className="cart-item-card__media">
          <img
            alt={item.service.title}
            className="cart-item-card__image"
            src={item.service.image_url}
          />
        </div>

        <div className="cart-item-card__content">
          <div className="cart-item-card__heading">
            <div className="cart-item-card__copy">
              <h3 className="cart-item-card__title">{item.service.title}</h3>
              <p className="cart-item-card__description">{item.options.option_summary}</p>
              <div className="cart-item-card__schedule">
                <CalendarIcon />
                <span>{item.options.schedule_label}</span>
              </div>
            </div>

            <strong className="cart-item-card__price">
              {formatCurrency(item.unit_price_snapshot)}
            </strong>
          </div>

          <div className="cart-item-card__actions">
            <button className="cart-item-card__action" type="button" onClick={() => onEdit(item)}>
              Chỉnh sửa
            </button>
            <button
              className="cart-item-card__action cart-item-card__action--danger"
              type="button"
              onClick={() => onRemove(item.id)}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default CartItemCard
