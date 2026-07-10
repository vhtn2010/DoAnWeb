import { useEffect, useMemo, useState } from 'react'
import { getMyBookingItems, listMyBookings } from '../repositories/bookingRepository.js'
import { listMyNotifications } from '../repositories/notificationRepository.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

const DEPARTURE_REMINDER_CHANNELS_STORAGE_KEY = 'net-viet-travel.departure-reminder-channels'
const ACTIVE_BOOKING_STATUSES = new Set([
  'pending_payment',
  'payment_processing',
  'paid',
  'confirmed',
  'in_progress',
])

const journeyDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readStoredChannels(defaultChannels) {
  if (!canUseStorage()) {
    return { ...defaultChannels }
  }

  try {
    const rawValue = window.localStorage.getItem(DEPARTURE_REMINDER_CHANNELS_STORAGE_KEY)

    if (!rawValue) {
      return { ...defaultChannels }
    }

    const parsedValue = JSON.parse(rawValue)

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return { ...defaultChannels }
    }

    return {
      ...defaultChannels,
      ...parsedValue,
    }
  } catch {
    return { ...defaultChannels }
  }
}

function persistChannels(channels) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(
      DEPARTURE_REMINDER_CHANNELS_STORAGE_KEY,
      JSON.stringify(channels),
    )
  } catch {
    // Ignore storage issues in restricted browser contexts.
  }
}

function parseDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function formatDateTimeLabel(date) {
  return journeyDateTimeFormatter.format(date)
}

function formatDepartureLabel(serviceType, startDate) {
  if (!startDate) {
    return 'Lịch khởi hành đang được cập nhật'
  }

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return `Nhận phòng lúc ${formatDateTimeLabel(startDate)}`
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return `Cất cánh lúc ${formatDateTimeLabel(startDate)}`
  }

  if (serviceType === SERVICE_TYPES.train) {
    return `Khởi hành lúc ${formatDateTimeLabel(startDate)}`
  }

  return `Bắt đầu lúc ${formatDateTimeLabel(startDate)}`
}

function formatServiceTypeLabel(serviceType) {
  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return 'Khách sạn'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return 'Vé máy bay'
  }

  if (serviceType === SERVICE_TYPES.train) {
    return 'Vé tàu'
  }

  return 'Tour / dịch vụ'
}

function buildServiceRoute(serviceSnapshot = {}, serviceType = SERVICE_TYPES.tour) {
  const slug = serviceSnapshot?.slug

  if (!slug) {
    if (serviceType === SERVICE_TYPES.flight) {
      return '/flights'
    }

    if (serviceType === SERVICE_TYPES.train) {
      return '/trains'
    }

    if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
      return '/hotels'
    }

    return '/services'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return `/flights/${slug}`
  }

  if (serviceType === SERVICE_TYPES.train) {
    return `/trains/${slug}`
  }

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return `/hotels/${slug}`
  }

  return `/services/${slug}`
}

function buildRouteLabel(serviceSnapshot = {}, bookingItem = {}) {
  return (
    serviceSnapshot.location_text ||
    bookingItem.route_label ||
    bookingItem.title_snapshot ||
    'Hành trình đang được cập nhật'
  )
}

function buildReminderTemplates(serviceType, startDate) {
  if (!startDate) {
    return []
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return [
      {
        channel_label: 'Email + SMS',
        offset_minutes: -24 * 60,
        title: 'Check-in online',
      },
      {
        channel_label: 'SMS',
        offset_minutes: -180,
        title: 'Ra sân bay',
      },
      {
        channel_label: 'Thông báo trên web',
        offset_minutes: -45,
        title: 'Kiểm tra cổng khởi hành',
      },
    ]
  }

  if (serviceType === SERVICE_TYPES.train) {
    return [
      {
        channel_label: 'Email + SMS',
        offset_minutes: -12 * 60,
        title: 'Kiểm tra vé và giấy tờ',
      },
      {
        channel_label: 'SMS',
        offset_minutes: -120,
        title: 'Ra nhà ga',
      },
      {
        channel_label: 'Thông báo trên web',
        offset_minutes: -30,
        title: 'Sắp tới giờ lên tàu',
      },
    ]
  }

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return [
      {
        channel_label: 'Email',
        offset_minutes: -24 * 60,
        title: 'Kiểm tra thông tin nhận phòng',
      },
      {
        channel_label: 'SMS',
        offset_minutes: -180,
        title: 'Chuẩn bị di chuyển tới khách sạn',
      },
      {
        channel_label: 'Thông báo trên web',
        offset_minutes: -60,
        title: 'Nhắc giờ check-in',
      },
    ]
  }

  return [
    {
      channel_label: 'Email + SMS',
      offset_minutes: -24 * 60,
      title: 'Kiểm tra giấy tờ và hành lý',
    },
    {
      channel_label: 'SMS',
      offset_minutes: -120,
      title: 'Có mặt tại điểm đón',
    },
    {
      channel_label: 'Thông báo trên web',
      offset_minutes: -30,
      title: 'Nhắc giờ khởi hành',
    },
  ]
}

