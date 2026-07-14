import { useEffect, useMemo, useState } from 'react'
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminLoadingBlock,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import useAdminServiceReview from '../../hooks/useAdminServiceReview.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Chưa cập nhật'
  }

  return `${currencyFormatter.format(amount)} Đ`
}

function ReviewIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function ServiceTypeIcon({ type }) {
  if (type === 'hotel' || type === 'room') {
    return (
      <ReviewIcon>
        <path d="M3 11h18v8h-2v-3H5v3H3V11Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4M12 11V8h5a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </ReviewIcon>
    )
  }

  if (type === 'flight') {
    return (
      <ReviewIcon>
        <path d="m3 14 18-8-5 15-4-6-6-1Z" fill="currentColor" />
      </ReviewIcon>
    )
  }

  if (type === 'train') {
    return (
      <ReviewIcon>
        <rect x="6" y="3" width="12" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 8h7M9 17l-2 3M15 17l2 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="9.5" cy="13" r="1" fill="currentColor" />
        <circle cx="14.5" cy="13" r="1" fill="currentColor" />
      </ReviewIcon>
    )
  }

  return (
    <ReviewIcon>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" fill="currentColor" />
    </ReviewIcon>
  )
}

function LocationIcon() {
  return (
    <ReviewIcon>
      <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </ReviewIcon>
  )
}

function PriceIcon() {
  return (
    <ReviewIcon>
      <path d="M4 7h16v10H4V7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12h8M8 15h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </ReviewIcon>
  )
}

function RejectIcon() {
  return (
    <ReviewIcon>
      <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </ReviewIcon>
  )
}

function ApproveIcon() {
  return (
    <ReviewIcon>
      <path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </ReviewIcon>
  )
}

function CloseIcon() {
  return (
    <ReviewIcon>
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
    </ReviewIcon>
  )
}

const SERVICE_TYPE_HEADLINES = Object.freeze({
  combo: 'Hồ sơ combo đối tác gửi duyệt',
  flight: 'Hồ sơ vé máy bay đối tác gửi duyệt',
  hotel: 'Hồ sơ khách sạn đối tác gửi duyệt',
  room: 'Hồ sơ hạng phòng đối tác gửi duyệt',
  tour: 'Hồ sơ tour đối tác gửi duyệt',
  train: 'Hồ sơ vé tàu đối tác gửi duyệt',
})

const TRANSPORT_TYPE_LABELS = Object.freeze({
  bus: 'Xe du lịch',
  car: 'Ô tô riêng',
  flight: 'Máy bay',
  mixed: 'Kết hợp nhiều phương tiện',
  ship: 'Tàu thủy / du thuyền',
  train: 'Tàu hỏa',
})

const CABIN_CLASS_LABELS = Object.freeze({
  business: 'Thương gia',
  economy: 'Phổ thông',
  first: 'Hạng nhất',
  premium_economy: 'Phổ thông đặc biệt',
})

const SEAT_CLASS_LABELS = Object.freeze({
  hard_seat: 'Ghế cứng',
  sleeper: 'Giường nằm',
  soft_seat: 'Ghế mềm',
  vip: 'VIP',
})

function formatDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split('-')
    return `${day}/${month}/${year}`
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatShortDateTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date)
}

function formatTime(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  if (/^\d{2}:\d{2}/.test(String(value))) {
    return String(value).slice(0, 5)
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTransportType(value) {
  return TRANSPORT_TYPE_LABELS[value] ?? value ?? 'Chưa cập nhật'
}

function formatCabinClass(value) {
  return CABIN_CLASS_LABELS[value] ?? value ?? 'Chưa cập nhật'
}

function formatSeatClass(value) {
  return SEAT_CLASS_LABELS[value] ?? value ?? 'Chưa cập nhật'
}

function buildScheduleItems(schedule = []) {
  if (!Array.isArray(schedule)) {
    return []
  }

  return schedule
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      if (!item || typeof item !== 'object') {
        return ''
      }

      if (item.date) {
        const availableSlots = Number(item.available_slots)
        const slotNote = Number.isFinite(availableSlots) ? `, còn ${availableSlots} chỗ` : ''
        return `${formatDate(item.date)}${slotNote}`
      }

      return ''
    })
    .filter(Boolean)
}

