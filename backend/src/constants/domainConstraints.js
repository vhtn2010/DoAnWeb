const freeze = (value) => Object.freeze(value);

const createValueMap = (values) =>
  freeze(
    values.reduce((accumulator, value) => {
      accumulator[value.toUpperCase()] = value;
      return accumulator;
    }, {}),
  );

const USER_STATUS_VALUES = freeze([
  'pending_verification',
  'active',
  'locked',
  'suspended',
  'disabled',
  'deleted',
]);

const SERVICE_TYPE_VALUES = freeze([
  'tour',
  'hotel',
  'room',
  'flight',
  'train',
  'combo',
]);

const SERVICE_STATUS_VALUES = freeze([
  'draft',
  'pending_review',
  'active',
  'hidden',
  'sold_out',
  'expired',
  'archived',
  'deleted',
]);

const TRANSPORT_TYPE_VALUES = freeze([
  'bus',
  'flight',
  'train',
  'car',
  'ship',
  'mixed',
]);

const CABIN_CLASS_VALUES = freeze([
  'economy',
  'premium_economy',
  'business',
  'first',
]);

const TRANSPORT_SCHEDULE_STATUS_VALUES = freeze([
  'open',
  'full',
  'cancelled',
  'departed',
  'completed',
]);

const SEAT_CLASS_VALUES = freeze([
  'hard_seat',
  'soft_seat',
  'sleeper',
  'vip',
]);

const CART_STATUS_VALUES = freeze([
  'active',
  'converted',
  'abandoned',
  'expired',
]);

const BOOKING_STATUS_VALUES = freeze([
  'pending_payment',
  'payment_processing',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancel_requested',
  'cancelled',
  'refund_pending',
  'partially_refunded',
  'refunded',
  'failed',
  'expired',
]);

const BOOKING_ITEM_STATUS_VALUES = freeze([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded',
  'failed',
]);

const DISCOUNT_TYPE_VALUES = freeze([
  'percent',
  'fixed_amount',
]);

const PAYMENT_PROVIDER_VALUES = freeze([
  'direct',
  'vnpay',
  'momo',
  'visa',
  'mastercard',
  'bank_transfer',
]);

const PAYMENT_METHOD_VALUES = freeze([
  'e_wallet',
  'card',
  'qr',
  'bank_transfer',
  'cash_at_office',
  'manual_bank_transfer',
  'staff_collect',
]);

const DIRECT_PAYMENT_METHOD_VALUES = freeze([
  'cash_at_office',
  'manual_bank_transfer',
  'staff_collect',
]);

const PAYMENT_STATUS_VALUES = freeze([
  'initiated',
  'pending',
  'processing',
  'success',
  'failed',
  'cancelled',
  'expired',
  'partially_refunded',
  'refunded',
  'reconciled',
]);

const REFUND_STATUS_VALUES = freeze([
  'requested',
  'approved',
  'rejected',
  'processing',
  'success',
  'failed',
  'cancelled',
]);

const PROMOTION_STATUS_VALUES = freeze([
  'draft',
  'active',
  'paused',
  'expired',
  'cancelled',
]);

const VOUCHER_STATUS_VALUES = freeze([
  'active',
  'disabled',
  'used_up',
  'expired',
]);

const SUPPORT_TICKET_STATUS_VALUES = freeze([
  'open',
  'assigned',
  'waiting_customer',
  'waiting_staff',
  'resolved',
  'closed',
  'spam',
]);

const SUPPORT_TICKET_PRIORITY_VALUES = freeze([
  'low',
  'normal',
  'high',
  'urgent',
]);

const SENDER_TYPE_VALUES = freeze([
  'customer',
  'staff',
  'admin',
  'system',
]);

const NOTIFICATION_TYPE_VALUES = freeze([
  'booking_status',
  'support_reply',
  'promotion',
  'payment',
  'system',
]);

const NOTIFICATION_STATUS_VALUES = freeze([
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
]);

const EMAIL_STATUS_VALUES = freeze([
  'queued',
  'sent',
  'delivered',
  'opened',
  'bounced',
  'spam_reported',
  'failed',
]);

const SUPABASE_CONNECTION_STATUS_VALUES = freeze([
  'not_configured',
  'connected',
  'connection_failed',
]);

