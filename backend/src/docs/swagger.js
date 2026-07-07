const express = require('express');
const { apiPrefix, backendUrl, env } = require('../config');
const backendPackage = require('../../package.json');

let swaggerUi = null;

try {
  swaggerUi = require('swagger-ui-express');
} catch (error) {
  swaggerUi = null;
}

const SWAGGER_PUBLIC_PATH = '/swagger-ui';
const SWAGGER_API_ALIAS_PATH = `${apiPrefix}/docs`;
const ROUTE_PROBE_CANDIDATES = [
  `${apiPrefix}/__codex_probe__`,
  `${SWAGGER_PUBLIC_PATH}/__codex_probe__`,
  `${SWAGGER_API_ALIAS_PATH}/__codex_probe__`,
];
const AUTH_MIDDLEWARE_MARKERS = [
  'extractBearerToken',
  'verifyAccessToken',
  'resolveAuthenticatedUser',
  'resolveAuthContext',
];
const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
]);

const jsonContent = (schema, example) => ({
  'application/json': {
    schema,
    ...(example === undefined ? {} : { example }),
  },
});

const successEnvelope = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    message: {
      type: 'string',
      example: 'OK',
    },
    data: {
      oneOf: [
        { type: 'object', additionalProperties: true },
        { type: 'array', items: { type: 'object', additionalProperties: true } },
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    },
    meta: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

const errorEnvelope = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: false,
    },
    message: {
      type: 'string',
      example: 'Validation failed',
    },
    error: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'VALIDATION_ERROR',
        },
        details: {
          oneOf: [
            { type: 'array', items: { type: 'object', additionalProperties: true } },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    },
  },
};

const titleCase = (value) =>
  value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const joinPaths = (basePath = '', childPath = '') => {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/, '');
  const child = childPath.replace(/^\/+/, '');
  const joined = [base, child].filter(Boolean).join('/');

  return joined ? `/${joined.replace(/^\/+/, '')}` : '/';
};

const toConcreteSamplePath = (path) => {
  if (!path) {
    return '/';
  }

  return path.replace(/:([A-Za-z0-9_]+)/g, (_, paramName) => {
    const normalizedName = paramName.toLowerCase();

    if (normalizedName.includes('slug')) {
      return 'sample-slug';
    }

    return normalizedName.includes('id')
      ? '11111111-1111-4111-8111-111111111111'
      : 'sample';
  });
};

const normalizePathForSpec = (path) => {
  const withoutPrefix = path.startsWith(apiPrefix)
    ? path.slice(apiPrefix.length) || '/'
    : path;

  return withoutPrefix.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
};

const extractPathParameters = (path) => {
  const matches = [...path.matchAll(/:([A-Za-z0-9_]+)/g)];

  return matches.map((match) => {
    const name = match[1];
    const normalizedName = name.toLowerCase();
    const isUuidLike =
      normalizedName.includes('id') && !normalizedName.includes('slug');

    return {
      in: 'path',
      name,
      required: true,
      schema: isUuidLike
        ? {
            type: 'string',
            format: 'uuid',
          }
        : {
            type: 'string',
          },
    };
  });
};

const inferTagFromPath = (path) => {
  const [firstSegment, secondSegment, thirdSegment] = path
    .split('/')
    .filter(Boolean);

  if (
    !firstSegment ||
    ['health', 'version', 'tours', 'supabase-test'].includes(firstSegment)
  ) {
    return 'System';
  }

  if (firstSegment === 'auth') {
    return 'Auth';
  }

  if (firstSegment === 'me') {
    return 'Profile';
  }

  if (firstSegment === 'admin' && secondSegment === 'users') {
    return 'Admin Users';
  }

  if (
    firstSegment === 'admin' &&
    (secondSegment === 'permissions' || thirdSegment === 'permissions')
  ) {
    return 'Admin Permissions';
  }

  if (firstSegment === 'admin' && secondSegment === 'roles') {
    return 'Admin Roles';
  }

  if (['lookups', 'locations', 'services'].includes(firstSegment)) {
    return 'Public Search';
  }

  return titleCase(firstSegment);
};

