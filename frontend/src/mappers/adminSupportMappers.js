import {
  ADMIN_SUPPORT_PRIORITY_META,
  ADMIN_SUPPORT_PRIORITIES,
  ADMIN_SUPPORT_STATUS_META,
  ADMIN_SUPPORT_STATUSES,
} from '../constants/adminSupport.js'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const relativeTimeFormatter = new Intl.RelativeTimeFormat('vi-VN', {
  numeric: 'auto',
})

function getDisplayValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? ''
}

function normalizeDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function formatRelativeDate(value) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật'
  }

  const diffMs = date.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (absMs < hourMs) {
    return relativeTimeFormatter.format(Math.round(diffMs / minuteMs), 'minute')
  }

  if (absMs < dayMs) {
    return relativeTimeFormatter.format(Math.round(diffMs / hourMs), 'hour')
  }

  if (absMs < 7 * dayMs) {
    return relativeTimeFormatter.format(Math.round(diffMs / dayMs), 'day')
  }

  return dateTimeFormatter.format(date)
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function createInitials(name) {
  const words = String(name || 'NV')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'NV'
}

export function getAdminSupportStatusMeta(status) {
  return ADMIN_SUPPORT_STATUS_META[status] ?? {
    label: status || 'Chưa xác định',
    tone: 'neutral',
  }
}

export function getAdminSupportPriorityMeta(priority) {
  return ADMIN_SUPPORT_PRIORITY_META[priority] ?? {
    label: priority || ADMIN_SUPPORT_PRIORITIES.normal,
    tone: 'neutral',
  }
}

export function mapAdminSupportReply(reply = {}) {
  const senderType = reply.sender?.type || reply.sender_type || 'system'
  const fallbackName = senderType === 'customer'
    ? 'Khách hàng'
    : senderType === 'system'
      ? 'Hệ thống'
      : 'Net Viet Travel'
  const senderName = reply.sender?.full_name || fallbackName

  return {
    createdAt: normalizeDate(reply.created_at),
    createdLabel: formatRelativeDate(reply.created_at),
    id: reply.id || `${senderType}-${reply.created_at || Date.now()}`,
    initials: createInitials(senderName),
    isCustomer: senderType === 'customer',
    isInternalNote: Boolean(reply.is_internal_note),
    isStaff: senderType !== 'customer' && senderType !== 'system',
    message: reply.message || '',
    senderName,
    senderType,
  }
}

export function mapAdminSupportTicket(ticket = {}) {
  const customer = ticket.customer ?? {}
  const customerName = getDisplayValue(
    customer.full_name,
    ticket.customer_name,
    customer.email,
    ticket.customer_email,
    'Khách chưa có tên',
  )
  const customerEmail = getDisplayValue(customer.email, ticket.customer_email)
  const customerPhone = getDisplayValue(customer.phone, ticket.customer_phone)
  const bookingCode = ticket.booking?.booking_code || ''
  const serviceName = ticket.service?.title || ''
  const ticketCode = ticket.ticket_code || ticket.id || ''

  return {
    assignedTo: ticket.assigned_to ?? null,
    assignedToName: ticket.assigned_to?.full_name || '',
    bookingCode,
    bookingStatus: ticket.booking?.status || '',
    canClose: ![
      ADMIN_SUPPORT_STATUSES.closed,
      ADMIN_SUPPORT_STATUSES.spam,
    ].includes(ticket.status),
    canMarkSpam: ticket.status !== ADMIN_SUPPORT_STATUSES.spam,
    canReopen: [
      ADMIN_SUPPORT_STATUSES.closed,
      ADMIN_SUPPORT_STATUSES.resolved,
    ].includes(ticket.status),
    canReply: ![
      ADMIN_SUPPORT_STATUSES.closed,
      ADMIN_SUPPORT_STATUSES.spam,
    ].includes(ticket.status),
    closedAt: normalizeDate(ticket.closed_at),
    createdAt: normalizeDate(ticket.created_at),
    createdLabel: formatRelativeDate(ticket.created_at),
    customerEmail,
    customerId: customer.id || ticket.user_id || '',
    customerInitials: createInitials(customerName),
    customerName,
    customerPhone,
    customerTier: customer.id ? 'Khách hàng có tài khoản' : 'Khách vãng lai',
    displayCode: ticketCode,
    id: ticket.id,
    priority: ticket.priority || ADMIN_SUPPORT_PRIORITIES.normal,
    raw: ticket,
    serviceName,
    status: ticket.status || ADMIN_SUPPORT_STATUSES.open,
    subject: ticket.subject || 'Yêu cầu hỗ trợ',
    ticketCode,
    updatedAt: normalizeDate(ticket.updated_at),
    updatedLabel: formatRelativeDate(ticket.updated_at || ticket.created_at),
  }
}

export function mapAdminSupportTicketDetail(ticket = {}) {
  return {
    ...mapAdminSupportTicket(ticket),
    replies: Array.isArray(ticket.replies)
      ? ticket.replies.map(mapAdminSupportReply)
      : [],
  }
}

export function matchesAdminSupportSearch(ticket, query) {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return true
  }

  return normalizeSearchText(
    [
      ticket.displayCode,
      ticket.ticketCode,
      ticket.customerName,
      ticket.customerEmail,
      ticket.customerPhone,
      ticket.subject,
      ticket.bookingCode,
      ticket.serviceName,
    ].join(' '),
  ).includes(normalizedQuery)
}

export function createAdminSupportPageNumbers(totalPages = 1) {
  return Array.from({ length: Math.max(Number(totalPages) || 1, 1) }, (_, index) => index + 1)
}
