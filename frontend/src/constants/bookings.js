import { SERVICE_TYPES } from './serviceTypes.js'

export const BOOKING_STATUSES = Object.freeze({
  pending_payment: 'pending_payment',
  payment_processing: 'payment_processing',
  paid: 'paid',
  confirmed: 'confirmed',
  in_progress: 'in_progress',
  completed: 'completed',
  cancel_requested: 'cancel_requested',
  cancelled: 'cancelled',
  refund_pending: 'refund_pending',
  partially_refunded: 'partially_refunded',
  refunded: 'refunded',
  failed: 'failed',
  expired: 'expired',
})

export const PAYMENT_STATUSES = Object.freeze({
  initiated: 'initiated',
  pending: 'pending',
  processing: 'processing',
  success: 'success',
  failed: 'failed',
  cancelled: 'cancelled',
  expired: 'expired',
  partially_refunded: 'partially_refunded',
  refunded: 'refunded',
  reconciled: 'reconciled',
})

export const BOOKING_DEFAULT_CURRENCY = 'VND'
export const BOOKING_DEFAULT_PAYMENT_METHOD = 'bank_transfer'
export const BOOKING_DEFAULT_SERVICE_TYPE = SERVICE_TYPES.tour

export const BOOKING_CONFIRMATION_STEPS = Object.freeze([
  { id: 1, label: 'Kiểm Tra' },
  { id: 2, label: 'Thông Tin' },
  { id: 3, label: 'Thanh Toán' },
])

export const BOOKING_TRUST_CARD_ITEMS = Object.freeze([
  {
    id: 'best-price',
    title: 'Đảm bảo giá tốt nhất',
    description: 'Hoàn tiền nếu phát hiện thấy giá rẻ hơn.',
    iconLabel: 'Gia',
  },
  {
    id: 'support',
    title: 'Hỗ trợ 24/7',
    description: 'Đội ngũ hỗ trợ tận tâm luôn sẵn sàng.',
    iconLabel: '24',
  },
])