const inferSummary = (method, path) => `${method.toUpperCase()} ${path}`;

const inferDescription = (method, path, tag) =>
  `Auto-generated from Express routes for ${tag}. Source route: ${method.toUpperCase()} ${path}.`;

const sampleUuid = '11111111-1111-4111-8111-111111111111';
const sampleDateTime = '2026-07-20T09:00:00+07:00';
const sampleEndDateTime = '2026-07-22T18:00:00+07:00';
const sampleCloudinaryUrl =
  'https://res.cloudinary.com/demo/image/upload/net-viet-travel/sample.jpg';

const requestBodyExamples = Object.freeze({
  'DELETE /admin/flight-details/{flight_detail_id}': {
    reason: 'Cancel duplicate flight schedule',
  },
  'DELETE /admin/promotions/{promotionId}': {
    reason: 'Promotion is no longer applicable',
  },
  'DELETE /admin/roles/{roleId}': {
    reason: 'Role is no longer used',
  },
  'DELETE /admin/rooms/{room_type_id}': {
    reason: 'Room type is no longer available',
  },
  'DELETE /admin/services/{service_id}': {
    reason: 'Service is no longer available',
  },
  'DELETE /admin/train-details/{train_detail_id}': {
    reason: 'Cancel duplicate train schedule',
  },
  'DELETE /admin/users/{userId}': {
    reason: 'User left the company',
  },
  'DELETE /admin/vouchers/{voucherId}': {
    reason: 'Voucher campaign ended',
  },
  'DELETE /uploads/cloudinary': {
    public_id: 'net-viet-travel/services/sample-image',
    resource_type: 'image',
  },
  'PATCH /admin/booking-items/{booking_item_id}/status': {
    status: 'confirmed',
    reason: 'Traveller information verified',
  },
  'PATCH /admin/booking-items/{booking_item_id}/traveller-info': {
    traveller_info: {
      full_name: 'Nguyen Van A',
      date_of_birth: '1995-05-20',
      gender: 'male',
      document_number: 'P1234567',
      nationality: 'VN',
    },
  },
  'PATCH /admin/bookings/{booking_id}/status': {
    status: 'confirmed',
    reason: 'Payment was confirmed manually',
  },
  'PATCH /admin/flight-details/{flight_detail_id}': {
    flight_number: 'VN123',
    departure_airport: 'HAN',
    arrival_airport: 'SGN',
    departure_time: sampleDateTime,
    arrival_time: '2026-07-20T11:15:00+07:00',
    total_seats: 120,
    available_seats: 100,
    fare_class: 'economy',
  },
  'PATCH /admin/notifications/{notification_id}/status': {
    status: 'sent',
  },
  'PATCH /admin/payments/{payment_id}/note': {
    note: 'Customer sent bank transfer receipt by email',
  },
  'PATCH /admin/promotions/{promotionId}': {
    name: 'Summer travel promotion',
    description: 'Discount for selected summer services',
    valid_from: '2026-07-01T00:00:00+07:00',
    valid_to: '2026-08-31T23:59:59+07:00',
    target_service_type: 'tour',
  },
  'PATCH /admin/promotions/{promotionId}/status': {
    status: 'active',
  },
  'PATCH /admin/refunds/{refund_id}/note': {
    note: 'Waiting for bank confirmation',
  },
  'PATCH /admin/roles/{roleId}': {
    name: 'Operations Manager',
    description: 'Manages daily booking operations',
    level: 60,
  },
  'PATCH /admin/rooms/{room_type_id}': {
    name: 'Deluxe Double Room',
    bed_type: 'double',
    max_adults: 2,
    max_children: 1,
    total_rooms: 10,
    available_rooms: 8,
    price: 1200000,
    status: 'active',
  },
  'PATCH /admin/services/{service_id}': {
    title: 'Ha Long Bay 2 days 1 night',
    location: 'Ha Long',
    price: 2500000,
    status: 'draft',
    details: {
      duration_days: 2,
      transport_type: 'bus',
      itinerary: ['Depart from Hanoi', 'Cruise Ha Long Bay'],
    },
  },
  'PATCH /admin/services/{service_id}/images/{image_id}': {
    alt_text: 'Main service image',
    sort_order: 1,
    is_primary: true,
  },
  'PATCH /admin/services/{service_id}/inventory': {
    reference_id: sampleUuid,
    available_quantity: 20,
  },
  'PATCH /admin/services/{service_id}/status': {
    status: 'active',
    reason: 'Service content approved',
  },
  'PATCH /admin/services/combos/{service_id}': {
    title: 'Northern Vietnam combo',
    price: 5500000,
    combo_items: [
      {
        service_id: sampleUuid,
        quantity: 1,
      },
    ],
  },
  'PATCH /admin/settings/business': {
    company_name: 'Net Viet Travel Co., Ltd.',
    tax_code: '0312345678',
    address: '123 Nguyen Trai, Ho Chi Minh City',
    invoice_email: 'invoice@example.com',
    invoice_phone: '0900000000',
  },
  'PATCH /admin/settings/direct-payment': {
    methods: [
      {
        code: 'manual_bank_transfer',
        enabled: true,
        bank_name: 'VCB',
        account_number: '0123456789',
        account_holder: 'NET VIET TRAVEL',
        branch: 'Ho Chi Minh',
        transfer_content_template: 'NVT-{booking_code}',
        instructions: 'Transfer with the exact booking code.',
      },
    ],
  },
  'PATCH /admin/settings/public': {
    site_name: 'Net Viet Travel',
    hotline: '0900000000',
    support_email: 'support@example.com',
    address: '123 Nguyen Trai, Ho Chi Minh City',
    social_links: {
      facebook: 'https://facebook.com/netviettravel',
    },
  },
  'PATCH /admin/support/tickets/{ticket_id}': {
    status: 'assigned',
    priority: 'high',
    assigned_to: sampleUuid,
  },
  'PATCH /admin/train-details/{train_detail_id}': {
    train_number: 'SE1',
    departure_station: 'Ha Noi',
    arrival_station: 'Da Nang',
    departure_time: sampleDateTime,
    arrival_time: sampleEndDateTime,
    seat_class: 'soft_seat',
    total_seats: 80,
    available_seats: 60,
  },
  'PATCH /admin/users/{userId}': {
    full_name: 'Tran Thi B',
    phone: '0900000001',
    avatar_url: sampleCloudinaryUrl,
  },
  'PATCH /admin/users/{userId}/role': {
    role_code: 'staff',
  },
  'PATCH /admin/users/{userId}/status': {
    status: 'locked',
    reason: 'Security review requested',
  },
  'PATCH /admin/vouchers/{voucherId}': {
    code: 'SUMMER2026',
    discount_type: 'percent',
    discount_value: 10,
    max_discount_amount: 500000,
    usage_limit: 100,
    per_user_limit: 1,
    valid_from: '2026-07-01T00:00:00+07:00',
    valid_to: '2026-08-31T23:59:59+07:00',
  },
  'PATCH /admin/vouchers/{voucherId}/status': {
    status: 'active',
  },
  'PATCH /bookings/{booking_id}/contact': {
    contact_name: 'Nguyen Van A',
    contact_phone: '0900000000',
    note: 'Please call before departure',
  },
  'PATCH /cart/items/{cartItemId}': {
    quantity: 2,
    start_at: sampleDateTime,
    end_at: sampleEndDateTime,
    options: {
      adults: 2,
      children: 0,
    },
  },
  'PATCH /me': {
    full_name: 'Nguyen Van A',
    phone: '0900000000',
    avatar_url: sampleCloudinaryUrl,
  },
  'PATCH /me/avatar': {
    avatar_url: sampleCloudinaryUrl,
  },
  'PATCH /me/password': {
    current_password: 'OldPassword123!',
    new_password: 'NewPassword123!',
  },
  'PATCH /notifications/bulk-read': {
    notification_ids: [sampleUuid],
  },
  'POST /admin/hotels/{hotel_service_id}/rooms': {
    name: 'Deluxe Double Room',
    bed_type: 'double',
    max_adults: 2,
    max_children: 1,
    total_rooms: 10,
    available_rooms: 10,
    price: 1200000,
    status: 'active',
  },
  'POST /admin/notifications/broadcast': {
    title: 'System maintenance',
    body: 'The system will be maintained tonight.',
    type: 'system',
    target: {
      roles: ['customer'],
    },
  },
  'POST /admin/notifications/users/{user_id}': {
    title: 'Booking updated',
    body: 'Your booking status has changed.',
    type: 'booking_status',
    related_entity: {
      entity_name: 'bookings',
      entity_id: sampleUuid,
    },
  },
  'POST /admin/payments/{payment_id}/confirm': {
    received_amount: 2500000,
    received_at: sampleDateTime,
    collector_note: 'Bank transfer received',
    next_booking_status: 'paid',
  },
  'POST /admin/payments/{payment_id}/expire': {
    reason: 'Payment window expired',
  },
  'POST /admin/payments/{payment_id}/mark-reconciled': {
    note: 'Matched with bank statement',
  },
  'POST /admin/payments/{payment_id}/reject': {
    reason: 'Transfer amount does not match booking total',
  },
  'POST /admin/promotions': {
    name: 'Summer travel promotion',
    description: 'Discount for selected summer services',
    status: 'draft',
    valid_from: '2026-07-01T00:00:00+07:00',
    valid_to: '2026-08-31T23:59:59+07:00',
    target_service_type: 'tour',
  },
  'POST /admin/refunds/{refund_id}/approve': {
    approved_amount: 1000000,
    note: 'Refund request approved',
  },
  'POST /admin/refunds/{refund_id}/mark-failed': {
    reason: 'Bank transfer failed',
  },
  'POST /admin/refunds/{refund_id}/mark-processing': {
    note: 'Refund sent to accounting team',
  },
  'POST /admin/refunds/{refund_id}/mark-success': {
    processed_at: sampleDateTime,
    provider_refund_id: 'BANK-REF-001',
    note: 'Refund completed manually',
  },
  'POST /admin/refunds/{refund_id}/reject': {
    reason: 'Refund policy does not apply',
  },
  'POST /admin/reports/export': {
    report_type: 'revenue',
    format: 'xlsx',
    from: '2026-07-01',
    to: '2026-07-31',
    filters: {
      group_by: 'day',
    },
  },
  'POST /admin/roles': {
    code: 'operations_manager',
    name: 'Operations Manager',
    description: 'Manages daily booking operations',
    level: 60,
  },
  'POST /admin/services': {
    service_type: 'tour',
    title: 'Ha Long Bay 2 days 1 night',
    location: 'Ha Long',
    price: 2500000,
    details: {
      duration_days: 2,
      transport_type: 'bus',
      itinerary: ['Depart from Hanoi', 'Cruise Ha Long Bay'],
    },
  },
  'POST /admin/services/{service_id}/approve': {
    note: 'Content and pricing verified',
  },
  'POST /admin/services/{service_id}/flight-details': {
    flight_number: 'VN123',
    departure_airport: 'HAN',
    arrival_airport: 'SGN',
    departure_time: sampleDateTime,
    arrival_time: '2026-07-20T11:15:00+07:00',
    total_seats: 120,
    available_seats: 120,
    fare_class: 'economy',
  },
  'POST /admin/services/{service_id}/hide': {
    reason: 'Temporarily unavailable',
  },
  'POST /admin/services/{service_id}/images': {
    image_url: sampleCloudinaryUrl,
    cloudinary_public_id: 'net-viet-travel/services/sample-image',
    alt_text: 'Service cover image',
    sort_order: 1,
    is_primary: true,
  },
  'POST /admin/services/{service_id}/reject': {
    reason: 'Missing required service information',
  },
  'POST /admin/services/{service_id}/restore': {
    target_status: 'active',
  },
  'POST /admin/services/{service_id}/train-details': {
    train_number: 'SE1',
    departure_station: 'Ha Noi',
    arrival_station: 'Da Nang',
    departure_time: sampleDateTime,
    arrival_time: sampleEndDateTime,
    seat_class: 'soft_seat',
    total_seats: 80,
    available_seats: 80,
  },
  'POST /admin/services/combos': {
    service_type: 'combo',
    title: 'Northern Vietnam combo',
    price: 5500000,
    combo_items: [
      {
        service_id: sampleUuid,
        quantity: 1,
      },
    ],
  },
  'POST /admin/support/tickets/{ticket_id}/assign': {
    assigned_to: sampleUuid,
  },
  'POST /admin/support/tickets/{ticket_id}/close': {
    reason: 'Issue resolved',
  },
  'POST /admin/support/tickets/{ticket_id}/mark-spam': {
    reason: 'Spam content',
  },
  'POST /admin/support/tickets/{ticket_id}/reopen': {
    reason: 'Customer provided more information',
  },
  'POST /admin/support/tickets/{ticket_id}/replies': {
    message: 'We are checking this request.',
    is_internal_note: false,
  },
  'POST /admin/support/tickets/{ticket_id}/send-email': {
    subject: 'Support update',
    message: 'We have updated your support request.',
  },
  'POST /admin/support/tickets/{ticket_id}/send-emails': {
    subject: 'Support update',
    message: 'We have updated your support request.',
  },
  'POST /admin/users': {
    email: 'staff@example.com',
    password: 'Password123!',
    full_name: 'Tran Thi B',
    phone: '0900000001',
    role_code: 'staff',
  },
  'POST /admin/vouchers': {
    promotion_id: sampleUuid,
    code: 'SUMMER2026',
    discount_type: 'percent',
    discount_value: 10,
    max_discount_amount: 500000,
    usage_limit: 100,
    per_user_limit: 1,
    valid_from: '2026-07-01T00:00:00+07:00',
    valid_to: '2026-08-31T23:59:59+07:00',
  },
  'POST /admin/vouchers/{voucherId}/duplicate': {
    new_code: 'SUMMER2026_COPY',
    valid_from: '2026-07-01T00:00:00+07:00',
    valid_to: '2026-08-31T23:59:59+07:00',
  },
  'POST /auth/change-email/confirm': {
    token: 'change-email-token-from-email',
  },
  'POST /auth/change-email/request': {
    new_email: 'new-email@example.com',
  },
  'POST /auth/forgot-password': {
    email: 'customer@example.com',
  },
  'POST /auth/login': {
    email: 'customer@example.com',
    password: 'Password123!',
  },
  'POST /auth/logout': {
    refresh_token: 'refresh-token-from-login',
  },
  'POST /auth/refresh-token': {
    refresh_token: 'refresh-token-from-login',
  },
  'POST /auth/register': {
    email: 'customer@example.com',
    password: 'Password123!',
    full_name: 'Nguyen Van A',
    phone: '0900000000',
  },
  'POST /auth/resend-verification': {
    email: 'customer@example.com',
  },
  'POST /auth/reset-password': {
    token: 'reset-password-token-from-email',
    new_password: 'NewPassword123!',
  },
  'POST /auth/verify-email': {
    token: 'verification-token-from-email',
  },
  'POST /bookings/{booking_id}/cancel-request': {
    reason: 'Customer cannot join this trip',
  },
  'POST /bookings/{booking_id}/direct-payments': {
    payment_method: 'manual_bank_transfer',
    payer_name: 'Nguyen Van A',
    payer_phone: '0900000000',
    note: 'Transferred from VCB',
  },
  'POST /bookings/{booking_id}/refunds': {
    payment_id: sampleUuid,
    amount: 1000000,
    reason: 'Customer requested cancellation',
  },
  'POST /bookings/checkout': {
    cart_id: sampleUuid,
    contact_name: 'Nguyen Van A',
    contact_phone: '0900000000',
    contact_email: 'customer@example.com',
    voucher_code: 'SUMMER2026',
    travellers: [
      {
        full_name: 'Nguyen Van A',
        date_of_birth: '1995-05-20',
        gender: 'male',
        document_number: 'P1234567',
        nationality: 'VN',
      },
    ],
    note: 'Vegetarian meal if available',
  },
  'POST /cart/apply-voucher': {
    code: 'SUMMER2026',
  },
  'POST /cart/items': {
    service_id: sampleUuid,
    service_type: 'tour',
    reference_id: sampleUuid,
    start_at: sampleDateTime,
    end_at: sampleEndDateTime,
    quantity: 2,
    options: {
      adults: 2,
      children: 0,
    },
  },
  'POST /cart/merge': {
    guest_items: [
      {
        service_id: sampleUuid,
        service_type: 'tour',
        quantity: 1,
      },
    ],
  },
  'POST /cart/validate': {
    voucher_code: 'SUMMER2026',
  },
  'POST /me/account-deactivation-request': {
    reason: 'I no longer use this account',
  },
  'POST /payments/{payment_id}/cancel': {
    reason: 'Customer wants to use another payment method',
  },
  'POST /payments/{payment_id}/proof': {
    proof_image_url: sampleCloudinaryUrl,
    transfer_note: 'Transferred via VCB',
    bank_transaction_code: 'VCB123456',
  },
  'POST /refunds/{refund_id}/cancel': {
    reason: 'Customer changed mind',
  },
  'POST /services/{service_id}/availability': {
    service_type: 'tour',
    reference_id: sampleUuid,
    start_at: sampleDateTime,
    end_at: sampleEndDateTime,
    quantity: 2,
  },
  'POST /support/tickets': {
    customer_name: 'Nguyen Van A',
    customer_email: 'customer@example.com',
    customer_phone: '0900000000',
    subject: 'Need help with my booking',
    message: 'Please help me update traveller information.',
    booking_id: sampleUuid,
    service_id: sampleUuid,
  },
  'POST /support/tickets/{ticket_id}/close': {
    reason: 'Issue resolved',
  },
  'POST /support/tickets/{ticket_id}/replies': {
    message: 'Here is more information about my request.',
  },
  'POST /uploads/complete': {
    asset_url: sampleCloudinaryUrl,
    public_id: 'net-viet-travel/services/sample-image',
    resource_type: 'image',
    purpose: 'service_image',
  },
  'POST /uploads/signature': {
    folder: 'services',
    resource_type: 'image',
  },
  'POST /vouchers/validate': {
    code: 'SUMMER2026',
    cart_id: sampleUuid,
  },
  'PUT /admin/roles/{roleId}/permissions': {
    permission_codes: ['user.read_all', 'booking.read_all'],
  },
  'PUT /admin/services/{service_id}/images/reorder': {
    image_orders: [
      {
        image_id: sampleUuid,
        sort_order: 1,
      },
    ],
  },
});

