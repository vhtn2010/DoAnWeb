import { Link, NavLink } from 'react-router-dom'
import { PUBLIC_PRIMARY_NAV_ITEMS } from './publicLayoutData.jsx'

function getNavLinkClassName({ isActive }) {
  return `public-header__link${isActive ? ' public-header__link--active' : ''}`
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
        d="M11.25 2.75a.75.75 0 0 1 1.5 0v5.89l6.68 3.03a1.5 1.5 0 0 1-.62 2.87h-5.34l1.88 5.39a.75.75 0 0 1-1.16.85L12 19.16l-2.19 1.62a.75.75 0 0 1-1.16-.85l1.88-5.39H5.19a1.5 1.5 0 0 1-.62-2.87l6.68-3.03V2.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PublicHeaderNav({
  bookingLinkClassName,
  buildHeaderPath,
  id,
  isFlightPreview,
  isTicketActive,
  isTrainPreview,
}) {
  return (
    <nav aria-label="Điều hướng công khai" className="public-header__nav" id={id}>
      {PUBLIC_PRIMARY_NAV_ITEMS.slice(0, 2).map((item) => (
        <NavLink
          className={getNavLinkClassName}
          end={item.end}
          key={item.label}
          to={buildHeaderPath(item.to)}
        >
          {item.label}
        </NavLink>
      ))}

      <div className="public-nav-ticket">
        <Link
          className={bookingLinkClassName}
          data-active={isTicketActive ? 'true' : 'false'}
          to={buildHeaderPath('/flights')}
        >
          Đặt vé
        </Link>

        <div className="ticket-dropdown">
          <Link
            className={`ticket-dropdown-item ${
              isFlightPreview ? 'ticket-dropdown-item--active' : ''
            }`}
            to={buildHeaderPath('/flights')}
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
            to={buildHeaderPath('/trains')}
          >
            <span className="ticket-dropdown-icon">
              <BookingSubmenuIcon type="train" />
            </span>
            <span>Vé tàu</span>
          </Link>
        </div>
      </div>

      {PUBLIC_PRIMARY_NAV_ITEMS.slice(2).map((item) => (
        <NavLink
          className={getNavLinkClassName}
          end={item.end}
          key={item.label}
          to={buildHeaderPath(item.to)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default PublicHeaderNav
