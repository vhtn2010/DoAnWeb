function RoomFeature({ label, value }) {
  return (
    <div className="hotel-room-card__feature">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function HotelRoomCard({
  room,
  isSelected,
  onReserve,
  onSelect,
  formatCurrency,
}) {
  return (
    <article className={`hotel-room-card ${isSelected ? 'hotel-room-card--selected' : ''}`}>
      <div className="hotel-room-card__media">
        <img alt={room.title} className="hotel-room-card__image" src={room.image_url} />
      </div>

      <div className="hotel-room-card__body">
        <div className="hotel-room-card__heading">
          <div>
            <h3 className="hotel-room-card__title">{room.title}</h3>
            <p className="hotel-room-card__description">{room.short_description}</p>
          </div>

          <div className="hotel-room-card__price">
            <span className="hotel-room-card__price-old">{formatCurrency(room.base_price)}</span>
            <strong>{formatCurrency(room.sale_price)}</strong>
            <span>/ đêm</span>
          </div>
        </div>

        <div className="hotel-room-card__features">
          <RoomFeature label="Sức chứa" value={`${room.max_guests} khách`} />
          <RoomFeature label="Giường" value={room.bed_type} />
          <RoomFeature label="Diện tích" value={room.room_size} />
          <RoomFeature label="Còn lại" value={`${room.available_quantity} phòng`} />
        </div>

        <div className="hotel-room-card__amenities">
          {room.amenities.map((amenity) => (
            <span className="hotel-room-card__amenity" key={amenity}>
              {amenity}
            </span>
          ))}
        </div>

        <div className="hotel-room-card__actions">
          <button
            className={`hotel-room-card__button hotel-room-card__button--secondary ${
              isSelected ? 'hotel-room-card__button--selected' : ''
            }`}
            type="button"
            onClick={() => onSelect(room.id)}
          >
            {isSelected ? 'Đang chọn' : 'Chọn phòng'}
          </button>

          <button
            className="hotel-room-card__button hotel-room-card__button--primary"
            type="button"
            onClick={() => onReserve(room.id)}
          >
            Đặt phòng
          </button>
        </div>
      </div>
    </article>
  )
}

export default HotelRoomCard