function buildItineraryItems(itinerary = []) {
  if (!Array.isArray(itinerary)) {
    return []
  }

  return itinerary
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      if (!item || typeof item !== 'object') {
        return ''
      }

      const dayNumber = item.day_number ?? item.day
      const dayLabel = dayNumber ? `Ngày ${dayNumber}` : 'Lịch trình'
      const title = item.title ? ` - ${item.title}` : ''
      const actions = Array.isArray(item.actions) && item.actions.length > 0
        ? item.actions
            .map((action) => {
              if (typeof action === 'string') {
                return action
              }

              if (!action || typeof action !== 'object') {
                return ''
              }

              return [action.time, action.title, action.description]
                .filter(Boolean)
                .join(' - ')
            })
            .filter(Boolean)
        : []
      const activities = actions.length > 0
        ? `: ${actions.join('; ')}`
        : Array.isArray(item.activities) && item.activities.length > 0
          ? `: ${item.activities.join(', ')}`
          : ''

      return `${dayLabel}${title}${activities}`
    })
    .filter(Boolean)
}

function buildComboItems(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return ''
      }

      const typeLabel = item.service_type ? `${item.service_type.toUpperCase()} · ` : ''
      return `${typeLabel}${item.service_code ?? 'Chưa có mã dịch vụ'}`
    })
    .filter(Boolean)
}

function buildCardMetaItems(item) {
  const details = item.raw?.details ?? {}
  const comboItems = Array.isArray(details.combo_items) ? details.combo_items : []
  let secondaryLabel = 'Thông tin nhanh'
  let secondaryValue = item.duration

  if (item.type === 'hotel') {
    secondaryLabel = 'Lưu trú'
    secondaryValue = details.star_rating ? `${details.star_rating} sao` : 'Khách sạn đối tác'
  } else if (item.type === 'room') {
    secondaryLabel = 'Phân loại'
    secondaryValue = item.tag
  } else if (item.type === 'flight' || item.type === 'train') {
    secondaryLabel = 'Khởi hành'
    secondaryValue = formatShortDateTime(details.departure_at)
  } else if (item.type === 'combo') {
    secondaryLabel = 'Thành phần'
    secondaryValue = `${comboItems.length} dịch vụ`
  }

  return [
    {
      icon: <LocationIcon />,
      label: 'Địa điểm',
      value: item.location,
    },
    {
      icon: <ServiceTypeIcon type={item.type} />,
      label: secondaryLabel,
      value: secondaryValue,
    },
    {
      icon: <PriceIcon />,
      label: 'Giá đề xuất',
      value: formatCurrency(item.price),
    },
  ]
}

