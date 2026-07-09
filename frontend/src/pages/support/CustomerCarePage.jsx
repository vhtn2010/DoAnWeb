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
    description: 'Hệ thống phản hồi tức thì cho các câu hỏi phổ biến trước khi chuyển tiếp nhân viên.',
  },
  {
    id: 'handoff',
    title: 'Escalation rõ ràng',
    description: 'Những yêu cầu cần xử lý sâu hơn sẽ được ghi nhận để bộ phận vận hành tiếp tục hỗ trợ.',
  },
  {
    id: 'history',
    title: 'Theo ngữ cảnh chuyến đi',
    description: 'Bạn có thể hỏi về đơn hàng, lịch trình, thanh toán hoặc thay đổi dịch vụ ngay trong cùng một luồng chat.',
  },
])

function CustomerCarePage() {
  const { isCustomer } = usePublicSession()
  const {
    draft,
    handleSubmit,
    handleTopicSelect,
    logRef,
    messages,
    sending,
    setDraft,
  } = useCustomerCare({ isCustomer })
  const backToProfilePath = buildPublicAuthPath('/profile', isCustomer)
  return (
    <div className="customer-care-page">
      <section className="customer-care-hero">
        <div className="customer-care-hero__copy">
          <p className="customer-care-hero__eyebrow">Chăm sóc khách hàng</p>
          <h1>Trò chuyện trực tiếp với hệ thống hỗ trợ</h1>
          <p>
            Gửi câu hỏi về đơn hàng, thay đổi lịch trình, hoàn tiền hoặc voucher. Hệ thống sẽ
            phản hồi ngay với các hướng dẫn cơ bản trước khi cần chuyển tiếp thêm.
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
          <strong>Phản hồi tự động trong vài giây</strong>
          <p>
            Đây là kênh hỗ trợ mock theo hướng API-ready. Nội dung chat hiện được mô phỏng để
            người dùng có thể thao tác và hình dung luồng chăm sóc khách hàng.
          </p>
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
                  disabled={sending}
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.prompt}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="customer-care-panel customer-care-panel--highlights">
            <header className="customer-care-panel__header">
              <p className="customer-care-panel__eyebrow">Điểm nổi bật</p>
              <h2>Kênh hỗ trợ được thiết kế cho hành trình</h2>
            </header>

            <div className="customer-care-highlight-list">
              {SUPPORT_HIGHLIGHTS.map((item) => (
                <article className="customer-care-highlight" key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
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
              {sending ? 'Hệ thống đang trả lời...' : 'Sẵn sàng hỗ trợ'}
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
                <p>Đang phân tích yêu cầu và chuẩn bị phản hồi...</p>
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
                disabled={sending || !draft.trim()}
              >
                {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
              </button>
            </div>

            <p className="customer-care-composer__hint" role="status">
              {sending
                ? 'Yêu cầu đang được hệ thống xử lý.'
                : 'Mô hình hiện tại là mock chat để người dùng trải nghiệm luồng hỗ trợ.'}
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}

export default CustomerCarePage



