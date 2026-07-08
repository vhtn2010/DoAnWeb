import { AdminPagination } from '../../components/admin/ui/index.js'
import {
  ADMIN_SUPPORT_STATUS_OPTIONS,
} from '../../constants/adminSupport.js'
import useAdminSupport from '../../hooks/useAdminSupport.js'
import {
  getAdminSupportPriorityMeta,
  getAdminSupportStatusMeta,
} from '../../mappers/adminSupportMappers.js'

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

function RefreshIcon() {
  return (
    <SupportIcon>
      <path d="M20 6v5h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M4 18v-5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M18.7 10A7 7 0 0 0 6.3 7.2L4 10m16 4-2.3 2.8A7 7 0 0 1 5.3 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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

function TextStyleButton({ children, disabled = false, label }) {
  return (
    <button
      className="admin-support-reply__tool"
      disabled={disabled}
      type="button"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function SupportAvatar({ initials = '', name, size = 'md' }) {
  const fallbackInitials = String(name || 'Net Viet')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <span className={cx('admin-support-avatar', `admin-support-avatar--${size}`)} aria-hidden="true">
      {initials || fallbackInitials}
    </span>
  )
}

function SupportBadge({ children, tone }) {
  return <span className={cx('admin-support-badge', `admin-support-badge--${tone}`)}>{children}</span>
}

function getMessageParagraphs(message) {
  return String(message || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function openContactLink(href) {
  if (typeof window !== 'undefined' && href) {
    window.location.href = href
  }
}

function buildMailLink(email, subject) {
  if (!email) {
    return ''
  }

  return `mailto:${email}?subject=${encodeURIComponent(subject || 'Net Viet Travel hỗ trợ')}`
}

function AdminSupportFigmaPage() {
  const {
    actionLoading,
    currentPage,
    detailLoading,
    error,
    feedback,
    isInternalNote,
    loading,
    pageNumbers,
    pagination,
    reloadTickets,
    replyMessage,
    resetFilters,
    runTicketAction,
    searchQuery,
    selectTicket,
    selectedTicket,
    sendReply,
    setCurrentPage,
    setIsInternalNote,
    setReplyMessage,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    tickets,
    totalLoadedTickets,
  } = useAdminSupport()

  const selectedStatus = selectedTicket
    ? getAdminSupportStatusMeta(selectedTicket.status)
    : null
  const selectedPriority = selectedTicket
    ? getAdminSupportPriorityMeta(selectedTicket.priority)
    : null
  const canSubmitReply =
    Boolean(selectedTicket?.canReply) &&
    replyMessage.trim().length > 0 &&
    !actionLoading &&
    !detailLoading

  return (
    <main className="admin-support-page">
      <header className="admin-support-page__header">
        <div className="admin-support-page__header-copy">
          <h1>Hỗ trợ khách hàng</h1>
          <p>Quản lý và phản hồi các yêu cầu từ du khách.</p>
        </div>

        <div className="admin-support-page__filters" role="group" aria-label="Lọc trạng thái hỗ trợ">
          {ADMIN_SUPPORT_STATUS_OPTIONS.map((option) => (
            <button
              className={cx(
                'admin-support-page__filter',
                statusFilter === option.value && 'admin-support-page__filter--active',
              )}
              disabled={loading}
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

      {feedback?.message ? (
        <p
          className={cx(
            'admin-support-page__feedback',
            `admin-support-page__feedback--${feedback.tone}`,
          )}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

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
            {loading ? (
              <div className="admin-support-empty" role="status">
                <strong>Đang tải yêu cầu hỗ trợ</strong>
                <span>Dữ liệu đang được lấy từ API backend.</span>
              </div>
            ) : error && totalLoadedTickets === 0 ? (
              <div className="admin-support-empty" role="alert">
                <strong>Không thể tải yêu cầu hỗ trợ</strong>
                <span>{error}</span>
                <button type="button" onClick={reloadTickets}>Thử lại</button>
              </div>
            ) : tickets.length > 0 ? tickets.map((ticket) => {
              const priority = getAdminSupportPriorityMeta(ticket.priority)
              const status = getAdminSupportStatusMeta(ticket.status)

              return (
                <button
                  className={cx(
                    'admin-support-ticket',
                    ticket.id === selectedTicket?.id && 'admin-support-ticket--active',
                  )}
                  aria-pressed={ticket.id === selectedTicket?.id}
                  key={ticket.id}
                  type="button"
                  onClick={() => selectTicket(ticket)}
                >
                  <span className="admin-support-ticket__main">
                    <SupportAvatar
                      initials={ticket.customerInitials}
                      name={ticket.customerName}
                      size="sm"
                    />
                    <span className="admin-support-ticket__body">
                      <span className="admin-support-ticket__top">
                        <strong>#{ticket.displayCode}</strong>
                        <span>{ticket.updatedLabel}</span>
                      </span>
                      <span className="admin-support-ticket__customer">{ticket.customerName}</span>
                      <span className="admin-support-ticket__subject">{ticket.subject}</span>
                      <span className="admin-support-ticket__badges">
                        <SupportBadge tone={priority.tone}>{priority.label}</SupportBadge>
                        <SupportBadge tone={status.tone}>{status.label}</SupportBadge>
                      </span>
                    </span>
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

          <div className="admin-support-page__queue-footer">
            <span>
              {pagination.total > 0
                ? `Hiển thị ${tickets.length}/${pagination.total} yêu cầu`
                : `${totalLoadedTickets} yêu cầu`}
            </span>
            <AdminPagination
              className="admin-support-page__pagination"
              currentPage={pagination.page || currentPage}
              pages={pageNumbers}
              totalPages={pagination.total_pages}
              onPageChange={setCurrentPage}
            />
          </div>
        </section>

        {selectedTicket ? (
          <section className="admin-support-page__conversation" aria-label={`Chi tiết hỗ trợ của ${selectedTicket.customerName}`}>
            <div className="admin-support-detail-header">
              <div className="admin-support-detail-header__customer">
                <SupportAvatar
                  initials={selectedTicket.customerInitials}
                  name={selectedTicket.customerName}
                  size="lg"
                />
                <div>
                  <h2>{selectedTicket.customerName}</h2>
                  <p>
                    <strong>{selectedTicket.customerTier}</strong>
                    <span aria-hidden="true">•</span>
                    <span>{selectedTicket.customerPhone || selectedTicket.customerEmail || 'Chưa có liên hệ'}</span>
                  </p>
                </div>
              </div>
              <div className="admin-support-detail-header__actions" role="group" aria-label="Liên hệ khách hàng">
                <button
                  type="button"
                  aria-label="Tải lại chi tiết"
                  title="Tải lại chi tiết"
                  onClick={() => selectTicket(selectedTicket)}
                >
                  <RefreshIcon />
                </button>
                <button
                  disabled={!selectedTicket.customerPhone}
                  type="button"
                  aria-label="Gọi khách hàng"
                  title="Gọi khách hàng"
                  onClick={() => openContactLink(`tel:${selectedTicket.customerPhone}`)}
                >
                  <PhoneIcon />
                </button>
                <button
                  disabled={!selectedTicket.customerEmail}
                  type="button"
                  aria-label="Gửi email khách hàng"
                  title="Gửi email khách hàng"
                  onClick={() => openContactLink(buildMailLink(selectedTicket.customerEmail, selectedTicket.subject))}
                >
                  <MailIcon />
                </button>
              </div>
            </div>

            <div className="admin-support-page__thread">
              <div className="admin-support-page__subject-row">
                <p className="admin-support-page__subject">
                  Chủ đề: {selectedTicket.subject}
                </p>
                <span className="admin-support-ticket__badges">
                  <SupportBadge tone={selectedPriority.tone}>{selectedPriority.label}</SupportBadge>
                  <SupportBadge tone={selectedStatus.tone}>{selectedStatus.label}</SupportBadge>
                </span>
              </div>

              <div className="admin-support-thread-actions" role="group" aria-label="Thao tác ticket hỗ trợ">
                {selectedTicket.canClose ? (
                  <button
                    className="admin-support-thread-actions__button"
                    disabled={actionLoading}
                    type="button"
                    onClick={() => runTicketAction('close')}
                  >
                    Đóng ticket
                  </button>
                ) : null}
                {selectedTicket.canReopen ? (
                  <button
                    className="admin-support-thread-actions__button"
                    disabled={actionLoading}
                    type="button"
                    onClick={() => runTicketAction('reopen')}
                  >
                    Mở lại
                  </button>
                ) : null}
                {selectedTicket.canMarkSpam ? (
                  <button
                    className="admin-support-thread-actions__button admin-support-thread-actions__button--danger"
                    disabled={actionLoading}
                    type="button"
                    onClick={() => runTicketAction('spam')}
                  >
                    Đánh dấu spam
                  </button>
                ) : null}
              </div>

              {detailLoading ? (
                <div className="admin-support-empty" role="status">
                  <strong>Đang tải hội thoại</strong>
                  <span>Đang lấy chi tiết ticket và lịch sử phản hồi.</span>
                </div>
              ) : selectedTicket.replies?.length > 0 ? selectedTicket.replies.map((reply) => (
                <article
                  className={cx(
                    'admin-support-thread-item',
                    reply.isStaff && 'admin-support-thread-item--staff',
                    reply.isInternalNote && 'admin-support-thread-item--internal',
                  )}
                  key={reply.id}
                >
                  <SupportAvatar initials={reply.initials} name={reply.senderName} size="sm" />
                  <div className="admin-support-thread-item__content">
                    <div className="admin-support-thread-item__meta">
                      <strong>{reply.senderName}</strong>
                      <span>{reply.createdLabel}</span>
                      {reply.isInternalNote ? (
                        <SupportBadge tone="info">Nội bộ</SupportBadge>
                      ) : null}
                    </div>
                    <div className="admin-support-message">
                      {getMessageParagraphs(reply.message).map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </article>
              )) : (
                <div className="admin-support-empty" role="status">
                  <strong>Chưa có nội dung hội thoại</strong>
                  <span>Ticket này chưa có phản hồi nào được ghi nhận.</span>
                </div>
              )}
            </div>

            <form className="admin-support-reply" onSubmit={sendReply}>
              <SupportAvatar name="Net Viet" size="sm" />
              <div className="admin-support-reply__editor">
                <label className="admin-support-page__sr-only" htmlFor="support-reply">
                  Phản hồi
                </label>
                <textarea
                  disabled={!selectedTicket.canReply || actionLoading || detailLoading}
                  id="support-reply"
                  placeholder={
                    selectedTicket.canReply
                      ? 'Nhập phản hồi cho khách hàng...'
                      : 'Ticket đã đóng hoặc không cho phép phản hồi.'
                  }
                  rows="4"
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                />
                <div className="admin-support-reply__toolbar">
                  <div className="admin-support-reply__tools" role="group" aria-label="Định dạng phản hồi">
                    <TextStyleButton disabled={actionLoading} label="In đậm"><strong>B</strong></TextStyleButton>
                    <TextStyleButton disabled={actionLoading} label="In nghiêng"><em>I</em></TextStyleButton>
                    <span className="admin-support-reply__divider" aria-hidden="true" />
                    <TextStyleButton disabled={actionLoading} label="Đính kèm tệp"><PaperclipIcon /></TextStyleButton>
                    <TextStyleButton disabled={actionLoading} label="Đính kèm hình ảnh"><ImageIcon /></TextStyleButton>
                  </div>
                  <label className="admin-support-reply__internal">
                    <input
                      checked={isInternalNote}
                      disabled={!selectedTicket.canReply || actionLoading || detailLoading}
                      type="checkbox"
                      onChange={(event) => setIsInternalNote(event.target.checked)}
                    />
                    <span>Ghi chú nội bộ</span>
                  </label>
                  <button
                    className="admin-support-reply__submit"
                    disabled={!canSubmitReply}
                    type="submit"
                  >
                    <SendIcon />
                    <span>{actionLoading ? 'Đang gửi...' : 'Phản hồi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        ) : (
          <section className="admin-support-page__conversation" aria-label="Chi tiết hỗ trợ">
            <div className="admin-support-empty" role="status">
              <strong>Chọn một yêu cầu hỗ trợ</strong>
              <span>Danh sách bên trái sẽ hiển thị ticket sau khi tải dữ liệu từ backend.</span>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default AdminSupportFigmaPage
