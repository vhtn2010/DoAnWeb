import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicErrorState,
  PublicLoadingBlock,
  PublicNotice,
  PublicPageHeader,
  PublicPagination,
  PublicSectionHeader,
  PublicToolbar,
} from '../../components/public/ui/index.js'
import {
  deleteMyNotification,
  getMyNotificationDetail,
  listMyNotifications,
  markMyNotificationsBulkRead,
  markMyNotificationRead,
} from '../../repositories/notificationRepository.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'
import './notificationsPage.css'

const NOTIFICATION_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'read', label: 'Đã đọc' },
])

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const PRIORITY_NOTIFICATION_TYPES = new Set([
  'booking_status',
  'payment',
  'promotion',
  'support_reply',
])

const PRIORITY_SYSTEM_RELATED_ENTITIES = new Set([
  'booking',
  'payment',
  'promotion',
  'support_ticket',
  'cart',
])

const IRRELEVANT_NOTIFICATION_KEYWORDS = [
  'dev',
  'development',
  'sample data',
  'seeded',
  'uat',
  'dashboard sample',
  'internal test',
  'test broadcast',
]

const ACTIONABLE_NOTIFICATION_KEYWORDS = [
  'đơn hàng',
  'đơn đặt chỗ',
  'booking',
  'thanh toán',
  'payment',
  'khuyến mãi',
  'ưu đãi',
  'giảm giá',
  'voucher',
  'giỏ hàng',
  'cart',
  'hỗ trợ',
  'support',
  'admin trả lời',
  'phản hồi',
  'xác nhận',
  'hoàn tiền',
  'refund',
  'nhắc bạn đặt',
  'hoàn tất mua',
]

function formatDateTime(value) {
  const parsedDate = value ? new Date(value) : null

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return 'Đang cập nhật'
  }

  return dateTimeFormatter.format(parsedDate)
}

function normalizeNotificationText(value = '') {
  return String(value).trim().toLowerCase()
}

function buildNotificationSearchText(notification = {}) {
  return [
    notification.title,
    notification.body,
    notification.type,
    notification.related_entity_name,
  ]
    .map((entry) => normalizeNotificationText(entry))
    .filter(Boolean)
    .join(' ')
}

function includesKeyword(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword))
}

function isRelevantCustomerNotification(notification = {}) {
  const normalizedType = normalizeNotificationText(notification.type)
  const normalizedRelatedEntityName = normalizeNotificationText(notification.related_entity_name)
  const searchText = buildNotificationSearchText(notification)

  if (!searchText) {
    return false
  }

  if (includesKeyword(searchText, IRRELEVANT_NOTIFICATION_KEYWORDS)) {
    return false
  }

  if (PRIORITY_NOTIFICATION_TYPES.has(normalizedType)) {
    return true
  }

  if (normalizedType === 'system') {
    return (
      PRIORITY_SYSTEM_RELATED_ENTITIES.has(normalizedRelatedEntityName) ||
      includesKeyword(searchText, ACTIONABLE_NOTIFICATION_KEYWORDS)
    )
  }

  return includesKeyword(searchText, ACTIONABLE_NOTIFICATION_KEYWORDS)
}

function getTypeLabel(type = '') {
  const normalizedType = String(type).trim().toLowerCase()

  if (normalizedType === 'booking_status') {
    return 'Đơn đặt chỗ'
  }

  if (normalizedType === 'payment') {
    return 'Thanh toán'
  }

  if (normalizedType === 'promotion') {
    return 'Khuyến mãi'
  }

  if (normalizedType === 'support_reply') {
    return 'Hỗ trợ'
  }

  if (normalizedType === 'system') {
    return 'Hệ thống'
  }

  return normalizedType ? normalizedType.replace(/_/g, ' ') : 'Thông báo'
}

function getStatusLabel(notification = {}) {
  return notification.read_at ? 'Đã đọc' : 'Chưa đọc'
}

function matchesFilter(notification, filterId) {
  if (filterId === 'all') {
    return true
  }

  if (filterId === 'unread') {
    return !notification.read_at
  }

  return Boolean(notification.read_at)
}

