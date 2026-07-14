import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function buildHomeServiceDetailPath(service = {}) {
  if (service.detail_path) {
    return service.detail_path
  }

  if (service.service_type === 'hotel' || service.service_type === 'room') {
    return `/hotels/${service.slug}`
  }

  if (service.service_type === 'flight') {
    return `/flights/${service.slug}`
  }

  if (service.service_type === 'train') {
    return `/trains/${service.slug}`
  }

  return `/services/${service.slug}`
}

function FlashSaleBoltIcon() {
  return (
    <svg aria-hidden="true" className="home-flash-sale__eyebrow-mark" viewBox="0 0 16 20">
      <path
        d="M9.2 1.5 3.8 10h3.5L6.8 18.5 12.4 9.7H8.8L9.2 1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function FlashSaleCard({ formatCurrency, index, service }) {
  const detailPath = buildHomeServiceDetailPath(service)

  return (
    <Link
      className="home-offer-card"
      to={detailPath}
      style={{ '--offer-delay': `${480 + index * 170}ms` }}
    >
      <svg className="home-offer-card__outline" aria-hidden="true" preserveAspectRatio="none">
        <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="27" pathLength="1" />
      </svg>
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

          <span className="home-offer-card__action">
            Đặt Ngay
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function HomeFlashSaleSection({
  flashSaleMeta,
  flashSaleServices,
  formatCurrency,
}) {
  const sectionRef = useRef(null)
  const initialMinutes =
    Number(flashSaleMeta.timer.days) * 24 * 60 +
    Number(flashSaleMeta.timer.hours) * 60 +
    Number(flashSaleMeta.timer.minutes)
  const [remainingMinutes, setRemainingMinutes] = useState(initialMinutes)

  useEffect(() => {
    setRemainingMinutes(initialMinutes)
  }, [initialMinutes])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setRemainingMinutes((minutes) => Math.max(0, minutes - 1))
    }, 60000)
    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('home-flash-sale--visible')
        observer.disconnect()
      }
    }, { threshold: 0.14 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const timer = {
    days: String(Math.floor(remainingMinutes / 1440)).padStart(2, '0'),
    hours: String(Math.floor((remainingMinutes % 1440) / 60)).padStart(2, '0'),
    minutes: String(remainingMinutes % 60).padStart(2, '0'),
  }

  return (
    <section className="home-flash-sale home-flash-sale--reveal" ref={sectionRef}>
      <div className="home-flash-sale__glow" aria-hidden="true" />
      <div className="home-flash-sale__header">
        <div className="home-flash-sale__intro">
          <div className="home-flash-sale__eyebrow">
            <FlashSaleBoltIcon />
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
            <span className="home-flash-sale__timer-value" key={`days-${timer.days}`}>{timer.days}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.day_label}</span>
          </div>
          <div className="home-flash-sale__timer-unit">
            <span className="home-flash-sale__timer-value" key={`hours-${timer.hours}`}>{timer.hours}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.hour_label}</span>
          </div>
          <div className="home-flash-sale__timer-unit">
            <span className="home-flash-sale__timer-value" key={`minutes-${timer.minutes}`}>{timer.minutes}</span>
            <span className="home-flash-sale__timer-label">{flashSaleMeta.minute_label}</span>
          </div>
        </div>
      </div>

      <div className="home-flash-sale__offers">
        {flashSaleServices.map((service, index) => (
          <FlashSaleCard
            formatCurrency={formatCurrency}
            index={index}
            key={service.slug}
            service={service}
          />
        ))}
      </div>
    </section>
  )
}
