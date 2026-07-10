import {
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function listAdminSupportTickets(params = {}) {
  return apiGet('/admin/support/tickets', {
    params: normalizeParams(params),
  })
}

export function getAdminSupportTicketDetail(ticketId) {
  return apiGet(`/admin/support/tickets/${ticketId}`)
}

export function updateAdminSupportTicket(ticketId, payload = {}) {
  return apiPatch(`/admin/support/tickets/${ticketId}`, {
    assigned_to: payload.assignedTo,
    priority: payload.priority,
    status: payload.status,
  })
}

export function assignAdminSupportTicket(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/assign`, {
    assigned_to: payload.assignedTo,
  })
}

export function replyToAdminSupportTicket(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/replies`, {
    is_internal_note: Boolean(payload.isInternalNote),
    message: payload.message,
  })
}

export function closeAdminSupportTicket(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/close`, {
    reason: payload.reason,
  })
}

export function reopenAdminSupportTicket(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/reopen`, {
    reason: payload.reason,
  })
}

export function markAdminSupportTicketAsSpam(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/mark-spam`, {
    reason: payload.reason,
  })
}

export function sendAdminSupportTicketEmail(ticketId, payload = {}) {
  return apiPost(`/admin/support/tickets/${ticketId}/send-email`, {
    message: payload.message,
    subject: payload.subject,
  })
}
