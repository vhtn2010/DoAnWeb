import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  uploadSupportReplyFileAsset,
  uploadSupportReplyImageAsset,
} from '../../adapters/api/uploadApiAdapter.js'
import { LocalLoading } from '../loading/Loading.jsx'
import useCustomerCare from '../../hooks/useCustomerCare.js'
import {
  appendSupportFileMarkdown,
  appendSupportImageMarkdown,
  getSupportImageAlt,
  getSupportMessageFileBlocks,
  getSupportMessageImageBlocks,
  parseSupportInlineSegments,
  parseSupportMessageBlocks,
} from '../../utils/adminSupportMessageFormat.js'
import { useCustomerSurveyPopup } from '../customerSurvey/customerSurveyContext.js'
import './customerCareMiniWidget.css'

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

function MiniChatIcon({ name }) {
  if (name === 'lightning') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M13.2 2.8 5.8 13h5.1l-1.1 8.2 8.4-11.3h-5.4l.4-7.1Z"
          fill="currentColor"
        />
      </svg>
    )
  }

  if (name === 'headset') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path
          d="M5.5 12a6.5 6.5 0 1 1 13 0v4a2 2 0 0 1-2 2h-1.5v-5H19"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5 13h1.5v5H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (name === 'expand') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
        <path
          d="M7.25 3.5H4.5a1 1 0 0 0-1 1v2.75M12.75 3.5h2.75a1 1 0 0 1 1 1v2.75M7.25 16.5H4.5a1 1 0 0 1-1-1v-2.75M12.75 16.5h2.75a1 1 0 0 0 1-1v-2.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
        <path
          d="m12.5 7.5 4-4M7.5 12.5l-4 4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    )
  }

  if (name === 'close') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
        <path d="M5 10h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    )
  }

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

  if (name === 'seen') {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
        <path
          d="m2.75 8.1 2.45 2.45 5.55-5.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="m6.25 9.95 1.05 1.05 6-6.05"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    )
  }

  return null
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
    <div className="customer-care-mini-message__body">
      {blocks.map((block, index) => {
        if (block.type === 'image') {
          return (
            <figure className="customer-care-mini-message__image" key={`${block.url}-${index}`}>
              <a href={block.url} target="_blank" rel="noreferrer">
                <img alt={block.alt} loading="lazy" src={block.url} />
              </a>
            </figure>
          )
        }

        if (block.type === 'file') {
          return (
            <a
              className="customer-care-mini-message__file"
              href={block.url}
              key={`${block.url}-${index}`}
              target="_blank"
              rel="noreferrer"
            >
              <MiniChatIcon name="file" />
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

function CustomerCareMiniPanel({ isCustomer, onExpand, onMinimize }) {
  const {
    draft,
    error,
    feedback,
    handleSubmit,
    loading,
    logRef,
    messages,
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
  const attachedImages = useMemo(
    () => getSupportMessageImageBlocks(draft),
    [draft],
  )
  const attachedFiles = useMemo(
    () => getSupportMessageFileBlocks(draft),
    [draft],
  )

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
    <section
      aria-label="Hộp chat chăm sóc khách hàng"
      className="customer-care-mini"
    >
      <header className="customer-care-mini__header">
        <div className="customer-care-mini__brand">
          <span className="customer-care-mini__logo" aria-hidden="true">
            <img src="/assets/template/brand/logo.png" alt="" />
          </span>
          <div>
            <h2>Hỗ trợ Nét Việt Travel</h2>
            <span className="customer-care-mini__status">
              <span aria-hidden="true" />
              Đang trực tuyến
            </span>
          </div>
        </div>

        <div className="customer-care-mini__window-actions">
          <button type="button" aria-label="Thu nhỏ hộp chat" onClick={onMinimize}>
            <MiniChatIcon name="close" />
          </button>
          <Link
            to="/customer-care"
            aria-label="Mở trang Chăm sóc khách hàng đầy đủ"
            onClick={onExpand}
          >
            <MiniChatIcon name="expand" />
          </Link>
        </div>
      </header>

      <div
        ref={logRef}
        aria-live="polite"
        className="customer-care-mini__messages"
        role="log"
      >
        {messages.map((message) => (
          <article
            className={`customer-care-mini-message customer-care-mini-message--${message.sender}`}
            key={message.id}
          >
            <SupportMessageBody message={message.content} />
            <span className="customer-care-mini-message__meta">
              {message.timeLabel}
              {message.sender === 'user' ? <MiniChatIcon name="seen" /> : null}
            </span>
          </article>
        ))}

        {sending ? (
          <article className="customer-care-mini-message customer-care-mini-message--system customer-care-mini-message--typing">
            <LocalLoading minHeight="56px" size="sm" />
          </article>
        ) : null}
      </div>

      <form className="customer-care-mini-composer" onSubmit={handleComposerSubmit}>
        <label htmlFor="customer-care-mini-input">Nhập nội dung</label>
        <div className="customer-care-mini-composer__box">
          <input
            ref={imageUploadRef}
            accept="image/*"
            className="customer-care-mini-composer__input-hidden"
            multiple
            type="file"
            onChange={handleImageSelection}
          />
          <input
            ref={fileUploadRef}
            className="customer-care-mini-composer__input-hidden"
            multiple
            type="file"
            onChange={handleFileSelection}
          />
          <textarea
            ref={textareaRef}
            id="customer-care-mini-input"
            placeholder="Nhập nội dung..."
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={sending || isUploadingAsset}
          />

          {attachedImages.length > 0 || attachedFiles.length > 0 ? (
            <div className="customer-care-mini-composer__attachments" aria-label="Tệp đã đính kèm">
              {attachedImages.map((image, index) => (
                <figure className="customer-care-mini-composer__attachment-image" key={`${image.url}-${index}`}>
                  <img alt={image.alt} loading="lazy" src={image.url} />
                  <figcaption>{image.alt}</figcaption>
                </figure>
              ))}
              {attachedFiles.map((file, index) => (
                <a
                  className="customer-care-mini-composer__attachment-file"
                  href={file.url}
                  key={`${file.url}-${index}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MiniChatIcon name="file" />
                  <span>{file.label}</span>
                </a>
              ))}
            </div>
          ) : null}

          <div className="customer-care-mini-composer__actions">
            <div
              aria-label="Định dạng tin nhắn"
              className="customer-care-mini-composer__tools"
            >
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
                  <MiniChatIcon name="emoji" />
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
              <span
                aria-hidden="true"
                className="customer-care-mini-composer__divider"
              />
              <button
                type="button"
                aria-label="Đính kèm tệp"
                disabled={sending || loading || isUploadingAsset}
                onMouseDown={(event) => event.preventDefault()}
                onClick={triggerFileUpload}
              >
                <MiniChatIcon name="attach" />
              </button>
              <button
                type="button"
                aria-label="Đính kèm hình ảnh"
                disabled={sending || loading || isUploadingAsset}
                onMouseDown={(event) => event.preventDefault()}
                onClick={triggerImageUpload}
              >
                <MiniChatIcon name="image" />
              </button>
            </div>

            <button
              className="customer-care-mini-composer__submit"
              type="submit"
              disabled={sending || loading || isUploadingAsset || !draft.trim()}
            >
              <MiniChatIcon name="send" />
              <span>Gửi</span>
            </button>
          </div>
        </div>
        <p className="customer-care-mini-composer__hint" role="status">
          {error || feedback || composerFeedback || 'Tin nhắn sẽ được lưu vào phiếu hỗ trợ của bạn.'}
        </p>
      </form>
    </section>
  )
}

function CustomerCareMiniWidget({ isCustomer = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const customerSurvey = useCustomerSurveyPopup()
  const shouldShowSurveyButton =
    customerSurvey.isCustomer &&
    !customerSurvey.isStatusLoading &&
    !customerSurvey.completed

  if (!isCustomer) {
    return null
  }

  return (
    <div className="customer-care-mini-widget">
      {isOpen ? (
        <CustomerCareMiniPanel
          isCustomer={isCustomer}
          onExpand={() => setIsOpen(false)}
          onMinimize={() => setIsOpen(false)}
        />
      ) : null}

      {shouldShowSurveyButton ? (
        <button
          className="customer-care-mini-fab customer-care-mini-fab--survey"
          type="button"
          aria-label="Mở khảo sát nhận voucher"
          onClick={customerSurvey.openSurvey}
        >
          <MiniChatIcon name="lightning" />
        </button>
      ) : null}

      <button
        className="customer-care-mini-fab"
        type="button"
        aria-expanded={isOpen}
        aria-controls="customer-care-mini-input"
        aria-label={isOpen ? 'Ẩn hộp chat hỗ trợ' : 'Mở hộp chat hỗ trợ'}
        onClick={() => setIsOpen((currentState) => !currentState)}
      >
        <MiniChatIcon name="headset" />
      </button>
    </div>
  )
}

export default CustomerCareMiniWidget
