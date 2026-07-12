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
        {isCustomer ? (
          <>
            <PublicHeaderIconAction
              badgeCount={notificationCount}
              isActive={isNotificationPreview}
              label={notificationCount ? `Thông báo (${notificationCount})` : 'Thông báo'}
              to={notificationPath}
            >
              <path
                d="M6.75 10.2a5.25 5.25 0 0 1 10.5 0v2.65c0 1.06.33 2.09.95 2.94l.48.66H5.32l.48-.66c.62-.85.95-1.88.95-2.94V10.2Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M10 18.35a2.1 2.1 0 0 0 4 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </PublicHeaderIconAction>

            <PublicHeaderIconAction
              badgeCount={favoriteCount}
              isActive={isFavoritePreview}
              label={favoriteCount ? `Yêu thích (${favoriteCount})` : 'Yêu thích'}
              to={favoritePath}
            >
              <path
                d="M12 19.25 5.48 12.7C3.86 11.08 3.45 8.58 4.5 6.7a4.02 4.02 0 0 1 6.36-.8L12 7.05l1.14-1.15a4.02 4.02 0 0 1 6.36.8c1.05 1.88.64 4.38-.98 6L12 19.25Z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </PublicHeaderIconAction>

            <PublicHeaderIconAction label="Giỏ hàng" to={customerCartPath}>
              <path
                d="M3.75 5.4h2.1l1.34 8.1h9.04a1.2 1.2 0 0 0 1.15-.85l1.7-5.55H7.08"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <circle cx="9.2" cy="18.1" fill="currentColor" r="1.45" />
              <circle cx="16.15" cy="18.1" fill="currentColor" r="1.45" />
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
