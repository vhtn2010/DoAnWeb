import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { resolveCartItemUnitAmount } from '../../mappers/cartMappers.js'

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

function PassengerCounter({
  count,
  disabled = false,
  label,
  min = 0,
  onChange,
}) {
  const canDecrease = count > min && !disabled

  return (
    <div className="cart-item-card__passenger-control">
      <span className="cart-item-card__passenger-label">{label}</span>
      <div className="cart-item-card__passenger-stepper">
        <button
          aria-label={`Giảm ${label.toLowerCase()}`}
          className="cart-item-card__quantity-button"
          disabled={!canDecrease}
          type="button"
          onClick={() => onChange(count - 1)}
        >
          -
        </button>
        <strong className="cart-item-card__passenger-value" aria-live="polite">
          {count}
        </strong>
        <button
          aria-label={`Tăng ${label.toLowerCase()}`}
          className="cart-item-card__quantity-button"
          disabled={disabled}
          type="button"
          onClick={() => onChange(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function formatDateInputValue(value) {
  const date = value ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function addDaysToInputDate(value, dayCount = 1) {
  const [yearText, monthText, dayText] = String(value ?? '').split('-')
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText))

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  date.setDate(date.getDate() + dayCount)

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function CartItemCard({
  formatCurrency,
  isSelected,
  isUpdatingQuantity = false,
  item,
  onEdit,
  onHotelDateChange,
  onQuantityChange,
  onRemove,
  onToggle,
  onTourPassengerChange,
}) {
  const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1
  const canDecreaseQuantity = quantity > 1 && !isUpdatingQuantity
  const isTourItem = item.service_type === SERVICE_TYPES.tour
  const isHotelItem = item.service_type === SERVICE_TYPES.hotel || item.service_type === SERVICE_TYPES.room
  const adultCount = Math.max(Number(item.options?.adult_count) || quantity, 1)
  const childCount = Math.max(Number(item.options?.child_count) || 0, 0)
  const checkinDate = formatDateInputValue(item.start_at) || item.options?.checkin_date || ''
  const checkoutDate = formatDateInputValue(item.end_at) || item.options?.checkout_date || ''
  const displayAmount = resolveCartItemUnitAmount(item)

  return (
    <article className={isSelected ? 'cart-item-card cart-item-card--selected' : 'cart-item-card'}>
      <label className="cart-item-card__checkbox">
        <input checked={isSelected} type="checkbox" onChange={() => onToggle(item.id)} />
        <span aria-hidden="true" className="cart-item-card__checkbox-box" />
      </label>

      <div className="cart-item-card__body">
        <button
          className="cart-item-card__media cart-item-card__detail-trigger"
          type="button"
          onClick={() => onEdit(item)}
        >
          <img
            alt={item.service.title}
            className="cart-item-card__image"
            src={item.service.image_url}
          />
        </button>

        <div className="cart-item-card__content">
          <div className="cart-item-card__heading">
            <button
              className="cart-item-card__copy cart-item-card__detail-trigger"
              type="button"
              onClick={() => onEdit(item)}
            >
              <h3 className="cart-item-card__title">{item.service.title}</h3>
              <p className="cart-item-card__description">{item.options.option_summary}</p>
              <div className="cart-item-card__schedule">
                <CalendarIcon />
                <span>{item.options.schedule_label}</span>
              </div>
            </button>

            <div className="cart-item-card__price-block">
              <strong className="cart-item-card__price">{formatCurrency(displayAmount)}</strong>
            </div>
          </div>

          <div className="cart-item-card__actions">
            <div className="cart-item-card__quantity-stack">
              {isTourItem ? (
                <div className="cart-item-card__passenger-grid">
                  <PassengerCounter
                    count={adultCount}
                    disabled={isUpdatingQuantity}
                    label="Người lớn"
                    min={1}
                    onChange={(nextCount) => onTourPassengerChange(item, 'adult_count', nextCount)}
                  />
                  <PassengerCounter
                    count={childCount}
                    disabled={isUpdatingQuantity}
                    label="Trẻ em"
                    min={0}
                    onChange={(nextCount) => onTourPassengerChange(item, 'child_count', nextCount)}
                  />
                </div>
              ) : isHotelItem ? (
                <div className="cart-item-card__date-grid" aria-label={`Ngày lưu trú ${item.service.title}`}>
                  <label className="cart-item-card__date-field">
                    <span>Nhận phòng</span>
                    <input
                      disabled={isUpdatingQuantity}
                      type="date"
                      value={checkinDate}
                      onChange={(event) => onHotelDateChange?.(item, 'checkin', event.target.value)}
                    />
                  </label>
                  <label className="cart-item-card__date-field">
                    <span>Trả phòng</span>
                    <input
                      disabled={isUpdatingQuantity}
                      min={checkinDate ? addDaysToInputDate(checkinDate, 1) : undefined}
                      type="date"
                      value={checkoutDate}
                      onChange={(event) => onHotelDateChange?.(item, 'checkout', event.target.value)}
                    />
                  </label>
                </div>
              ) : (
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
              )}
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
