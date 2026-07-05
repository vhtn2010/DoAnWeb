import { useMemo, useState } from 'react'

const SUPPORT_STATUSES = Object.freeze({
  all: 'all',
  open: 'open',
  processing: 'processing',
  resolved: 'resolved',
})

const SUPPORT_STATUS_OPTIONS = Object.freeze([
  { value: SUPPORT_STATUSES.all, label: 'Tất cả' },
  { value: SUPPORT_STATUSES.open, label: 'Đang chờ' },
  { value: SUPPORT_STATUSES.processing, label: 'Đang xử lý' },
  { value: SUPPORT_STATUSES.resolved, label: 'Đã xử lý' },
])

const SUPPORT_STATUS_META = Object.freeze({
  [SUPPORT_STATUSES.open]: { label: 'Đang chờ', tone: 'warning' },
  [SUPPORT_STATUSES.processing]: { label: 'Đang xử lý', tone: 'info' },
  [SUPPORT_STATUSES.resolved]: { label: 'Đã xử lý', tone: 'success' },
})

const SUPPORT_PRIORITY_META = Object.freeze({
  high: { label: 'Ưu tiên cao', tone: 'danger' },
  low: { label: 'Thấp', tone: 'neutral' },
  medium: { label: 'Trung bình', tone: 'warning' },
})

const SUPPORT_REQUESTS = Object.freeze([
  {
    id: 'REQ-8492',
    bookingCode: 'HL-99821',
    createdLabel: '10 phút trước',
    customerName: 'Trần Quang Hiếu',
    customerPhone: '+84 901 234 567',
    customerTier: 'Khách hàng hạng Vàng',
    message:
      'Chào các bạn,\n\nDo tình hình thời tiết bão sắp tới, gia đình tôi không thể tham gia tour Vịnh Hạ Long 3N2Đ dự kiến khởi hành vào thứ 6 tuần này (Mã Booking: #HL-99821).\n\nXin vui lòng hướng dẫn tôi thủ tục hủy tour và chính sách hoàn tiền trong trường hợp bất khả kháng này. Rất mong nhận được phản hồi sớm. Cảm ơn!',
    priority: 'high',
    status: SUPPORT_STATUSES.open,
    subject: 'Hủy vé: Tour Vịnh Hạ Long 3N2Đ - Yêu cầu hoàn tiền do bão.',
  },
  {
    id: 'REQ-8491',
    bookingCode: 'VN-2026',
    createdLabel: '1 giờ trước',
    customerName: 'Nguyễn Mai Phương',
    customerPhone: '+84 918 221 432',
    customerTier: 'Khách hàng thân thiết',
    message:
      'Tôi muốn đổi ngày chuyến bay VN Airlines tuyến SGN-HAN sang tuần sau. Vui lòng kiểm tra giúp tôi các khung giờ còn trống và phí chênh lệch nếu có.',
    priority: 'medium',
    status: SUPPORT_STATUSES.processing,
    subject: 'Đổi ngày: Chuyến bay VN Airlines (SGN-HAN)',
  },
  {
    id: 'REQ-8488',
    bookingCode: 'SP-0926',
    createdLabel: 'Hôm qua',
    customerName: 'Lê Đức Anh',
    customerPhone: '+84 936 778 900',
    customerTier: 'Khách hàng mới',
    message:
      'Tôi cần tư vấn tour Sapa mùa lúa chín tháng 9 cho nhóm 6 người. Nhờ Net Viet Travel gợi ý lịch trình phù hợp cho gia đình có trẻ nhỏ.',
    priority: 'low',
    status: SUPPORT_STATUSES.resolved,
    subject: 'Tư vấn Tour: Du lịch Sapa mùa lúa chín tháng 9',
  },
])

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cx(...classNames) {
  return classNames.filter(Boolean).join(' ')
}

function SupportIcon({ children }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      {children}
    </svg>
  )
}

function SearchIcon() {
  return (
    <SupportIcon>
      <path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </SupportIcon>
  )
}

