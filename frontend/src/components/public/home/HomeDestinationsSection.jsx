import { useEffect, useRef } from 'react'
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

function DestinationCard({ index, service }) {
  const modifierClass = {
    tall: 'home-destination-card--tall',
    small: 'home-destination-card--small',
    wide: 'home-destination-card--wide',
  }[service.size]
  const detailPath = buildHomeServiceDetailPath(service)

  return (
    <Link
      className={`home-destination-card ${modifierClass ?? ''}`}
      to={detailPath}
      style={{ '--reveal-delay': `${360 + index * 160}ms` }}
    >
      <div
        aria-hidden="true"
        className="home-destination-card__media"
        style={{ backgroundImage: `url(${service.image_url})` }}
      />
      <div className="home-destination-card__overlay" />
      <div className="home-destination-card__content">
        {service.badge_text ? (
          <span className="home-destination-card__badge">{service.badge_text}</span>
        ) : null}
        <h3 className="home-destination-card__title">{service.title}</h3>
        <p className="home-destination-card__description">{service.short_description}</p>
      </div>
    </Link>
  )
}

export default function HomeDestinationsSection({ destinations }) {
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('home-section--visible')
        observer.disconnect()
      }
    }, { threshold: 0.16 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="home-section home-section--reveal" ref={sectionRef}>
      <div className="home-section__heading">
        <span className="home-section__spark" aria-hidden="true" />
        <h2 className="home-section__title">Điểm Đến Tuyệt Diệu</h2>
        <span className="home-section__underline" aria-hidden="true" />
        <p className="home-section__subtitle">
          Lựa chọn hàng đầu cho những tâm hồn xê dịch thượng lưu
        </p>
      </div>

      <div className="home-destinations-grid">
        {destinations.map((service, index) => (
          <DestinationCard index={index} key={service.slug} service={service} />
        ))}
      </div>
    </section>
  )
}
