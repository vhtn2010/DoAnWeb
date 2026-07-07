function TrainScheduleCard({ schedule = [] }) {
  return (
    <section className="train-detail-card train-schedule-card">
      <div className="train-detail-section-heading">
        <h2>Lịch trình chuyến đi</h2>
      </div>

      <div className="train-schedule-card__timeline">
        {schedule.map((stop) => (
          <div key={stop.id} className="train-schedule-card__item">
            <div className="train-schedule-card__track" aria-hidden="true">
              <span
                className={
                  stop.is_terminal
                    ? 'train-schedule-card__dot train-schedule-card__dot--terminal'
                    : 'train-schedule-card__dot'
                }
              />
            </div>

            <div className="train-schedule-card__copy">
              <strong>{stop.station_name}</strong>
              <p>{stop.city}</p>
              {stop.note ? <small>{stop.note}</small> : null}
            </div>

            <div className="train-schedule-card__time">{stop.time}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TrainScheduleCard
