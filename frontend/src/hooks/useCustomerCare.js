import { useEffect, useRef, useState } from 'react'
import {
  closeMySupportTicket,
  createSupportTicket,
  getMySupportTicketDetail,
  listMySupportTickets,
  replyToSupportTicket,
} from '../repositories/supportRepository.js'

function formatMessageTime(timestamp) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function createMessage(sender, content, timestamp = Date.now(), metadata = {}) {
  return {
    content,
    id: metadata.id ?? `${sender}-${timestamp}-${Math.random().toString(16).slice(2, 8)}`,
    metadata,
    sender,
    timeLabel: formatMessageTime(timestamp),
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

function getGuestWelcomeMessage(isCustomer) {
  return createMessage(
    'system',
    isCustomer
      ? 'Xin chào thành viên Nét Việt. Bạn có thể hỏi về đơn hàng, đổi lịch trình, hoàn tiền hoặc các vấn đề thanh toán ngay tại đây.'
      : 'Xin chào. Đây là kênh chăm sóc khách hàng của Nét Việt. Bạn có thể mô tả nhu cầu để hệ thống hỗ trợ bước đầu.',
  )
}

function getTicketStatusLabel(status = '') {
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

function buildTicketIntroMessage(ticket) {
  return createMessage(
    'system',
    `Phiếu ${ticket.ticket_code} đang ở trạng thái "${getTicketStatusLabel(
      ticket.status,
    )}". Bạn có thể tiếp tục trao đổi trực tiếp ngay trong luồng này.`,
    ticket.updated_at ? new Date(ticket.updated_at).getTime() : Date.now(),
    {
      kind: 'ticket-intro',
      ticketId: ticket.id,
    },
  )
}

function mapRepliesToMessages(replies = []) {
  return replies.map((reply) =>
    createMessage(
      reply.sender_type === 'customer' ? 'user' : 'system',
      reply.message,
      reply.created_at ? new Date(reply.created_at).getTime() : Date.now(),
      {
        id: reply.id,
      },
    ),
  )
}

function buildMessagesFromTicket(ticket) {
  return [buildTicketIntroMessage(ticket), ...mapRepliesToMessages(ticket.replies)]
}

function buildTicketSubject(message) {
  const normalizedMessage = String(message ?? '').trim().replace(/\s+/g, ' ')

  if (!normalizedMessage) {
    return 'Yêu cầu hỗ trợ khách hàng'
  }

  if (normalizedMessage.length <= 72) {
    return normalizedMessage
  }

  return `${normalizedMessage.slice(0, 69)}...`
}

export default function useCustomerCare({ isCustomer } = {}) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(Boolean(isCustomer))
  const [messages, setMessages] = useState(() => [getGuestWelcomeMessage(isCustomer)])
  const [recentTickets, setRecentTickets] = useState([])
  const [activeTicket, setActiveTicket] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
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

  useEffect(() => {
    let isActive = true

    async function hydrateCustomerTickets() {
      if (!isCustomer) {
        setLoading(false)
        setMessages([getGuestWelcomeMessage(false)])
        return
      }

      setLoading(true)
      setError('')

      try {
        const listResponse = await listMySupportTickets({
          limit: 5,
          page: 1,
        })
        const tickets = Array.isArray(listResponse.data) ? listResponse.data : []

        if (!isActive) {
          return
        }

        setRecentTickets(tickets)

        if (tickets.length === 0) {
          setActiveTicket(null)
          setMessages([
            createMessage(
              'system',
              'Bạn chưa có phiếu hỗ trợ nào. Hãy gửi nội dung cần hỗ trợ để hệ thống tạo phiếu mới cho bạn.',
            ),
          ])
          return
        }

        const detailResponse = await getMySupportTicketDetail(tickets[0].id)

        if (!isActive) {
          return
        }

        setActiveTicket(detailResponse.data)
        setMessages(buildMessagesFromTicket(detailResponse.data))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setRecentTickets([])
        setActiveTicket(null)
        setMessages([
          createMessage(
            'system',
            'Không thể tải lịch sử hỗ trợ lúc này. Bạn vẫn có thể thử gửi lại yêu cầu sau ít phút nữa.',
          ),
        ])
        setError(loadError?.message ?? 'Không thể tải dữ liệu hỗ trợ lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    hydrateCustomerTickets()

    return () => {
      isActive = false
    }
  }, [isCustomer])

  function queueSystemReply(content) {
    setSending(true)
    timeoutRef.current = setTimeout(() => {
      setMessages((currentMessages) => [...currentMessages, createMessage('system', content)])
      setSending(false)
      timeoutRef.current = null
    }, 700)
  }

  async function refreshTicketState(ticketId) {
    const [listResponse, detailResponse] = await Promise.all([
      listMySupportTickets({
        limit: 5,
        page: 1,
      }),
      getMySupportTicketDetail(ticketId),
    ])

    const tickets = Array.isArray(listResponse.data) ? listResponse.data : []

    setRecentTickets(tickets)
    setActiveTicket(detailResponse.data)
    setMessages(buildMessagesFromTicket(detailResponse.data))
  }

  async function sendCustomerMessage(content) {
    const trimmedContent = content.trim()

    if (!trimmedContent || sending) {
      return
    }

    setSending(true)
    setError('')
    setFeedback('')

    try {
      const isClosedTicket =
        activeTicket?.status === 'closed' || activeTicket?.status === 'spam'
      let ticketId = activeTicket?.id ?? ''

      if (!ticketId || isClosedTicket) {
        const createResponse = await createSupportTicket({
          message: trimmedContent,
          subject: buildTicketSubject(trimmedContent),
        })

        ticketId = createResponse.data.id
        await refreshTicketState(ticketId)
        setFeedback(`Đã tạo phiếu hỗ trợ ${createResponse.data.ticket_code}.`)
      } else {
        await replyToSupportTicket(ticketId, {
          message: trimmedContent,
        })

        await refreshTicketState(ticketId)
        setFeedback('Tin nhắn đã được gửi tới bộ phận hỗ trợ.')
      }

      setDraft('')
    } catch (sendError) {
      setError(sendError?.message ?? 'Không thể gửi yêu cầu hỗ trợ lúc này.')
    } finally {
      setSending(false)
    }
  }

  function sendGuestMessage(content) {
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

  function sendMessage(content) {
    if (isCustomer) {
      return sendCustomerMessage(content)
    }

    return sendGuestMessage(content)
  }

  function handleSubmit(event) {
    event.preventDefault()
    sendMessage(draft)
  }

  function handleTopicSelect(prompt) {
    sendMessage(prompt)
  }

  async function handleSelectTicket(ticketId) {
    if (!ticketId || sending) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await refreshTicketState(ticketId)
    } catch (selectError) {
      setError(selectError?.message ?? 'Không thể tải phiếu hỗ trợ này.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCloseTicket() {
    if (!activeTicket?.id || sending) {
      return
    }

    setSending(true)
    setError('')

    try {
      await closeMySupportTicket(activeTicket.id, {
        reason: 'Khách hàng đã xác nhận yêu cầu được xử lý xong.',
      })
      await refreshTicketState(activeTicket.id)
      setFeedback('Phiếu hỗ trợ hiện tại đã được đóng.')
    } catch (closeError) {
      setError(closeError?.message ?? 'Không thể đóng phiếu hỗ trợ lúc này.')
    } finally {
      setSending(false)
    }
  }

  return {
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
  }
}