function buildDetailViewModel(item) {
  const service = item.raw ?? {}
  const details = service.details ?? {}
  const comboItems = Array.isArray(details.combo_items) ? details.combo_items : []
  const overviewEntries = [
    ['Loại dịch vụ', item.tag],
    ['Mã dịch vụ', item.serviceCode],
    ['Đối tác cung cấp', item.partnerName],
    ['Khu vực khai thác', item.location],
    ['Giá đề xuất', formatCurrency(item.price)],
  ]
  const pricingNote =
    Number(service.base_price) > 0 && Number(service.base_price) !== Number(item.price)
      ? `Giá gốc ${formatCurrency(service.base_price)}`
      : 'Mức giá đang chờ duyệt'
  const quickFacts = [
    {
      hint: pricingNote,
      label: 'Giá bán hiển thị',
      value: formatCurrency(item.price),
    },
    {
      hint: item.serviceCode,
      label: 'Loại hình',
      value: item.tag,
    },
    {
      hint: item.location,
      label: 'Đối tác',
      value: item.partnerName,
    },
    {
      hint: service.created_at ? `Tạo lúc ${formatDateTime(service.created_at)}` : 'Mới cập nhật gần đây',
      label: 'Cập nhật gần nhất',
      value: formatDateTime(service.updated_at ?? service.created_at),
    },
  ]

  if (Number(service.base_price) > 0 && Number(service.base_price) !== Number(item.price)) {
    overviewEntries.push(['Giá gốc', formatCurrency(service.base_price)])
  }

  if (service.created_by_name) {
    overviewEntries.push(['Người tạo bản ghi', service.created_by_name])
  }

  if (service.created_at) {
    overviewEntries.push(['Thời điểm tạo', formatDateTime(service.created_at)])
  }

  if (service.updated_at) {
    overviewEntries.push(['Cập nhật lần cuối', formatDateTime(service.updated_at)])
  }

  const sections = [
    {
      description: 'Nhóm thông tin nền tảng để đối chiếu với form dịch vụ và dữ liệu đối tác.',
      entries: overviewEntries,
      title: 'Thông tin chung',
    },
  ]

  const operationEntries = []
  const operationLists = []

  if (item.type === 'tour') {
    operationEntries.push(['Thời lượng', item.duration])

    if (details.departure_location) {
      operationEntries.push(['Điểm khởi hành', details.departure_location])
    }

    if (details.destination_location) {
      operationEntries.push(['Điểm đến chính', details.destination_location])
    }

    if (details.transport_type) {
      operationEntries.push(['Phương tiện', formatTransportType(details.transport_type)])
    }

    if (details.max_group_size) {
      operationEntries.push(['Quy mô tối đa', `Tối đa ${details.max_group_size} khách`])
    }

    const departureSchedules = buildScheduleItems(details.departure_schedule)

    if (departureSchedules.length > 0) {
      operationLists.push({
        items: departureSchedules,
        label: 'Lịch khởi hành',
      })
    }

    const itineraryItems = buildItineraryItems(details.itinerary)

    if (itineraryItems.length > 0) {
      operationLists.push({
        items: itineraryItems,
        label: 'Lịch trình nổi bật',
      })
    }
  }

  if (item.type === 'hotel') {
    if (details.star_rating) {
      operationEntries.push(['Hạng sao', `${details.star_rating} sao`])
    }

    if (details.address) {
      operationEntries.push(['Địa chỉ', details.address])
    }

    if (details.checkin_time) {
      operationEntries.push(['Giờ nhận phòng', formatTime(details.checkin_time)])
    }

    if (details.checkout_time) {
      operationEntries.push(['Giờ trả phòng', formatTime(details.checkout_time)])
    }

    if (Array.isArray(details.amenities) && details.amenities.length > 0) {
      operationLists.push({
        items: details.amenities,
        label: 'Tiện ích nổi bật',
      })
    }
  }

  if (item.type === 'flight') {
    if (details.airline_name) {
      operationEntries.push(['Hãng bay', details.airline_name])
    }

    if (details.flight_number) {
      operationEntries.push(['Số hiệu chuyến bay', details.flight_number])
    }

    if (details.departure_airport || details.arrival_airport) {
      operationEntries.push([
        'Hành trình',
        `${details.departure_airport ?? 'Chưa cập nhật'} - ${details.arrival_airport ?? 'Chưa cập nhật'}`,
      ])
    }

    if (details.departure_at) {
      operationEntries.push(['Khởi hành', formatDateTime(details.departure_at)])
    }

    if (details.arrival_at) {
      operationEntries.push(['Hạ cánh', formatDateTime(details.arrival_at)])
    }

    if (details.cabin_class) {
      operationEntries.push(['Hạng vé', formatCabinClass(details.cabin_class)])
    }

    if (details.seats_available != null || details.seats_total != null) {
      operationEntries.push([
        'Tình trạng chỗ',
        `${details.seats_available ?? '?'} / ${details.seats_total ?? '?'} chỗ`,
      ])
    }
  }

  if (item.type === 'train') {
    if (details.train_number) {
      operationEntries.push(['Số hiệu tàu', details.train_number])
    }

    if (details.departure_station || details.arrival_station) {
      operationEntries.push([
        'Lộ trình',
        `${details.departure_station ?? 'Chưa cập nhật'} - ${details.arrival_station ?? 'Chưa cập nhật'}`,
      ])
    }

    if (details.departure_at) {
      operationEntries.push(['Giờ khởi hành', formatDateTime(details.departure_at)])
    }

    if (details.arrival_at) {
      operationEntries.push(['Giờ đến', formatDateTime(details.arrival_at)])
    }

    if (details.seat_class) {
      operationEntries.push(['Loại ghế / giường', formatSeatClass(details.seat_class)])
    }

    if (details.seats_available != null || details.seats_total != null) {
      operationEntries.push([
        'Tình trạng chỗ',
        `${details.seats_available ?? '?'} / ${details.seats_total ?? '?'} chỗ`,
      ])
    }
  }

  if (item.type === 'combo') {
    operationEntries.push(['Số dịch vụ thành phần', `${comboItems.length} dịch vụ`])

    if (comboItems.length > 0) {
      operationLists.push({
        items: buildComboItems(comboItems),
        label: 'Danh sách thành phần',
      })
    }
  }

  if (operationEntries.length > 0 || operationLists.length > 0) {
    sections.push({
      description: 'Thông tin riêng theo loại hình để kiểm tra logic trước khi mở bán.',
      entries: operationEntries,
      lists: operationLists,
      title: 'Thông tin vận hành',
    })
  }

  const policyEntries = []

  if (service.cancellation_policy) {
    policyEntries.push(['Chính sách hủy', service.cancellation_policy])
  }

  if (details.included_services) {
    policyEntries.push(['Bao gồm', details.included_services])
  }

  if (details.excluded_services) {
    policyEntries.push(['Không bao gồm', details.excluded_services])
  }

  if (details.hotel_policy) {
    policyEntries.push(['Chính sách lưu trú', details.hotel_policy])
  }

  if (details.terms) {
    policyEntries.push(['Điều khoản áp dụng', details.terms])
  }

  if (policyEntries.length > 0) {
    sections.push({
      description: 'Các điều khoản sẽ ảnh hưởng trực tiếp đến trải nghiệm khách hàng sau khi duyệt.',
      entries: policyEntries,
      title: 'Chính sách và quyền lợi',
    })
  }

  const textBlocks = []

  if (service.short_description) {
    textBlocks.push({
      label: 'Mô tả ngắn',
      text: service.short_description,
    })
  }

  if (service.description && service.description !== service.short_description) {
    textBlocks.push({
      label: 'Mô tả chi tiết',
      text: service.description,
    })
  }

  if (textBlocks.length > 0) {
    sections.push({
      description: 'Nội dung văn bản đang được chuẩn bị hiển thị cho khách trên trang bán.',
      textBlocks,
      title: 'Nội dung hiển thị',
    })
  }

  const supplierReviewDescription = service.description || service.short_description || ''
  const supplierReviewSectionIndex = sections.findIndex(
    (section) => Array.isArray(section.textBlocks) && section.textBlocks.length > 0,
  )

  if (supplierReviewDescription) {
    const supplierReviewSection = {
      description:
        'Mô tả này là nội dung nhà cung cấp gửi lên để đội ngũ kiểm duyệt đọc và đánh giá trước khi duyệt.',
      textBlocks: [
        {
          label: 'Mô tả dài nhà cung cấp gửi duyệt',
          text: supplierReviewDescription,
        },
      ],
      title: 'Mô tả nhà cung cấp gửi duyệt',
    }

    if (supplierReviewSectionIndex >= 0) {
      sections[supplierReviewSectionIndex] = supplierReviewSection
    } else {
      sections.push(supplierReviewSection)
    }
  }

  return {
    eyebrow: SERVICE_TYPE_HEADLINES[item.type] ?? 'Hồ sơ dịch vụ đối tác gửi duyệt',
    quickFacts,
    sections,
    subtitle: `${item.partnerName} • ${item.location}`,
    title: item.title,
  }
}