function PhoneIcon() {
  return (
    <SupportIcon>
      <path d="M7.4 4.6 9 8.2 7.3 9.5c.9 1.9 2.3 3.3 4.2 4.2l1.3-1.7 3.6 1.6-.5 3.1c-.1.7-.7 1.3-1.4 1.3C8.7 18 4 13.3 4 7.5c0-.7.6-1.3 1.3-1.4l2.1-.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </SupportIcon>
  )
}

function MailIcon() {
  return (
    <SupportIcon>
      <path d="M4 6.5h16v11H4v-11Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </SupportIcon>
  )
}

function SendIcon() {
  return (
    <SupportIcon>
      <path d="m4 12 16-7-7 16-2.2-6.8L4 12Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m11 14 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </SupportIcon>
  )
}

function PaperclipIcon() {
  return (
    <SupportIcon>
      <path d="m8.5 12.8 5.7-5.7a3 3 0 0 1 4.2 4.2l-7.1 7.1a4.5 4.5 0 0 1-6.4-6.4l6.7-6.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </SupportIcon>
  )
}

function ImageIcon() {
  return (
    <SupportIcon>
      <path d="M4.5 6.5h15v11h-15v-11Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m6.5 15 3.2-3 2.2 2 2.7-3.1 3 4.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 9.5h.01" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </SupportIcon>
  )
}

function TextStyleButton({ children, label }) {
  return (
    <button className="admin-support-reply__tool" type="button" aria-label={label} title={label}>
      {children}
    </button>
  )
}

function SupportAvatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <span className={cx('admin-support-avatar', `admin-support-avatar--${size}`)} aria-hidden="true">
      {initials}
    </span>
  )
}

function SupportBadge({ children, tone }) {
  return <span className={cx('admin-support-badge', `admin-support-badge--${tone}`)}>{children}</span>
}

