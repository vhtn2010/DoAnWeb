import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

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

function formatMessageTime(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function buildSystemMessage(content) {
  return {
    id: `system-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sender: 'system',
    content,
    timeLabel: formatMessageTime(Date.now()),
  }
}

function buildUserMessage(content) {
  return {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sender: 'user',
    content,
    timeLabel: formatMessageTime(Date.now()),
  }
}

function buildSystemReply(inputValue) {
  const normalizedInput = inputValue.toLowerCase()

  if (
    normalizedInput.includes('hoàn tiền') ||
    normalizedInput.includes('hủy') ||
    normalizedInput.includes('refund')
  ) {
    return 'Nếu bạn cần hủy hoặc hoàn tiền, hãy gửi mã đơn hàng và dịch vụ liên quan. Hệ thống sẽ ưu tiên kiểm tra điều kiện hoàn hủy và hướng dẫn bước tiếp theo.'
  }

  if (
    normalizedInput.includes('đổi') ||
    normalizedInput.includes('lịch trình') ||
    normalizedInput.includes('reschedule')
  ) {
    return 'Với yêu cầu đổi lịch trình, bạn có thể cung cấp mã đơn và ngày mong muốn. Một số dịch vụ sẽ phụ thuộc vào điều kiện vé, phòng hoặc tour đã đặt.'
  }

  if (
    normalizedInput.includes('voucher') ||
    normalizedInput.includes('ưu đãi') ||
    normalizedInput.includes('mã giảm')
  ) {
    return 'Bạn có thể gửi mã voucher hoặc chụp màn hình ưu đãi đang dùng. Hệ thống sẽ kiểm tra điều kiện áp dụng, thời hạn và phạm vi dịch vụ hỗ trợ.'
  }

  if (
    normalizedInput.includes('thanh toán') ||
    normalizedInput.includes('đơn hàng') ||
    normalizedInput.includes('booking') ||
    normalizedInput.includes('mã đơn')
  ) {
    return 'Hãy gửi mã đơn hàng hoặc email đặt dịch vụ để hệ thống hỗ trợ tra cứu. Nếu cần, bạn cũng có thể mô tả nhanh tình trạng hiện tại như chờ xác nhận, đã thanh toán hoặc cần xuất hóa đơn.'
  }

  return 'Mình đã ghi nhận yêu cầu của bạn. Bạn hãy cung cấp thêm mã đơn, loại dịch vụ hoặc mô tả cụ thể hơn để hệ thống hỗ trợ nhanh và đúng luồng xử lý.'
}

function CustomerCarePage() {
  const [searchParams] = useSearchParams()
  const isCustomer = searchParams.get('auth') === 'customer'
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState(() => [
    buildSystemMessage(
      isCustomer
        ? 'Xin chào thành viên Nét Việt. Bạn có thể hỏi về đơn hàng, đổi lịch trình, hoàn tiền hoặc các vấn đề thanh toán ngay tại đây.'
        : 'Xin chào. Đây là kênh chăm sóc khách hàng tự động của Nét Việt. Bạn có thể mô tả nhu cầu để hệ thống hỗ trợ bước đầu.',
    ),
  ])
  const timeoutRef = useRef(null)
  const logRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages, sending])

  function queueSystemReply(content) {
    setSending(true)
    timeoutRef.current = setTimeout(() => {
      setMessages((currentMessages) => [...currentMessages, buildSystemMessage(content)])
      setSending(false)
      timeoutRef.current = null
    }, 700)
  }

  function sendMessage(content) {
    const trimmedContent = content.trim()

    if (!trimmedContent || sending) {
      return
    }

    setMessages((currentMessages) => [...currentMessages, buildUserMessage(trimmedContent)])
    setDraft('')
    queueSystemReply(buildSystemReply(trimmedContent))
  }

  function handleSubmit(event) {
    event.preventDefault()
    sendMessage(draft)
  }

  function handleTopicSelect(prompt) {
    sendMessage(prompt)
  }

  const backToProfilePath = isCustomer ? '/profile?auth=customer' : '/profile'

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
