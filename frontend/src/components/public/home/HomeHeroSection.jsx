import { useRef } from 'react'
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
  const heroRef = useRef(null)

  function handlePointerMove(event) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const bounds = heroRef.current?.getBoundingClientRect()
    if (!bounds) return

    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    heroRef.current.style.setProperty('--hero-pointer-x', x.toFixed(3))
    heroRef.current.style.setProperty('--hero-pointer-y', y.toFixed(3))
  }

  function resetPointer() {
    heroRef.current?.style.setProperty('--hero-pointer-x', 0)
    heroRef.current?.style.setProperty('--hero-pointer-y', 0)
  }

  return (
    <div
      className="home-hero__content"
      ref={heroRef}
      onMouseLeave={resetPointer}
      onMouseMove={handlePointerMove}
    >
      <div className="home-hero__sky" aria-hidden="true">
        <span className="home-hero__cloud home-hero__cloud--one" />
        <span className="home-hero__cloud home-hero__cloud--two" />
        <span className="home-hero__birds">⌁　⌁</span>
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

      <div className="home-hero__art">
        <img
          alt={imageAlt}
          className="home-hero__art-image"
          src={imageUrl}
        />
        <span className="home-hero__float home-hero__float--spark" aria-hidden="true">✦</span>
      </div>
    </div>
  )
}
