import { CheckIcon, CrossIcon, renderServiceStars } from './ServiceDetailIcons.jsx'
import ServiceDetailInfoStrip from './ServiceDetailInfoStrip.jsx'

function ServiceDetailSectionTitle({ title }) {
  return (
    <div className="service-detail-section-title">
      <span aria-hidden="true" className="service-detail-section-title__icon" />
      <h2 className="service-detail-section-title__text">{title}</h2>
    </div>
  )
}

function ServiceDetailItinerary({ itinerary }) {
  if (!itinerary.length) {
    return null
  }

  return (
    <section className="service-detail-itinerary">
      <ServiceDetailSectionTitle title="Lịch trình chi tiết" />

      <div className="service-detail-timeline">
        {itinerary.map((day) => (
          <article className="service-detail-day" key={day.day_number}>
            <div className="service-detail-day__marker">
              <span>{day.day_number}</span>
            </div>

            <div className="service-detail-day__body">
              <h3 className="service-detail-day__title">{day.title}</h3>
              <p className="service-detail-day__summary">{day.summary}</p>

              <div className="service-detail-day__highlights">
                {(Array.isArray(day.highlights) ? day.highlights : []).map((highlight) => (
                  <p className="service-detail-day__highlight" key={highlight}>
                    <span aria-hidden="true" className="service-detail-day__dot" />
                    <span>{highlight}</span>
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ServiceDetailInclusions({ excludedServices, includedServices }) {
  return (
    <section className="service-detail-inclusions">
      <article className="service-detail-inclusions__card service-detail-inclusions__card--included">
        <div className="service-detail-inclusions__heading">
          <span className="service-detail-inclusions__icon">
            <CheckIcon />
          </span>
          <h2>Bao gồm</h2>
        </div>

        <ul className="service-detail-inclusions__list">
          {includedServices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      <article className="service-detail-inclusions__card service-detail-inclusions__card--excluded">
        <div className="service-detail-inclusions__heading">
          <span className="service-detail-inclusions__icon">
            <CrossIcon />
          </span>
          <h2>Không bao gồm</h2>
        </div>

        <ul className="service-detail-inclusions__list">
          {excludedServices.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

function ServiceDetailReviews({ service }) {
  const reviewSamples = Array.isArray(service.review_samples)
    ? service.review_samples.slice(0, 1)
    : []

  return (
    <section className="service-detail-reviews" id="service-detail-reviews">
      <div className="service-detail-reviews__header">
        <h2 className="service-detail-reviews__title">Đánh giá từ khách hàng</h2>
        <a className="service-detail-reviews__link" href="#service-detail-reviews">
          Xem tất cả {service.review_count} đánh giá
        </a>
      </div>

      <div className="service-detail-reviews__list">
        {reviewSamples.length ? (
          reviewSamples.map((review) => (
            <article
              className="service-detail-review-card"
              key={`${review.author_name}-${review.month_label}`}
            >
              <div className="service-detail-review-card__top">
                <div className="service-detail-review-card__identity">
                  <span className="service-detail-review-card__avatar">
                    {review.author_initials}
                  </span>
                  <div>
                    <p className="service-detail-review-card__name">{review.author_name}</p>
                    <p className="service-detail-review-card__date">{review.month_label}</p>
                  </div>
                </div>

                <div className="service-detail-review-card__stars">
                  {renderServiceStars(review.rating_value)}
                </div>
              </div>

              <p className="service-detail-review-card__content">“{review.content}”</p>
            </article>
          ))
        ) : (
          <article className="service-detail-review-card">
            <p className="service-detail-review-card__content">
              Chưa có đánh giá hiển thị cho tour này.
            </p>
          </article>
        )}
      </div>
    </section>
  )
}

export default function ServiceDetailMainContentV2({ infoItems, service }) {
  const itinerary = Array.isArray(service?.details?.itinerary) ? service.details.itinerary : []
  const includedServices = Array.isArray(service?.details?.included_services)
    ? service.details.included_services
    : []
  const excludedServices = Array.isArray(service?.details?.excluded_services)
    ? service.details.excluded_services
    : []

  return (
    <div className="service-detail-page__main">
      <ServiceDetailInfoStrip infoItems={infoItems} />
      <ServiceDetailItinerary itinerary={itinerary} />
      <ServiceDetailInclusions
        excludedServices={excludedServices}
        includedServices={includedServices}
      />
      <ServiceDetailReviews service={service} />
    </div>
  )
}
