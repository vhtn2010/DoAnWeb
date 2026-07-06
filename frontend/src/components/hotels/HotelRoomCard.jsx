function RoomMetaIcon({ type }) {
  if (type === 'guests') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M12 12.5a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM5.5 19.25a6.5 6.5 0 0 1 13 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (type === 'pool') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path
          d="M4 16c1.1 0 1.7-.5 2.4-1 .7-.5 1.3-1 2.4-1 1.1 0 1.7.5 2.4 1 .7.5 1.3 1 2.4 1 1.1 0 1.7-.5 2.4-1 .7-.5 1.3-1 2.4-1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
        <path d="M7 12V8a2 2 0 0 1 4 0v4M15 12V6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M7 4H4v3M17 4h3v3M7 20H4v-3M20 17v3h-3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function RoomMetaItem({ iconType, value }) {
  if (!value) {
    return null
  }

  return (
    <div className="hotel-room-card__meta-item">
      <span className="hotel-room-card__meta-icon" aria-hidden="true">
        <RoomMetaIcon type={iconType} />
      </span>
      <span>{value}</span>
    </div>
  )
}

function HotelRoomCard({ room, isSelected, onReserve, onSelect, formatCurrency }) {
  const badgeLabel = room.display_badge ?? room.options?.badge ?? ''
  const guestLabel = room.display_guest_label ?? `${room.max_guests} Người lớn`
  const secondaryMeta = room.display_secondary_meta ?? room.room_size
  const normalizedSecondaryMeta = String(secondaryMeta)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
  const secondaryMetaIcon = normalizedSecondaryMeta.includes('ho boi')
    ? 'pool'
    : 'size'
  const displayPrice = room.display_price_text ?? formatCurrency(room.sale_price)

  function handleSelect() {
    onSelect(room.id)
  }

  function handleReserve(event) {
    event.stopPropagation()
    onReserve(room.id)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <article
      className={`hotel-room-card ${isSelected ? 'hotel-room-card--selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="hotel-room-card__media">
        <img alt={room.title} className="hotel-room-card__image" src={room.image_url} />
      </div>

      <div className="hotel-room-card__body">
        <div className="hotel-room-card__heading">
          <h3 className="hotel-room-card__title">{room.title}</h3>
          {badgeLabel ? <span className="hotel-room-card__badge">{badgeLabel}</span> : null}
        </div>

        <div className="hotel-room-card__meta">
          <RoomMetaItem iconType="guests" value={guestLabel} />
          <RoomMetaItem iconType={secondaryMetaIcon} value={secondaryMeta} />
        </div>

        <div className="hotel-room-card__footer">
          <div className="hotel-room-card__price">
            <strong>{displayPrice}</strong>
            <span>{room.display_price_suffix ?? 'mỗi đêm'}</span>
          </div>

          <button
            className="hotel-room-card__button hotel-room-card__button--primary"
            type="button"
            onClick={handleReserve}
          >
            Đặt ngay
          </button>
        </div>
      </div>
    </article>
  )
}

export default HotelRoomCard
