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
          ★
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
      <p>{review.comment}</p>
    </article>
  )
}

function HotelReviewSummary({ rating, reviewCount, reviews = [] }) {
  const reviewItems = Array.isArray(reviews) ? reviews.slice(0, 3) : []

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

      <div className="hotel-review-summary__overview">
        <div className="hotel-review-summary__score">
          <ReviewStars rating={rating} />
          <strong>{rating.toFixed(1)}</strong>
          <span>{reviewCount} danh gia da xac thuc</span>
        </div>

        <div className="hotel-review-summary__list">
          {reviewItems.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default HotelReviewSummary
