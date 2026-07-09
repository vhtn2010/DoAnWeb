import { Link } from 'react-router-dom'

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
          {ctaLabel}
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
