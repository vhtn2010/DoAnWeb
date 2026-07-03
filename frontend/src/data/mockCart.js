export const mockActiveCart = {
  id: 'cart-preview-001',
  user_id: 'customer-preview-001',
  status: 'active',
  created_at: '2026-07-01T09:00:00+07:00',
  updated_at: '2026-07-02T09:15:00+07:00',
  cart_items: [
    {
      id: 'cart-item-001',
      cart_id: 'cart-preview-001',
      service_id: 'service-room-ha-long-001',
      service_type: 'room',
      reference_id: 'room-suite-balcony-001',
      start_at: '2024-10-12T14:00:00+07:00',
      end_at: '2024-10-14T12:00:00+07:00',
      quantity: 1,
      unit_price_snapshot: 14600000,
      options: {
        option_summary: 'Phòng Suite Ban công • 2 Đêm',
        schedule_label: '12 Th10 - 14 Th10, 2024',
      },
      created_at: '2026-07-01T09:00:00+07:00',
      service: {
        service_code: 'ROOM-HL-2001',
        title: 'Du thuyền Hạ Long Heritage',
        slug: 'du-thuyen-ha-long-heritage',
        short_description: 'Hành trình nghỉ dưỡng với phòng suite ban công và bữa tối trên vịnh.',
        location_text: 'Hạ Long, Quảng Ninh',
        image_url: '/assets/template/service/detail/ha-long-gallery-main.png',
        status: 'active',
      },
    },
    {
      id: 'cart-item-002',
      cart_id: 'cart-preview-001',
      service_id: 'service-tour-hoi-an-001',
      service_type: 'tour',
      reference_id: 'tour-hoi-an-private-001',
      start_at: '2024-10-13T18:30:00+07:00',
      end_at: '2024-10-13T21:30:00+07:00',
      quantity: 1,
      unit_price_snapshot: 2100000,
      options: {
        option_summary: 'Tour riêng hướng dẫn viên • 2 Người lớn',
        schedule_label: '13 Th10, 18:30',
      },
      created_at: '2026-07-01T09:05:00+07:00',
      service: {
        service_code: 'TOUR-HA-0102',
        title: 'Khám phá Phố cổ Hội An',
        slug: 'kham-pha-pho-co-hoi-an',
        short_description: 'Dạo phố cổ, thưởng thức ẩm thực địa phương và trải nghiệm thả đèn hoa đăng.',
        location_text: 'Hội An, Quảng Nam',
        image_url: '/assets/template/home/v1_137.png',
        status: 'active',
      },
    },
  ],
}

export function formatCurrencyVND(amount = 0) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s/g, '')
}

export function calculateCartSummary(cartItems, selectedItemIds = []) {
  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id))
  const subtotalAmount = selectedItems.reduce(
    (totalAmount, item) => totalAmount + item.unit_price_snapshot * item.quantity,
    0
  )

  return {
    subtotal_amount: subtotalAmount,
    discount_amount: 0,
    total_amount: subtotalAmount,
    currency: 'VND',
    selected_item_count: selectedItems.length,
  }
}

export function buildCartSummaryPayload(cart, cartItems, selectedItemIds = []) {
  return {
    cart_id: cart.id,
    cart_item_ids: selectedItemIds,
    summary: calculateCartSummary(cartItems, selectedItemIds),
  }
}