function NotificationsPage() {
  const navigate = useNavigate()
  const { isCustomer, isCustomerPreview } = usePublicSession()
  const [loading, setLoading] = useState(Boolean(isCustomerPreview))
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({
    message: '',
    tone: 'info',
  })
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [selectedNotificationId, setSelectedNotificationId] = useState('')
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pageMeta, setPageMeta] = useState({
    page: 1,
    total: 0,
    total_pages: 0,
  })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!isCustomerPreview) {
      setLoading(false)
      setNotifications([])
      setSelectedNotification(null)
      return
    }

    let isActive = true

    async function loadNotifications() {
      setLoading(true)
      setError('')

      try {
        const listResponse = await listMyNotifications({
          limit: 8,
          page: pageMeta.page,
        })

        if (!isActive) {
          return
        }

        setNotifications(Array.isArray(listResponse.data) ? listResponse.data : [])
        setPageMeta((currentMeta) => ({
          ...currentMeta,
          ...(listResponse.meta ?? {}),
        }))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setNotifications([])
        setSelectedNotification(null)
        setError(loadError?.message || 'Không thể tải hộp thư thông báo lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      isActive = false
    }
  }, [isCustomerPreview, pageMeta.page, reloadToken])

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => isRelevantCustomerNotification(notification)),
    [notifications],
  )

  const visibleUnreadCount = useMemo(
    () => visibleNotifications.filter((notification) => !notification.read_at).length,
    [visibleNotifications],
  )

  useEffect(() => {
    if (!visibleNotifications.length) {
      setSelectedNotificationId('')
      setSelectedNotification(null)
      return
    }

    const hasSelectedVisibleNotification = visibleNotifications.some(
      (notification) => notification.id === selectedNotificationId,
    )

    if (!hasSelectedVisibleNotification) {
      setSelectedNotificationId(visibleNotifications[0].id)
    }
  }, [selectedNotificationId, visibleNotifications])

  useEffect(() => {
    if (!isCustomerPreview || !selectedNotificationId) {
      setSelectedNotification(null)
      return
    }

    let isActive = true

    async function loadNotificationDetail() {
      setDetailLoading(true)

      try {
        const response = await getMyNotificationDetail(selectedNotificationId)

        if (!isActive) {
          return
        }

        const detail = response?.data ?? null
        setSelectedNotification(detail)

        if (detail && !detail.read_at) {
          try {
            const readResponse = await markMyNotificationRead(selectedNotificationId)
            const nextReadAt = readResponse?.data?.read_at ?? new Date().toISOString()

            if (!isActive) {
              return
            }

            setNotifications((currentItems) =>
              currentItems.map((item) =>
                item.id === selectedNotificationId
                  ? {
                      ...item,
                      read_at: nextReadAt,
                      status: readResponse?.data?.status ?? item.status,
                    }
                  : item,
              ),
            )
            setSelectedNotification((currentDetail) =>
              currentDetail
                ? {
                    ...currentDetail,
                    read_at: nextReadAt,
                    status: readResponse?.data?.status ?? currentDetail.status,
                  }
                : currentDetail,
            )
          } catch {
            // Keep detail visible even if read-state sync fails.
          }
        }
      } catch (detailError) {
        if (!isActive) {
          return
        }

        setSelectedNotification(null)
        setFeedback({
          message:
            detailError?.message || 'Không thể tải chi tiết thông báo đang chọn.',
          tone: 'error',
        })
      } finally {
        if (isActive) {
          setDetailLoading(false)
        }
      }
    }

    loadNotificationDetail()

    return () => {
      isActive = false
    }
  }, [isCustomerPreview, selectedNotificationId])

  const filteredNotifications = useMemo(
    () => visibleNotifications.filter((notification) => matchesFilter(notification, selectedFilter)),
    [visibleNotifications, selectedFilter],
  )

  const profilePath = buildPublicAuthPath('/profile', isCustomer)
  const customerCarePath = buildPublicAuthPath('/customer-care', isCustomer)

  async function handleMarkAllRead() {
    const unreadVisibleNotificationIds = visibleNotifications
      .filter((notification) => !notification.read_at)
      .map((notification) => notification.id)

    if (!unreadVisibleNotificationIds.length) {
      return
    }

    try {
      const response = await markMyNotificationsBulkRead(unreadVisibleNotificationIds)
      const readTimestamp = new Date().toISOString()

      setNotifications((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          read_at:
            unreadVisibleNotificationIds.includes(item.id) && !item.read_at
              ? readTimestamp
              : item.read_at,
          status:
            unreadVisibleNotificationIds.includes(item.id) && !item.read_at
              ? 'read'
              : item.status,
        })),
      )
      setSelectedNotification((currentDetail) =>
        currentDetail
          && unreadVisibleNotificationIds.includes(currentDetail.id)
          ? {
              ...currentDetail,
              read_at: currentDetail.read_at || readTimestamp,
              status: 'read',
            }
          : currentDetail,
      )
      setFeedback({
        message:
          response?.message || 'Các thông báo quan trọng trong danh sách này đã được đánh dấu đã đọc.',
        tone: 'success',
      })
    } catch (markError) {
      setFeedback({
        message: markError?.message || 'Không thể đánh dấu toàn bộ thông báo là đã đọc.',
        tone: 'error',
      })
    }
  }

  async function handleDelete(notificationId) {
    try {
      await deleteMyNotification(notificationId)

      setNotifications((currentItems) =>
        currentItems.filter((item) => item.id !== notificationId),
      )

      if (selectedNotificationId === notificationId) {
        const nextNotification =
          visibleNotifications.find((item) => item.id !== notificationId) ?? null
        setSelectedNotificationId(nextNotification?.id ?? '')
        setSelectedNotification(nextNotification)
      }

      setFeedback({
        message: 'Thông báo đã được xóa khỏi hộp thư của bạn.',
        tone: 'success',
      })
    } catch (deleteError) {
      setFeedback({
        message: deleteError?.message || 'Không thể xóa thông báo này.',
        tone: 'error',
      })
    }
  }

  if (!isCustomerPreview && !loading) {
    return (
      <div className="notifications-page">
        <ProfileGuestGate
          message="Đăng nhập để xem thông báo đơn hàng, thanh toán và các cập nhật hệ thống dành riêng cho tài khoản của bạn."
          onGoHome={() => navigate(buildPublicAuthPath('/', isCustomer))}
          onGoLogin={() => navigate('/login')}
        />
      </div>
    )
  }

  return (
    <div className="notifications-page">
      <PublicPageHeader
        actions={
          <>
            <Link className="public-ui-button public-ui-button--secondary public-ui-button--md" to={profilePath}>
              Về tài khoản
            </Link>
            <Link className="public-ui-button public-ui-button--ghost public-ui-button--md" to={customerCarePath}>
              Cần hỗ trợ
            </Link>
          </>
        }
        eyebrow="Tài khoản cá nhân"
        subtitle="Theo dõi các cập nhật thật sự cần thiết như đơn hàng, thanh toán, khuyến mãi, hỗ trợ và các nhắc nhở mua hàng."
        title="Hộp thư thông báo"
      >
        <PublicNotice tone="info">
          {visibleUnreadCount > 0
            ? `Bạn có ${visibleUnreadCount} thông báo quan trọng chưa đọc trong danh sách này.`
            : 'Hiện chưa có thông báo quan trọng nào cần bạn xem thêm.'}
        </PublicNotice>
      </PublicPageHeader>

      {feedback.message ? (
        <PublicNotice role="status" tone={feedback.tone === 'error' ? 'info' : feedback.tone}>
          {feedback.message}
        </PublicNotice>
      ) : null}

      {loading ? (
        <PublicLoadingBlock
          description="Đang đồng bộ hộp thư cá nhân và trạng thái đã đọc mới nhất từ hệ thống."
          rows={4}
          title="Đang tải thông báo"
        />
      ) : null}

      {!loading && error ? (
        <PublicErrorState
          action={
            <PublicButton type="button" variant="secondary" onClick={() => setReloadToken((value) => value + 1)}>
              Tải lại
            </PublicButton>
          }
          description={error}
          eyebrow="Không thể đồng bộ"
          title="Chưa tải được hộp thư thông báo"
        />
      ) : null}

      {!loading && !error ? (
        <div className="notifications-page__layout">
          <section className="notifications-page__list">
            <PublicCard padding="lg">
              <PublicSectionHeader
                actions={
                  <PublicButton
                    disabled={visibleNotifications.length === 0 || visibleUnreadCount === 0}
                    type="button"
                    variant="secondary"
                    onClick={handleMarkAllRead}
                  >
                    Đánh dấu tất cả đã đọc
                  </PublicButton>
                }
                eyebrow="Danh sách"
                subtitle="Chỉ hiển thị các thông báo quan trọng và hữu ích trực tiếp với tài khoản của bạn."
                title="Thông báo gần đây"
              />

              <PublicToolbar className="notifications-page__toolbar" compact>
                <div className="notifications-page__filter-group" role="tablist" aria-label="Lọc thông báo">
                  {NOTIFICATION_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      className={
                        selectedFilter === filter.id
                          ? 'notifications-page__filter notifications-page__filter--active'
                          : 'notifications-page__filter'
                      }
                      type="button"
                      onClick={() => setSelectedFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </PublicToolbar>

              {filteredNotifications.length ? (
                <div className="notifications-page__list-stack">
                  {filteredNotifications.map((notification) => (
                    <article
                      className={
                        notification.read_at
                          ? 'notifications-page__item'
                          : 'notifications-page__item notifications-page__item--unread'
                      }
                      key={notification.id}
                    >
                      <div className="notifications-page__item-top">
                        <strong>{notification.title || 'Thông báo mới'}</strong>
                        <span>{getStatusLabel(notification)}</span>
                      </div>

                      <div className="notifications-page__item-copy">
                        <p>{notification.body || 'Nội dung đang được cập nhật.'}</p>
                      </div>

                      <div className="notifications-page__item-meta">
                        <span>{getTypeLabel(notification.type)}</span>
                        <span>{formatDateTime(notification.created_at)}</span>
                      </div>

                      <div className="notifications-page__item-actions">
                        <PublicButton
                          type="button"
                          variant="primary"
                          onClick={() => setSelectedNotificationId(notification.id)}
                        >
                          Xem chi tiết
                        </PublicButton>
                        <button
                          className="notifications-page__ghost-button notifications-page__danger-button"
                          type="button"
                          onClick={() => handleDelete(notification.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <PublicEmptyState
                  description="Hiện chưa có thông báo quan trọng phù hợp với bộ lọc này. Khi có cập nhật về đơn hàng, thanh toán, hỗ trợ hoặc ưu đãi, chúng sẽ xuất hiện ở đây."
                  eyebrow="Không có dữ liệu"
                  title="Chưa có thông báo nào trong nhóm này"
                />
              )}

              <PublicPagination
                currentPage={pageMeta.page}
                onPageChange={(page) => {
                  setPageMeta((currentMeta) => ({
                    ...currentMeta,
                    page,
                  }))
                }}
                totalPages={pageMeta.total_pages}
              />
            </PublicCard>
          </section>

          <aside className="notifications-page__detail">
            <PublicCard className="notifications-page__detail-card" padding="lg">
              <PublicSectionHeader
                eyebrow="Chi tiết"
                subtitle="Nội dung đầy đủ và các mốc liên quan của thông báo đang chọn."
                title="Thông báo đang mở"
              />

              {detailLoading ? (
                <PublicLoadingBlock rows={3} title="Đang tải chi tiết thông báo" />
              ) : selectedNotification ? (
                <div className="notifications-page__detail-copy">
                  <div className="notifications-page__detail-meta">
                    <span>{getTypeLabel(selectedNotification.type)}</span>
                    <span>{getStatusLabel(selectedNotification)}</span>
                  </div>
                  <strong className="notifications-page__detail-title">
                    {selectedNotification.title || 'Thông báo mới'}
                  </strong>
                  <p>{selectedNotification.body || 'Nội dung đang được cập nhật.'}</p>
                  <div className="notifications-page__detail-meta">
                    <span>Tạo lúc: {formatDateTime(selectedNotification.created_at)}</span>
                    <span>
                      {selectedNotification.read_at
                        ? `Đã đọc: ${formatDateTime(selectedNotification.read_at)}`
                        : 'Chưa có thời điểm đọc'}
                    </span>
                  </div>
                </div>
              ) : (
                <PublicEmptyState
                  description="Chọn một thông báo quan trọng ở bên trái để xem chi tiết nội dung và trạng thái mới nhất."
                  eyebrow="Chưa chọn"
                  title="Hãy chọn một thông báo"
                />
              )}
            </PublicCard>

            <PublicCard className="notifications-page__meta-card" padding="lg">
              <PublicSectionHeader
                eyebrow="Tổng quan"
                subtitle="Một số chỉ dấu nhanh giúp bạn theo dõi tình trạng hộp thư."
                title="Nhịp cập nhật"
              />

              <div className="notifications-page__meta-list">
                <div className="notifications-page__meta-item">
                  <span>Thông báo quan trọng đang hiển thị</span>
                  <strong>{visibleNotifications.length}</strong>
                </div>
                <div className="notifications-page__meta-item">
                  <span>Chưa đọc trong danh sách này</span>
                  <strong>{visibleUnreadCount}</strong>
                </div>
                <div className="notifications-page__meta-item">
                  <span>Trang hiện tại</span>
                  <strong>
                    {pageMeta.page}/{pageMeta.total_pages || 1}
                  </strong>
                </div>
              </div>
            </PublicCard>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

export default NotificationsPage
