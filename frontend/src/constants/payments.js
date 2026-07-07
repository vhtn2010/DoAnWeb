import { PAYMENT_STATUSES } from './bookings.js'

export const PAYMENT_METHOD_CODES = Object.freeze({
  card: 'card',
  wallet: 'wallet',
})

export const PAYMENT_PROVIDER_BY_METHOD = Object.freeze({
  [PAYMENT_METHOD_CODES.card]: 'card_gateway_mock',
  [PAYMENT_METHOD_CODES.wallet]: 'wallet_gateway_mock',
})

export const PAYMENT_CONFIRMATION_STEPS = Object.freeze([
  { id: 1, label: 'Kiểm Tra' },
  { id: 2, label: 'Thông Tin' },
  { id: 3, label: 'Thanh Toán' },
])

export const PAYMENT_DEFAULT_CARD_NUMBER = '0000 0000 0000 0000'
export const PAYMENT_DEFAULT_CURRENCY = 'VND'

export const PAYMENT_METHOD_OPTIONS = Object.freeze([
  {
    id: 'payment-method-card',
    code: PAYMENT_METHOD_CODES.card,
    label: 'Thẻ Tín dụng / Ghi nợ',
    description: 'Visa, Mastercard, JCB',
    provider: PAYMENT_PROVIDER_BY_METHOD[PAYMENT_METHOD_CODES.card],
  },
  {
    id: 'payment-method-wallet',
    code: PAYMENT_METHOD_CODES.wallet,
    label: 'Ví điện tử / Momo / VNPay',
    description: 'Nhanh chóng & An toàn',
    provider: PAYMENT_PROVIDER_BY_METHOD[PAYMENT_METHOD_CODES.wallet],
  },
])

export const PAYMENT_VALID_VOUCHERS = Object.freeze([
  {
    code: 'NETVIET300',
    discount_amount: 300000,
  },
  {
    code: 'HALONG500',
    discount_amount: 500000,
  },
])

export const PAYMENT_TRUST_CARD_ITEMS = Object.freeze([
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

export { PAYMENT_STATUSES }
