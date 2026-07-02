const {
  API_ERROR_CODES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminPaymentRepository,
} = require('../database/adminPaymentRepository');
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

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Payment not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

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

const ensureAllowedRole = (auth) => {
  if (!['staff', 'admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }
};

const ensureReadAllAccess = (auth) => {
  ensureAllowedRole(auth);
  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (permissionCodes.includes('payment.read_all')) {
    return;
  }

  throw buildForbiddenError();
};

const ensureProofAccess = (auth) => {
  ensureAllowedRole(auth);
  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (
    permissionCodes.includes('payment.read_all') ||
    permissionCodes.includes('payment.confirm')
  ) {
    return;
  }

  throw buildForbiddenError();
};

const sanitizeProof = (rawResponse) => {
  const proof = rawResponse?.proof;

  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return null;
  }

  return {
    bank_transaction_code: proof.bank_transaction_code || null,
    proof_image_url: proof.proof_image_url || null,
    submitted_at: proof.submitted_at || null,
    transfer_note: proof.transfer_note || null,
  };
};

const sanitizePaymentListItem = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    id: row.booking_id,
    status: row.booking_status,
  },
  created_at: row.created_at,
  currency: row.currency || DEFAULT_CURRENCY,
  customer: {
    email: row.customer_email || null,
    full_name: row.customer_full_name || null,
    id: row.customer_id || null,
    phone: row.customer_phone || null,
  },
  expired_at: row.expired_at,
  has_proof: Boolean(sanitizeProof(row.raw_response)),
  id: row.id,
  paid_at: row.paid_at,
  payment_code: row.payment_code,
  payment_method: row.payment_method,
  provider: row.provider,
  status: row.status,
  updated_at: row.updated_at || null,
});

const sanitizePaymentDetail = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    contact_email: row.contact_email || null,
    contact_name: row.contact_name || null,
    contact_phone: row.contact_phone || null,
    created_at: row.booking_created_at || null,
    currency: row.booking_currency || DEFAULT_CURRENCY,
    expires_at: row.booking_expires_at || null,
    id: row.booking_id,
    status: row.booking_status,
    total_amount: roundMoney(row.booking_total_amount),
  },
  created_at: row.created_at,
  currency: row.currency || DEFAULT_CURRENCY,
  customer: {
    email: row.customer_email || null,
    full_name: row.customer_full_name || null,
    id: row.customer_id || null,
    phone: row.customer_phone || null,
  },
  expired_at: row.expired_at,
  id: row.id,
  paid_at: row.paid_at,
  payment_code: row.payment_code,
  payment_method: row.payment_method,
  proof_summary: sanitizeProof(row.raw_response),
  provider: row.provider,
  status: row.status,
  updated_at: row.updated_at || null,
});

const sanitizePaymentProofDetail = (row) => ({
  amount: roundMoney(row.amount),
  booking_code: row.booking_code,
  currency: row.currency || DEFAULT_CURRENCY,
  payment_code: row.payment_code,
  payment_id: row.id,
  proof: sanitizeProof(row.raw_response),
  status: row.status,
});

const parseListQuery = (query = {}) => {
  const provider = parseOptionalEnum(
    'provider',
    query.provider,
    PAYMENT_PROVIDER_VALUES,
  );
  const method = parseOptionalEnum(
    'method',
    query.method,
    PAYMENT_METHOD_VALUES,
  );
  const status = parseOptionalEnum(
    'status',
    query.status,
    PAYMENT_STATUS_VALUES,
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
    method,
    page: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: query.page,
    }),
    provider,
    status,
    to,
  };
};

const createAdminPaymentService = ({
  repository = createAdminPaymentRepository(),
} = {}) => {
  const listPayments = async ({
    auth,
    query,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listPayments({
      from: parsedQuery.from,
      limit: parsedQuery.limit,
      method: parsedQuery.method,
      offset,
      provider: parsedQuery.provider,
      status: parsedQuery.status,
      to: parsedQuery.to,
    });

    return {
      items: result.rows.map(sanitizePaymentListItem),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getPaymentDetail = async ({
    auth,
    payment_id: paymentId,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    return sanitizePaymentDetail(payment);
  };

  const getPaymentProof = async ({
    auth,
    payment_id: paymentId,
  } = {}) => {
    ensureProofAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    return sanitizePaymentProofDetail(payment);
  };

  return {
    getPaymentDetail,
    getPaymentProof,
    listPayments,
  };
};

module.exports = Object.assign(createAdminPaymentService(), {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  MAX_LIST_LIMIT,
  createAdminPaymentService,
});
