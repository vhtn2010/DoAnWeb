import { Link } from 'react-router-dom'

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M5.75 3.25v2.1M14.25 3.25v2.1M4 7h12M5 4.75h10A1.75 1.75 0 0 1 16.75 6.5v8.25A1.75 1.75 0 0 1 15 16.5H5A1.75 1.75 0 0 1 3.25 14.75V6.5A1.75 1.75 0 0 1 5 4.75Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function TransportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M4.25 10.25 10 3.5l5.75 6.75M6.25 9.5h7.5v5.25H6.25V9.5Zm1.25 5.25v1.5m5-1.5v1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="m10 16.25-.96-.87C5.2 11.94 2.75 9.7 2.75 6.88A3.63 3.63 0 0 1 6.4 3.25c1.39 0 2.7.66 3.6 1.7.9-1.04 2.21-1.7 3.6-1.7a3.63 3.63 0 0 1 3.65 3.63c0 2.82-2.45 5.06-6.29 8.5l-.96.87Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
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

function ServiceCard({ service }) {
  const detailPath = service.detail_path ?? `/services/${service.slug}`

  return (
    <article className="service-card">
      <Link className="service-card__media-link" to={detailPath}>
        <img
          alt={service.title}
          className="service-card__image"
          src={service.image_url}
        />
        {service.badge_text ? (
          <span className="service-card__badge">{service.badge_text}</span>
        ) : null}
        <span aria-hidden="true" className="service-card__favorite">
          <HeartIcon />
        </span>
        {service.rating_text ? (
          <span className="service-card__rating">
            <StarIcon />
            {service.rating_text}
          </span>
        ) : null}
      </Link>

      <div className="service-card__body">
        <div className="service-card__meta">
          <span className="service-card__meta-item">
            <CalendarIcon />
            {service.duration_text}
          </span>
          <span className="service-card__meta-item">
            <TransportIcon />
            {service.transport_text}
          </span>
        </div>

        <p className="service-card__location">{service.location_text}</p>
        <h2 className="service-card__title">
          <Link className="service-card__title-link" to={detailPath}>
            {service.title}
          </Link>
        </h2>
        <p className="service-card__description">{service.short_description}</p>

        <div className="service-card__footer">
          <div className="service-card__price-group">
            {service.has_sale_price ? (
              <span className="service-card__price-old">{formatCurrency(service.base_price)}</span>
            ) : null}
            <span className="service-card__price-new">{formatCurrency(service.sale_price)}</span>
          </div>

          <Link className="service-card__action" to={detailPath}>
            Đặt ngay
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ServiceCard
