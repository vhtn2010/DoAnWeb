import { Link } from 'react-router-dom'
import ServiceRecommendationCard from '../../components/service/ServiceRecommendationCard.jsx'
import useTourServiceDetail from '../../hooks/useTourServiceDetail.js'

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

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 .17 1L7.9 7.16a3 3 0 0 0-3.74.45A3 3 0 0 0 6 12.75c.69 0 1.32-.23 1.83-.62l4.4 2.2a3 3 0 0 0-.08.67 3 3 0 1 0 .82-2.06l-4.48-2.24c.03-.2.05-.45.05-.7 0-.2-.02-.4-.05-.58l4.3-2.16c.54.46 1.24.74 2.01.74Z"
        fill="currentColor"
      />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="m12 20.35-1.45-1.32C5.4 14.36 2 11.28 2 7.5A4.5 4.5 0 0 1 6.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 15.5 3 4.5 4.5 0 0 1 20 7.5c0 3.78-3.4 6.86-8.55 11.54L12 20.35Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10 17s5-4.85 5-8.75A5 5 0 1 0 5 8.25C5 12.15 10 17 10 17Zm0-6.5A1.75 1.75 0 1 1 10 7a1.75 1.75 0 0 1 0 3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10 3.25A6.75 6.75 0 1 1 3.25 10 6.76 6.76 0 0 1 10 3.25Zm0 2v4.25l3 1.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function TransportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M4 12.25V8.5l2-3h8l2 3v3.75M5.5 14.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm9 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5ZM4 10.25h12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function TourTypeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M5.25 5.25h9.5v9.5h-9.5v-9.5Zm2 0v9.5M5.25 8.5h9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="m4.5 10 3.5 3.5L15.5 6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="m6 6 8 8M14 6l-8 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function renderStars(ratingValue) {
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

