const {
  API_ERROR_CODES,
  REFUND_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminRefundRepository,
} = require('../database/adminRefundRepository');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const MAX_LIST_LIMIT = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildValidationError = (field, message) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        message,
      },
    ],
    statusCode: 400,
  });

const buildForbiddenError = (
  message = 'You do not have permission to access this resource',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Refund not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizePermissionCodes = (auth) => {
  const rawPermissions =
    auth?.tokenPayload?.permission_codes ||
    auth?.tokenPayload?.permissionCodes ||
    auth?.tokenPayload?.permissions ||
    [];

  if (!Array.isArray(rawPermissions)) {
    return [];
  }

  return rawPermissions
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && typeof entry.code === 'string') {
        return entry.code.trim();
      }

      return null;
    })
    .filter(Boolean);
};

const ensureReadAllAccess = (auth) => {
  if (!['staff', 'admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (permissionCodes.includes('refund.read_all')) {
    return;
  }

  throw buildForbiddenError();
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parsePositiveInteger = ({
  defaultValue,
  field,
  max,
  value,
}) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError(field, `${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to 1`,
    );
  }

  if (parsed > max) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${max}`,
    );
  }

  return parsed;
};

const parseOptionalEnum = (field, value, allowedValues) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  if (!allowedValues.includes(value)) {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  return value;
};

const parseOptionalDate = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  const parsed = new Date(value.trim());

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  return parsed.toISOString();
};

const parseListQuery = (query = {}) => {
  const status = parseOptionalEnum(
    'status',
    query.status,
    REFUND_STATUS_VALUES,
  );
  const from = parseOptionalDate('from', query.from);
  const to = parseOptionalDate('to', query.to);

  if (from && to && from > to) {
    throw buildValidationError('date_range', 'from must be less than or equal to to');
  }

  return {
    from,
    limit: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_LIMIT,
      field: 'limit',
      max: MAX_LIST_LIMIT,
      value: query.limit,
    }),
    page: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: query.page,
    }),
    status,
    to,
  };
};

const buildPaginationMeta = ({
  limit,
  page,
  total,
}) => {
  const normalizedTotal = Number(total || 0);
  const totalPages = normalizedTotal === 0
    ? 0
    : Math.ceil(normalizedTotal / limit);

  return {
    has_next: normalizedTotal > 0 && page < totalPages,
    limit,
    page,
    total: normalizedTotal,
    total_pages: totalPages,
  };
};

const sanitizeInternalNote = (rawResponse) => {
  const internalNote =
    rawResponse?.internal_note ||
    rawResponse?.internal_notes ||
    null;

  if (!internalNote) {
    return null;
  }

  if (typeof internalNote === 'string') {
    return {
      note: internalNote,
      updated_at: null,
      updated_by_user_id: null,
    };
  }

  if (typeof internalNote !== 'object' || Array.isArray(internalNote)) {
    return null;
  }

  return {
    note: internalNote.note || null,
    updated_at: internalNote.updated_at || null,
    updated_by_user_id: internalNote.updated_by_user_id || null,
  };
};

const sanitizeCancellation = (rawResponse) => {
  const cancellation = rawResponse?.cancellation;

  if (!cancellation || typeof cancellation !== 'object' || Array.isArray(cancellation)) {
    return null;
  }

  return {
    cancelled_at: cancellation.cancelled_at || null,
    cancelled_by: cancellation.cancelled_by || null,
    reason: cancellation.reason || null,
  };
};

const sanitizeUserSummary = ({
  email,
  full_name,
  id,
  phone,
}) => {
  if (!id && !full_name && !email && !phone) {
    return null;
  }

  return {
    email: email || null,
    full_name: full_name || null,
    id: id || null,
    phone: phone || null,
  };
};

const sanitizeRefundListItem = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    id: row.booking_id,
    status: row.booking_status,
  },
  created_at: row.created_at,
  currency: row.payment_currency || row.booking_currency || DEFAULT_CURRENCY,
  id: row.id,
  payment: {
    amount: roundMoney(row.payment_amount),
    currency: row.payment_currency || DEFAULT_CURRENCY,
    id: row.payment_id,
    paid_at: row.payment_paid_at || null,
    payment_code: row.payment_code,
    payment_method: row.payment_method,
    provider: row.payment_provider,
    status: row.payment_status,
  },
  processed_at: row.processed_at,
  reason: row.reason,
  refund_code: row.refund_code,
  requested_by: sanitizeUserSummary({
    email: row.requested_by_email,
    full_name: row.requested_by_full_name,
    id: row.requested_by_user_id,
    phone: row.requested_by_phone,
  }),
  status: row.status,
});

const sanitizeRefundDetail = (row) => ({
  amount: roundMoney(row.amount),
  approved_by: sanitizeUserSummary({
    email: row.approved_by_email,
    full_name: row.approved_by_full_name,
    id: row.approved_by_user_id,
    phone: row.approved_by_phone,
  }),
  booking: {
    booking_code: row.booking_code,
    contact_email: row.contact_email || null,
    contact_name: row.contact_name || null,
    contact_phone: row.contact_phone || null,
    created_at: row.booking_created_at || null,
    currency: row.booking_currency || DEFAULT_CURRENCY,
    customer: sanitizeUserSummary({
      email: row.customer_email,
      full_name: row.customer_full_name,
      id: row.customer_id,
      phone: row.customer_phone,
    }),
    expires_at: row.booking_expires_at || null,
    id: row.booking_id,
    status: row.booking_status,
    total_amount: roundMoney(row.booking_total_amount),
  },
  cancellation: sanitizeCancellation(row.raw_response),
  created_at: row.created_at,
  id: row.id,
  internal_note: sanitizeInternalNote(row.raw_response),
  payment: {
    amount: roundMoney(row.payment_amount),
    currency: row.payment_currency || DEFAULT_CURRENCY,
    id: row.payment_id,
    paid_at: row.payment_paid_at || null,
    payment_code: row.payment_code,
    payment_method: row.payment_method,
    provider: row.payment_provider,
    status: row.payment_status,
  },
  processed_at: row.processed_at,
  provider_refund_id: row.provider_refund_id || null,
  reason: row.reason,
  refund_code: row.refund_code,
  requested_by: sanitizeUserSummary({
    email: row.requested_by_email,
    full_name: row.requested_by_full_name,
    id: row.requested_by_user_id,
    phone: row.requested_by_phone,
  }),
  status: row.status,
});

const createAdminRefundService = ({
  repository = createAdminRefundRepository(),
} = {}) => {
  const listRefunds = async ({
    auth,
    query,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listRefunds({
      allowedServiceIds: resolveScopeServiceIds(auth),
      from: parsedQuery.from,
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      to: parsedQuery.to,
    });

    return {
      items: result.rows.map(sanitizeRefundListItem),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getRefundDetail = async ({
    auth,
    refund_id: refundId,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const refund = await repository.getRefundById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    return sanitizeRefundDetail(refund);
  };

  return {
    getRefundDetail,
    listRefunds,
  };
};

module.exports = Object.assign(createAdminRefundService(), {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  MAX_LIST_LIMIT,
  createAdminRefundService,
});
