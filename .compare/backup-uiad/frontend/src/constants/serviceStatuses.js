export const SERVICE_STATUSES = Object.freeze({
  draft: 'draft',
  pendingReview: 'pending_review',
  active: 'active',
  hidden: 'hidden',
  soldOut: 'sold_out',
  expired: 'expired',
  archived: 'archived',
  deleted: 'deleted',
})

export const SERVICE_STATUS_VALUES = Object.freeze(Object.values(SERVICE_STATUSES))