const emptyRequestBodyExamples = new Set([
  'DELETE /admin/services/{service_id}/images/{image_id}',
  'DELETE /cart/items',
  'DELETE /cart/items/{cartItemId}',
  'DELETE /cart/voucher',
  'DELETE /notifications/{notification_id}',
  'PATCH /notifications/{notification_id}/read',
  'PATCH /notifications/read-all',
  'POST /admin/bookings/{booking_id}/resend-confirmation-email',
  'POST /admin/email-logs/{email_log_id}/resend',
  'POST /admin/services/{service_id}/submit-review',
  'POST /admin/users/{userId}/resend-verification-email',
]);

const cloneExample = (value) => JSON.parse(JSON.stringify(value));

const getRequestBodyExample = (method, path) => {
  const key = `${method.toUpperCase()} ${path}`;

  if (Object.prototype.hasOwnProperty.call(requestBodyExamples, key)) {
    return cloneExample(requestBodyExamples[key]);
  }

  if (emptyRequestBodyExamples.has(key)) {
    return {};
  }

  return {
    // Add the fields required by this endpoint before sending.
  };
};

const getHandlerSource = (handler) => {
  if (typeof handler !== 'function') {
    return '';
  }

  return Function.prototype.toString.call(handler);
};

const isAuthMiddleware = (handler) => {
  const source = getHandlerSource(handler);

  return AUTH_MIDDLEWARE_MARKERS.some((marker) => source.includes(marker));
};

