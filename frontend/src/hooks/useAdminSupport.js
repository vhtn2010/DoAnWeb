import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ADMIN_SUPPORT_CLOSE_REASON,
  ADMIN_SUPPORT_PAGE_SIZE,
  ADMIN_SUPPORT_REOPEN_REASON,
  ADMIN_SUPPORT_SPAM_REASON,
  ADMIN_SUPPORT_STATUSES,
} from '../constants/adminSupport.js'
import {
  createAdminSupportPageNumbers,
  mapAdminSupportTicket,
  mapAdminSupportTicketDetail,
  matchesAdminSupportSearch,
} from '../mappers/adminSupportMappers.js'
import {
  closeAdminSupportTicket,
  getAdminSupportTicketDetail,
  listAdminSupportTickets,
  markAdminSupportTicketAsSpam,
  reopenAdminSupportTicket,
  replyToAdminSupportTicket,
} from '../repositories/adminSupportRepository.js'

function createInitialPagination() {
  return {
    has_next: false,
    limit: ADMIN_SUPPORT_PAGE_SIZE,
    page: 1,
    total: 0,
    total_pages: 0,
  }
}

function createFeedback(tone = 'info', message = '') {
  return { message, tone }
}

function getResponseMessage(response, fallback) {
  return response?.message || fallback
}

export default function useAdminSupport() {
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilterState] = useState(ADMIN_SUPPORT_STATUSES.all)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState(() => createInitialPagination())
  const [replyMessage, setReplyMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedback('info', ''))
  const [reloadKey, setReloadKey] = useState(0)
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const selectedIdRef = useRef('')

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  async function loadTicketDetail(ticketId) {
    if (!ticketId) {
      setSelectedTicket(null)
      return null
    }

    setDetailLoading(true)
    setError('')

    try {
      const response = await getAdminSupportTicketDetail(ticketId)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể tải chi tiết yêu cầu hỗ trợ.')
      }

      const nextTicket = mapAdminSupportTicketDetail(response.data)

      setSelectedTicket(nextTicket)
      setSelectedId(nextTicket.id)
      selectedIdRef.current = nextTicket.id

      return nextTicket
    } catch (loadError) {
      const nextMessage = loadError?.message ?? 'Không thể tải chi tiết yêu cầu hỗ trợ lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadTickets() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminSupportTickets({
          limit: ADMIN_SUPPORT_PAGE_SIZE,
          page: currentPage,
          status: statusFilter,
        })

        if (!isActive) {
          return
        }

        if (!response.success) {
          throw new Error(response.message || 'Không thể tải danh sách yêu cầu hỗ trợ.')
        }

        const nextTickets = Array.isArray(response.data)
          ? response.data.map(mapAdminSupportTicket)
          : []
        const currentSelectedId = selectedIdRef.current
        const nextSelectedId = nextTickets.some((ticket) => ticket.id === currentSelectedId)
          ? currentSelectedId
          : nextTickets[0]?.id ?? ''
        const nextSelectedTicket =
          nextTickets.find((ticket) => ticket.id === nextSelectedId) ?? null

        setTickets(nextTickets)
        setPagination(response.meta ?? createInitialPagination())
        setSelectedId(nextSelectedId)
        selectedIdRef.current = nextSelectedId
        setSelectedTicket(nextSelectedTicket)

        if (nextSelectedId) {
          setDetailReloadKey((currentKey) => currentKey + 1)
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        const nextMessage = loadError?.message ?? 'Không thể tải yêu cầu hỗ trợ lúc này.'

        setTickets([])
        setSelectedId('')
        selectedIdRef.current = ''
        setSelectedTicket(null)
        setPagination(createInitialPagination())
        setError(nextMessage)
        setFeedback(createFeedback('error', nextMessage))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadTickets()

    return () => {
      isActive = false
    }
  }, [currentPage, reloadKey, statusFilter])

  useEffect(() => {
    if (!selectedId) {
      return
    }

    loadTicketDetail(selectedId)
  }, [detailReloadKey, selectedId])

  const visibleTickets = useMemo(
    () => tickets.filter((ticket) => matchesAdminSupportSearch(ticket, searchQuery)),
    [searchQuery, tickets],
  )
  const pageNumbers = useMemo(
    () => createAdminSupportPageNumbers(pagination.total_pages),
    [pagination.total_pages],
  )

  function reloadTickets() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  function resetFilters() {
    setSearchQuery('')
    setStatusFilterState(ADMIN_SUPPORT_STATUSES.all)
    setCurrentPage(1)
    setFeedback(createFeedback('info', 'Đã đặt lại bộ lọc hỗ trợ khách hàng.'))
  }

  function setStatusFilter(value) {
    setStatusFilterState(value)
    setCurrentPage(1)
    setSelectedTicket(null)
  }

  function selectTicket(ticket) {
    if (!ticket) {
      return
    }

    setSelectedId(ticket.id)
    selectedIdRef.current = ticket.id
    setSelectedTicket(ticket)
    setDetailReloadKey((currentKey) => currentKey + 1)
  }

  async function sendReply(event) {
    event?.preventDefault?.()

    if (!selectedTicket) {
      setFeedback(createFeedback('error', 'Chọn một yêu cầu hỗ trợ trước khi phản hồi.'))
      return
    }

    if (!selectedTicket.canReply) {
      setFeedback(createFeedback('error', 'Ticket này đã đóng hoặc bị đánh dấu spam.'))
      return
    }

    const message = replyMessage.trim()

    if (!message) {
      setFeedback(createFeedback('error', 'Nhập nội dung phản hồi trước khi gửi.'))
      return
    }

    setActionLoading(true)
    setError('')

    try {
      const response = await replyToAdminSupportTicket(selectedTicket.id, {
        isInternalNote,
        message,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể gửi phản hồi hỗ trợ.')
      }

      setReplyMessage('')
      setIsInternalNote(false)
      setFeedback(
        createFeedback(
          'success',
          getResponseMessage(response, 'Đã gửi phản hồi cho khách hàng.'),
        ),
      )
      await loadTicketDetail(selectedTicket.id)
      reloadTickets()
    } catch (replyError) {
      const nextMessage = replyError?.message ?? 'Không thể gửi phản hồi lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  async function runTicketAction(action) {
    if (!selectedTicket) {
      return
    }

    setActionLoading(true)
    setError('')

    try {
      let response

      if (action === 'reopen') {
        response = await reopenAdminSupportTicket(selectedTicket.id, {
          reason: ADMIN_SUPPORT_REOPEN_REASON,
        })
      } else if (action === 'spam') {
        response = await markAdminSupportTicketAsSpam(selectedTicket.id, {
          reason: ADMIN_SUPPORT_SPAM_REASON,
        })
      } else {
        response = await closeAdminSupportTicket(selectedTicket.id, {
          reason: ADMIN_SUPPORT_CLOSE_REASON,
        })
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể cập nhật ticket hỗ trợ.')
      }

      setFeedback(
        createFeedback(
          'success',
          getResponseMessage(response, 'Đã cập nhật trạng thái ticket hỗ trợ.'),
        ),
      )
      await loadTicketDetail(selectedTicket.id)
      reloadTickets()
    } catch (actionError) {
      const nextMessage = actionError?.message ?? 'Không thể cập nhật ticket hỗ trợ lúc này.'

      setError(nextMessage)
      setFeedback(createFeedback('error', nextMessage))
    } finally {
      setActionLoading(false)
    }
  }

  return {
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
    setFeedback,
    setIsInternalNote,
    setReplyMessage,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    tickets: visibleTickets,
    totalLoadedTickets: tickets.length,
  }
}
