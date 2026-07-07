function chunkItems(items = [], chunkSize = 4) {
  const chunks = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

function renderSeatButton({ onSelectSeat, seat, selectedSeatId }) {
  const isSelected = seat.id === selectedSeatId
  const isBooked = seat.status === 'booked'
  const className = isSelected
    ? 'train-seat-map__seat train-seat-map__seat--selected'
    : isBooked
      ? 'train-seat-map__seat train-seat-map__seat--booked'
      : 'train-seat-map__seat'

  return (
    <button
      key={seat.id}
      className={className}
      type="button"
      aria-pressed={isSelected}
      aria-label={`Chỗ ${seat.number}`}
      onClick={() => onSelectSeat(seat.id)}
    >
      <span>{seat.number}</span>
    </button>
  )
}

function renderSeatGroups({ car, layout, onSelectSeat, selectedSeatId }) {
  const groupSize = Math.max(Number(layout.group_size ?? 4), 1)
  const groupColumns = Math.max(Number(layout.group_columns ?? 2), 1)
  const seatGroups = chunkItems(car.seats, groupSize)

  return (
    <div className="train-seat-map__board">
      <div className="train-seat-map__groups">
        {seatGroups.map((seatGroup, groupIndex) => (
          <div
            key={`${car.id}-group-${groupIndex + 1}`}
            className="train-seat-map__group"
            style={{ gridTemplateColumns: `repeat(${groupColumns}, 42px)` }}
          >
            {seatGroup.map((seat) =>
              renderSeatButton({
                onSelectSeat,
                seat,
                selectedSeatId,
              }),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TrainSeatMap({ car, onSelectSeat, selectedSeatId }) {
  if (!car) {
    return null
  }

  const layout = car.layout ?? {}

  return (
    <section className="train-detail-card train-seat-map train-detail-section">
      <div className="train-seat-map__header">
        <div>
          <h2>Sơ đồ {car.name}</h2>
          <p>Chọn chỗ trống để cập nhật tóm tắt đặt chỗ trong thời gian thực.</p>
        </div>

        <div className="train-seat-map__legend">
          <span>
            <i className="train-seat-map__legend-box" />
            Trống
          </span>
          <span>
            <i className="train-seat-map__legend-box train-seat-map__legend-box--booked" />
            Đã đặt
          </span>
          <span>
            <i className="train-seat-map__legend-box train-seat-map__legend-box--selected" />
            Đang chọn
          </span>
        </div>
      </div>

      <div className="train-seat-map__shell">
        <div className="train-seat-map__coach">
          <div className="train-seat-map__coach-label">
            <strong>{car.label}</strong>
          </div>

          {renderSeatGroups({
            car,
            layout,
            onSelectSeat,
            selectedSeatId,
          })}
        </div>
      </div>
    </section>
  )
}

export default TrainSeatMap
