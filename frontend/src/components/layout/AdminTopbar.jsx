import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminButton, AdminStatusBadge } from '../admin/ui/index.js'
import { LocalLoading } from '../loading/Loading.jsx'
import { listAdminNotifications, updateAdminNotificationStatus } from '../../repositories/adminUtilityRepository.js'
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_PROFILE_NAMES,
  ADMIN_ROUTES,
  buildAdminPath,
  canViewAdminRoute,
} from '../../constants/adminRoutes.js'
import './adminLayout.css'

const NOTIFICATION_PAGE_SIZE = 6
const NOTIFICATION_FETCH_LIMIT = 100
const ADMIN_NOTIFICATION_PREFERENCE_STORAGE_KEY = 'net-viet-admin-notification-preferences'
const notificationTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
})

function formatNotificationTime(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? notificationTimeFormatter.format(date) : 'Chưa cập nhật'
}

function getNotificationPreferenceStorageKey(userKey = 'anonymous') {
  return `${ADMIN_NOTIFICATION_PREFERENCE_STORAGE_KEY}:${userKey}`
}

function readNotificationPreferences(userKey) {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(getNotificationPreferenceStorageKey(userKey))

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)

    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

function writeNotificationPreferences(userKey, preferences) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      getNotificationPreferenceStorageKey(userKey),
      JSON.stringify(preferences),
    )
  } catch {
    // Ignore storage write failures and keep UI responsive.
  }
}

function getNotificationTimestamp(item) {
  const rawValue = item?.read_at || item?.sent_at || item?.created_at
  const timestamp = rawValue ? new Date(rawValue).getTime() : 0

  return Number.isNaN(timestamp) ? 0 : timestamp
}

function isNotificationRead(item, preferences = {}) {
  const overrideState = preferences[String(item?.id)] || ''

  if (overrideState === 'read') {
    return true
  }

  if (overrideState === 'unread') {
    return false
  }

  return String(item?.status || '').toLowerCase() === 'read'
}

function sortNotifications(items = [], preferences = {}) {
  return [...items].sort((firstItem, secondItem) => {
    const firstIsRead = isNotificationRead(firstItem, preferences)
    const secondIsRead = isNotificationRead(secondItem, preferences)

    if (firstIsRead !== secondIsRead) {
      return firstIsRead ? 1 : -1
    }

    return getNotificationTimestamp(secondItem) - getNotificationTimestamp(firstItem)
  })
}

function getNotificationLabel(status = '') {
  const normalizedStatus = String(status).toLowerCase()

  if (normalizedStatus === 'read') {
    return 'Đã đọc'
  }

  if (normalizedStatus === 'sent') {
    return 'Đã gửi'
  }

  if (normalizedStatus === 'queued') {
    return 'Chờ xử lý'
  }

  if (normalizedStatus === 'failed') {
    return 'Thất bại'
  }

  return status || 'Không xác định'
}

function getNotificationAudience(item) {
  if (item?.recipient?.email) {
    return item.recipient.email
  }

  if (item?.is_broadcast) {
    return 'Thông báo broadcast'
  }

  return 'Thông báo hệ thống'
}

function getNotificationChannelLabel(item) {
  const detailLabel = item?.type || item?.related_entity_name || 'Hệ thống'
  const deliveryLabel = getNotificationLabel(item?.status)

  return `${detailLabel} • ${deliveryLabel}`
}

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

