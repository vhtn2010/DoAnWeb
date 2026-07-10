import { apiGet, apiPost } from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function createSupportTicket(payload = {}) {
  return apiPost('/support/tickets', payload)
}

export function listMySupportTickets(params = {}) {
  return apiGet('/support/tickets', {
    params: normalizeParams(params),
  })
}

export function getMySupportTicketDetail(ticketId) {
  return apiGet(`/support/tickets/${ticketId}`)
}

export function replyToSupportTicket(ticketId, payload = {}) {
  return apiPost(`/support/tickets/${ticketId}/replies`, payload)
}

export function closeMySupportTicket(ticketId, payload = {}) {
  return apiPost(`/support/tickets/${ticketId}/close`, payload)
}
