import { Link, NavLink, useLocation } from 'react-router-dom'

const primaryNavItems = [
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Tour', to: '/services' },
  { label: 'Khách sạn', to: '/hotels' },
]

function getNavLinkClassName({ isActive }) {
  return `public-header__link${isActive ? ' public-header__link--active' : ''}`
}

function HeaderActionIcon({ children, href, label, to }) {
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

function BookingSubmenuIcon({ type }) {
  if (type === 'train') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <rect height="11" rx="3" stroke="currentColor" strokeWidth="1.7" width="12" x="6" y="4.5" />
        <path
          d="M8.5 8.5h2.6M12.9 8.5h2.6M9 15.5l-2 4M15 15.5l2 4M7 19.5h10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M3.75 13.25h7.05l3.15 5.2c.2.35.56.55.96.55h1.34c.4 0 .65-.44.45-.8l-1.88-4.95h4.46c.56 0 1.08-.3 1.36-.78l.66-1.16c.19-.33-.05-.75-.43-.75H14.1L9.96 4.43a1.23 1.23 0 0 0-1.06-.61H7.7c-.36 0-.6.36-.46.68l2.02 5.06H3.75c-.42 0-.75.33-.75.75v2.19c0 .42.33.75.75.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PublicHeader() {
  const location = useLocation()
  const authParams = new URLSearchParams(location.search)
  const isCustomer = authParams.get('auth') === 'customer'

  function preserveAuthPath(path) {
    return isCustomer ? `${path}?auth=customer` : path
  }

  const customerCartPath = preserveAuthPath('/cart')
  const isCartPreview = location.pathname === '/cart'
  const isCheckoutPreview = location.pathname === '/checkout'
  const isHotelPreview = location.pathname.startsWith('/hotels')
  const isTicketActive =
    location.pathname.startsWith('/flights') || location.pathname.startsWith('/trains')
  const isFlightPreview = location.pathname.startsWith('/flights')
  const isTrainPreview = location.pathname.startsWith('/trains')
  const bookingLinkClassName = `public-header__link${
    isTicketActive ? ' public-header__link--active' : ''
  }`

  return (
    <header className="public-header">
      <div className="public-header__shell">
        <Link
          aria-label="Nét Việt Travel"
          className="public-header__brand"
          to={preserveAuthPath('/')}
        >
          <img
            alt="Nét Việt Travel"
            className="public-header__logo"
            src="/assets/template/brand/logo.png"
          />
        </Link>

        <nav aria-label="Điều hướng công khai" className="public-header__nav">
          {primaryNavItems.slice(0, 2).map((item) => (
            <NavLink
              className={getNavLinkClassName}
              end={item.end}
              key={item.label}
              to={preserveAuthPath(item.to)}
            >
              {item.label}
            </NavLink>
          ))}

          <div className="public-nav-ticket">
            <Link className={bookingLinkClassName} to={preserveAuthPath('/flights')}>
              Đặt vé
            </Link>

            <div className="ticket-dropdown">
              <Link
                className={`ticket-dropdown-item ${
                  isFlightPreview ? 'ticket-dropdown-item--active' : ''
                }`}
                to={preserveAuthPath('/flights')}
              >
                <span className="ticket-dropdown-icon">
                  <BookingSubmenuIcon type="flight" />
                </span>
                <span>Vé máy bay</span>
              </Link>

              <Link
                className={`ticket-dropdown-item ${
                  isTrainPreview ? 'ticket-dropdown-item--active' : ''
                }`}
                to={preserveAuthPath('/trains')}
              >
                <span className="ticket-dropdown-icon">
                  <BookingSubmenuIcon type="train" />
                </span>
                <span>Vé tàu</span>
              </Link>
            </div>
          </div>

          {primaryNavItems.slice(2).map((item) => (
            <NavLink
              className={getNavLinkClassName}
              end={item.end}
              key={item.label}
              to={preserveAuthPath(item.to)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="public-header__actions">
          {isCustomer ? (
            <div className="public-header__customer-actions">
              <HeaderActionIcon href="#" label="Ngôn ngữ">
                <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M3.9 12h16.2M12 3.75c2.2 2.25 3.44 5.14 3.5 8.25-.06 3.11-1.3 6-3.5 8.25-2.2-2.25-3.44-5.14-3.5-8.25.06-3.11 1.3-6 3.5-8.25Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </HeaderActionIcon>

              <HeaderActionIcon href="#" label="Yêu thích">
                <path
                  d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </HeaderActionIcon>

              <HeaderActionIcon label="Giỏ hàng" to={customerCartPath}>
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

              <span
                aria-label={
                  isCartPreview || isCheckoutPreview || isHotelPreview || isTicketActive
                    ? 'Tài khoản người dùng trên trang preview'
                    : 'Tài khoản người dùng'
                }
                className="public-header__profile"
                role="img"
              >
                <span className="public-header__profile-ring">
                  <span className="public-header__profile-avatar">NV</span>
                </span>
              </span>
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
