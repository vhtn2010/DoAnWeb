function UpcomingTripCard({
  trip,
  onOpenPrimary,
  onOpenSecondary,
}) {
  return (
    <section className="profile-upcoming-trip">
      <header className="profile-upcoming-trip__header">
        <h2>Chuyến đi sắp tới</h2>
        <button type="button" onClick={onOpenPrimary}>
          Xem tất cả
        </button>
      </header>

      <article
        className="profile-upcoming-trip__card"
        style={{ backgroundImage: `url(${trip.image_url})` }}
      >
        <div className="profile-upcoming-trip__overlay" />

        <div className="profile-upcoming-trip__content">
          <span className="profile-upcoming-trip__badge">{trip.badge}</span>
          <span className="profile-upcoming-trip__code">MÃ: {trip.code}</span>
          <h3>{trip.title}</h3>

          <div className="profile-upcoming-trip__meta">
            <span>{trip.date_label}</span>
            <span>{trip.location_label}</span>
          </div>

          <div className="profile-upcoming-trip__actions">
            <button type="button" onClick={onOpenPrimary}>
              {trip.primary_action_label}
            </button>
            <button
              className="profile-upcoming-trip__secondary-action"
              type="button"
              onClick={onOpenSecondary}
            >
              {trip.secondary_action_label}
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}

export default UpcomingTripCard