function AdminServiceReviewFigmaPage() {
  const [selectedItem, setSelectedItem] = useState(null)
  const {
    activeType,
    activeTypeLabel,
    approveReviewItem,
    error,
    errors,
    feedback,
    isActionLoading,
    isMutating,
    loading,
    notes,
    rejectReviewItem,
    reloadReviewItems,
    resetFilters,
    reviewItems,
    reviewTypeOptions,
    setActiveType,
    updateNote,
    visibleItems,
  } = useAdminServiceReview()
  const detailView = useMemo(
    () => (selectedItem ? buildDetailViewModel(selectedItem) : null),
    [selectedItem],
  )
  const selectedNote = selectedItem ? notes[selectedItem.id] ?? '' : ''
  const selectedError = selectedItem ? errors[selectedItem.id] : ''

  useEffect(() => {
    if (!selectedItem) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    function handleWindowKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedItem(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleWindowKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [selectedItem])

  useEffect(() => {
    if (!selectedItem) {
      return
    }

    const stillVisible = visibleItems.some((item) => item.id === selectedItem.id)

    if (!stillVisible) {
      setSelectedItem(null)
    }
  }, [selectedItem, visibleItems])

  function openDetail(item) {
    setSelectedItem(item)
  }

  function closeDetail() {
    setSelectedItem(null)
  }

  function handleDetailKeyDown(event, item) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDetail(item)
    }
  }

  function handleDetailApprove() {
    if (!selectedItem) {
      return
    }

    approveReviewItem(selectedItem)
  }

  function handleDetailReject() {
    if (!selectedItem) {
      return
    }

    rejectReviewItem(selectedItem)
  }

  return (
    <main className="admin-ops-page admin-service-review-page">
      <header className="admin-service-review-page__header">
        <h1>Phê duyệt Dịch vụ</h1>
        <p>Quản lý và phê duyệt dịch vụ mới từ đối tác</p>
      </header>

      <nav className="admin-review-tabs" aria-label="Lọc loại dịch vụ cần phê duyệt">
        {reviewTypeOptions.map((type) => (
          <button
            aria-current={activeType === type.value ? 'page' : undefined}
            className={`admin-review-tabs__item${activeType === type.value ? ' admin-review-tabs__item--active' : ''}`}
            disabled={loading || isMutating}
            key={type.value}
            type="button"
            onClick={() => setActiveType(type.value)}
          >
            <span className="admin-review-tabs__icon">
              <ServiceTypeIcon type={type.value} />
            </span>
            <span>{type.label}</span>
          </button>
        ))}
      </nav>

      {feedback.message ? (
        <p
          className={`admin-service-review-page__feedback admin-service-review-page__feedback--${feedback.tone}`}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-service-review-page__list" aria-label="Danh sách dịch vụ chờ duyệt">
        {loading ? <AdminLoadingBlock rows={3} /> : null}

        {!loading && error ? (
          <AdminErrorState
            title="Không thể tải dịch vụ chờ duyệt"
            description={error}
            action={
              <AdminButton variant="secondary" onClick={reloadReviewItems}>
                Thử lại
              </AdminButton>
            }
          />
        ) : null}

        {!loading && !error && visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <article className="admin-review-card" key={item.id}>
              <div
                className="admin-review-card__media admin-review-card__details-trigger"
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết ${item.title}`}
                onClick={() => openDetail(item)}
                onKeyDown={(event) => handleDetailKeyDown(event, item)}
              >
                <img alt={item.title} src={item.imageUrl} />
                <div className="admin-review-card__badges" aria-label={`${item.tag}, ${item.duration}`}>
                  <span className="admin-review-card__badge admin-review-card__badge--hot">{item.tag}</span>
                  <span className="admin-review-card__badge admin-review-card__badge--duration">
                    {item.duration.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="admin-review-card__content">
                <div
                  className="admin-review-card__body admin-review-card__details-trigger admin-review-card__details-trigger--content"
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem mô tả chi tiết ${item.title}`}
                  onClick={() => openDetail(item)}
                  onKeyDown={(event) => handleDetailKeyDown(event, item)}
                >
                  <h2>{item.title}</h2>
                  <p className="admin-review-card__partner">Đối tác: {item.partnerName}</p>

                  <dl className="admin-review-card__meta" aria-label="Thông tin dịch vụ">
                    {buildCardMetaItems(item).map((metaItem) => (
                      <div key={metaItem.label}>
                        <dt>{metaItem.label}</dt>
                        <dd>
                          {metaItem.icon}
                          {metaItem.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="admin-review-card__description">{item.description}</p>
                </div>

                <div className="admin-review-card__actions-panel">
                  <AdminField
                    className="admin-review-card__note"
                    error={errors[item.id]}
                    label="Ghi chú (Bắt buộc nếu Từ chối)"
                  >
                    <AdminTextarea
                      className="admin-review-card__textarea"
                      disabled={isMutating}
                      invalid={Boolean(errors[item.id])}
                      placeholder="Nhập lý do hoặc ghi chú kiểm duyệt..."
                      rows={1}
                      value={notes[item.id] ?? ''}
                      onChange={(event) => updateNote(item.id, event.target.value)}
                    />
                  </AdminField>

                  <div className="admin-review-card__actions">
                    <AdminButton
                      className="admin-review-card__button admin-review-card__button--reject"
                      disabled={isMutating}
                      icon={<RejectIcon />}
                      loading={isActionLoading(item.id, 'reject')}
                      variant="danger"
                      onClick={() => rejectReviewItem(item)}
                    >
                      Từ chối
                    </AdminButton>
                    <AdminButton
                      className="admin-review-card__button admin-review-card__button--approve"
                      disabled={isMutating}
                      icon={<ApproveIcon />}
                      loading={isActionLoading(item.id, 'approve')}
                      variant="success"
                      onClick={() => approveReviewItem(item)}
                    >
                      Phê duyệt
                    </AdminButton>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : null}

        {!loading && !error && visibleItems.length === 0 ? (
          <AdminEmptyState
            title="Không có dịch vụ chờ duyệt phù hợp"
            description="Thử đổi loại dịch vụ hoặc quay lại sau khi nhân viên gửi dịch vụ lên hàng chờ."
            action={
              <AdminButton variant="secondary" onClick={resetFilters}>
                Đặt lại bộ lọc
              </AdminButton>
            }
          />
        ) : null}
      </section>

      <p className="admin-service-review-page__summary">
        Hiển thị {visibleItems.length} trong số {reviewItems.length} {activeTypeLabel}
      </p>
      {selectedItem ? (
        <div
          className="admin-service-review-page__modal-backdrop"
          role="presentation"
          onClick={closeDetail}
        >
          <section
            className="admin-service-review-page__detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-service-review-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-service-review-page__detail-header">
              <div className="admin-service-review-page__detail-header-body">
                <p>{detailView?.eyebrow}</p>
                <h2 id="admin-service-review-detail-title">{detailView?.title}</h2>
                <span className="admin-service-review-page__detail-subtitle">{detailView?.subtitle}</span>
              </div>
              <button
                className="admin-service-review-page__detail-close"
                type="button"
                aria-label="Đóng popup chi tiết dịch vụ"
                onClick={closeDetail}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="admin-service-review-page__detail-hero">
              <img alt={selectedItem.title} src={selectedItem.imageUrl} />
              <div className="admin-service-review-page__detail-hero-content">
                <div className="admin-service-review-page__detail-badges">
                  <span className="admin-review-card__badge admin-review-card__badge--hot">{selectedItem.tag}</span>
                  <span className="admin-review-card__badge admin-review-card__badge--duration">
                    {selectedItem.duration.toUpperCase()}
                  </span>
                </div>
                <p>Kiểm tra mô tả, thông tin vận hành và chính sách trước khi phê duyệt công khai.</p>
              </div>
            </div>

            <div className="admin-service-review-page__detail-facts">
              {detailView?.quickFacts.map((fact) => (
                <div className="admin-service-review-page__detail-fact" key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                  <p>{fact.hint}</p>
                </div>
              ))}
            </div>

            {detailView?.sections.map((section) => (
              <div className="admin-service-review-page__detail-section" key={section.title}>
                <div className="admin-service-review-page__detail-section-header">
                  <h3>{section.title}</h3>
                  <p>{section.description}</p>
                </div>

                {section.entries?.length ? (
                  <div className="admin-service-review-page__detail-grid">
                    {section.entries.map(([label, value]) => (
                      <div className="admin-service-review-page__detail-item" key={`${section.title}-${label}`}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.lists?.length ? (
                  <div className="admin-service-review-page__detail-list-grid">
                    {section.lists.map((listBlock) => (
                      <div className="admin-service-review-page__detail-list-block" key={`${section.title}-${listBlock.label}`}>
                        <span>{listBlock.label}</span>
                        <ul>
                          {listBlock.items.map((listItem) => (
                            <li key={listItem}>{listItem}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.textBlocks?.length ? (
                  <div className="admin-service-review-page__detail-text-grid">
                    {section.textBlocks.map((textBlock) => (
                      <div className="admin-service-review-page__detail-text-block" key={`${section.title}-${textBlock.label}`}>
                        <span>{textBlock.label}</span>
                        <p>{textBlock.text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            <div className="admin-service-review-page__detail-actions-panel">
              <AdminField
                className="admin-service-review-page__detail-note"
                error={selectedError}
                label="Ghi chú kiểm duyệt (bắt buộc nếu từ chối)"
              >
                <AdminTextarea
                  className="admin-service-review-page__detail-textarea"
                  disabled={isMutating}
                  invalid={Boolean(selectedError)}
                  placeholder="Nhập lý do từ chối hoặc ghi chú nội bộ cho lần duyệt này..."
                  rows={2}
                  value={selectedNote}
                  onChange={(event) => updateNote(selectedItem.id, event.target.value)}
                />
              </AdminField>

              <div className="admin-service-review-page__detail-actions">
                <AdminButton
                  className="admin-review-card__button admin-review-card__button--reject"
                  disabled={isMutating}
                  icon={<RejectIcon />}
                  loading={isActionLoading(selectedItem.id, 'reject')}
                  variant="danger"
                  onClick={handleDetailReject}
                >
                  Từ chối
                </AdminButton>
                <AdminButton
                  className="admin-review-card__button admin-review-card__button--approve"
                  disabled={isMutating}
                  icon={<ApproveIcon />}
                  loading={isActionLoading(selectedItem.id, 'approve')}
                  variant="success"
                  onClick={handleDetailApprove}
                >
                  Phê duyệt
                </AdminButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default AdminServiceReviewFigmaPage
