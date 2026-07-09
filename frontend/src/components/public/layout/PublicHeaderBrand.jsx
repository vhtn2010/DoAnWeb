import { Link } from 'react-router-dom'

function PublicHeaderBrand({ to }) {
  return (
    <Link aria-label="Nét Việt Travel" className="public-header__brand" to={to}>
      <img
        alt="Nét Việt Travel"
        className="public-header__logo"
        src="/assets/template/brand/logo.png"
      />
    </Link>
  )
}

export default PublicHeaderBrand
