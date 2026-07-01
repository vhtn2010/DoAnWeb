import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Tour', to: '/services' },
  { label: 'Đặt vé', to: '#' },
  { label: 'Khách sạn', to: '#' },
]

function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__shell">
        <Link aria-label="Nét Việt Travel" className="public-header__brand" to="/">
          <img
            alt="Nét Việt Travel"
            className="public-header__logo"
            src="/assets/template/brand/logo.png"
          />
        </Link>

        <nav aria-label="Public navigation" className="public-header__nav">
          {navItems.map((item) =>
            item.to === '#' ? (
              <a
                className="public-header__link public-header__link--muted"
                href="#"
                key={item.label}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                className={({ isActive }) =>
                  `public-header__link${isActive ? ' public-header__link--active' : ''}`
                }
                end={item.end}
                key={item.label}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ),
          )}

          <Link className="public-header__login" to="/login">
            Đăng nhập
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default PublicHeader
