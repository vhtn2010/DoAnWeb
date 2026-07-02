import { Link } from 'react-router-dom'

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="m10 3.25 1.88 3.8 4.19.61-3.03 2.95.72 4.17L10 12.8l-3.76 1.98.72-4.17L3.94 7.66l4.18-.61L10 3.25Z"
        fill="currentColor"
      />
    </svg>
  )
}

function buildEyebrow(service) {
  if (service.recommendation_label) {
    return service.recommendation_label
  }

  return `${service.location_text} - ${service.duration_text}`.toUpperCase()
}

function ServiceRecommendationCard({ service }) {
  const imageUrl = service.similar_card_image_url ?? service.image_url

  return (
    <article className="service-recommendation-card">
      <Link className="service-recommendation-card__image-link" to={`/services/${service.slug}`}>
        <img
          alt={service.title}
          className="service-recommendation-card__image"
          src={imageUrl}
        />
        {service.badge_text ? (
          <span className="service-recommendation-card__badge">{service.badge_text}</span>
        ) : null}
      </Link>

      <div className="service-recommendation-card__body">
        <p className="service-recommendation-card__eyebrow">{buildEyebrow(service)}</p>
        <h3 className="service-recommendation-card__title">
          <Link to={`/services/${service.slug}`}>{service.title}</Link>
        </h3>

        <div className="service-recommendation-card__footer">
          <p className="service-recommendation-card__price">
            Từ <strong>{formatCurrency(service.sale_price)}</strong>
          </p>

          <p className="service-recommendation-card__rating">
            <StarIcon />
            <span>
              {service.rating_value?.toFixed(1) ?? '4.8'} ({service.review_count ?? 0})
            </span>
          </p>
        </div>
      </div>
    </article>
  )
}

export default ServiceRecommendationCard
