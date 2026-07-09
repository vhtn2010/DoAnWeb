import { Link } from 'react-router-dom'

function FlashSaleCard({ formatCurrency, service, serviceListPath }) {
  return (
    <article className="home-offer-card">
      <div className="home-offer-card__image-frame">
        <div
          aria-hidden="true"
          className="home-offer-card__media"
          style={{ backgroundImage: `url(${service.image_url})` }}
        />
      </div>
      <div className="home-offer-card__body">
        <span className="home-offer-card__discount">GIẢM {service.discount_percent}%</span>
        <h3 className="home-offer-card__title">{service.title}</h3>
        <p className="home-offer-card__description">{service.short_description}</p>
        <div className="home-offer-card__footer">
          <div className="home-offer-card__price-group">
            <span className="home-offer-card__price">
              {formatCurrency(service.sale_price)}
              <span className="home-offer-card__unit">{service.price_unit}</span>
            </span>
          </div>

          <Link className="home-offer-card__action" to={serviceListPath}>
            Đặt Ngay
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function HomeFlashSaleSection({
  flashSaleMeta,
  flashSaleServices,
  formatCurrency,
  serviceListPath,
}) {
  return (
    <section className="home-flash-sale">
      <div className="home-flash-sale__glow" aria-hidden="true" />
      <div className="home-flash-sale__header">
        <div className="home-flash-sale__intro">
          <div className="home-flash-sale__eyebrow">
            <span className="home-flash-sale__eyebrow-mark" aria-hidden="true" />
            <span>ƯU ĐÃI GIỚI HẠN</span>
          </div>
          <h2 className="home-flash-sale__title">
            Flash Sale
            <br />
            Mùa Hội Ngộ
          </h2>
        </div>

        <div className="home-flash-sale__timer">
          <div className="home-flash-sale__timer-unit">
            <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.days}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.day_label}</span>
          </div>
          <div className="home-flash-sale__timer-unit">
            <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.hours}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.hour_label}</span>
          </div>
          <div className="home-flash-sale__timer-unit">
            <span className="home-flash-sale__timer-value">{flashSaleMeta.timer.minutes}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.minute_label}</span>
          </div>
        </div>
      </div>

      <div className="home-flash-sale__offers">
        {flashSaleServices.map((service) => (
          <FlashSaleCard
            formatCurrency={formatCurrency}
            key={service.slug}
            service={service}
            serviceListPath={serviceListPath}
          />
        ))}
      </div>
    </section>
  )
}
