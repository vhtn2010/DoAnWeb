import { Link } from 'react-router-dom'

function HeartIcon({ isActive }) {
  return (
    <svg fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24">
      <path
        d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20s6-5.1 6-10.2A6 6 0 1 0 6 9.8C6 14.9 12 20 12 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="9.6" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function HotelCard({
  hotel,
  isFavorite = false,
  onToggleFavorite,
  ratingValue,
  formatCurrency,
  actionLabel = 'Đặt ngay',
}) {
  const detailPath = hotel.detail_path ?? `/hotels/${hotel.slug}`
  const hasSalePrice =
    hotel.sale_price != null &&
    hotel.sale_price !== '' &&
    Number(hotel.sale_price) < Number(hotel.base_price ?? 0)
  const currentPrice = hasSalePrice ? hotel.sale_price : hotel.base_price

  return (
    <article className="hotel-card">
      <div className="hotel-card__media">
        <Link className="hotel-card__media-link" to={detailPath}>
          <img alt={hotel.title} className="hotel-card__image" src={hotel.image_url} />
        </Link>
        <span className="hotel-card__badge">{ratingValue.toFixed(1)} Đánh giá</span>
        <button
          aria-label={isFavorite ? 'Bỏ yêu thích khách sạn' : 'Thêm khách sạn vào yêu thích'}
          className={`hotel-card__favorite ${isFavorite ? 'hotel-card__favorite--active' : ''}`}
          type="button"
          onClick={() => onToggleFavorite?.(hotel)}
        >
          <HeartIcon isActive={isFavorite} />
        </button>
      </div>

      <div className="hotel-card__body">
        <div className="hotel-card__location">
          <PinIcon />
          <span>{hotel.displayAddress ?? hotel.address}</span>
        </div>

        <h3 className="hotel-card__title">
          <Link className="hotel-card__title-link" to={detailPath}>
            {hotel.title}
          </Link>
        </h3>

        <div className="hotel-card__pricing">
          {hasSalePrice ? (
            <span className="hotel-card__price-old">{formatCurrency(hotel.base_price)}</span>
          ) : null}
          <strong className="hotel-card__price-sale">{formatCurrency(currentPrice)}</strong>
        </div>

        <Link className="hotel-card__button" to={detailPath}>
          {actionLabel}
        </Link>
      </div>
    </article>
  )
}

export default HotelCard