const USER_STATUS = createValueMap(USER_STATUS_VALUES);
const SERVICE_TYPE = createValueMap(SERVICE_TYPE_VALUES);
const SERVICE_STATUS = createValueMap(SERVICE_STATUS_VALUES);
const TRANSPORT_TYPE = createValueMap(TRANSPORT_TYPE_VALUES);
const CABIN_CLASS = createValueMap(CABIN_CLASS_VALUES);
const TRANSPORT_SCHEDULE_STATUS = createValueMap(
  TRANSPORT_SCHEDULE_STATUS_VALUES,
);
const SEAT_CLASS = createValueMap(SEAT_CLASS_VALUES);
const CART_STATUS = createValueMap(CART_STATUS_VALUES);
const BOOKING_STATUS = createValueMap(BOOKING_STATUS_VALUES);
const BOOKING_ITEM_STATUS = createValueMap(BOOKING_ITEM_STATUS_VALUES);
const DISCOUNT_TYPE = createValueMap(DISCOUNT_TYPE_VALUES);
const PAYMENT_PROVIDER = createValueMap(PAYMENT_PROVIDER_VALUES);
const PAYMENT_METHOD = createValueMap(PAYMENT_METHOD_VALUES);
const DIRECT_PAYMENT_METHOD = createValueMap(DIRECT_PAYMENT_METHOD_VALUES);
const PAYMENT_STATUS = createValueMap(PAYMENT_STATUS_VALUES);
const REFUND_STATUS = createValueMap(REFUND_STATUS_VALUES);
const PROMOTION_STATUS = createValueMap(PROMOTION_STATUS_VALUES);
const VOUCHER_STATUS = createValueMap(VOUCHER_STATUS_VALUES);
const SUPPORT_TICKET_STATUS = createValueMap(SUPPORT_TICKET_STATUS_VALUES);
const SUPPORT_TICKET_PRIORITY = createValueMap(
  SUPPORT_TICKET_PRIORITY_VALUES,
);
const SENDER_TYPE = createValueMap(SENDER_TYPE_VALUES);
const NOTIFICATION_TYPE = createValueMap(NOTIFICATION_TYPE_VALUES);
const NOTIFICATION_STATUS = createValueMap(NOTIFICATION_STATUS_VALUES);
const EMAIL_STATUS = createValueMap(EMAIL_STATUS_VALUES);
const SUPABASE_CONNECTION_STATUS = createValueMap(
  SUPABASE_CONNECTION_STATUS_VALUES,
);

const BOOKING_STATUS_TRANSITIONS = freeze({
  [BOOKING_STATUS.PENDING_PAYMENT]: freeze([
    BOOKING_STATUS.PAYMENT_PROCESSING,
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.FAILED,
  ]),
  [BOOKING_STATUS.PAYMENT_PROCESSING]: freeze([
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.EXPIRED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.FAILED,
  ]),
  [BOOKING_STATUS.PAID]: freeze([
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.REFUND_PENDING,
    BOOKING_STATUS.CANCELLED,
  ]),
  [BOOKING_STATUS.CONFIRMED]: freeze([
    BOOKING_STATUS.IN_PROGRESS,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCEL_REQUESTED,
    BOOKING_STATUS.CANCELLED,
  ]),
  [BOOKING_STATUS.IN_PROGRESS]: freeze([
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.CANCEL_REQUESTED,
  ]),
  [BOOKING_STATUS.CANCEL_REQUESTED]: freeze([
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.REFUND_PENDING,
  ]),
  [BOOKING_STATUS.REFUND_PENDING]: freeze([
    BOOKING_STATUS.PARTIALLY_REFUNDED,
    BOOKING_STATUS.REFUNDED,
    BOOKING_STATUS.CANCELLED,
  ]),
  [BOOKING_STATUS.PARTIALLY_REFUNDED]: freeze([
    BOOKING_STATUS.REFUNDED,
    BOOKING_STATUS.COMPLETED,
  ]),
  [BOOKING_STATUS.COMPLETED]: freeze([
    BOOKING_STATUS.REFUND_PENDING,
  ]),
});