function ServiceDetailPage() {
  const {
    adultCount,
    adultTotal,
    bookingMessage,
    breadcrumbHomePath,
    breadcrumbListLabel,
    breadcrumbListPath,
    childCount,
    childTotal,
    departureDate,
    errorMessage,
    handleBookNow,
    handleShareClick,
    infoItems,
    isFavorite,
    isLoading,
    isShared,
    leadLocation,
    recommendedServices,
    selectedImage,
    service,
    setAdultCount,
    setChildCount,
    setDepartureDate,
    setSelectedImage,
    totalPrice,
  } = useTourServiceDetail()

  function handleImageError(event) {
    if (service && event.currentTarget.src !== service.image_url) {
      event.currentTarget.src = service.image_url
    }
  }

  if (errorMessage && !service && !isLoading) {
    return (
      <div className="service-detail-page">
        <div className="service-detail-page__shell">
          <nav aria-label="Breadcrumb" className="service-detail-page__breadcrumb">
            <Link className="service-detail-page__breadcrumb-link" to={breadcrumbHomePath}>
              Trang chủ
            </Link>
            <span aria-hidden="true">›</span>
            <Link className="service-detail-page__breadcrumb-link" to={breadcrumbListPath}>
              {breadcrumbListLabel}
            </Link>
          </nav>

          <section className="service-detail-section">
            <div className="service-detail-section__header">
              <span className="service-detail-section__eyebrow">Không khả dụng</span>
              <h1 className="service-detail-section__title">Không tìm thấy tour</h1>
            </div>
            <p className="service-detail-page__description">{errorMessage}</p>
          </section>
        </div>
      </div>
    )
  }

  if (isLoading || !service) {
    return (
      <div className="service-detail-page">
        <div className="service-detail-page__shell">
          <section className="service-detail-section">
            <div className="service-detail-section__header">
              <span className="service-detail-section__eyebrow">Đang tải</span>
              <h1 className="service-detail-section__title">Chi tiết tour đang được chuẩn bị</h1>
            </div>
            <p className="service-detail-page__description">
              Dữ liệu đang được đọc từ mock adapter theo API-ready pattern.
            </p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="service-detail-page">
      <div className="service-detail-page__shell">
        <nav aria-label="Breadcrumb" className="service-detail-page__breadcrumb">
          <Link className="service-detail-page__breadcrumb-link" to={breadcrumbHomePath}>
            Trang chủ
          </Link>
          <span aria-hidden="true">›</span>
          <Link className="service-detail-page__breadcrumb-link" to={breadcrumbListPath}>
            {breadcrumbListLabel}
          </Link>
          <span aria-hidden="true">›</span>
          <span className="service-detail-page__breadcrumb-current">{leadLocation}</span>
        </nav>

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
              onClick={handleShareClick}
            >
              <ShareIcon />
            </button>
            <button
              aria-label="Lưu tour yêu thích"
              className={`service-detail-page__action-button ${
                isFavorite ? 'service-detail-page__action-button--active' : ''
              }`}
              type="button"
              onClick={handleToggleFavorite}
            >
              <HeartIcon />
            </button>
          </div>
        </section>

        <section aria-label="Bộ sưu tập ảnh tour" className="service-detail-gallery">
          <div className="service-detail-gallery__featured">
            <img alt={service.title} src={selectedImage} onError={handleImageError} />
          </div>

          <div className="service-detail-gallery__grid">
            {service.gallery_images.slice(1, 5).map((imageUrl, index) => {
              const isLastThumb = index === 3
              const isActive = selectedImage === imageUrl

              return (
                <button
                  className={`service-detail-gallery__thumb ${
                    isActive ? 'service-detail-gallery__thumb--active' : ''
                  }`}
                  key={imageUrl}
                  type="button"
                  onClick={() => setSelectedImage(imageUrl)}
                >
                  <img alt={`${service.title} ${index + 2}`} src={imageUrl} onError={handleImageError} />
                  {isLastThumb ? (
                    <span className="service-detail-gallery__overlay">
                      +{service.extra_gallery_count} ảnh
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <div className="service-detail-page__content-grid">
          <div className="service-detail-page__main">
            <section className="service-detail-strip">
              {infoItems.map((item) => (
                <div className="service-detail-strip__item" key={item.label}>
                  <span className="service-detail-strip__icon">
                    {item.label === 'Thời gian' ? <ClockIcon /> : null}
                    {item.label === 'Phương tiện' ? <TransportIcon /> : null}
                    {item.label === 'Loại tour' ? <TourTypeIcon /> : null}
                  </span>
                  <div>
                    <p className="service-detail-strip__label">{item.label}</p>
                    <p className="service-detail-strip__value">{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="service-detail-section service-detail-section--intro">
              <div className="service-detail-section__header">
                <span className="service-detail-section__eyebrow">Điểm nhấn hành trình</span>
                <h2 className="service-detail-section__title">Kỳ nghỉ được thiết kế để tận hưởng</h2>
              </div>
              <p className="service-detail-page__description">{service.description}</p>
              <p className="service-detail-page__policy">
                Chính sách linh hoạt: <strong>{service.cancellation_policy}</strong>
              </p>
            </section>

            <section className="service-detail-section">
              <div className="service-detail-section__header">
                <span className="service-detail-section__eyebrow">Lịch trình</span>
                <h2 className="service-detail-section__title">Lịch trình chi tiết</h2>
              </div>

              <div className="service-detail-timeline">
                {service.details.itinerary.map((day) => (
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

            <section className="service-detail-inclusions">
              <article className="service-detail-inclusions__card service-detail-inclusions__card--included">
                <div className="service-detail-inclusions__heading">
                  <span className="service-detail-inclusions__icon">
                    <CheckIcon />
                  </span>
                  <h2>Bao gồm</h2>
                </div>

                <ul className="service-detail-inclusions__list">
                  {service.details.included_services.map((item) => (
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
                  {service.details.excluded_services.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="service-detail-section">
              <div className="service-detail-section__header">
                <span className="service-detail-section__eyebrow">Lưu ý</span>
                <h2 className="service-detail-section__title">Điều kiện tham gia</h2>
              </div>

              <ul className="service-detail-terms">
                {service.details.terms.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="service-detail-section">
              <div className="service-detail-reviews__header">
                <div className="service-detail-section__header">
                  <span className="service-detail-section__eyebrow">Cảm nhận thực tế</span>
                  <h2 className="service-detail-section__title">Đánh giá từ khách hàng</h2>
                </div>

                <span className="service-detail-reviews__link">
                  {service.review_count} đánh giá đã xác thực
                </span>
              </div>

              <div className="service-detail-reviews__summary">
                <div>
                  <p className="service-detail-reviews__score">{service.rating_value.toFixed(1)}</p>
                  <div className="service-detail-reviews__stars">{renderStars(service.rating_value)}</div>
                </div>
                <p className="service-detail-reviews__summary-copy">
                  {service.review_count > 0
                    ? 'Điểm số được tổng hợp từ những khách hàng đã hoàn thành tour.'
                    : 'Tour chưa có đánh giá. Trải nghiệm của khách hàng đầu tiên sẽ xuất hiện tại đây.'}
                </p>
              </div>

              <div className="service-detail-reviews__grid">
                {service.review_samples.map((review) => (
                  <article className="service-detail-review-card" key={`${review.author_name}-${review.month_label}`}>
                    <div className="service-detail-review-card__top">
                      <div className="service-detail-review-card__identity">
                        <span className="service-detail-review-card__avatar">{review.author_initials}</span>
                        <div>
                          <p className="service-detail-review-card__name">{review.author_name}</p>
                          <p className="service-detail-review-card__date">{review.month_label}</p>
                        </div>
                      </div>

                      <div className="service-detail-review-card__stars">
                        {renderStars(review.rating_value)}
                      </div>
                    </div>

                    <p className="service-detail-review-card__content">“{review.content}”</p>
                  </article>
                ))}
                {service.review_samples.length === 0 ? (
                  <p className="service-detail-reviews__empty">Chưa có đánh giá cho tour này.</p>
                ) : null}
              </div>
            </section>

            <section className="service-detail-section">
              <div className="service-detail-section__header">
                <span className="service-detail-section__eyebrow">Gợi ý thêm</span>
                <h2 className="service-detail-section__title">Tour tương tự bạn có thể thích</h2>
              </div>

              <div className="service-detail-recommendations">
                {recommendedServices.map((recommendedService) => (
                  <ServiceRecommendationCard
                    key={recommendedService.slug}
                    service={recommendedService}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="service-detail-booking">
            <div className="service-detail-booking__card">
              <div className="service-detail-booking__price">
                {service.has_sale_price ? (
                  <span className="service-detail-booking__price-old">
                    {formatCurrency(service.base_price)}
                  </span>
                ) : null}
                <div className="service-detail-booking__price-current">
                  <strong>{formatCurrency(service.sale_price)}</strong>
                  <span>/ khách</span>
                </div>
              </div>

              <div className="service-detail-booking__form">
                <label className="service-detail-booking__field">
                  <span>Ngày khởi hành</span>
                  <select value={departureDate} onChange={(event) => setDepartureDate(event.target.value)}>
                    {service.details.departure_dates.map((dateOption) => (
                      <option key={dateOption} value={dateOption}>
                        {dateOption}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="service-detail-booking__guest-grid">
                  <label className="service-detail-booking__field">
                    <span>Người lớn</span>
                    <select
                      value={adultCount}
                      onChange={(event) => setAdultCount(Number(event.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="service-detail-booking__field">
                    <span>Trẻ em</span>
                    <select
                      value={childCount}
                      onChange={(event) => setChildCount(Number(event.target.value))}
                    >
                      {[0, 1, 2, 3, 4].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="service-detail-booking__summary">
                <div className="service-detail-booking__summary-row">
                  <span>Người lớn (x{adultCount})</span>
                  <strong>{formatCurrency(adultTotal)}</strong>
                </div>

                <div className="service-detail-booking__summary-row">
                  <span>Trẻ em (x{childCount})</span>
                  <strong>{childCount > 0 ? formatCurrency(childTotal) : '0đ'}</strong>
                </div>

                <div className="service-detail-booking__summary-row">
                  <span>Phí dịch vụ</span>
                  <strong>Miễn phí</strong>
                </div>

                <div className="service-detail-booking__summary-row service-detail-booking__summary-row--total">
                  <span>Tổng cộng</span>
                  <strong>{formatCurrency(totalPrice)}</strong>
                </div>
              </div>

              <button className="service-detail-booking__submit" type="button" onClick={handleBookNow}>
                Đặt ngay
              </button>
              <p className="service-detail-booking__helper">Giữ chỗ ngay, thanh toán sau</p>
              <p className="service-detail-booking__policy">{service.cancellation_policy}</p>

              <p aria-live="polite" className="service-detail-booking__feedback">
                {bookingMessage}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default ServiceDetailPage
