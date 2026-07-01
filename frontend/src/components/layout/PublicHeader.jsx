import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Tour', to: '/services' },
  { label: 'Đặt vé', to: '#' },
  { label: 'Khách sạn', to: '#' },
]

function getNavLinkClassName({ isActive }) {
  return `public-header__link${isActive ? ' public-header__link--active' : ''}`
}

function HeaderActionIcon({ children, href, label }) {
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

function PublicHeader() {
  const isAuthenticated = false // doi true de preview header customer
  const role = 'guest' // doi sang 'customer' khi test UI customer
  const isCustomer = isAuthenticated && role === 'customer'

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

        <nav aria-label="Điều hướng công khai" className="public-header__nav">
          {navItems.map((item) =>
            item.to === '#' ? (
              <a
                aria-disabled="true"
                className="public-header__link public-header__link--placeholder"
                href="#"
                key={item.label}
                onClick={(event) => event.preventDefault()}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                className={getNavLinkClassName}
                end={item.end}
                key={item.label}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="public-header__actions">
          {isCustomer ? (
            <div className="public-header__customer-actions">
              <HeaderActionIcon href="#" label="Giỏ hàng">
                <path
                  d="M3.75 5.25h1.7l1.05 5.26a1 1 0 0 0 .98.8h8.76a1 1 0 0 0 .97-.76l1.3-5.3H7.06"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <circle cx="9.2" cy="18.2" fill="currentColor" r="1.3" />
                <circle cx="16.1" cy="18.2" fill="currentColor" r="1.3" />
              </HeaderActionIcon>

              <HeaderActionIcon href="#" label="Thông báo">
                <path
                  d="M12 4.75a4.25 4.25 0 0 0-4.25 4.25v2.06c0 .7-.24 1.38-.68 1.92l-1.19 1.47a.85.85 0 0 0 .66 1.39h10.92a.85.85 0 0 0 .66-1.39l-1.19-1.47a3.07 3.07 0 0 1-.68-1.92V9A4.25 4.25 0 0 0 12 4.75Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path
                  d="M10.2 18.1a1.9 1.9 0 0 0 3.6 0"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </HeaderActionIcon>
            </div>
          ) : (
            <Link className="public-header__login" to="/login">
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default PublicHeader
