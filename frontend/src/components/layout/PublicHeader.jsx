import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'

const navItems = [
  { label: 'Trang chủ', to: '/', end: true },
  { label: 'Tour', to: '/services' },
  { label: 'Đặt vé', to: '#' },
  { label: 'Khách sạn', to: '#' },
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

function getPublicHeaderState(authState) {
  const isCustomer = authState === 'customer'

  return {
    isCustomer,
    previewSearch: isCustomer ? '?auth=customer' : '',
  }
}

function PublicHeader() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const authPreview = searchParams.get('auth') === 'customer' ? 'customer' : 'guest'
  const { isCustomer, previewSearch } = getPublicHeaderState(authPreview)

  function buildPreviewPath(path) {
    return previewSearch ? `${path}${previewSearch}` : path
  }

  const customerCartPath = buildPreviewPath('/cart')
  const isCartPreview = location.pathname === '/cart'

  return (
    <header className="public-header">
      <div className="public-header__shell">
        <Link
          aria-label="Nét Việt Travel"
          className="public-header__brand"
          to={buildPreviewPath('/')}
        >
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
                to={buildPreviewPath(item.to)}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="public-header__actions">
          {isCustomer ? (
            <div className="public-header__customer-actions">
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
                aria-label={isCartPreview ? 'Tài khoản người dùng trên trang giỏ hàng' : 'Tài khoản người dùng'}
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
