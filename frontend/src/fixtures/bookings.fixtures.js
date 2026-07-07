import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../constants/bookings.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

function createBookingConfirmationFixture({
  bookingId,
  userId,
  guestSessionId,
  contactName,
  contactEmail,
  contactPhone,
}) {
  const bookingCode = 'NVBT20241012001'
  const bookingItemId = `${bookingId}-item-001`

  return {
    booking: {
      id: bookingId,
      booking_code: bookingCode,
      user_id: userId,
      guest_session_id: guestSessionId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      note: 'Ưu tiên bàn cạnh cửa sổ nếu còn trống.',
      booking_status: BOOKING_STATUSES.pending_payment,
      payment_status: PAYMENT_STATUSES.initiated,
      subtotal_amount: 14600000,
      discount_amount: 300000,
      tax_amount: 950000,
      service_fee_amount: 300000,
      total_amount: 15550000,
      currency: 'VND',
      voucher_code: 'NETVIET300',
      created_at: '2026-07-07T09:15:00+07:00',
      expires_at: '2026-07-07T12:15:00+07:00',
    },
    booking_items: [
      {
        id: bookingItemId,
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
    travellers: [
      {
        id: `${bookingId}-traveller-001`,
        full_name: contactName,
        phone: contactPhone,
        email: contactEmail,
        passenger_type: 'adult',
        identity_number: null,
      },
    ],
    payment_options: [
      {
        id: 'payment-option-bank-transfer',
        code: 'bank_transfer',
        label: 'Chuyển khoản',
        description: 'Thanh toán chuyển khoản và xác nhận ở bước tiếp theo.',
      },
      {
        id: 'payment-option-card',
        code: 'credit_card',
        label: 'Thẻ nội địa/quốc tế',
        description: 'Chuyển tiếp sang màn thanh toán thẻ ở task tiếp theo.',
      },
    ],
  }
}

export const guestBookingConfirmationFixture = Object.freeze(
  createBookingConfirmationFixture({
    bookingId: 'booking-preview-guest-001',
    userId: null,
    guestSessionId: 'guest-session-preview-001',
    contactName: 'Nguyễn Minh Anh',
    contactEmail: 'minhanh@example.com',
    contactPhone: '0901234567',
  }),
)

export const customerBookingConfirmationFixture = Object.freeze(
  createBookingConfirmationFixture({
    bookingId: 'booking-preview-customer-001',
    userId: 'customer-preview-001',
    guestSessionId: null,
    contactName: 'Trần Gia Hân',
    contactEmail: 'giahan@example.com',
    contactPhone: '0912345678',
  }),
)

export const bookingConfirmationFixtures = Object.freeze([
  guestBookingConfirmationFixture,
  customerBookingConfirmationFixture,
])