function buildJourneyReminders({
  booking,
  item,
  notificationsByBookingId,
}) {
  const now = new Date()
  const startDate = parseDate(item.start_at)
  const serviceType = item.service_type ?? SERVICE_TYPES.tour
  const reminders = buildReminderTemplates(serviceType, startDate)
    .map((template, index) => {
      const scheduleAt = addMinutes(startDate, template.offset_minutes)

      return {
        channel_label: template.channel_label,
        enabled: scheduleAt >= now,
        id: `${booking.id}-auto-${index + 1}`,
        schedule_at: scheduleAt.toISOString(),
        schedule_label: formatDateTimeLabel(scheduleAt),
        title: template.title,
      }
    })
    .filter((reminder) => reminder.enabled)

  const notification = notificationsByBookingId.get(String(booking.id)) ?? null

  if (notification) {
    reminders.push({
      channel_label: 'Thông báo trên web',
      enabled: true,
      id: notification.id,
      schedule_at: notification.created_at,
      schedule_label: formatDateTimeLabel(parseDate(notification.created_at) ?? now),
      title: notification.title || 'Thông báo cho hành trình này',
    })
  }

  if (reminders.length === 0) {
    reminders.push({
      channel_label: 'Thông báo trên web',
      enabled: true,
      id: `${booking.id}-status-follow-up`,
      schedule_at: item.start_at ?? booking.created_at ?? now.toISOString(),
      schedule_label: startDate ? formatDateTimeLabel(startDate) : 'Theo dõi trên tài khoản',
      title: 'Theo dõi trạng thái đơn đặt chỗ',
    })
  }

  return reminders.sort((leftReminder, rightReminder) => {
    const leftTime = parseDate(leftReminder.schedule_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const rightTime = parseDate(rightReminder.schedule_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return leftTime - rightTime
  })
}

function buildJourneyItem({
  booking,
  bookingItem,
  notificationsByBookingId,
}) {
  const snapshot = bookingItem.service_snapshot ?? {}
  const reminders = buildJourneyReminders({
    booking,
    item: bookingItem,
    notificationsByBookingId,
  })
  const enabledReminderCount = reminders.filter((reminder) => reminder.enabled).length
  const status = enabledReminderCount > 0 ? 'enabled' : 'paused'

  return {
    departure_label: formatDepartureLabel(
      bookingItem.service_type ?? SERVICE_TYPES.tour,
      parseDate(bookingItem.start_at),
    ),
    id: booking.id,
    primary_route: `/booking-confirmation/${booking.booking_code}`,
    reminder_count_label:
      enabledReminderCount > 0
        ? `${enabledReminderCount} mốc nhắc đang hoạt động`
        : 'Chưa có mốc nhắc khả dụng',
    reminders,
    route_label: buildRouteLabel(snapshot, bookingItem),
    secondary_route: buildServiceRoute(snapshot, bookingItem.service_type),
    status,
    status_label: status === 'enabled' ? 'Đang bật' : 'Tạm tắt',
    title: bookingItem.title_snapshot || booking.booking_code || 'Hành trình sắp tới',
    type_label: formatServiceTypeLabel(bookingItem.service_type),
  }
}

export default function useDepartureReminders({
  authState,
  defaultChannels = {},
  enabled = false,
} = {}) {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [channels, setChannels] = useState(() => readStoredChannels(defaultChannels))
  const [journeys, setJourneys] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    persistChannels(channels)
  }, [channels])

  useEffect(() => {
    let isActive = true

    async function loadJourneys() {
      if (!enabled) {
        setJourneys([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const [bookingsResponse, notificationsResponse] = await Promise.all([
          listMyBookings({
            limit: 8,
            page: 1,
            status: 'all',
          }),
          listMyNotifications({
            limit: 20,
            page: 1,
          }).catch(() => ({
            data: [],
          })),
        ])

        const bookings = Array.isArray(bookingsResponse.data)
          ? bookingsResponse.data.filter((booking) => ACTIVE_BOOKING_STATUSES.has(booking.status))
          : []

        const bookingWithItems = await Promise.all(
          bookings.map(async (booking) => {
            const itemsResponse = await getMyBookingItems(booking.id)

            return {
              ...booking,
              items: Array.isArray(itemsResponse.data) ? itemsResponse.data : [],
            }
          }),
        )

        if (!isActive) {
          return
        }

        const notificationsByBookingId = new Map(
          (Array.isArray(notificationsResponse.data) ? notificationsResponse.data : [])
            .filter((notification) => notification.related_entity_name === 'booking')
            .map((notification) => [String(notification.related_entity_id), notification]),
        )

        const nextJourneys = bookingWithItems
          .map((booking) => {
            const firstItem = booking.items?.[0]

            if (!firstItem) {
              return null
            }

            return buildJourneyItem({
              booking,
              bookingItem: firstItem,
              notificationsByBookingId,
            })
          })
          .filter(Boolean)

        setJourneys(nextJourneys)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setJourneys([])
        setError(loadError?.message ?? 'Không thể tải nhắc lịch khởi hành lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadJourneys()

    return () => {
      isActive = false
    }
  }, [authState, enabled, reloadToken])

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      if (selectedFilter === 'all') {
        return true
      }

      return journey.status === selectedFilter
    })
  }, [journeys, selectedFilter])

  const enabledJourneys = useMemo(
    () => journeys.filter((journey) => journey.status === 'enabled'),
    [journeys],
  )

  const activeReminderCount = useMemo(
    () =>
      journeys.reduce((totalCount, journey) => {
        return totalCount + journey.reminders.filter((reminder) => reminder.enabled).length
      }, 0),
    [journeys],
  )

  const nextReminder = useMemo(() => {
    const reminders = journeys.flatMap((journey) =>
      journey.reminders
        .filter((reminder) => reminder.enabled)
        .map((reminder) => ({
          ...reminder,
          journeyTitle: journey.title,
        })),
    )

    return reminders.sort((leftReminder, rightReminder) => {
      const leftTime = parseDate(leftReminder.schedule_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const rightTime =
        parseDate(rightReminder.schedule_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return leftTime - rightTime
    })[0] ?? null
  }, [journeys])

  function reload() {
    setReloadToken((currentToken) => currentToken + 1)
  }

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
          reminder_count_label:
            nextStatus === 'enabled'
              ? `${journey.reminders.length} mốc nhắc đang hoạt động`
              : 'Tất cả mốc nhắc đang tạm dừng',
          reminders: journey.reminders.map((reminder) => ({
            ...reminder,
            enabled: nextStatus === 'enabled',
          })),
          status: nextStatus,
          status_label: nextStatus === 'enabled' ? 'Đang bật' : 'Tạm tắt',
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
        const enabledReminderCount = nextReminders.filter((reminder) => reminder.enabled).length
        const nextStatus = enabledReminderCount > 0 ? 'enabled' : 'paused'

        return {
          ...journey,
          reminder_count_label:
            enabledReminderCount > 0
              ? `${enabledReminderCount} mốc nhắc đang hoạt động`
              : 'Tất cả mốc nhắc đang tạm dừng',
          reminders: nextReminders,
          status: nextStatus,
          status_label: nextStatus === 'enabled' ? 'Đang bật' : 'Tạm tắt',
        }
      }),
    )
  }

  return {
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
  }
}
