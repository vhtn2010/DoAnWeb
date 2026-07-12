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
  formatCurrency,
  isSelected,
  isUpdatingQuantity = false,
  item,
  onEdit,
  onQuantityChange,
  onRemove,
  onToggle,
}) {
  const unitPrice = Number(item.unit_price_snapshot)
  const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1
  const lineAmount = Number.isFinite(Number(item.total_amount))
    ? Number(item.total_amount)
    : unitPrice * quantity
  const shouldShowUnitPrice = Number.isFinite(unitPrice) && quantity > 1 && lineAmount !== unitPrice
  const canDecreaseQuantity = quantity > 1 && !isUpdatingQuantity

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

            <div className="cart-item-card__price-block">
              <strong className="cart-item-card__price">{formatCurrency(lineAmount)}</strong>
              {shouldShowUnitPrice ? (
                <span className="cart-item-card__price-note">
                  Đơn giá {formatCurrency(unitPrice)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="cart-item-card__actions">
            <div className="cart-item-card__quantity-control" aria-label={`Số lượng ${item.service.title}`}>
              <span className="cart-item-card__quantity-label">Số lượng</span>
              <button
                aria-label="Giảm số lượng"
                className="cart-item-card__quantity-button"
                disabled={!canDecreaseQuantity}
                type="button"
                onClick={() => onQuantityChange(item, quantity - 1)}
              >
                -
              </button>
              <strong className="cart-item-card__quantity-value" aria-live="polite">
                {quantity}
              </strong>
              <button
                aria-label="Tăng số lượng"
                className="cart-item-card__quantity-button"
                disabled={isUpdatingQuantity}
                type="button"
                onClick={() => onQuantityChange(item, quantity + 1)}
              >
                +
              </button>
            </div>
            <button
              className="cart-item-card__action cart-item-card__action--secondary"
              type="button"
              onClick={() => onEdit(item)}
            >
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
