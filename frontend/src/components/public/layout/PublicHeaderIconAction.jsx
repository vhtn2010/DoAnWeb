import { Link } from 'react-router-dom'

function PublicHeaderIconActionContent({ badgeCount = 0, children }) {
  const safeBadgeCount = Math.max(Number(badgeCount) || 0, 0)

  return (
    <>
      <svg fill="none" viewBox="0 0 24 24">
        {children}
      </svg>
      {safeBadgeCount > 0 ? (
        <span className="public-header__icon-badge" aria-hidden="true">
          {safeBadgeCount > 99 ? '99+' : safeBadgeCount}
        </span>
      ) : null}
    </>
  )
}

function getClassName(isActive = false) {
  return `public-header__icon-action${isActive ? ' public-header__icon-action--active' : ''}`
}

function PublicHeaderIconAction({
  badgeCount = 0,
  children,
  href,
  isActive = false,
  label,
  to,
}) {
  if (to) {
    return (
      <Link aria-label={label} className={getClassName(isActive)} to={to}>
        <PublicHeaderIconActionContent badgeCount={badgeCount}>
          {children}
        </PublicHeaderIconActionContent>
      </Link>
    )
  }

  return (
    <a
      aria-label={label}
      className={getClassName(isActive)}
      href={href}
      onClick={(event) => event.preventDefault()}
    >
      <PublicHeaderIconActionContent badgeCount={badgeCount}>
        {children}
      </PublicHeaderIconActionContent>
    </a>
  )
}

export default PublicHeaderIconAction
