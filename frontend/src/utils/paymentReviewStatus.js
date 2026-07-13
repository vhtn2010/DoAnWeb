const REVIEW_PAYMENT_STATUSES = new Set([
  'awaiting_review',
  'pending_confirmation',
  'pending_review',
  'submitted',
  'under_review',
])

function normalizeStatus(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function pickLatestPayment(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return null
  }

  return [...payments].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime()
    const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime()

    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime)
  })[0]
}

export function getSubmittedPaymentProof(payment = null, proof = null) {
  return proof ?? payment?.proof ?? payment?.proof_summary ?? null
}

export function hasSubmittedPaymentProof(payment = null, proof = null) {
  const submittedProof = getSubmittedPaymentProof(payment, proof)

  return Boolean(
    submittedProof?.proof_image_url ||
      submittedProof?.submitted_at ||
      submittedProof?.uploaded_at ||
      submittedProof?.bank_transaction_code ||
      submittedProof?.transfer_note,
  )
}

export function isBookingAwaitingAdminReview(booking = {}) {
  const bookingStatus = normalizeStatus(booking.status ?? booking.booking_status)
  const payment = booking.latest_payment ?? booking.payment ?? null
  const paymentStatus = normalizeStatus(payment?.payment_status ?? payment?.status)

  return (
    ['pending_payment', 'payment_processing', 'pending_confirmation'].includes(bookingStatus) &&
    (hasSubmittedPaymentProof(payment, booking.payment_proof) ||
      REVIEW_PAYMENT_STATUSES.has(paymentStatus))
  )
}
