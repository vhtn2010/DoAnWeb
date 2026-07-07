import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../constants/bookings.js'
import {
  PAYMENT_DEFAULT_CARD_NUMBER,
  PAYMENT_METHOD_CODES,
  PAYMENT_METHOD_OPTIONS,
} from '../constants/payments.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

function createPaymentConfirmationFixture({ paymentId, bookingId, userId, guestSessionId }) {
  return {
    payment: {
      id: paymentId,
      payment_code: 'NVPAY20241012001',
      booking_id: bookingId,
      booking_code: 'NVBT20241012001',
      payment_method: PAYMENT_METHOD_CODES.card,
      payment_provider: 'card_gateway_mock',
      payment_status: PAYMENT_STATUSES.initiated,
      amount: 15550000,
      currency: 'VND',
      transaction_reference: null,
      paid_at: null,
      expired_at: '2026-07-07T12:45:00+07:00',
      created_at: '2026-07-07T09:45:00+07:00',
      updated_at: '2026-07-07T09:45:00+07:00',
      metadata: {
        preset_card_number: PAYMENT_DEFAULT_CARD_NUMBER,
      },
    },
    booking: {
      id: bookingId,
      booking_id: bookingId,
      booking_code: 'NVBT20241012001',
      user_id: userId,
      guest_session_id: guestSessionId,
      contact_name: 'Nguyễn Văn A',
      contact_email: 'Example@gmail.com',
      contact_phone: '090 123 4567',
      booking_status: BOOKING_STATUSES.pending_payment,
      payment_status: PAYMENT_STATUSES.initiated,
      subtotal_amount: 14600000,
      discount_amount: 300000,
      tax_amount: 950000,
      service_fee_amount: 300000,
      total_amount: 15550000,
      currency: 'VND',
    },
    booking_items: [
      {
        id: `${bookingId}-item-001`,
        booking_id: bookingId,
        service_id: 'service-tour-ha-long-heritage-001',
        service_type: SERVICE_TYPES.tour,
        service_title: 'Du thuyền Hạ Long Heritage',
        service_code: 'TOUR-HL-HERITAGE-001',
        image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
        start_at: '2026-10-12T09:00:00+07:00',
        end_at: '2026-10-14T12:00:00+07:00',
        quantity: 1,
        unit_price_snapshot: 14600000,
        total_amount: 14600000,
        options: {
          duration_label: '2 ngày 1 đêm',
          schedule_label: '12 Th10 - 14 Th10, 2024',
          location_text: 'Hạ Long, Quảng Ninh',
        },
      },
    ],
    payment_methods: PAYMENT_METHOD_OPTIONS.map((item) => ({ ...item })),
    payment_summary: {
      subtotal_amount: 14600000,
      tax_and_fee_amount: 1250000,
      discount_amount: 300000,
      total_amount: 15550000,
      currency: 'VND',
      voucher_code: '',
    },
  }
}

export const guestPaymentConfirmationFixture = Object.freeze(
  createPaymentConfirmationFixture({
    paymentId: 'payment-preview-guest-001',
    bookingId: 'booking-preview-guest-001',
    userId: null,
    guestSessionId: 'guest-session-preview-001',
  }),
)

export const customerPaymentConfirmationFixture = Object.freeze(
  createPaymentConfirmationFixture({
    paymentId: 'payment-preview-customer-001',
    bookingId: 'booking-preview-customer-001',
    userId: 'customer-preview-001',
    guestSessionId: null,
  }),
)

export const paymentConfirmationFixtures = Object.freeze([
  guestPaymentConfirmationFixture,
  customerPaymentConfirmationFixture,
])
