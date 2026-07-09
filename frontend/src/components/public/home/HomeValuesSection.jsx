function CoreValueIcon({ type, tone }) {
  const iconColor = tone === 'gold' ? '#f4c542' : '#d62828'

  return (
    <span
      aria-hidden="true"
      className={`home-values__icon home-values__icon--${tone}`}
    >
      <svg className="home-values__icon-svg" viewBox="0 0 28 28">
        {type === 'shield' ? (
          <path
            d="M14 4.5 20.75 7v5.2c0 5-3.38 8.77-6.75 10.3-3.37-1.53-6.75-5.3-6.75-10.3V7L14 4.5Zm0 5.1-1.14 2.3-2.54.37 1.84 1.8-.44 2.55L14 15.42l2.28 1.2-.43-2.55 1.83-1.8-2.53-.37L14 9.6Z"
            fill={iconColor}
          />
        ) : null}
        {type === 'gem' ? (
          <path
            d="m7 10.25 4.2-4.75h5.6L21 10.25 14 21 7 10.25Zm3.25 0L14 16.4l3.75-6.15h-7.5Z"
            fill={iconColor}
          />
        ) : null}
        {type === 'support' ? (
          <>
            <path
              d="M7.25 14.25V12.5a6.75 6.75 0 1 1 13.5 0v1.75"
              fill="none"
              stroke={iconColor}
              strokeLinecap="round"
              strokeWidth="2.2"
            />
            <rect x="5" y="13.5" width="4.25" height="7" rx="2.1" fill={iconColor} />
            <rect x="18.75" y="13.5" width="4.25" height="7" rx="2.1" fill={iconColor} />
            <path
              d="M18 21c-.72 1.3-2.06 2-4 2h-2.2"
              fill="none"
              stroke={iconColor}
              strokeLinecap="round"
              strokeWidth="2.2"
            />
          </>
        ) : null}
      </svg>
    </span>
  )
}

export default function HomeValuesSection({ valueProps }) {
  return (
    <section className="home-values">
      <div className="home-values__image-wrap">
        <img
          alt="Nét Việt Travel core values"
          className="home-values__image"
          src="/assets/template/home/v184_152.png"
        />
      </div>

      <div className="home-values__content">
        <div className="home-values__heading">
          <span className="home-values__eyebrow">GIÁ TRỊ CỐT LÕI</span>
          <h2 className="home-values__title">
            Tại sao chọn <span className="home-values__title-highlight">Nét Việt Travel?</span>
          </h2>
        </div>

        <div className="home-values__list">
          {valueProps.map((item) => (
            <article className="home-values__item" key={item.title}>
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
