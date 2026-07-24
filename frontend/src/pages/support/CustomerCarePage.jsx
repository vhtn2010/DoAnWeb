import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  uploadSupportReplyFileAsset,
  uploadSupportReplyImageAsset,
} from '../../adapters/api/uploadApiAdapter.js'
import { LocalLoading } from '../../components/loading/Loading.jsx'
import useCustomerCare from '../../hooks/useCustomerCare.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import {
  appendSupportFileMarkdown,
  appendSupportImageMarkdown,
  getSupportImageAlt,
  getSupportMessageFileBlocks,
  getSupportMessageImageBlocks,
  parseSupportInlineSegments,
  parseSupportMessageBlocks,
} from '../../utils/adminSupportMessageFormat.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'
import './customerCarePage.css'

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

const QUICK_EMOJIS = Object.freeze([
  '😀',
  '😊',
  '😍',
  '🥰',
  '😎',
  '🤗',
  '👍',
  '🙏',
  '🎉',
  '❤️',
  '🔥',
  '✈️',
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

function formatConversationDate(value) {
  if (!value) {
    return 'Hôm nay'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'long',
  }).format(new Date(value))
}

function buildConversationItems({ activeTicket, isCustomer, recentTickets }) {
  if (!isCustomer) {
    return []
  }

  return recentTickets.map((ticket, index) => ({
    id: ticket.id,
    code: ticket.ticket_code ? `#${ticket.ticket_code}` : `#${ticket.id}`,
    dateLabel: formatConversationDate(ticket.updated_at || ticket.created_at),
    isActive: activeTicket?.id ? activeTicket.id === ticket.id : index === 0,
    preview: `${formatTicketStatus(ticket.status)} • ${ticket.subject}`,
    title: ticket.subject || 'Yêu cầu hỗ trợ khách hàng',
  }))
}

function ChatIcon({ name }) {
  if (name === 'send') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="m4.75 5.5 14.5 6.5-14.5 6.5 2.25-6.5-2.25-6.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M7 12h5.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'plus') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'file') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M8 3.5h5.8L18.5 8v12a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V5A1.5 1.5 0 0 1 8 3.5Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M13.5 3.8V8H18" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (name === 'attach') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="m8.5 12.4 4.85-4.85a3 3 0 1 1 4.24 4.24l-6.36 6.36a4.5 4.5 0 0 1-6.36-6.36l6.72-6.72"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (name === 'image') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M6.5 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="m7.5 15 3.2-3.2 2.4 2.4 1.7-1.7 2.7 2.5M15.5 9h.01"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (name === 'emoji') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9 10h.01M15 10h.01M8.8 14.2c.8 1 1.9 1.5 3.2 1.5s2.4-.5 3.2-1.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return null
}

function applyWrappedText(value, selectionStart, selectionEnd, marker) {
  const start = Number.isInteger(selectionStart) ? selectionStart : value.length
  const end = Number.isInteger(selectionEnd) ? selectionEnd : value.length
  const selectedText = value.slice(start, end)
  const wrappedText = `${marker}${selectedText}${marker}`

  return {
    cursorEnd: selectedText ? start + marker.length + selectedText.length : start + marker.length,
    cursorStart: start + marker.length,
    nextValue: `${value.slice(0, start)}${wrappedText}${value.slice(end)}`,
  }
}

function renderSupportInlineContent(text = '') {
  const lines = String(text || '').split('\n')

  return lines.map((line, lineIndex) => (
    <span key={`line-${lineIndex}`}>
      {parseSupportInlineSegments(line).map((segment, segmentIndex) => {
        if (segment.type === 'strong') {
          return <strong key={`segment-${lineIndex}-${segmentIndex}`}>{segment.text}</strong>
        }

        if (segment.type === 'em') {
          return <em key={`segment-${lineIndex}-${segmentIndex}`}>{segment.text}</em>
        }

        return <span key={`segment-${lineIndex}-${segmentIndex}`}>{segment.text}</span>
      })}
      {lineIndex < lines.length - 1 ? <br /> : null}
    </span>
  ))
}

function SupportMessageBody({ message }) {
  const blocks = parseSupportMessageBlocks(message)

  return (
    <div className="customer-care-message__body">
      {blocks.map((block, index) => {
        if (block.type === 'image') {
          return (
            <figure className="customer-care-message__image" key={`${block.url}-${index}`}>
              <a href={block.url} target="_blank" rel="noreferrer">
                <img alt={block.alt} loading="lazy" src={block.url} />
              </a>
            </figure>
          )
        }

        if (block.type === 'file') {
          return (
            <a
              className="customer-care-message__file"
              href={block.url}
              key={`${block.url}-${index}`}
              target="_blank"
              rel="noreferrer"
            >
              <ChatIcon name="file" />
              <span>{block.label}</span>
            </a>
          )
        }

        return (
          <p key={`paragraph-${index}`}>
            {renderSupportInlineContent(block.text)}
          </p>
        )
      })}
    </div>
  )
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
    handleStartNewTicket,
    handleSubmit,
    handleTopicSelect,
    loading,
    logRef,
    messages,
    recentTickets,
    sending,
    setDraft,
  } = useCustomerCare({ isCustomer })
  const textareaRef = useRef(null)
  const emojiPanelRef = useRef(null)
  const imageUploadRef = useRef(null)
  const fileUploadRef = useRef(null)
  const [isEmojiOpen, setIsEmojiOpen] = useState(false)
  const [isUploadingAsset, setIsUploadingAsset] = useState(false)
  const [composerFeedback, setComposerFeedback] = useState('')
  const backToProfilePath = buildPublicAuthPath('/profile', isCustomer)
  const conversationItems = buildConversationItems({
    activeTicket,
    isCustomer,
    recentTickets,
  })
  const attachedImages = useMemo(
    () => getSupportMessageImageBlocks(draft),
    [draft],
  )
  const attachedFiles = useMemo(
    () => getSupportMessageFileBlocks(draft),
    [draft],
  )
  const canCloseTicket =
    Boolean(activeTicket?.id) &&
    activeTicket.status !== 'closed' &&
    activeTicket.status !== 'spam'

  useEffect(() => {
    if (!isEmojiOpen) {
      return undefined
    }

    function handleClickOutside(event) {
      if (emojiPanelRef.current?.contains(event.target)) {
        return
      }

      setIsEmojiOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEmojiOpen])

  function focusTextarea(selectionStart, selectionEnd = selectionStart) {
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return
      }

      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd)
    })
  }

  function handleApplyBold() {
    const textarea = textareaRef.current
    const currentValue = draft

    if (!textarea) {
      setDraft(`${currentValue}****`)
      focusTextarea(currentValue.length + 2)
      return
    }

    const selectionStart = textarea.selectionStart ?? currentValue.length
    const selectionEnd = textarea.selectionEnd ?? currentValue.length
    const result = applyWrappedText(currentValue, selectionStart, selectionEnd, '**')

    setDraft(result.nextValue)
    focusTextarea(result.cursorStart, result.cursorEnd)
  }

  function handleInsertEmoji(emoji) {
    const textarea = textareaRef.current
    const currentValue = draft
    const selectionStart = textarea?.selectionStart ?? currentValue.length
    const selectionEnd = textarea?.selectionEnd ?? currentValue.length
    const nextValue = `${currentValue.slice(0, selectionStart)}${emoji}${currentValue.slice(selectionEnd)}`

    setDraft(nextValue)
    setIsEmojiOpen(false)
    focusTextarea(selectionStart + emoji.length)
  }

  function triggerImageUpload() {
    if (sending || loading || isUploadingAsset) {
      return
    }

    imageUploadRef.current?.click()
  }

  function triggerFileUpload() {
    if (sending || loading || isUploadingAsset) {
      return
    }

    fileUploadRef.current?.click()
  }

  async function handleAssetSelection(files, kind) {
    if (!files.length) {
      return
    }

    setIsUploadingAsset(true)
    setComposerFeedback('')

    try {
      let nextDraft = draft

      for (const file of files) {
        if (kind === 'image') {
          const uploadResponse = await uploadSupportReplyImageAsset(file)
          const assetUrl = uploadResponse?.data?.asset_url

          if (!assetUrl) {
            throw new Error('Không thể lấy đường dẫn ảnh sau khi tải lên.')
          }

          nextDraft = appendSupportImageMarkdown(nextDraft, {
            alt: getSupportImageAlt(file.name),
            url: assetUrl,
          })
        } else {
          const uploadResponse = await uploadSupportReplyFileAsset(file)
          const assetUrl = uploadResponse?.data?.asset_url

          if (!assetUrl) {
            throw new Error('Không thể lấy đường dẫn tệp sau khi tải lên.')
          }

          nextDraft = appendSupportFileMarkdown(nextDraft, {
            label: file.name,
            url: assetUrl,
          })
        }
      }

      setDraft(nextDraft)
      setComposerFeedback(
        kind === 'image'
          ? 'Đã chèn ảnh vào nội dung hỗ trợ.'
          : 'Đã chèn tệp đính kèm vào nội dung hỗ trợ.',
      )
      focusTextarea(nextDraft.length)
    } catch (uploadError) {
      setComposerFeedback(
        uploadError?.message || 'Không thể tải tệp đính kèm lúc này.',
      )
    } finally {
      setIsUploadingAsset(false)
    }
  }

  async function handleImageSelection(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    await handleAssetSelection(files, 'image')
  }

  async function handleFileSelection(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    await handleAssetSelection(files, 'file')
  }

  function handleComposerSubmit(event) {
    setComposerFeedback('')
    setIsEmojiOpen(false)
    handleSubmit(event)
  }

  return (
    <div className="customer-care-page customer-care-page--figma">
      <div className="customer-care-layout">
        <aside className="customer-care-inbox" aria-label="Hộp thư hỗ trợ">
          <header className="customer-care-inbox__header">
            <h1>Hộp thư đến</h1>
          </header>

          <div className="customer-care-inbox__list">
            {conversationItems.length > 0 ? (
              conversationItems.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`customer-care-conversation${
                    conversation.isActive ? ' customer-care-conversation--active' : ''
                  }`}
                  type="button"
                  disabled={sending || loading}
                  onClick={() => handleSelectTicket(conversation.id)}
                >
                  <span className="customer-care-conversation__meta">
                    <span>{conversation.code}</span>
                    <time>{conversation.dateLabel}</time>
                  </span>
                  <strong>{conversation.title}</strong>
                  <span className="customer-care-conversation__preview">
                    {conversation.preview}
                  </span>
                </button>
              ))
            ) : (
              <div className="customer-care-inbox__empty">
                {isCustomer
                  ? 'Chưa có phiếu hỗ trợ nào. Bạn có thể tạo phiếu mới hoặc dùng câu hỏi nhanh ở bên dưới.'
                  : 'Khu vực này chỉ dành cho tài khoản Customer đã đăng nhập.'}
              </div>
            )}
          </div>

          {isCustomer ? (
            <div className="customer-care-topic-strip" aria-label="Câu hỏi nhanh">
              {SUPPORT_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  className="customer-care-topic"
                  type="button"
                  onClick={() => handleTopicSelect(topic.prompt)}
                  disabled={sending || loading}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          ) : null}

          {isCustomer ? (
            <div className="customer-care-inbox__footer">
              <button
                className="customer-care-new-chat"
                type="button"
                onClick={() => handleStartNewTicket('')}
              >
                <span>Tạo phiếu hỗ trợ mới</span>
                <ChatIcon name="plus" />
              </button>
            </div>
          ) : null}
        </aside>

        <section className="customer-care-chat" aria-label="Khung trò chuyện hỗ trợ">
          <header className="customer-care-chat__header">
            <div className="customer-care-chat__brand">
              <span className="customer-care-chat__logo" aria-hidden="true">
                <img src="/assets/template/brand/logo.png" alt="" />
              </span>
              <div>
                <h2>Hỗ trợ Nét Việt Travel</h2>
                <span className="customer-care-chat__presence">
                  <span aria-hidden="true" />
                  Đang trực tuyến
                </span>
              </div>
            </div>

            <div className="customer-care-chat__actions">
              {isCustomer ? (
                <Link className="customer-care-chat__link" to={backToProfilePath}>
                  Tài khoản
                </Link>
              ) : (
                <Link className="customer-care-chat__link" to="/login">
                  Đăng nhập
                </Link>
              )}
              <a className="customer-care-chat__link" href="tel:1990888999">
                Hotline
              </a>
              {canCloseTicket ? (
                <button
                  className="customer-care-chat__link"
                  type="button"
                  onClick={handleCloseTicket}
                  disabled={sending}
                >
                  Đóng phiếu
                </button>
              ) : null}
            </div>
          </header>

          <div
            ref={logRef}
            aria-live="polite"
            className="customer-care-chat__log"
            role="log"
          >
            {isCustomer ? (
              <>
                <div className="customer-care-chat__date">Hôm nay</div>

                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`customer-care-message customer-care-message--${message.sender}`}
                  >
                    <SupportMessageBody message={message.content} />
                    <span className="customer-care-message__time">{message.timeLabel}</span>
                  </article>
                ))}

                {sending ? (
                  <article className="customer-care-message customer-care-message--system customer-care-message--typing">
                    <LocalLoading minHeight="56px" size="sm" />
                  </article>
                ) : null}
              </>
            ) : (
              <div className="customer-care-chat__locked">
                <h3>Đăng nhập để dùng hỗ trợ khách hàng</h3>
                <p>
                  Tin nhắn ở đây được đồng bộ trực tiếp với phiếu hỗ trợ của Customer
                  và phản hồi từ admin.
                </p>
                <div className="customer-care-chat__locked-actions">
                  <Link className="customer-care-chat__link" to="/login">
                    Đăng nhập tài khoản
                  </Link>
                  <a className="customer-care-chat__link" href="tel:1990888999">
                    Gọi hotline
                  </a>
                </div>
              </div>
            )}
          </div>

          {isCustomer ? (
            <form className="customer-care-composer" onSubmit={handleComposerSubmit}>
              <label className="customer-care-composer__label" htmlFor="customer-care-input">
                Nhập tin nhắn của bạn
              </label>

              <div className="customer-care-composer__box">
                <input
                  ref={imageUploadRef}
                  accept="image/*"
                  className="customer-care-composer__input-hidden"
                  multiple
                  type="file"
                  onChange={handleImageSelection}
                />
                <input
                  ref={fileUploadRef}
                  className="customer-care-composer__input-hidden"
                  multiple
                  type="file"
                  onChange={handleFileSelection}
                />
                <div className="customer-care-composer__field">
                  <textarea
                    ref={textareaRef}
                    id="customer-care-input"
                    className="customer-care-composer__textarea"
                    placeholder="Nhập tin nhắn của bạn ở đây..."
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={3}
                    disabled={sending || isUploadingAsset}
                  />
                </div>

                {attachedImages.length > 0 || attachedFiles.length > 0 ? (
                  <div className="customer-care-composer__attachments" aria-label="Tệp đã đính kèm">
                    {attachedImages.map((image, index) => (
                      <figure className="customer-care-composer__attachment-image" key={`${image.url}-${index}`}>
                        <img alt={image.alt} loading="lazy" src={image.url} />
                        <figcaption>{image.alt}</figcaption>
                      </figure>
                    ))}
                    {attachedFiles.map((file, index) => (
                      <a
                        className="customer-care-composer__attachment-file"
                        href={file.url}
                        key={`${file.url}-${index}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ChatIcon name="file" />
                        <span>{file.label}</span>
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="customer-care-composer__actions">
                  <div aria-label="Định dạng tin nhắn" className="customer-care-mini-composer__tools">
                    <button
                      type="button"
                      aria-label="In đậm chữ"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleApplyBold}
                    >
                      <span aria-hidden="true">B</span>
                    </button>
                    <div className="customer-care-mini-composer__emoji-wrap" ref={emojiPanelRef}>
                      <button
                        type="button"
                        aria-expanded={isEmojiOpen}
                        aria-label="Chèn biểu tượng cảm xúc"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIsEmojiOpen((currentValue) => !currentValue)}
                      >
                        <ChatIcon name="emoji" />
                      </button>
                      {isEmojiOpen ? (
                        <div className="customer-care-mini-composer__emoji-panel">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleInsertEmoji(emoji)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span aria-hidden="true" className="customer-care-mini-composer__divider" />
                    <button
                      type="button"
                      aria-label="Đính kèm tệp"
                      disabled={sending || loading || isUploadingAsset}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={triggerFileUpload}
                    >
                      <ChatIcon name="attach" />
                    </button>
                    <button
                      type="button"
                      aria-label="Đính kèm hình ảnh"
                      disabled={sending || loading || isUploadingAsset}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={triggerImageUpload}
                    >
                      <ChatIcon name="image" />
                    </button>
                  </div>

                  <button
                    className="customer-care-composer__submit"
                    type="submit"
                    disabled={sending || loading || isUploadingAsset || !draft.trim()}
                  >
                    <ChatIcon name="send" />
                    <span>Gửi</span>
                  </button>
                </div>
              </div>

              <p className="customer-care-composer__hint" role="status">
                {error || feedback || composerFeedback ||
                  'Tin nhắn sẽ được đồng bộ vào phiếu hỗ trợ hiện tại hoặc tạo phiếu mới khi cần.'}
              </p>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default CustomerCarePage
