const SYSTEM_EMAIL_TEMPLATES = Object.freeze([
  Object.freeze({
    code: 'AUTH_VERIFY_EMAIL',
    description: 'Email xác thực tài khoản sau khi đăng ký.',
    display_name: 'Verify Email',
    required_variables: Object.freeze([
      'full_name',
      'verification_url',
      'expires_in_minutes',
    ]),
  }),
  Object.freeze({
    code: 'AUTH_RESEND_VERIFY_EMAIL',
    description: 'Email gửi lại liên kết xác thực tài khoản.',
    display_name: 'Resend Verify Email',
    required_variables: Object.freeze([
      'full_name',
      'verification_url',
      'expires_in_minutes',
    ]),
  }),
  Object.freeze({
    code: 'AUTH_RESET_PASSWORD',
    description: 'Email khôi phục và đặt lại mật khẩu.',
    display_name: 'Reset Password',
    required_variables: Object.freeze([
      'full_name',
      'reset_url',
      'expires_in_minutes',
    ]),
  }),
  Object.freeze({
    code: 'AUTH_CHANGE_EMAIL_CONFIRM',
    description: 'Email xác nhận thay đổi địa chỉ email tài khoản.',
    display_name: 'Change Email Confirm',
    required_variables: Object.freeze([
      'full_name',
      'new_email',
      'confirm_url',
      'expires_in_minutes',
    ]),
  }),
  Object.freeze({
    code: 'BOOKING_CONFIRMATION',
    description: 'Email xác nhận booking sau khi tạo đơn thành công.',
    display_name: 'Booking Confirmation',
    required_variables: Object.freeze([
      'booking_code',
      'contact_name',
      'items',
      'subtotal_amount',
      'discount_amount',
      'total_amount',
      'currency',
      'booking_status',
    ]),
  }),
  Object.freeze({
    code: 'BOOKING_CONFIRMATION_RESEND',
    description: 'Email gửi lại xác nhận booking đã tồn tại.',
    display_name: 'Booking Confirmation Resend',
    required_variables: Object.freeze([
      'booking_code',
      'contact_name',
      'items',
      'subtotal_amount',
      'discount_amount',
      'total_amount',
      'currency',
      'booking_status',
    ]),
  }),
  Object.freeze({
    code: 'BOOKING_RECEIPT',
    description: 'Email biên lai thanh toán booking.',
    display_name: 'Booking Receipt',
    required_variables: Object.freeze([
      'booking_code',
      'contact_name',
      'payment_amount',
      'currency',
      'payment_method',
      'receipt_number',
      'paid_at',
    ]),
  }),
  Object.freeze({
    code: 'SUPPORT_MANUAL_EMAIL',
    description: 'Email hỗ trợ thủ công do staff hoặc admin gửi trong ngữ cảnh support ticket.',
    display_name: 'Support Manual Email',
    required_variables: Object.freeze([
      'customer_name',
      'ticket_code',
      'subject',
      'message',
    ]),
  }),
  Object.freeze({
    code: 'SUPPORT_REPLY_NOTIFICATION',
    description: 'Thông báo email khi support ticket có phản hồi mới.',
    display_name: 'Support Reply Notification',
    required_variables: Object.freeze([
      'customer_name',
      'ticket_code',
      'reply_message',
      'reply_url',
    ]),
  }),
  Object.freeze({
    code: 'SYSTEM_NOTICE',
    description: 'Email thông báo hệ thống phục vụ vận hành hoặc debug.',
    display_name: 'System Notice',
    required_variables: Object.freeze([
      'recipient_name',
      'title',
      'message',
      'notice_type',
    ]),
  }),
]);

module.exports = {
  SYSTEM_EMAIL_TEMPLATES,
};
