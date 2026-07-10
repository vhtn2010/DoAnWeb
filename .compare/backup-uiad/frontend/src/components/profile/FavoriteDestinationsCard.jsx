function ArrowIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M7 5.75 11.25 10 7 14.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FavoriteDestinationsCard({ destinations, onOpenDestination }) {
  return (
    <section className="profile-favorites-card">
      <header className="profile-favorites-card__header">
        <h2>Điểm đến yêu thích</h2>
        <span className="profile-favorites-card__header-icon" aria-hidden="true">
          <ArrowIcon />
        </span>
      </header>

      <div className="profile-favorites-card__list">
        {destinations.map((destination) => (
          <button
            className="profile-favorites-card__item"
            key={destination.id}
            type="button"
            onClick={() => onOpenDestination(destination)}
          >
            <img alt={destination.name} src={destination.image_url} />
            <span className="profile-favorites-card__item-copy">
              <strong>{destination.name}</strong>
              <small>{destination.location}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default FavoriteDestinationsCard
