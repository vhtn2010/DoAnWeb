import { Link } from 'react-router-dom'

const HERO_LAYER_BASE_PATH = '/assets/template/home/hero-layers'

const heroLayers = [
  { className: 'home-hero__layer--base', key: 'base', name: 'base.png' },
  { className: 'home-hero__layer--birds-left', key: 'birdsLeft', name: 'birds-left.png' },
  { className: 'home-hero__layer--stars-left', key: 'starsLeft', name: 'stars-left.png' },
  { className: 'home-hero__layer--cloud home-hero__layer--cloud-three', key: 'cloudThree', name: 'cloud-3.png' },
  { className: 'home-hero__layer--cloud home-hero__layer--cloud-two', key: 'cloudTwo', name: 'cloud-2.png' },
  { className: 'home-hero__layer--firework', key: 'firework', name: 'firework.png' },
  { className: 'home-hero__layer--plane', key: 'plane', name: 'plane.png' },
  { className: 'home-hero__layer--cloud home-hero__layer--cloud-one', key: 'cloudOne', name: 'cloud-1.png' },
  { className: 'home-hero__layer--balloon', key: 'balloon', name: 'balloon.png' },
  { className: 'home-hero__layer--bird', key: 'bird', name: 'bird.png' },
  { className: 'home-hero__layer--star', key: 'star', name: 'star.png' },
]

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
  titleLeading,
  titleScript,
}) {
  return (
    <div className="home-hero__content">
      <div className="home-hero__sky" aria-hidden="true">
        <span className="home-hero__cloud home-hero__cloud--one" />
        <span className="home-hero__cloud home-hero__cloud--two" />
        <span className="home-hero__birds">⌁ ⌁</span>
      </div>
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

      <div
        aria-label={imageAlt}
        className="home-hero__art"
        role="img"
      >
        <div className="home-hero__art-stage">
          {heroLayers.map((layer) => (
            <img
              alt=""
              aria-hidden="true"
              className={`home-hero__art-layer ${layer.className}`}
              draggable="false"
              key={layer.name}
              src={`${HERO_LAYER_BASE_PATH}/${layer.name}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
