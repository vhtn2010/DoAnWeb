export const BOOKING_STATUSES = Object.freeze({
  pendingPayment: 'pending_payment',
  confirmed: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
})

export const BOOKING_STATUS_VALUES = Object.freeze(Object.values(BOOKING_STATUSES))
