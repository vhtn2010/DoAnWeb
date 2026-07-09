import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const REMINDER_FILTERS = Object.freeze([
  { id: 'all', label: 'Tất cả' },
  { id: 'enabled', label: 'Đang bật' },
  { id: 'paused', label: 'Tạm tắt' },
])

const DEFAULT_CHANNELS = Object.freeze({
  email: true,
  sms: true,
  app: false,
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
    title: 'Check-in trước 24 giờ',
    description: 'Tự động nhắc với vé máy bay để bạn không quên hoàn tất check-in online.',
  },
  {
    id: 'rule-002',
    title: 'Ra điểm đón trước giờ khởi hành',
    description: 'Tính theo loại dịch vụ để gợi ý thời gian rời khách sạn, ra ga hoặc sân bay.',
  },
  {
    id: 'rule-003',
    title: 'Nhắc kiểm tra giấy tờ',
    description: 'Gửi checklist hành lý, CCCD hoặc hộ chiếu trước ngày đi để tránh thiếu sót.',
  },
])

const REMINDER_JOURNEYS = Object.freeze([
  {
    id: 'journey-001',
    status: 'enabled',
    status_label: 'Đang bật',
    type_label: 'Tour di sản',
    title: 'Hành trình Di sản Hội An - Huế',
    route_label: 'Huế - Hội An',
    departure_label: 'Khởi hành lúc 08:00, 15/08/2026',
    reminder_count_label: '3 mốc nhắc tự động',
    primary_route: '/services',
    reminders: [
      {
        id: 'reminder-001',
        title: 'Kiểm tra giấy tờ và hành lý',
        schedule_label: '19:00, 14/08/2026',
        channel_label: 'Email + SMS',
        enabled: true,
      },
      {
        id: 'reminder-002',
        title: 'Có mặt tại điểm đón',
        schedule_label: '06:30, 15/08/2026',
        channel_label: 'SMS',
        enabled: true,
      },
      {
        id: 'reminder-003',
        title: 'Nhắc giờ khởi hành',
        schedule_label: '07:30, 15/08/2026',
        channel_label: 'Thông báo trên web',
        enabled: false,
      },
    ],
  },
  {
    id: 'journey-002',
    status: 'enabled',
    status_label: 'Đang bật',
    type_label: 'Vé máy bay',
    title: 'Vietnam Airlines: HAN - PQC',
    route_label: 'Hà Nội - Phú Quốc',
    departure_label: 'Cất cánh lúc 09:20, 11/10/2026',
    reminder_count_label: '4 mốc nhắc tự động',
    primary_route: '/flights',
    reminders: [
      {
        id: 'reminder-004',
        title: 'Check-in online',
        schedule_label: '09:20, 10/10/2026',
        channel_label: 'Email + SMS',
        enabled: true,
      },
      {
        id: 'reminder-005',
        title: 'Ra sân bay',
        schedule_label: '06:50, 11/10/2026',
        channel_label: 'SMS',
        enabled: true,
      },
      {
        id: 'reminder-006',
        title: 'Kiểm tra cổng khởi hành',
        schedule_label: '08:20, 11/10/2026',
        channel_label: 'Thông báo trên web',
        enabled: true,
      },
    ],
  },
  {
    id: 'journey-003',
    status: 'paused',
    status_label: 'Tạm tắt',
    type_label: 'Du thuyền',
    title: 'Du thuyền Hạ Long Signature 2N1Đ',
    route_label: 'Hạ Long, Quảng Ninh',
    departure_label: 'Nhận phòng lúc 11:30, 02/09/2026',
    reminder_count_label: '2 mốc đang tạm dừng',
    primary_route: '/services',
    reminders: [
      {
        id: 'reminder-007',
        title: 'Xác nhận giờ lên tàu',
        schedule_label: '17:00, 01/09/2026',
        channel_label: 'Email',
        enabled: false,
      },
      {
        id: 'reminder-008',
        title: 'Ra bến tàu',
        schedule_label: '10:15, 02/09/2026',
        channel_label: 'SMS',
        enabled: false,
      },
    ],
  },
])

