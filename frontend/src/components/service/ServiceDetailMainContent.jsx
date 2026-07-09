import ServiceRecommendationCard from './ServiceRecommendationCard.jsx'
import {
  CheckIcon,
  CrossIcon,
  renderServiceStars,
} from './ServiceDetailIcons.jsx'
import ServiceDetailInfoStrip from './ServiceDetailInfoStrip.jsx'

function ServiceDetailSectionHeader({ eyebrow, title }) {
  return (
    <div className="service-detail-section__header">
      <span className="service-detail-section__eyebrow">{eyebrow}</span>
      <h2 className="service-detail-section__title">{title}</h2>
    </div>
  )
}

function ServiceDetailIntro({ service }) {
  return (
    <section className="service-detail-section service-detail-section--intro">
      <ServiceDetailSectionHeader
        eyebrow="Điểm nhấn hành trình"
        title="Kỳ nghỉ được thiết kế để tận hưởng"
      />
      <p className="service-detail-page__description">{service.description}</p>
      <p className="service-detail-page__policy">
        Chính sách linh hoạt: <strong>{service.cancellation_policy}</strong>
      </p>
    </section>
  )
}

function ServiceDetailTimeline({ itinerary }) {
  return (
    <section className="service-detail-section">
      <ServiceDetailSectionHeader eyebrow="Lịch trình" title="Lịch trình chi tiết" />

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
                {day.highlights.map((highlight) => (
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

function ServiceDetailTerms({ terms }) {
  return (
    <section className="service-detail-section">
      <ServiceDetailSectionHeader eyebrow="Lưu ý" title="Điều kiện tham gia" />

      <ul className="service-detail-terms">
        {terms.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function ServiceDetailReviews({ service }) {
  return (
    <section className="service-detail-section">
      <div className="service-detail-reviews__header">
        <ServiceDetailSectionHeader
          eyebrow="Cảm nhận thực tế"
          title="Đánh giá từ khách hàng"
        />

        <a className="service-detail-reviews__link" href="#">
          Xem tất cả {service.review_count} đánh giá
        </a>
      </div>

      <div className="service-detail-reviews__summary">
        <div>
          <p className="service-detail-reviews__score">{service.rating_value.toFixed(1)}</p>
          <div className="service-detail-reviews__stars">
            {renderServiceStars(service.rating_value)}
          </div>
        </div>
        <p className="service-detail-reviews__summary-copy">
          Khách hàng yêu thích chất lượng lưu trú, lịch trình hợp lý và cảm giác được chăm sóc xuyên suốt hành trình.
        </p>
      </div>

      <div className="service-detail-reviews__grid">
        {service.review_samples.map((review) => (
          <article
            className="service-detail-review-card"
            key={`${review.author_name}-${review.month_label}`}
          >
            <div className="service-detail-review-card__top">
              <div className="service-detail-review-card__identity">
                <span className="service-detail-review-card__avatar">{review.author_initials}</span>
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
        ))}
      </div>
    </section>
  )
}

function ServiceDetailRecommendations({ recommendedServices }) {
  return (
    <section className="service-detail-section">
      <ServiceDetailSectionHeader
        eyebrow="Gợi ý thêm"
        title="Tour tương tự bạn có thể thích"
      />

      <div className="service-detail-recommendations">
        {recommendedServices.map((recommendedService) => (
          <ServiceRecommendationCard
            key={recommendedService.slug}
            service={recommendedService}
          />
        ))}
      </div>
    </section>
  )
}

export default function ServiceDetailMainContent({
  infoItems,
  recommendedServices,
  service,
}) {
  return (
    <div className="service-detail-page__main">
      <ServiceDetailInfoStrip infoItems={infoItems} />
      <ServiceDetailIntro service={service} />
      <ServiceDetailTimeline itinerary={service.details.itinerary} />
      <ServiceDetailInclusions
        excludedServices={service.details.excluded_services}
        includedServices={service.details.included_services}
      />
      <ServiceDetailTerms terms={service.details.terms} />
      <ServiceDetailReviews service={service} />
      <ServiceDetailRecommendations recommendedServices={recommendedServices} />
    </div>
  )
}
