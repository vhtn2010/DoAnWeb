import { Link, useNavigate } from 'react-router-dom'
import ProfileGuestGate from '../../components/profile/ProfileGuestGate.jsx'
import {
  PublicButton,
  PublicErrorState,
  PublicLoadingBlock,
} from '../../components/public/ui/index.js'
import useDepartureReminders from '../../hooks/useDepartureReminders.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const REMINDER_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'enabled', label: 'Đang bật' },
  { id: 'paused', label: 'Tạm tắt' },
])

const DEFAULT_CHANNELS = Object.freeze({
  email: true,
  sms: true,
  app: true,
})

const REMINDER_CHANNEL_OPTIONS = Object.freeze([
  {
    id: 'email',
    title: 'Email',
    description: 'Nhận checklist và mốc giờ quan trọng trong hộp thư đặt dịch vụ.',
  },
  {
    id: 'sms',
    title: 'SMS',
    description: 'Nhắc ngắn gọn khi sắp tới giờ check-in hoặc cần ra sân bay, nhà ga.',
  },
  {
    id: 'app',
    title: 'Thông báo trên web',
    description: 'Hiển thị nhắc việc ngay khi bạn quay lại tài khoản cá nhân.',
  },
])

const SMART_RULES = Object.freeze([
  {
    id: 'rule-001',
    title: 'Check-in sớm theo loại hành trình',
    description: 'Vé máy bay ưu tiên mốc 24 giờ trước giờ cất cánh để bạn chủ động check-in online.',
  },
  {
    id: 'rule-002',
    title: 'Nhắc giờ di chuyển',
    description: 'Hệ thống ước lượng thời điểm nên ra sân bay, nhà ga hoặc điểm đón theo từng dịch vụ.',
  },
  {
    id: 'rule-003',
    title: 'Ưu tiên thông báo gắn với booking',
    description: 'Những cập nhật trạng thái đơn đặt chỗ sẽ được hiển thị như nhắc việc ngay trên tài khoản.',
  },
])

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
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
    </svg>
  )
}