const matchLayerPath = (layer, samplePath) => {
  if (!Array.isArray(layer?.matchers)) {
    return null;
  }

  for (const matcher of layer.matchers) {
    const result = matcher(samplePath);

    if (result) {
      return result.path || null;
    }
  }

  return null;
};

const detectMountPath = (layer, samplePaths = []) => {
  for (const samplePath of samplePaths) {
    const matchedPath = matchLayerPath(layer, samplePath);

    if (matchedPath) {
      return matchedPath;
    }
  }

  return null;
};

const buildRouteSamplePath = (basePath, routePath) =>
  toConcreteSamplePath(joinPaths(basePath, routePath));

const routeUsesAuth = (routeLayer, authGuards, basePath) => {
  const routeHasAuthMiddleware = routeLayer.route.stack.some((stackLayer) =>
    isAuthMiddleware(stackLayer.handle),
  );

  if (routeHasAuthMiddleware) {
    return true;
  }

  const samplePath = buildRouteSamplePath(basePath, routeLayer.route.path);

  return authGuards.some((guardLayer) => Boolean(matchLayerPath(guardLayer, samplePath)));
};

const createOperation = ({ method, path, requiresAuth }) => {
  const normalizedMethod = method.toLowerCase();
  const tag = inferTagFromPath(path);
  const requestBodyMethods = new Set(['post', 'put', 'patch', 'delete']);
  const operation = {
    tags: [tag],
    summary: inferSummary(normalizedMethod, path),
    description: inferDescription(normalizedMethod, path, tag),
    parameters: extractPathParameters(path),
    responses: {
      200: {
        description: 'Successful response',
        content: jsonContent(successEnvelope),
      },
      400: {
        description: 'Validation or malformed request',
        content: jsonContent(errorEnvelope),
      },
      404: {
        description: 'Resource not found',
        content: jsonContent(errorEnvelope),
      },
      429: {
        description: 'Rate limit exceeded',
        content: jsonContent(errorEnvelope),
      },
    },
  };

  if (requiresAuth) {
    operation.security = [{ bearerAuth: [] }];
    operation.responses[401] = {
      description: 'Authentication required or token invalid',
      content: jsonContent(errorEnvelope),
    };
    operation.responses[403] = {
      description: 'Forbidden',
      content: jsonContent(errorEnvelope),
    };
  }

  if (requestBodyMethods.has(normalizedMethod)) {
    const requestBodyExample = getRequestBodyExample(normalizedMethod, path);

    operation.requestBody = {
      required: false,
      content: jsonContent(
        {
          type: 'object',
          additionalProperties: true,
        },
        requestBodyExample,
      ),
    };
  }

  return operation;
};