function AdminTopbar({
  currentPermissions = undefined,
  currentRole = 'system_admin',
  currentUser = null,
}) {
  const notificationPanelRef = useRef(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [notificationActionId, setNotificationActionId] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState({})
  const [hasLoadedNotificationPreferences, setHasLoadedNotificationPreferences] = useState(false)
  const profileRoleLabel = ADMIN_ROLE_LABELS[currentRole] ?? currentRole
  const profileName =
    currentUser?.full_name ||
    currentUser?.email ||
    ADMIN_ROLE_PROFILE_NAMES[currentRole] ||
    ADMIN_ROLE_PROFILE_NAMES.system_admin
  const profileAvatarUrl = currentUser?.avatar_url || ''
  const canOpenNotifications = canViewAdminRoute(
    currentRole,
    ADMIN_ROUTES.notifications,
    currentPermissions,
  )
  const canOpenSettings = canViewAdminRoute(
    currentRole,
    ADMIN_ROUTES.settings,
    currentPermissions,
  )
  const notificationPreferenceUserKey = currentUser?.id || currentUser?.email || currentRole
  const sortedNotifications = useMemo(
    () => sortNotifications(notifications, notificationPreferences),
    [notificationPreferences, notifications],
  )
  const visibleNotifications = useMemo(
    () => sortedNotifications.slice(0, NOTIFICATION_PAGE_SIZE),
    [sortedNotifications],
  )
  const pendingNotificationCount = useMemo(
    () => notifications.filter((item) => !isNotificationRead(item, notificationPreferences)).length,
    [notificationPreferences, notifications],
  )

  useEffect(() => {
    setNotificationPreferences(readNotificationPreferences(notificationPreferenceUserKey))
    setHasLoadedNotificationPreferences(true)
  }, [notificationPreferenceUserKey])

  useEffect(() => {
    if (!hasLoadedNotificationPreferences) {
      return
    }

    writeNotificationPreferences(notificationPreferenceUserKey, notificationPreferences)
  }, [
    hasLoadedNotificationPreferences,
    notificationPreferenceUserKey,
    notificationPreferences,
  ])

  const loadNotifications = useCallback(async () => {
    if (!canOpenNotifications) {
      return
    }

    setNotificationLoading(true)
    setNotificationError('')

    try {
      const response = await listAdminNotifications({
        limit: NOTIFICATION_FETCH_LIMIT,
        page: 1,
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tải thông báo.')
      }

      setNotifications(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      setNotificationError(error?.message || 'Không thể tải thông báo.')
    } finally {
      setNotificationLoading(false)
    }
  }, [canOpenNotifications])

  useEffect(() => {
    if (!canOpenNotifications) {
      return
    }

    loadNotifications()
  }, [canOpenNotifications, loadNotifications])

  useEffect(() => {
    if (!isNotificationOpen || !canOpenNotifications) {
      return
    }

    loadNotifications()
  }, [canOpenNotifications, isNotificationOpen, loadNotifications])

  useEffect(() => {
    if (!isNotificationOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!notificationPanelRef.current?.contains(event.target)) {
        setIsNotificationOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationOpen])

  function updateNotificationPreference(notificationId, nextState) {
    setNotificationPreferences((currentValue) => ({
      ...currentValue,
      [String(notificationId)]: nextState,
    }))
  }

  async function handleNotificationRead(notificationItem) {
    if (!notificationItem?.id || isNotificationRead(notificationItem, notificationPreferences)) {
      return
    }

    updateNotificationPreference(notificationItem.id, 'read')

    if (String(notificationItem.status || '').toLowerCase() === 'read') {
      return
    }

    setNotificationActionId(notificationItem.id)
    setNotificationError('')

    try {
      const response = await updateAdminNotificationStatus(notificationItem.id, { status: 'read' })

      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể cập nhật trạng thái đã đọc.')
      }

      setNotifications((currentItems) => currentItems.map((item) => (
        item.id === notificationItem.id
          ? { ...item, ...response.data }
          : item
      )))
    } catch (error) {
      setNotificationError(error?.message || 'Không thể cập nhật trạng thái đã đọc.')
    } finally {
      setNotificationActionId('')
    }
  }

  function handleMarkAsUnread(event, notificationId) {
    event.stopPropagation()
    updateNotificationPreference(notificationId, 'unread')
  }

  function toggleNotificationPanel() {
    if (!canOpenNotifications) {
      return
    }

    setIsNotificationOpen((currentValue) => !currentValue)
  }

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
        <div className="admin-topbar__notification" ref={notificationPanelRef}>
          <button
            aria-disabled={canOpenNotifications ? undefined : 'true'}
            aria-expanded={isNotificationOpen}
            aria-haspopup="dialog"
            aria-label="Thông báo"
            className={`admin-topbar__icon-button${isNotificationOpen ? ' admin-topbar__icon-button--active' : ''}`}
            type="button"
            onClick={toggleNotificationPanel}
          >
            <BellIcon />
            {pendingNotificationCount > 0 ? (
              <span className="admin-topbar__notification-badge">
                {pendingNotificationCount > 9 ? '9+' : pendingNotificationCount}
              </span>
            ) : null}
          </button>

          {isNotificationOpen && canOpenNotifications ? (
            <div
              aria-label="Thông báo hệ thống"
              className="admin-topbar__notification-popover"
              role="dialog"
            >
              <div className="admin-topbar__notification-header">
                <div className="admin-topbar__notification-copy">
                  <strong>Thông báo</strong>
                  <p>
                    {pendingNotificationCount > 0
                      ? `${pendingNotificationCount} thông báo chưa đọc. Bấm vào từng tin để đánh dấu đã đọc.`
                      : 'Tất cả thông báo hiện đã được đọc.'}
                  </p>
                </div>
                <AdminButton
                  loading={notificationLoading}
                  size="sm"
                  variant="secondary"
                  onClick={loadNotifications}
                >
                  Làm mới
                </AdminButton>
              </div>

              {notificationError ? (
                <p className="admin-topbar__notification-feedback" role="alert">
                  {notificationError}
                </p>
              ) : null}

              {notificationLoading ? (
                <LocalLoading className="admin-topbar__notification-state" minHeight="140px" size="sm" />
              ) : null}

              {!notificationLoading && notifications.length === 0 ? (
                <p className="admin-topbar__notification-state" role="status">
                  Hiện tại chưa có thông báo hệ thống nào.
                </p>
              ) : null}

              {!notificationLoading && notifications.length > 0 ? (
                <div className="admin-topbar__notification-list">
                  {visibleNotifications.map((item) => {
                    const itemIsRead = isNotificationRead(item, notificationPreferences)

                    return (
                      <article
                        className={`admin-topbar__notification-item${
                          itemIsRead ? '' : ' admin-topbar__notification-item--unread'
                        }`}
                        key={item.id}
                      >
                        <button
                          className="admin-topbar__notification-trigger"
                          type="button"
                          onClick={() => handleNotificationRead(item)}
                        >
                          <div className="admin-topbar__notification-item-top">
                            <AdminStatusBadge tone={itemIsRead ? 'success' : 'warning'}>
                              {itemIsRead ? 'Đã đọc' : 'Chưa đọc'}
                            </AdminStatusBadge>
                            <span>{formatNotificationTime(item.created_at || item.sent_at)}</span>
                          </div>

                          <h3>{item.title || 'Thông báo hệ thống'}</h3>
                          <p>{item.body || item.related_entity_name || item.type || 'Không có nội dung'}</p>

                          <div className="admin-topbar__notification-meta">
                            <span>{getNotificationAudience(item)}</span>
                            <span>{getNotificationChannelLabel(item)}</span>
                          </div>
                        </button>

                        <div className="admin-topbar__notification-actions">
                          {itemIsRead ? (
                            <AdminButton
                              size="sm"
                              variant="secondary"
                              onClick={(event) => handleMarkAsUnread(event, item.id)}
                            >
                              Đánh dấu là chưa đọc
                            </AdminButton>
                          ) : (
                            <span className="admin-topbar__notification-hint">
                              {notificationActionId === item.id
                                ? 'Đang cập nhật trạng thái...'
                                : 'Bấm vào thông báo để đánh dấu đã đọc'}
                            </span>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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

        <Link
          aria-label="Mở hồ sơ quản trị"
          className="admin-topbar__profile admin-topbar__profile-link"
          to={buildAdminPath(ADMIN_ROUTES.profile.path, currentRole)}
        >
          <span aria-hidden="true" className="admin-topbar__avatar">
            {profileAvatarUrl ? (
              <img alt="" className="admin-topbar__avatar-image" src={profileAvatarUrl} />
            ) : (
              <UserAvatarIcon />
            )}
          </span>

          <div className="admin-topbar__profile-copy">
            <span className="admin-topbar__profile-name">{profileName}</span>
            <span className="admin-topbar__profile-role">{profileRoleLabel}</span>
          </div>
        </Link>
      </div>
    </header>
  )
}

export default AdminTopbar
