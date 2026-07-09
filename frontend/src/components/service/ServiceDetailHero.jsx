import { HeartIcon, PinIcon, ShareIcon, StarIcon } from './ServiceDetailIcons.jsx'

export default function ServiceDetailHero({
  isFavorite,
  isShared,
  onShare,
  onToggleFavorite,
  service,
}) {
  return (
    <section className="service-detail-page__hero">
      <div className="service-detail-page__hero-copy">
        <h1 className="service-detail-page__title">{service.title}</h1>

        <div className="service-detail-page__meta">
          <span className="service-detail-page__meta-rating">
            <StarIcon />
            <strong>{service.rating_value.toFixed(1)}</strong>
            <span>({service.review_count} đánh giá)</span>
          </span>
          <span aria-hidden="true" className="service-detail-page__meta-dot">
            •
          </span>
          <span className="service-detail-page__meta-location">
            <PinIcon />
            <span>{service.location_text}</span>
          </span>
        </div>
      </div>

      <div className="service-detail-page__actions">
        <button
          aria-label="Chia sẻ tour"
          className={`service-detail-page__action-button ${
            isShared ? 'service-detail-page__action-button--active' : ''
          }`}
          type="button"
          onClick={onShare}
        >
          <ShareIcon />
        </button>
        <button
          aria-label="Lưu tour yêu thích"
          className={`service-detail-page__action-button ${
            isFavorite ? 'service-detail-page__action-button--active' : ''
          }`}
          type="button"
          onClick={onToggleFavorite}
        >
          <HeartIcon />
        </button>
      </div>
    </section>
  )
}
