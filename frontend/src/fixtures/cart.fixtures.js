import { CART_STATUSES } from '../constants/cartStatuses.js'
import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

const sharedCartItems = Object.freeze([
  {
    id: 'cart-item-001',
    service_id: 'service-room-ha-long-001',
    service_type: SERVICE_TYPES.room,
    reference_id: 'room-suite-balcony-001',
    start_at: '2026-10-12T14:00:00+07:00',
    end_at: '2026-10-14T12:00:00+07:00',
    quantity: 1,
    unit_price_snapshot: 14600000,
    options: {
      room_name: 'Phòng Suite Ban công',
      guest_count: 2,
      nights: 2,
    },
    created_at: '2026-07-01T09:00:00+07:00',
    service: {
      service_code: 'ROOM-HL-2001',
      title: 'Du thuyền Hạ Long Heritage',
      slug: 'du-thuyen-ha-long-heritage',
      short_description:
        'Hành trình nghỉ dưỡng với phòng suite ban công và bữa tối trên vịnh.',
      location_text: 'Hạ Long, Quảng Ninh',
      image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
      status: SERVICE_STATUSES.active,
    },
  },
  {
    id: 'cart-item-002',
    service_id: 'service-tour-hoi-an-001',
    service_type: SERVICE_TYPES.tour,
    reference_id: 'tour-hoi-an-private-001',
    start_at: '2026-10-13T18:30:00+07:00',
    end_at: '2026-10-13T21:30:00+07:00',
    quantity: 1,
    unit_price_snapshot: 2100000,
    options: {
      package_name: 'Tour riêng hướng dẫn viên',
      adult_count: 2,
    },
    created_at: '2026-07-01T09:05:00+07:00',
    service: {
      service_code: 'TOUR-HA-0102',
      title: 'Khám phá Phố cổ Hội An',
      slug: 'kham-pha-pho-co-hoi-an',
      short_description:
        'Dạo phố cổ, thưởng thức ẩm thực địa phương và trải nghiệm thả đèn hoa đăng.',
      location_text: 'Hội An, Quảng Nam',
      image_url: '/assets/template/home/v1_137.png',
      status: SERVICE_STATUSES.active,
    },
  },
])

function createCartFixture({ id, userId }) {
  return {
    cart: {
      id,
      user_id: userId,
      status: CART_STATUSES.active,
      created_at: '2026-07-01T09:00:00+07:00',
      updated_at: '2026-07-02T09:15:00+07:00',
    },
    cart_items: sharedCartItems.map((item) => ({
      ...item,
      cart_id: id,
    })),
  }
}

export const guestActiveCartFixture = Object.freeze(
  createCartFixture({
    id: 'cart-preview-guest-001',
    userId: null,
  }),
)

export const customerActiveCartFixture = Object.freeze(
  createCartFixture({
    id: 'cart-preview-customer-001',
    userId: 'customer-preview-001',
  }),
)
