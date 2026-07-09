import { StarIcon } from './ServiceDetailIcons.jsx'

export function renderServiceStars(ratingValue) {
  const filledStars = Math.round(ratingValue)

  return Array.from({ length: 5 }, (_, index) => (
    <span
      aria-hidden="true"
      className={`service-detail-page__review-star ${
        index < filledStars ? 'service-detail-page__review-star--filled' : ''
      }`}
      key={`${ratingValue}-${index}`}
    >
      <StarIcon />
    </span>
  ))
}