const collectRoutesFromLayers = (layers, basePath = '', authGuards = []) => {
  const paths = {};
  const activeAuthGuards = [...authGuards];

  for (const layer of layers) {
    if (layer.route) {
      const routePath = joinPaths(basePath, layer.route.path);
      const normalizedPath = normalizePathForSpec(routePath);

      if (
        !normalizedPath.startsWith('/') ||
        normalizedPath.startsWith('/docs') ||
        normalizedPath.startsWith('/swagger-ui')
      ) {
        continue;
      }

      const methods = Object.keys(layer.route.methods || {}).filter((method) =>
        HTTP_METHODS.has(method),
      );

      if (methods.length === 0) {
        continue;
      }

      const requiresAuth = routeUsesAuth(layer, activeAuthGuards, basePath);

      paths[normalizedPath] = paths[normalizedPath] || {};

      for (const method of methods) {
        paths[normalizedPath][method] = createOperation({
          method,
          path: normalizedPath,
          requiresAuth,
        });
      }

      continue;
    }

    if (isAuthMiddleware(layer.handle)) {
      activeAuthGuards.push(layer);
      continue;
    }

    if (Array.isArray(layer.handle?.stack)) {
      const childRouteSamples = layer.handle.stack
        .filter((childLayer) => childLayer.route?.path)
        .map((childLayer) => toConcreteSamplePath(childLayer.route.path));
      const nestedMountPath = detectMountPath(layer, childRouteSamples);
      const nestedBasePath = nestedMountPath
        ? joinPaths(basePath, nestedMountPath)
        : basePath;
      const nestedPaths = collectRoutesFromLayers(
        layer.handle.stack,
        nestedBasePath,
        activeAuthGuards,
      );

      Object.assign(paths, nestedPaths);
    }
  }

  return paths;
};