function preserveAuthPath(pathname, isCustomer) {
  if (!isCustomer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

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
  const [searchParams] = useSearchParams()
  const isCustomer = searchParams.get('auth') === 'customer'
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [channels, setChannels] = useState(DEFAULT_CHANNELS)
  const [journeys, setJourneys] = useState(REMINDER_JOURNEYS)

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      if (selectedFilter === 'all') {
        return true
      }

      return journey.status === selectedFilter
    })
  }, [journeys, selectedFilter])

  const enabledJourneys = journeys.filter((journey) => journey.status === 'enabled')
  const activeReminderCount = journeys.reduce((totalCount, journey) => {
    return totalCount + journey.reminders.filter((reminder) => reminder.enabled).length
  }, 0)
  const nextReminder = journeys
    .flatMap((journey) =>
      journey.reminders
        .filter((reminder) => reminder.enabled)
        .map((reminder) => ({
          ...reminder,
          journeyTitle: journey.title,
        })),
    )[0]

  const profilePath = preserveAuthPath('/profile', isCustomer)
  const customerCarePath = preserveAuthPath('/customer-care', isCustomer)

  function handleChannelToggle(channelId) {
    setChannels((currentChannels) => ({
      ...currentChannels,
      [channelId]: !currentChannels[channelId],
    }))
  }

  function handleJourneyStatusToggle(journeyId) {
    setJourneys((currentJourneys) =>
      currentJourneys.map((journey) => {
        if (journey.id !== journeyId) {
          return journey
        }

        const nextStatus = journey.status === 'enabled' ? 'paused' : 'enabled'

        return {
          ...journey,
          status: nextStatus,
          status_label: nextStatus === 'enabled' ? 'Đang bật' : 'Tạm tắt',
          reminders: journey.reminders.map((reminder) => ({
            ...reminder,
            enabled: nextStatus === 'enabled',
          })),
        }
      }),
    )
  }

  function handleReminderToggle(journeyId, reminderId) {
    setJourneys((currentJourneys) =>
      currentJourneys.map((journey) => {
        if (journey.id !== journeyId) {
          return journey
        }

        const nextReminders = journey.reminders.map((reminder) =>
          reminder.id === reminderId
            ? { ...reminder, enabled: !reminder.enabled }
            : reminder,
        )

        const hasEnabledReminder = nextReminders.some((reminder) => reminder.enabled)

        return {
          ...journey,
          status: hasEnabledReminder ? 'enabled' : 'paused',
          status_label: hasEnabledReminder ? 'Đang bật' : 'Tạm tắt',
          reminders: nextReminders,
        }
      }),
    )
  }

  return (
    <div className="departure-reminders-page">
      <section className="departure-reminders-hero">
        <div className="departure-reminders-hero__copy">
          <p className="departure-reminders-hero__eyebrow">Tài khoản cá nhân</p>
          <h1>Nhắc lịch khởi hành</h1>
          <p>
            Bật nhắc việc theo từng chuyến đi để không quên check-in, ra sân bay, ra ga hoặc có
            mặt tại điểm đón đúng giờ.
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
          <strong>{nextReminder?.title}</strong>
          <p>{nextReminder?.journeyTitle}</p>
          <small>{nextReminder?.schedule_label}</small>
        </div>
      </section>

      <section className="departure-reminders-stats" aria-label="Tổng quan nhắc lịch">
        <article className="departure-reminders-stat-card">
          <span>Chuyến đang bật</span>
          <strong>{enabledJourneys.length}</strong>
          <p>Những hành trình đang được theo dõi với ít nhất một mốc nhắc chủ động.</p>
        </article>

        <article className="departure-reminders-stat-card">
          <span>Mốc nhắc đang hoạt động</span>
          <strong>{activeReminderCount}</strong>
          <p>Tổng số nhắc việc còn hiệu lực trong dữ liệu mock hiện tại.</p>
        </article>

        <article className="departure-reminders-stat-card">
          <span>Kênh ưu tiên</span>
          <strong>{Object.values(channels).filter(Boolean).length}/3</strong>
          <p>Bạn có thể nhận nhắc qua email, SMS hoặc thông báo ngay trên web.</p>
        </article>
      </section>

      <div className="departure-reminders-layout">
        <section className="departure-reminders-main">
          <header className="departure-reminders-toolbar">
            <div>
              <p className="departure-reminders-toolbar__eyebrow">Thiết lập nhanh</p>
              <h2>Lọc và quản lý nhắc lịch theo chuyến</h2>
            </div>

            <div className="departure-reminders-filter-list" role="tablist" aria-label="Lọc nhắc lịch">
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
                      to={preserveAuthPath(journey.primary_route, isCustomer)}
                    >
                      Mở hành trình
                    </Link>
                    <Link
                      className="departure-journey-card__button departure-journey-card__button--secondary"
                      to={customerCarePath}
                    >
                      Điều chỉnh với hỗ trợ
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="departure-reminders-empty" role="status">
              <strong>Không có chuyến đi phù hợp với bộ lọc hiện tại</strong>
              <p>Thử chuyển lại bộ lọc để xem các hành trình đang bật hoặc đã tạm dừng.</p>
              <button
                className="departure-reminders-empty__button"
                type="button"
                onClick={() => setSelectedFilter('all')}
              >
                Xem tất cả hành trình
              </button>
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
    </div>
  )
}

export default DepartureRemindersPage
