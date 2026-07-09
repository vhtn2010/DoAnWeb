import { Link } from 'react-router-dom'
import PublicHeaderIconAction from './PublicHeaderIconAction.jsx'

function PublicHeaderActions({
  customerCartPath,
  customerProfilePath,
  isCartPreview,
  isCheckoutPreview,
  isCustomer,
  isHotelPreview,
  isProfilePreview,
  isTicketActive,
}) {
  if (!isCustomer) {
    return (
      <div className="public-header__actions">
        <Link className="public-header__login" to="/login">
          Đăng nhập
        </Link>
      </div>
    )
  }

  const profileAriaLabel =
    isCartPreview || isCheckoutPreview || isHotelPreview || isTicketActive || isProfilePreview
      ? 'Tài khoản người dùng trên trang preview'
      : 'Tài khoản người dùng'

  return (
    <div className="public-header__actions">
      <div className="public-header__customer-actions">
        <PublicHeaderIconAction href="#" label="Ngôn ngữ">
          <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M3.9 12h16.2M12 3.75c2.2 2.25 3.44 5.14 3.5 8.25-.06 3.11-1.3 6-3.5 8.25-2.2-2.25-3.44-5.14-3.5-8.25.06-3.11 1.3-6 3.5-8.25Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </PublicHeaderIconAction>

        <PublicHeaderIconAction href="#" label="Yêu thích">
          <path
            d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </PublicHeaderIconAction>

        <PublicHeaderIconAction label="Giỏ hàng" to={customerCartPath}>
          <path
            d="M3.75 5.25h1.7l1.05 5.26a1 1 0 0 0 .98.8h8.76a1 1 0 0 0 .97-.76l1.3-5.3H7.06"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <circle cx="9.2" cy="18.2" fill="currentColor" r="1.3" />
          <circle cx="16.1" cy="18.2" fill="currentColor" r="1.3" />
        </PublicHeaderIconAction>

        <span className="public-header__profile">
          <Link
            aria-label={profileAriaLabel}
            className="public-header__profile-ring"
            to={customerProfilePath}
          >
            <span className="public-header__profile-avatar">MQ</span>
          </Link>
        </span>
      </div>
    </div>
  )
}

export default PublicHeaderActions