const PAYMENT_STATUS_TRANSITIONS = freeze({
  [PAYMENT_STATUS.INITIATED]: freeze([
    PAYMENT_STATUS.PENDING,
    PAYMENT_STATUS.PROCESSING,
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.EXPIRED,
  ]),
  [PAYMENT_STATUS.PENDING]: freeze([
    PAYMENT_STATUS.PROCESSING,
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.EXPIRED,
  ]),
  [PAYMENT_STATUS.PROCESSING]: freeze([
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.EXPIRED,
  ]),
  [PAYMENT_STATUS.SUCCESS]: freeze([
    PAYMENT_STATUS.RECONCILED,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.REFUNDED,
  ]),
  [PAYMENT_STATUS.RECONCILED]: freeze([
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
    PAYMENT_STATUS.REFUNDED,
  ]),
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: freeze([
    PAYMENT_STATUS.REFUNDED,
  ]),
});

const REFUND_STATUS_TRANSITIONS = freeze({
  [REFUND_STATUS.REQUESTED]: freeze([
    REFUND_STATUS.APPROVED,
    REFUND_STATUS.REJECTED,
    REFUND_STATUS.CANCELLED,
  ]),
  [REFUND_STATUS.APPROVED]: freeze([
    REFUND_STATUS.PROCESSING,
  ]),
  [REFUND_STATUS.PROCESSING]: freeze([
    REFUND_STATUS.SUCCESS,
    REFUND_STATUS.FAILED,
  ]),
});

const API_ERROR_CODES = freeze({
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  BAD_REQUEST: 'BAD_REQUEST',
  CLOUDINARY_DELETE_FAILED: 'CLOUDINARY_DELETE_FAILED',
  CLOUDINARY_NOT_CONFIGURED: 'CLOUDINARY_NOT_CONFIGURED',
  CLOUDINARY_UPLOAD_FAILED: 'CLOUDINARY_UPLOAD_FAILED',
  CONFLICT: 'CONFLICT',
  INVALID_EMAIL_PAYLOAD: 'INVALID_EMAIL_PAYLOAD',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_UPLOAD_SOURCE: 'INVALID_UPLOAD_SOURCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  NOT_FOUND: 'NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  SENDGRID_NOT_CONFIGURED: 'SENDGRID_NOT_CONFIGURED',
  SENDGRID_SEND_FAILED: 'SENDGRID_SEND_FAILED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SUPABASE_CONNECTION_FAILED: 'SUPABASE_CONNECTION_FAILED',
  SUPABASE_NOT_CONFIGURED: 'SUPABASE_NOT_CONFIGURED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
});

const DOMAIN_CONSTRAINTS = freeze({
  cloudinaryRequestTimeoutMs: 20000,
  defaultCurrency: 'VND',
  emailProvider: 'sendgrid',
  discountPercentMaxValue: 100,
  sendgridRequestTimeoutMs: 20000,
});

module.exports = {
  API_ERROR_CODES,
  BOOKING_ITEM_STATUS,
  BOOKING_ITEM_STATUS_VALUES,
  BOOKING_STATUS,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_STATUS_VALUES,
  CABIN_CLASS,
  CABIN_CLASS_VALUES,
  CART_STATUS,
  CART_STATUS_VALUES,
  DIRECT_PAYMENT_METHOD,
  DIRECT_PAYMENT_METHOD_VALUES,
  DISCOUNT_TYPE,
  DISCOUNT_TYPE_VALUES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
  EMAIL_STATUS_VALUES,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_VALUES,
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  PAYMENT_METHOD,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  PAYMENT_STATUS_VALUES,
  PROMOTION_STATUS,
  PROMOTION_STATUS_VALUES,
  REFUND_STATUS,
  REFUND_STATUS_TRANSITIONS,
  REFUND_STATUS_VALUES,
  SENDER_TYPE,
  SENDER_TYPE_VALUES,
  SEAT_CLASS,
  SEAT_CLASS_VALUES,
  SERVICE_STATUS,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_PRIORITY_VALUES,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_STATUS_VALUES,
  SUPABASE_CONNECTION_STATUS,
  SUPABASE_CONNECTION_STATUS_VALUES,
  TRANSPORT_SCHEDULE_STATUS,
  TRANSPORT_SCHEDULE_STATUS_VALUES,
  TRANSPORT_TYPE,
  TRANSPORT_TYPE_VALUES,
  USER_STATUS,
  USER_STATUS_VALUES,
  VOUCHER_STATUS,
  VOUCHER_STATUS_VALUES,
};
