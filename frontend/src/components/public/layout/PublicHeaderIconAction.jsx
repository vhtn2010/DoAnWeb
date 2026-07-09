import { Link } from 'react-router-dom'

function PublicHeaderIconAction({ children, href, label, to }) {
  if (to) {
    return (
      <Link aria-label={label} className="public-header__icon-action" to={to}>
        <svg fill="none" viewBox="0 0 24 24">
          {children}
        </svg>
      </Link>
    )
  }

  return (
    <a
      aria-label={label}
      className="public-header__icon-action"
      href={href}
      onClick={(event) => event.preventDefault()}
    >
      <svg fill="none" viewBox="0 0 24 24">
        {children}
      </svg>
    </a>
  )
}

export default PublicHeaderIconAction
