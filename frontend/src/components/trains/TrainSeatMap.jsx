function chunkSeats(seats = [], rowSize = 4) {
  const chunks = []

  for (let index = 0; index < seats.length; index += rowSize) {
    chunks.push(seats.slice(index, index + rowSize))
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
      onClick={() => onSelectSeat(seat.id)}
    >
      <span>{seat.number}</span>
    </button>
  )
}

function TrainSeatMap({
  car,
  onSelectSeat,
  selectedSeatId,
}) {
  if (!car) {
    return null
  }

  const layout = car.layout ?? {}
  const rowSize = Math.max(Number(layout.row_size ?? 4), 1)
  const aisleAfter = Math.max(Number(layout.aisle_after ?? 2), 0)
  const rows = chunkSeats(car.seats, rowSize)

  return (
    <section className="train-detail-card train-seat-map">
      <div className="train-seat-map__header">
        <div>
          <h2>Sơ đồ {car.name}</h2>
          <p>Chọn chỗ trống trực tiếp trên sơ đồ để cập nhật tóm tắt đặt chỗ.</p>
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
            <strong>{car.name}</strong>
            <span>{car.label}</span>
          </div>

          <div className="train-seat-map__rows">
            {rows.map((row, rowIndex) => (
              <div key={`${car.id}-row-${rowIndex + 1}`} className="train-seat-map__row">
                <div className="train-seat-map__seat-group">
                  {row
                    .slice(0, aisleAfter || row.length)
                    .map((seat) =>
                      renderSeatButton({
                        onSelectSeat,
                        seat,
                        selectedSeatId,
                      }),
                    )}
                </div>

                {aisleAfter > 0 && aisleAfter < row.length ? (
                  <>
                    <div className="train-seat-map__aisle" aria-hidden="true" />
                    <div className="train-seat-map__seat-group">
                      {row
                        .slice(aisleAfter)
                        .map((seat) =>
                          renderSeatButton({
                            onSelectSeat,
                            seat,
                            selectedSeatId,
                          }),
                        )}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrainSeatMap
