import { Link } from 'react-router-dom'
import useCustomerCare from '../../hooks/useCustomerCare.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'

const SUPPORT_TOPICS = Object.freeze([
  {
    id: 'booking',
    label: 'Hỗ trợ đơn hàng',
    prompt: 'Tôi cần hỗ trợ kiểm tra đơn hàng và trạng thái thanh toán.',
  },
  {
    id: 'reschedule',
    label: 'Đổi lịch trình',
    prompt: 'Tôi muốn thay đổi ngày đi hoặc lịch trình hiện tại.',
  },
  {
    id: 'refund',
    label: 'Hoàn tiền',
    prompt: 'Tôi cần được hướng dẫn quy trình hủy và hoàn tiền.',
  },
  {
    id: 'voucher',
    label: 'Voucher',
    prompt: 'Tôi muốn hỏi về voucher và ưu đãi đang áp dụng.',
  },
])

const SUPPORT_HIGHLIGHTS = Object.freeze([
  {
    id: 'availability',
    title: 'Phản hồi nhanh',
    description: 'Các câu hỏi phổ biến được tiếp nhận ngay trước khi chuyển tiếp cho nhân viên.',
  },
  {
    id: 'handoff',
    title: 'Theo dõi tập trung',
    description: 'Mọi trao đổi về đơn hàng, thanh toán và thay đổi lịch trình đều nằm trong cùng một luồng xử lý.',
  },
  {
    id: 'history',
    title: 'Lưu vết trạng thái',
    description: 'Khách hàng đã đăng nhập có thể xem lại phiếu hỗ trợ gần đây và tiếp tục trao đổi bất cứ lúc nào.',
  },
])

function formatTicketStatus(status = '') {
  switch (status) {
    case 'open':
      return 'Mới tiếp nhận'
    case 'waiting_staff':
      return 'Đang chờ nhân viên'
    case 'resolved':
      return 'Đã phản hồi'
    case 'closed':
      return 'Đã đóng'
    case 'spam':
      return 'Không hợp lệ'
    default:
      return 'Đang xử lý'
  }
}

function CustomerCarePage() {
  const { isCustomer } = usePublicSession()
  const {
    activeTicket,
    draft,
    error,
    feedback,
    handleCloseTicket,
    handleSelectTicket,
    handleSubmit,
    handleTopicSelect,
    loading,
    logRef,
    messages,
    recentTickets,
    sending,
    setDraft,
  } = useCustomerCare({ isCustomer })
  const backToProfilePath = buildPublicAuthPath('/profile', isCustomer)
  const canCloseTicket =
    Boolean(activeTicket?.id) &&
    activeTicket.status !== 'closed' &&
    activeTicket.status !== 'spam'

  return (
    <div className="customer-care-page">
      <section className="customer-care-hero">
        <div className="customer-care-hero__copy">
          <p className="customer-care-hero__eyebrow">Chăm sóc khách hàng</p>
          <h1>Trò chuyện trực tiếp với hệ thống hỗ trợ</h1>
          <p>
            Gửi câu hỏi về đơn hàng, thay đổi lịch trình, hoàn tiền hoặc voucher. Hệ thống sẽ
            tiếp nhận ngay và đồng bộ nội dung vào phiếu hỗ trợ của bạn khi đang đăng nhập.
          </p>

          <div className="customer-care-hero__actions">
            <Link className="customer-care-hero__button" to={backToProfilePath}>
              Quay về tài khoản
            </Link>
            <a
              className="customer-care-hero__button customer-care-hero__button--secondary"
              href="tel:1990888999"
            >
              Hotline 24/7
            </a>
          </div>
        </div>

        <div className="customer-care-hero__summary">
          <span className="customer-care-hero__status">
            {isCustomer ? 'Đang ở chế độ thành viên' : 'Khách vãng lai'}
          </span>
          <strong>
            {activeTicket?.ticket_code
              ? `Phiếu hiện tại: ${activeTicket.ticket_code}`
              : 'Sẵn sàng tiếp nhận yêu cầu mới'}
          </strong>
          <p>
            {activeTicket
              ? `Trạng thái hiện tại: ${formatTicketStatus(activeTicket.status)}.`
              : isCustomer
                ? 'Bạn chưa có phiếu hỗ trợ mở nào trong tài khoản hiện tại.'
                : 'Khách vãng lai có thể hỏi nhanh ngay trên giao diện này.'}
          </p>
          {canCloseTicket ? (
            <button
              className="customer-care-hero__button customer-care-hero__button--secondary"
              type="button"
              onClick={handleCloseTicket}
              disabled={sending}
            >
              Đóng phiếu hiện tại
            </button>
          ) : null}
        </div>
      </section>

      <div className="customer-care-layout">
        <aside className="customer-care-sidebar">
          <section className="customer-care-panel">
            <header className="customer-care-panel__header">
              <p className="customer-care-panel__eyebrow">Câu hỏi nhanh</p>
              <h2>Chọn một chủ đề để bắt đầu</h2>
            </header>

            <div className="customer-care-topic-grid">
              {SUPPORT_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  className="customer-care-topic"
                  type="button"
                  onClick={() => handleTopicSelect(topic.prompt)}
                  disabled={sending || loading}
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.prompt}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="customer-care-panel customer-care-panel--highlights">
            <header className="customer-care-panel__header">
              <p className="customer-care-panel__eyebrow">
                {isCustomer ? 'Phiếu gần đây' : 'Điểm nổi bật'}
              </p>
              <h2>
                {isCustomer
                  ? 'Tiếp tục xử lý các yêu cầu gần nhất'
                  : 'Kênh hỗ trợ được thiết kế cho hành trình'}
              </h2>
            </header>

            <div className="customer-care-highlight-list">
              {isCustomer ? (
                recentTickets.length > 0 ? (
                  recentTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      className="customer-care-topic customer-care-topic--compact"
                      type="button"
                      onClick={() => handleSelectTicket(ticket.id)}
                      disabled={sending || loading}
                    >
                      <strong>{ticket.ticket_code}</strong>
                      <span>
                        {ticket.subject} • {formatTicketStatus(ticket.status)}
                      </span>
                    </button>
                  ))
                ) : (
                  <article className="customer-care-highlight">
                    <strong>Chưa có phiếu hỗ trợ</strong>
                    <p>Gửi tin nhắn đầu tiên để hệ thống tạo phiếu mới cho tài khoản của bạn.</p>
                  </article>
                )
              ) : (
                SUPPORT_HIGHLIGHTS.map((item) => (
                  <article className="customer-care-highlight" key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="customer-care-chat">
          <header className="customer-care-chat__header">
            <div>
              <p className="customer-care-chat__eyebrow">Trò chuyện với hệ thống</p>
              <h2>Hỗ trợ đơn hàng và lịch trình</h2>
            </div>
            <span className="customer-care-chat__presence">
              {loading
                ? 'Đang đồng bộ lịch sử hỗ trợ...'
                : sending
                  ? 'Yêu cầu đang được gửi...'
                  : 'Sẵn sàng hỗ trợ'}
            </span>
          </header>

          <div
            ref={logRef}
            aria-live="polite"
            className="customer-care-chat__log"
            role="log"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`customer-care-message customer-care-message--${message.sender}`}
              >
                <span className="customer-care-message__sender">
                  {message.sender === 'system' ? 'Hệ thống' : 'Bạn'}
                </span>
                <p>{message.content}</p>
                <span className="customer-care-message__time">{message.timeLabel}</span>
              </article>
            ))}

            {sending ? (
              <article className="customer-care-message customer-care-message--system customer-care-message--typing">
                <span className="customer-care-message__sender">Hệ thống</span>
                <p>Đang phân tích yêu cầu và cập nhật nội dung hỗ trợ...</p>
              </article>
            ) : null}
          </div>

          <form className="customer-care-composer" onSubmit={handleSubmit}>
            <label className="customer-care-composer__label" htmlFor="customer-care-input">
              Nội dung cần hỗ trợ
            </label>

            <div className="customer-care-composer__field">
              <textarea
                id="customer-care-input"
                className="customer-care-composer__textarea"
                placeholder="Ví dụ: Tôi cần kiểm tra đơn hàng VT-99283 và muốn đổi ngày đi."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                disabled={sending}
              />

              <button
                className="customer-care-composer__submit"
                type="submit"
                disabled={sending || loading || !draft.trim()}
              >
                {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </button>
            </div>

            <p className="customer-care-composer__hint" role="status">
              {error || feedback ||
                (isCustomer
                  ? 'Tin nhắn sẽ được đồng bộ vào phiếu hỗ trợ hiện tại hoặc tạo phiếu mới khi cần.'
                  : 'Khách vãng lai có thể dùng kênh này để nhận hướng dẫn bước đầu trước khi liên hệ thêm.')}
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}

export default CustomerCarePage