function AdminSupportFigmaPage() {
  const [reply, setReply] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState(SUPPORT_REQUESTS[0]?.id ?? '')
  const [statusFilter, setStatusFilter] = useState(SUPPORT_STATUSES.all)

  const requests = useMemo(() => {
    const query = normalizeText(searchQuery.trim())

    return SUPPORT_REQUESTS.filter((request) => {
      const matchesStatus =
        statusFilter === SUPPORT_STATUSES.all || request.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        normalizeText(`${request.id} ${request.customerName} ${request.subject}`).includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchQuery, statusFilter])

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? requests[0]
  const messageParagraphs = selectedRequest?.message.split('\n\n').filter(Boolean) ?? []

  function resetFilters() {
    setSearchQuery('')
    setStatusFilter(SUPPORT_STATUSES.all)
  }

  return (
    <main className="admin-support-page">
      <header className="admin-support-page__header">
        <div className="admin-support-page__header-copy">
          <h1>Hỗ trợ khách hàng</h1>
          <p>Quản lý và phản hồi các yêu cầu từ du khách.</p>
        </div>

        <div className="admin-support-page__filters" role="group" aria-label="Lọc trạng thái hỗ trợ">
          {SUPPORT_STATUS_OPTIONS.map((option) => (
            <button
              className={cx(
                'admin-support-page__filter',
                statusFilter === option.value && 'admin-support-page__filter--active',
              )}
              key={option.value}
              type="button"
              aria-pressed={statusFilter === option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="admin-support-page__workspace">
        <section className="admin-support-page__queue" aria-label="Danh sách yêu cầu hỗ trợ">
          <form className="admin-support-page__search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="admin-support-page__search-control">
              <span className="admin-support-page__sr-only">Tìm kiếm mã hỗ trợ, khách hàng</span>
              <SearchIcon />
              <input
                placeholder="Tìm kiếm mã hỗ trợ, khách hàng..."
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </form>

          <div className="admin-support-page__list">
            {requests.length > 0 ? requests.map((request) => {
              const priority = SUPPORT_PRIORITY_META[request.priority]
              const status = SUPPORT_STATUS_META[request.status]

              return (
                <button
                  className={cx(
                    'admin-support-ticket',
                    request.id === selectedRequest?.id && 'admin-support-ticket--active',
                  )}
                  aria-pressed={request.id === selectedRequest?.id}
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedId(request.id)}
                >
                  <span className="admin-support-ticket__top">
                    <strong>#{request.id}</strong>
                    <span>{request.createdLabel}</span>
                  </span>
                  <span className="admin-support-ticket__customer">{request.customerName}</span>
                  <span className="admin-support-ticket__subject">{request.subject}</span>
                  <span className="admin-support-ticket__badges">
                    <SupportBadge tone={priority.tone}>{priority.label}</SupportBadge>
                    <SupportBadge tone={status.tone}>{status.label}</SupportBadge>
                  </span>
                </button>
              )
            }) : (
              <div className="admin-support-empty" role="status">
                <strong>Không có yêu cầu hỗ trợ phù hợp</strong>
                <span>Thử đổi trạng thái hoặc từ khóa tìm kiếm.</span>
                <button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button>
              </div>
            )}
          </div>
        </section>

        {selectedRequest ? (
          <section className="admin-support-page__conversation" aria-label={`Chi tiết hỗ trợ của ${selectedRequest.customerName}`}>
            <div className="admin-support-detail-header">
              <div className="admin-support-detail-header__customer">
                <SupportAvatar name={selectedRequest.customerName} size="lg" />
                <div>
                  <h2>{selectedRequest.customerName}</h2>
                  <p>
                    <strong>{selectedRequest.customerTier}</strong>
                    <span aria-hidden="true">•</span>
                    <span>{selectedRequest.customerPhone}</span>
                  </p>
                </div>
              </div>
              <div className="admin-support-detail-header__actions" role="group" aria-label="Liên hệ khách hàng">
                <button type="button" aria-label="Gọi khách hàng" title="Gọi khách hàng">
                  <PhoneIcon />
                </button>
                <button type="button" aria-label="Gửi email khách hàng" title="Gửi email khách hàng">
                  <MailIcon />
                </button>
              </div>
            </div>

            <div className="admin-support-page__thread">
              <p className="admin-support-page__subject">
                Chủ đề: {selectedRequest.subject.replace(/^Hủy vé:\s*/, 'Hủy vé - ')}
              </p>
              <article className="admin-support-thread-item">
                <SupportAvatar name={selectedRequest.customerName} size="sm" />
                <div className="admin-support-thread-item__content">
                  <div className="admin-support-thread-item__meta">
                    <strong>{selectedRequest.customerName}</strong>
                    <span>09:45 AM, Hôm nay</span>
                  </div>
                  <div className="admin-support-message">
                    {messageParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            <form className="admin-support-reply" onSubmit={(event) => event.preventDefault()}>
              <SupportAvatar name="Net Viet" size="sm" />
              <div className="admin-support-reply__editor">
                <label className="admin-support-page__sr-only" htmlFor="support-reply">
                  Phản hồi
                </label>
                <textarea
                  id="support-reply"
                  placeholder="Nhập phản hồi cho khách hàng..."
                  rows="4"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <div className="admin-support-reply__toolbar">
                  <div className="admin-support-reply__tools" role="group" aria-label="Định dạng phản hồi">
                    <TextStyleButton label="In đậm"><strong>B</strong></TextStyleButton>
                    <TextStyleButton label="In nghiêng"><em>I</em></TextStyleButton>
                    <span className="admin-support-reply__divider" aria-hidden="true" />
                    <TextStyleButton label="Đính kèm tệp"><PaperclipIcon /></TextStyleButton>
                    <TextStyleButton label="Đính kèm hình ảnh"><ImageIcon /></TextStyleButton>
                  </div>
                  <button className="admin-support-reply__submit" type="submit" disabled={reply.trim().length === 0}>
                    <SendIcon />
                    <span>Phản hồi</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default AdminSupportFigmaPage
