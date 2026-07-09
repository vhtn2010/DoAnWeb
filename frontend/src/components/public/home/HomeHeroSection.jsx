import { Link } from 'react-router-dom'

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="home-hero__cta-icon" viewBox="0 0 20 14">
      <path
        d="M12 2 18 7l-6 5M17 7H2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function HomeHeroSection({
  ctaLabel,
  ctaPath,
  description,
  imageAlt,
  imageUrl,
  titleLeading,
  titleScript,
}) {
  return (
    <div className="home-hero__content">
      <div className="home-hero__copy">
        <div className="home-hero__title-group">
          <span className="home-hero__title-leading">{titleLeading}</span>
          <span className="home-hero__title-script">{titleScript}</span>
        </div>

        <p className="home-hero__description">{description}</p>

        <Link className="home-hero__cta" to={ctaPath}>
          <span>{ctaLabel}</span>
          <ArrowRightIcon />
        </Link>
      </div>

      <div className="home-hero__art">
        <img
          alt={imageAlt}
          className="home-hero__art-image"
          src={imageUrl}
        />
      </div>
    </div>
  )
}
