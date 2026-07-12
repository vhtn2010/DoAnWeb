function CoreValueIcon({ type, tone }) {
  const iconColor = tone === 'gold' ? '#f4c542' : '#d62828'

  return (
    <span
      aria-hidden="true"
      className={`home-values__icon home-values__icon--${tone}`}
    >
      <svg
        className="home-values__icon-svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {type === 'shield' ? (
          <>
            <path d="M12 3.5 18.5 6v4.8c0 4.5-3 7.8-6.5 9.4-3.5-1.6-6.5-4.9-6.5-9.4V6L12 3.5Z" />
            <path d="m12 8.4 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4L12 8.4Z" fill={iconColor} stroke="none" />
          </>
        ) : null}
        {type === 'gem' ? (
          <>
            <path d="m7 9 5-5 5 5-5 11-5-11Z" />
            <path d="M9.8 9h4.4M12 4v16" />
          </>
        ) : null}
        {type === 'support' ? (
          <>
            <path d="M5.5 12.5a6.5 6.5 0 1 1 13 0" />
            <rect x="4" y="12.5" width="3.5" height="6" rx="1.75" fill={iconColor} stroke="none" />
            <rect x="16.5" y="12.5" width="3.5" height="6" rx="1.75" fill={iconColor} stroke="none" />
            <path d="M16.5 18.5c-.6 1.3-1.9 2-3.9 2H10" />
            <path d="M10 20.5h2.2" />
          </>
        ) : null}
      </svg>
    </span>
  )
}

export default function HomeValuesSectionV2({ valueProps }) {
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('home-values--visible')
        observer.disconnect()
      }
    }, { threshold: 0.18 })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="home-values home-values--reveal" ref={sectionRef}>
      <div className="home-values__media">
        <div aria-hidden="true" className="home-values__media-ring" />
        <div className="home-values__image-wrap">
          <img
            alt="Nét Việt Travel core values"
            className="home-values__image"
            src="/assets/template/home/v184_152.png"
          />
        </div>
        <div aria-hidden="true" className="home-values__media-accent" />
      </div>

      <div className="home-values__content">
        <div className="home-values__heading">
          <div className="home-values__eyebrow-row">
            <span aria-hidden="true" className="home-values__eyebrow-line" />
            <span className="home-values__eyebrow">GIÁ TRỊ CỐT LÕI</span>
          </div>
          <h2 className="home-values__title">
            Tại sao chọn <span className="home-values__title-highlight">Nét Việt Travel?</span>
          </h2>
        </div>

        <div className="home-values__list">
          {valueProps.map((item, index) => (
            <article
              className="home-values__item"
              key={item.title}
              style={{ '--value-delay': `${240 + index * 120}ms` }}
            >
              <CoreValueIcon type={item.icon} tone={item.tone} />
              <div className="home-values__copy">
                <h3 className="home-values__item-title">{item.title}</h3>
                <p className="home-values__item-description">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
import { useEffect, useRef } from 'react'
