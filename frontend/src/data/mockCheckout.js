import { mockActiveCart } from './mockCart.js'

export const mockCheckoutPreviewService = {
  service_id: 'service-tour-ha-long-luxury-001',
  service_code: 'TOUR-HL-LUX-001',
  service_type: 'tour',
  title: 'Du thuyền Hạ Long Luxury',
  slug: 'du-thuyen-ha-long-luxury',
  short_description:
    'Hành trình nghỉ dưỡng đẳng cấp với cabin hướng biển, bữa tối cao cấp và trải nghiệm vịnh di sản.',
  location_text: 'Hạ Long, Quảng Ninh',
  image_url: '/assets/template/service/list/tour-ha-long.png',
  status: 'active',
  start_at: '2024-11-25T08:00:00+07:00',
  end_at: '2024-11-27T12:00:00+07:00',
  quantity: 1,
  options: {
    adults: 2,
    children: 0,
    duration_text: '3 Ngày 2 Đêm',
    badge_text: 'DI SẢN THẾ GIỚI',
  },
}

const baseCheckoutSummary = {
  subtotal_amount: 14600000,
  service_fee_amount: 1250000,
  discount_amount: 300000,
  total_amount: 15550000,
  currency: 'VND',
}

export const mockCheckoutDraft = {
  cart_id: mockActiveCart.id,
  selected_cart_item_ids: ['cart-item-001'],
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  voucher_code: '',
  note: '',
  accepted_terms: false,
  travellers: [
    {
      cart_item_id: 'cart-item-001',
      traveller_info: [
        {
          full_name: '',
          phone: '',
          email: '',
        },
      ],
    },
  ],
  special_requests: {
    baggage_departure: false,
    baggage_return: false,
  },
  summary: baseCheckoutSummary,
  service: mockCheckoutPreviewService,
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

export function calculateCheckoutSummary({
  subtotalAmount = baseCheckoutSummary.subtotal_amount,
  serviceFeeAmount = baseCheckoutSummary.service_fee_amount,
  discountAmount = baseCheckoutSummary.discount_amount,
} = {}) {
  return {
    subtotal_amount: subtotalAmount,
    service_fee_amount: serviceFeeAmount,
    discount_amount: discountAmount,
    total_amount: subtotalAmount + serviceFeeAmount - discountAmount,
    currency: 'VND',
  }
}

export function createMockCheckoutDraft({
  authState = 'guest',
  selectedCartItemIds = mockCheckoutDraft.selected_cart_item_ids,
  cartSummaryPayload,
} = {}) {
  const contactValues = {
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  }

  const selectedIds =
    Array.isArray(selectedCartItemIds) && selectedCartItemIds.length > 0
      ? selectedCartItemIds
      : mockCheckoutDraft.selected_cart_item_ids

  const incomingSubtotal =
    typeof cartSummaryPayload?.summary?.subtotal_amount === 'number'
      ? cartSummaryPayload.summary.subtotal_amount
      : baseCheckoutSummary.subtotal_amount

  const mergedSummary = calculateCheckoutSummary({
    subtotalAmount: incomingSubtotal,
    serviceFeeAmount: baseCheckoutSummary.service_fee_amount,
    discountAmount: baseCheckoutSummary.discount_amount,
  })

  return {
    ...mockCheckoutDraft,
    ...contactValues,
    cart_id: cartSummaryPayload?.cart_id ?? mockCheckoutDraft.cart_id,
    selected_cart_item_ids: selectedIds,
    auth_state: authState,
    travellers: [
      {
        cart_item_id: selectedIds[0],
        traveller_info: [
          {
            full_name: contactValues.contact_name,
            phone: contactValues.contact_phone,
            email: contactValues.contact_email,
          },
        ],
      },
    ],
    special_requests: {
      ...mockCheckoutDraft.special_requests,
    },
    summary: mergedSummary,
    service: {
      ...mockCheckoutPreviewService,
    },
  }
}

export function buildCheckoutPayload(formValues) {
  return {
    cart_id: formValues.cart_id,
    contact_name: formValues.contact_name.trim(),
    contact_email: formValues.contact_email.trim(),
    contact_phone: formValues.contact_phone.trim(),
    voucher_code: formValues.voucher_code.trim(),
    note: formValues.note.trim(),
    travellers: formValues.travellers,
  }
}

export function validateCheckoutForm(formValues) {
  const errors = {}
  const normalizedEmail = formValues.contact_email.trim()
  const normalizedPhone = formValues.contact_phone.replace(/\D/g, '')

  if (!formValues.contact_name.trim()) {
    errors.contact_name = 'Vui lòng nhập họ và tên.'
  }

  if (!formValues.contact_phone.trim()) {
    errors.contact_phone = 'Vui lòng nhập số điện thoại.'
  } else if (normalizedPhone.length < 9) {
    errors.contact_phone = 'Số điện thoại cần có ít nhất 9 số.'
  }

  if (!normalizedEmail) {
    errors.contact_email = 'Vui lòng nhập email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.contact_email = 'Email chưa đúng định dạng.'
  }

  if (!formValues.accepted_terms) {
    errors.accepted_terms = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  }

  return errors
}
