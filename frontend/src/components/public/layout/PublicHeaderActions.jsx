import { Link } from 'react-router-dom'
import PublicHeaderIconAction from './PublicHeaderIconAction.jsx'

function getProfileInitials(name = '', fallback = 'NV') {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) {
    return fallback
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

function PublicHeaderActions({
  customerCartPath,
  currentUser,
  customerProfilePath,
  favoriteCount = 0,
  favoritePath,
  isCartPreview,
  isCheckoutPreview,
  isCustomer,
  isFavoritePreview,
  isHotelPreview,
  isNotificationPreview = false,
  isProfileHydrating = false,
  isProfilePreview,
  isTicketActive,
  notificationCount = 0,
  notificationPath = '/notifications',
}) {
  const profileAriaLabel =
    isCartPreview || isCheckoutPreview || isHotelPreview || isTicketActive || isProfilePreview
      ? 'Tài khoản người dùng trên trang preview'
      : 'Tài khoản người dùng'
  const profileDisplayName = currentUser?.full_name || currentUser?.email || 'Net Viet Travel'
  const profileAvatarUrl =
    typeof currentUser?.avatar_url === 'string' ? currentUser.avatar_url.trim() : ''
  const profileInitials = getProfileInitials(
    currentUser?.full_name || currentUser?.email || '',
    'NV',
  )

  return (
    <div className="public-header__actions">
      <div className="public-header__customer-actions">
        <PublicHeaderIconAction
          badgeCount={notificationCount}
          isActive={isNotificationPreview}
          label={notificationCount ? `Thông báo (${notificationCount})` : 'Thông báo'}
          to={notificationPath}
        >
          <path
            d="M7 10a5 5 0 1 1 10 0v3.06c0 .69.22 1.37.62 1.93l.88 1.23a1 1 0 0 1-.81 1.58H6.31a1 1 0 0 1-.81-1.58l.88-1.23A3.33 3.33 0 0 0 7 13.06V10Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M10 18.5a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </PublicHeaderIconAction>

        <PublicHeaderIconAction
          badgeCount={favoriteCount}
          isActive={isFavoritePreview}
          label={favoriteCount ? `Yêu thích (${favoriteCount})` : 'Yêu thích'}
          to={favoritePath}
        >
          <path
            d="m12 19.2-.92-.84C6.18 13.9 3 11.02 3 7.5a4.2 4.2 0 0 1 4.28-4.2c1.69 0 3.31.8 4.32 2.07A5.5 5.5 0 0 1 15.92 3.3 4.2 4.2 0 0 1 20.2 7.5c0 3.52-3.18 6.4-8.08 10.86l-.12.12Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </PublicHeaderIconAction>

        {isCustomer ? (
          <>
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
                {profileAvatarUrl ? (
                  <img
                    alt={profileDisplayName}
                    className="public-header__profile-avatar public-header__profile-avatar-image"
                    src={profileAvatarUrl}
                  />
                ) : isProfileHydrating ? (
                  <span
                    aria-hidden="true"
                    className="public-header__profile-avatar public-header__profile-avatar--placeholder"
                  />
                ) : (
                  <span className="public-header__profile-avatar">{profileInitials}</span>
                )}
              </Link>
            </span>
          </>
        ) : (
          <Link className="public-header__login" to="/login">
            Đăng nhập
          </Link>
        )}
      </div>
    </div>
  )
}

export default PublicHeaderActions