function DepartureRemindersPage() {
  const navigate = useNavigate()
  const { authState, isCustomer, isCustomerPreview } = usePublicSession()
  const {
    activeReminderCount,
    channels,
    enabledJourneys,
    error,
    filteredJourneys,
    handleChannelToggle,
    handleJourneyStatusToggle,
    handleReminderToggle,
    loading,
    nextReminder,
    reload,
    selectedFilter,
    setSelectedFilter,
  } = useDepartureReminders({
    authState,
    defaultChannels: DEFAULT_CHANNELS,
    enabled: isCustomerPreview,
  })

  const profilePath = buildPublicAuthPath('/profile', isCustomer)
  const customerCarePath = buildPublicAuthPath('/customer-care', isCustomer)
  const discoverServicesPath = buildPublicAuthPath('/services', isCustomer)

  if (!isCustomerPreview && !loading) {
    return (
      <div className="departure-reminders-page">
        <ProfileGuestGate
          message="Đăng nhập để xem các hành trình sắp tới và nhận nhắc việc theo từng đơn đặt chỗ."
          onGoHome={() => navigate(buildPublicAuthPath('/', isCustomer))}
          onGoLogin={() => navigate('/login')}
        />
      </div>
    )
  }

  return (
    <div className="departure-reminders-page">
      <section className="departure-reminders-hero">
        <div className="departure-reminders-hero__copy">
          <p className="departure-reminders-hero__eyebrow">Tài khoản cá nhân</p>
          <h1>Nhắc lịch khởi hành</h1>
          <p>
            Theo dõi các mốc cần nhớ cho từng đơn đặt chỗ để bạn chủ động check-in, di chuyển và
            chuẩn bị giấy tờ đúng lúc.
          </p>

          <div className="departure-reminders-hero__actions">
            <Link className="departure-reminders-hero__button" to={profilePath}>
              Quay về tài khoản
            </Link>
            <Link
              className="departure-reminders-hero__button departure-reminders-hero__button--secondary"
              to={customerCarePath}
            >
              Cần hỗ trợ lịch trình
            </Link>
          </div>
        </div>

        <div className="departure-reminders-hero__spotlight">
          <span className="departure-reminders-hero__badge">Mốc tiếp theo</span>
          <strong>{nextReminder?.title || 'Chưa có mốc nhắc gần nhất'}</strong>
          <p>{nextReminder?.journeyTitle || 'Khi có hành trình sắp tới, mốc nhắc sẽ hiển thị tại đây.'}</p>
          <small>{nextReminder?.schedule_label || 'Thêm hoặc hoàn tất đơn đặt chỗ để bắt đầu theo dõi.'}</small>
        </div>
      </section>

      {loading ? (
        <PublicLoadingBlock
          rows={3}
        />
      ) : null}

      {!loading && error ? (
        <PublicErrorState
          action={
            <PublicButton type="button" variant="secondary" onClick={reload}>
              Tải lại
            </PublicButton>
          }
          description={error}
          eyebrow="Cần đồng bộ lại"
          title="Không thể tải nhắc lịch lúc này"
        />
      ) : null}

      {!loading && !error ? (
        <>
          <section className="departure-reminders-stats" aria-label="Tổng quan nhắc lịch">
            <article className="departure-reminders-stat-card">
              <span>Chuyến đang bật</span>
              <strong>{enabledJourneys.length}</strong>
              <p>Những hành trình có ít nhất một mốc nhắc còn hiệu lực trong tài khoản hiện tại.</p>
            </article>

            <article className="departure-reminders-stat-card">
              <span>Mốc nhắc đang hoạt động</span>
              <strong>{activeReminderCount}</strong>
              <p>Các mốc theo dõi được sinh từ booking hiện có và thông báo gắn với đơn hàng.</p>
            </article>

            <article className="departure-reminders-stat-card">
              <span>Kênh ưu tiên</span>
              <strong>{Object.values(channels).filter(Boolean).length}/3</strong>
              <p>Bạn có thể bật hoặc tắt từng kênh để ưu tiên cách nhận nhắc phù hợp nhất.</p>
            </article>
          </section>

          <div className="departure-reminders-layout">
            <section className="departure-reminders-main">
              <header className="departure-reminders-toolbar">
                <div>
                  <p className="departure-reminders-toolbar__eyebrow">Thiết lập nhanh</p>
                  <h2>Lọc và quản lý nhắc lịch theo hành trình</h2>
                </div>

                <div
                  className="departure-reminders-filter-list"
                  role="tablist"
                  aria-label="Lọc nhắc lịch"
                >
                  {REMINDER_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      className={
                        selectedFilter === filter.id
                          ? 'departure-reminders-filter departure-reminders-filter--active'
                          : 'departure-reminders-filter'
                      }
                      type="button"
                      onClick={() => setSelectedFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </header>

              {filteredJourneys.length ? (
                <div className="departure-reminders-journey-list">
                  {filteredJourneys.map((journey) => (
                    <article
                      className={`departure-journey-card departure-journey-card--${journey.status}`}
                      key={journey.id}
                    >
                      <div className="departure-journey-card__header">
                        <span className="departure-journey-card__icon">
                          <BellIcon />
                        </span>

                        <div className="departure-journey-card__heading">
                          <span className="departure-journey-card__type">{journey.type_label}</span>
                          <strong>{journey.title}</strong>
                          <p>{journey.route_label}</p>
                        </div>

                        <div className="departure-journey-card__status-block">
                          <span className="departure-journey-card__status">{journey.status_label}</span>
                          <small>{journey.reminder_count_label}</small>
                        </div>
                      </div>

                      <div className="departure-journey-card__summary">
                        <span>{journey.departure_label}</span>
                        <button
                          className="departure-journey-card__toggle"
                          type="button"
                          onClick={() => handleJourneyStatusToggle(journey.id)}
                        >
                          {journey.status === 'enabled' ? 'Tạm tắt toàn bộ' : 'Bật lại toàn bộ'}
                        </button>
                      </div>

                      <div className="departure-journey-card__timeline">
                        {journey.reminders.map((reminder) => (
                          <div className="departure-reminder-item" key={reminder.id}>
                            <div className="departure-reminder-item__copy">
                              <strong>{reminder.title}</strong>
                              <span>{reminder.schedule_label}</span>
                              <small>{reminder.channel_label}</small>
                            </div>

                            <button
                              className={
                                reminder.enabled
                                  ? 'departure-reminder-item__switch departure-reminder-item__switch--active'
                                  : 'departure-reminder-item__switch'
                              }
                              type="button"
                              onClick={() => handleReminderToggle(journey.id, reminder.id)}
                              aria-pressed={reminder.enabled}
                            >
                              {reminder.enabled ? 'Đang bật' : 'Đã tắt'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="departure-journey-card__actions">
                        <Link
                          className="departure-journey-card__button"
                          to={buildPublicAuthPath(journey.primary_route, isCustomer)}
                        >
                          Mở đơn đặt chỗ
                        </Link>
                        <Link
                          className="departure-journey-card__button departure-journey-card__button--secondary"
                          to={buildPublicAuthPath(journey.secondary_route, isCustomer)}
                        >
                          Xem dịch vụ
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="departure-reminders-empty" role="status">
                  <strong>Chưa có hành trình nào phù hợp với bộ lọc hiện tại</strong>
                  <p>
                    Khi bạn có booking sắp tới, hệ thống sẽ tự tạo các mốc nhắc ngay tại trang này.
                  </p>
                  <Link className="departure-reminders-empty__button" to={discoverServicesPath}>
                    Khám phá dịch vụ
                  </Link>
                </div>
              )}
            </section>

            <aside className="departure-reminders-sidebar">
              <section className="departure-reminders-panel">
                <header className="departure-reminders-panel__header">
                  <p className="departure-reminders-panel__eyebrow">Kênh nhận nhắc</p>
                  <h2>Bật cách bạn muốn hệ thống gửi thông báo</h2>
                </header>

                <div className="departure-reminders-channel-list">
                  {REMINDER_CHANNEL_OPTIONS.map((channel) => (
                    <button
                      key={channel.id}
                      className={
                        channels[channel.id]
                          ? 'departure-reminders-channel departure-reminders-channel--active'
                          : 'departure-reminders-channel'
                      }
                      type="button"
                      onClick={() => handleChannelToggle(channel.id)}
                      aria-pressed={channels[channel.id]}
                    >
                      <strong>{channel.title}</strong>
                      <span>{channel.description}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="departure-reminders-panel departure-reminders-panel--rules">
                <header className="departure-reminders-panel__header">
                  <p className="departure-reminders-panel__eyebrow">Luật tự động</p>
                  <h2>Hệ thống đang ưu tiên nhắc theo các mốc này</h2>
                </header>

                <div className="departure-reminders-rule-list">
                  {SMART_RULES.map((rule) => (
                    <article className="departure-reminders-rule" key={rule.id}>
                      <strong>{rule.title}</strong>
                      <p>{rule.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default DepartureRemindersPage
