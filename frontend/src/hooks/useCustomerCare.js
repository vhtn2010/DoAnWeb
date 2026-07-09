import { useEffect, useRef, useState } from 'react'

function formatMessageTime(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function createMessage(sender, content) {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sender,
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
    return 'Bạn có thể gửi mã voucher hoặc ảnh chụp ưu đãi đang dùng. Hệ thống sẽ kiểm tra điều kiện áp dụng, thời hạn và phạm vi dịch vụ hỗ trợ.'
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

export default function useCustomerCare({ isCustomer } = {}) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState(() => [
    createMessage(
      'system',
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
      setMessages((currentMessages) => [...currentMessages, createMessage('system', content)])
      setSending(false)
      timeoutRef.current = null
    }, 700)
  }

  function sendMessage(content) {
    const trimmedContent = content.trim()

    if (!trimmedContent || sending) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', trimmedContent),
    ])
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

  return {
    draft,
    handleSubmit,
    handleTopicSelect,
    logRef,
    messages,
    sending,
    setDraft,
  }
}
