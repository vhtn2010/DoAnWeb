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

  if (type === 'size') {
    return (
      <svg fill="none" viewBox="0 0 24 24">
        <path d="M7 4H4v3M17 4h3v3M7 20H4v-3M20 17v3h-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M4 12h16M6.5 9.5V7A2.5 2.5 0 0 1 9 4.5h6A2.5 2.5 0 0 1 17.5 7v2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M5 12v5.5M19 12v5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function RoomMetaItem({ iconType, value }) {
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
  const badgeLabel = room.options?.badge ?? ''

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
        <div className="hotel-room-card__badges">
          {badgeLabel ? <span className="hotel-room-card__badge">{badgeLabel}</span> : null}
          {isSelected ? <span className="hotel-room-card__badge hotel-room-card__badge--active">Dang chon</span> : null}
        </div>

        <div className="hotel-room-card__copy">
          <h3 className="hotel-room-card__title">{room.title}</h3>
          <p className="hotel-room-card__description">{room.short_description}</p>
        </div>

        <div className="hotel-room-card__meta">
          <RoomMetaItem iconType="guests" value={`${room.max_guests} khach`} />
          <RoomMetaItem iconType="size" value={room.room_size} />
          <RoomMetaItem iconType="bed" value={room.bed_type} />
        </div>

        <div className="hotel-room-card__footer">
          <div className="hotel-room-card__price">
            <strong>{formatCurrency(room.sale_price)}</strong>
            <span>moi dem</span>
          </div>

          <button
            className="hotel-room-card__button hotel-room-card__button--primary"
            type="button"
            onClick={handleReserve}
          >
            Dat ngay
          </button>
        </div>
      </div>
    </article>
  )
}

export default HotelRoomCard