const buildOpenApiSpec = (app) => {
  const rootPaths = {};
  const layers = app?.router?.stack || [];

  for (const layer of layers) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {}).filter((method) =>
        HTTP_METHODS.has(method),
      );
      const normalizedPath = normalizePathForSpec(layer.route.path);

      if (!normalizedPath.startsWith('/')) {
        continue;
      }

      rootPaths[normalizedPath] = rootPaths[normalizedPath] || {};

      for (const method of methods) {
        rootPaths[normalizedPath][method] = createOperation({
          method,
          path: normalizedPath,
          requiresAuth: routeUsesAuth(layer, [], ''),
        });
      }

      continue;
    }

    if (!Array.isArray(layer.handle?.stack)) {
      continue;
    }

    const mountPath = detectMountPath(layer, ROUTE_PROBE_CANDIDATES);

    if (!mountPath || mountPath !== apiPrefix) {
      continue;
    }

    Object.assign(rootPaths, collectRoutesFromLayers(layer.handle.stack, mountPath));
  }

  const orderedPaths = Object.fromEntries(
    Object.entries(rootPaths).sort(([leftPath], [rightPath]) =>
      leftPath.localeCompare(rightPath),
    ),
  );

  return {
    openapi: '3.0.3',
    info: {
      title: 'Net Viet Travel API',
      version: backendPackage.version,
      description:
        'Auto-generated Swagger document from the mounted Express routes. New API routes appear automatically after they are registered in the app.',
    },
    servers: [
      {
        url: `${backendUrl}${apiPrefix}`,
        description: `${env} API server`,
      },
    ],
    tags: [
      { name: 'System', description: 'Health, version, and smoke endpoints.' },
      { name: 'Auth', description: 'Authentication and account recovery.' },
      { name: 'Profile', description: 'Current user profile management.' },
      { name: 'Admin Users', description: 'Internal user administration.' },
      { name: 'Admin Roles', description: 'Role management.' },
      { name: 'Admin Permissions', description: 'Permission catalog and assignment.' },
      { name: 'Public Search', description: 'Public lookups and service search.' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: orderedPaths,
  };
};

const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Net Viet Travel Swagger UI',
  explorer: true,
  swaggerOptions: {
    url: './openapi.json',
    defaultModelsExpandDepth: 1,
    displayRequestDuration: true,
    docExpansion: 'list',
    persistAuthorization: true,
  },
};

const removeSwaggerCsp = (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
};

const renderFallbackSwaggerHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Net Viet Travel Swagger UI</title>
  </head>
  <body>
    <div id="swagger-ui">Swagger UI is unavailable because swagger-ui-express is not installed.</div>
    <script src="./swagger-ui-bundle.js"></script>
  </body>
</html>`;

const createSwaggerRouter = () => {
  const router = express.Router();

  router.get('/openapi.json', (req, res) => {
    res.json(buildOpenApiSpec(req.app));
  });

  if (!swaggerUi) {
    const fallbackHandler = (req, res) => {
      res.type('html').send(renderFallbackSwaggerHtml());
    };

    router.get('/', fallbackHandler);
    router.get('/index.html', fallbackHandler);

    return router;
  }

  const swaggerUiHandler = swaggerUi.setup(null, swaggerUiOptions);

  router.get('/', swaggerUiHandler);
  router.get('/index.html', swaggerUiHandler);
  router.use(swaggerUi.serve);

  return router;
};

module.exports = {
  buildOpenApiSpec,
  createSwaggerRouter,
  removeSwaggerCsp,
};
