function StarIcon({ isActive }) {
  return (
    <svg fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24">
      <path
        d="m12 2.6 2.85 5.77 6.37.93-4.61 4.49 1.09 6.34L12 17.13 6.3 20.13l1.09-6.34L2.78 9.3l6.37-.93L12 2.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function ReviewStars({ rating }) {
  return (
    <div className="hotel-review-summary__stars" aria-label={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span
          className={`hotel-review-summary__star ${
            index < Math.round(rating) ? 'hotel-review-summary__star--active' : ''
          }`}
          key={index}
          aria-hidden="true"
        >
          <StarIcon isActive={index < Math.round(rating)} />
        </span>
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <article className="hotel-review-summary__card">
      <div className="hotel-review-summary__card-header">
        <span className="hotel-review-summary__avatar" aria-hidden="true">
          {review.initials}
        </span>

        <div className="hotel-review-summary__card-copy">
          <strong>{review.name}</strong>
          <span>{review.stayed_text}</span>
        </div>
      </div>

      <ReviewStars rating={review.rating} />
    </article>
  )
}

function HotelReviewSummary({ reviews = [] }) {
  const review = Array.isArray(reviews) ? reviews[0] : null

  return (
    <section className="hotel-detail-card hotel-detail-card--plain hotel-review-summary">
      <div className="hotel-review-summary__header">
        <div className="hotel-detail-section-heading">
          <h2 className="hotel-detail-section-heading__title">Danh gia tu khach hang</h2>
        </div>

        <button className="hotel-review-summary__link" type="button">
          Viet danh gia
        </button>
      </div>

      {review ? (
        <div className="hotel-review-summary__list">
          <ReviewCard review={review} />
        </div>
      ) : null}
    </section>
  )
}

export default HotelReviewSummary
