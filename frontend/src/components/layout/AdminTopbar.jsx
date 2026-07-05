import { Link } from 'react-router-dom'
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_PROFILE_NAMES,
  ADMIN_ROUTES,
  buildAdminPath,
  canViewAdminRoute,
} from '../../constants/adminRoutes.js'
import './adminLayout.css'

function BellIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 3.5a3.5 3.5 0 0 0-3.5 3.5v1.2c0 .84-.24 1.67-.7 2.38L4.8 12.2c-.33.5.03 1.18.63 1.18h9.14c.6 0 .96-.68.63-1.18l-1-1.62a4.57 4.57 0 0 1-.7-2.38V7A3.5 3.5 0 0 0 10 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 15.5a1.77 1.77 0 0 0 3 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 13.5 3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path
        d="M10 7.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m16.2 10-.98.57a5.96 5.96 0 0 1-.24.58l.28 1.1a.8.8 0 0 1-.22.79l-.8.8a.8.8 0 0 1-.79.22l-1.1-.28c-.18.09-.38.17-.58.24l-.57.98a.8.8 0 0 1-.69.4H9.39a.8.8 0 0 1-.69-.4l-.57-.98a5.96 5.96 0 0 1-.58-.24l-1.1.28a.8.8 0 0 1-.79-.22l-.8-.8a.8.8 0 0 1-.22-.79l.28-1.1c-.09-.18-.17-.38-.24-.58L3.8 10a.8.8 0 0 1 0-.78l.98-.57c.07-.2.15-.4.24-.58l-.28-1.1a.8.8 0 0 1 .22-.79l.8-.8a.8.8 0 0 1 .79-.22l1.1.28c.18-.09.38-.17.58-.24l.57-.98a.8.8 0 0 1 .69-.4h1.13a.8.8 0 0 1 .69.4l.57.98c.2.07.4.15.58.24l1.1-.28a.8.8 0 0 1 .79.22l.8.8a.8.8 0 0 1 .22.79l-.28 1.1c.09.18.17.38.24.58l.98.57a.8.8 0 0 1 0 .78Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  )
}

function UserAvatarIcon() {
  return (
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  )
}

function TopbarAction({ canOpen, children, label, to }) {
  if (canOpen) {
    return (
      <Link aria-label={label} className="admin-topbar__icon-button" to={to}>
        {children}
      </Link>
    )
  }

  return (
    <button
      aria-disabled="true"
      aria-label={label}
      className="admin-topbar__icon-button"
      type="button"
    >
      {children}
    </button>
  )
}

function AdminTopbar({ currentRole = 'system_admin' }) {
  const profileRoleLabel = ADMIN_ROLE_LABELS[currentRole] ?? currentRole
  const profileName = ADMIN_ROLE_PROFILE_NAMES[currentRole] ?? ADMIN_ROLE_PROFILE_NAMES.system_admin
  const canOpenNotifications = canViewAdminRoute(currentRole, ADMIN_ROUTES.notifications)
  const canOpenSettings = canViewAdminRoute(currentRole, ADMIN_ROUTES.settings)

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__slot" aria-hidden="true" />

      <label className="admin-topbar__search">
        <span aria-hidden="true" className="admin-topbar__search-icon">
          <SearchIcon />
        </span>
        <input aria-label="Tìm kiếm quản trị" placeholder="Tìm kiếm ....." type="search" />
      </label>

      <div className="admin-topbar__actions">
        <TopbarAction
          canOpen={canOpenNotifications}
          label="Thông báo"
          to={buildAdminPath(ADMIN_ROUTES.notifications.path, currentRole)}
        >
          <BellIcon />
        </TopbarAction>

        <TopbarAction
          canOpen={canOpenSettings}
          label="Cài đặt"
          to={buildAdminPath(ADMIN_ROUTES.settings.path, currentRole)}
        >
          <SettingsIcon />
        </TopbarAction>

        <div className="admin-topbar__profile">
          <span aria-hidden="true" className="admin-topbar__avatar">
            <UserAvatarIcon />
          </span>

          <div className="admin-topbar__profile-copy">
            <span className="admin-topbar__profile-name">{profileName}</span>
            <span className="admin-topbar__profile-role">{profileRoleLabel}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar
