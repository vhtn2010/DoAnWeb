const {
  API_ERROR_CODES,
  BOOKING_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_STATUS_VALUES,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminReportRepository,
} = require('../database/adminReportRepository');
const AppError = require('../utils/AppError');

const REPORT_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const REPORT_REQUIRED_PERMISSION = 'report.read';
const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const REPORT_TIMEZONE_OFFSET_MINUTES = 7 * 60;
const DEFAULT_TOP_SERVICE_LIMIT = 5;
const DEFAULT_RECENT_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const GROUP_BY_VALUES = Object.freeze([
  'day',
  'week',
  'month',
]);

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

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const padNumber = (value, length = 2) => String(value).padStart(length, '0');

const normalizeAuth = (auth) => ({
  role: auth?.role || auth?.roleCode || null,
  tokenPayload: auth?.tokenPayload || null,
  userId: auth?.userId || auth?.user?.id || null,
});

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

const ensureReportReadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !REPORT_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (!permissionCodes.includes(REPORT_REQUIRED_PERMISSION)) {
    throw buildForbiddenError();
  }

  return actor;
};

const toTimezoneShiftedDate = (date) =>
  new Date(date.getTime() + (REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000));

const getTimezoneParts = (date) => {
  const shifted = toTimezoneShiftedDate(date);

  return {
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    milliseconds: shifted.getUTCMilliseconds(),
    minutes: shifted.getUTCMinutes(),
    month: shifted.getUTCMonth() + 1,
    seconds: shifted.getUTCSeconds(),
    year: shifted.getUTCFullYear(),
  };
};

const createUtcDateFromTimezoneParts = ({
  day,
  hours = 0,
  milliseconds = 0,
  minutes = 0,
  month,
  seconds = 0,
  year,
}) =>
  new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
      milliseconds,
    ) - (REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000),
  );

const formatRangeDateTime = (date) => {
  const parts = getTimezoneParts(date);

  return `${parts.year}-${padNumber(parts.month)}-${padNumber(parts.day)}T${padNumber(parts.hours)}:${padNumber(parts.minutes)}:${padNumber(parts.seconds)}.${padNumber(parts.milliseconds, 3)}+07:00`;
};

const formatPeriodKey = (date) => {
  const parts = getTimezoneParts(date);

  return `${parts.year}-${padNumber(parts.month)}-${padNumber(parts.day)}`;
};

const parseDateQuery = ({
  field,
  rangeEdge,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid date or ISO datetime`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [yearText, monthText, dayText] = normalized.split('-');
    const year = Number.parseInt(yearText, 10);
    const month = Number.parseInt(monthText, 10);
    const day = Number.parseInt(dayText, 10);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));

    if (
      calendarCheck.getUTCFullYear() !== year ||
      (calendarCheck.getUTCMonth() + 1) !== month ||
      calendarCheck.getUTCDate() !== day
    ) {
      throw buildValidationError(field, `${field} must be a valid date or ISO datetime`);
    }

    return createUtcDateFromTimezoneParts({
      day,
      hours: rangeEdge === 'start' ? 0 : 23,
      milliseconds: rangeEdge === 'start' ? 0 : 999,
      minutes: rangeEdge === 'start' ? 0 : 59,
      month,
      seconds: rangeEdge === 'start' ? 0 : 59,
      year,
    });
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid date or ISO datetime`);
  }

  return parsed;
};

const startOfTimezoneDay = (date) => {
  const parts = getTimezoneParts(date);

  return createUtcDateFromTimezoneParts({
    day: parts.day,
    month: parts.month,
    year: parts.year,
  });
};

const addTimezoneDays = (date, dayCount) =>
  new Date(date.getTime() + (dayCount * DAY_MS));

const addTimezoneMonths = (date, monthCount) => {
  const parts = getTimezoneParts(date);

  return createUtcDateFromTimezoneParts({
    day: 1,
    month: parts.month + monthCount,
    year: parts.year,
  });
};

const startOfTimezoneWeek = (date) => {
  const startOfDay = startOfTimezoneDay(date);
  const shifted = toTimezoneShiftedDate(startOfDay);
  const dayOfWeek = shifted.getUTCDay();
  const dayOffset = (dayOfWeek + 6) % 7;

  return addTimezoneDays(startOfDay, -dayOffset);
};

const startOfTimezoneMonth = (date) => {
  const parts = getTimezoneParts(date);

  return createUtcDateFromTimezoneParts({
    day: 1,
    month: parts.month,
    year: parts.year,
  });
};

const startOfBucket = (date, groupBy) => {
  if (groupBy === 'week') {
    return startOfTimezoneWeek(date);
  }

  if (groupBy === 'month') {
    return startOfTimezoneMonth(date);
  }

  return startOfTimezoneDay(date);
};

const addBucket = (date, groupBy) => {
  if (groupBy === 'week') {
    return addTimezoneDays(date, 7);
  }

  if (groupBy === 'month') {
    return addTimezoneMonths(date, 1);
  }

  return addTimezoneDays(date, 1);
};

const parseOptionalEnum = (field, value, allowedValues) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string' || !allowedValues.includes(value)) {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  return value;
};

const parseGroupBy = (value) => {
  if (value == null || value === '') {
    return 'day';
  }

  if (Array.isArray(value) || typeof value !== 'string' || !GROUP_BY_VALUES.includes(value)) {
    throw buildValidationError(
      'group_by',
      `group_by must be one of: ${GROUP_BY_VALUES.join(', ')}`,
    );
  }

  return value;
};

const normalizeRequiredRange = (query = {}) => {
  const from = parseDateQuery({
    field: 'from',
    rangeEdge: 'start',
    value: query.from,
  });
  const to = parseDateQuery({
    field: 'to',
    rangeEdge: 'end',
    value: query.to,
  });

  if (!from) {
    throw buildValidationError('from', 'from is required');
  }

  if (!to) {
    throw buildValidationError('to', 'to is required');
  }

  if (from.getTime() > to.getTime()) {
    throw buildValidationError('from', 'from must be less than or equal to to');
  }

  if ((to.getTime() - from.getTime()) > (MAX_RANGE_DAYS * DAY_MS)) {
    throw buildValidationError(
      'to',
      `The requested date range must be less than or equal to ${MAX_RANGE_DAYS} days`,
    );
  }

  return {
    from,
    to,
  };
};

const buildRangePayload = ({
  from,
  to,
}) => ({
  from: formatRangeDateTime(from),
  timezone: REPORT_TIMEZONE,
  to: formatRangeDateTime(to),
});

const buildZeroFilledBuckets = ({
  from,
  groupBy,
  rows,
  to,
  valueFactory,
}) => {
  const byPeriod = new Map(
    (rows || []).map((row) => [
      row.period_key,
      row,
    ]),
  );
  const buckets = [];

  for (
    let cursor = startOfBucket(from, groupBy);
    cursor.getTime() <= startOfBucket(to, groupBy).getTime();
    cursor = addBucket(cursor, groupBy)
  ) {
    const periodKey = formatPeriodKey(cursor);
    buckets.push(valueFactory({
      periodKey,
      row: byPeriod.get(periodKey),
    }));
  }

  return buckets;
};

const buildEnumBreakdown = (values, rows, {
  keyField,
  valueField = 'total_count',
}) => {
  const breakdown = values.reduce((accumulator, value) => {
    accumulator[value] = 0;
    return accumulator;
  }, {});

  for (const row of rows || []) {
    const key = row?.[keyField];

    if (!key || !Object.prototype.hasOwnProperty.call(breakdown, key)) {
      continue;
    }

    breakdown[key] = Number(row[valueField] || 0);
  }

  return breakdown;
};

const sanitizeRecentBooking = (row) => ({
  booking_code: row.booking_code,
  created_at: row.created_at,
  currency: row.currency || 'VND',
  status: row.status,
  total_amount: roundMoney(row.total_amount),
});

const sanitizeTopService = (row) => ({
  booked_quantity: Number(row.booked_quantity || 0),
  booked_value: roundMoney(row.booked_value),
  booking_item_count: Number(row.booking_item_count || 0),
  is_deleted: Boolean(row.deleted_at),
  service_code: row.service_code,
  service_id: row.id,
  service_type: row.service_type,
  status: row.status,
  title: row.title,
});

const sanitizeRecentPayment = (row) => ({
  amount: roundMoney(row.amount),
  booking_code: row.booking_code,
  created_at: row.created_at,
  currency: row.currency || 'VND',
  has_proof: Boolean(row.has_proof),
  paid_at: row.paid_at || null,
  payment_code: row.payment_code,
  payment_method: row.payment_method,
  provider: row.provider,
  status: row.status,
});

const createAdminReportService = ({
  repository = createAdminReportRepository(),
} = {}) => {
  const getRevenueReport = async ({
    auth,
    query,
  } = {}) => {
    ensureReportReadAccess(auth);

    const range = normalizeRequiredRange(query || {});
    const groupBy = parseGroupBy(query?.group_by);
    const [summaryRow, periodRows, missingPaidAtCount] = await Promise.all([
      repository.getRevenueSummary({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      }),
      repository.getRevenuePeriods({
        from: range.from.toISOString(),
        groupBy,
        timezone: REPORT_TIMEZONE,
        to: range.to.toISOString(),
      }),
      repository.countRevenuePaymentsMissingPaidAt(),
    ]);
    const grossRevenue = roundMoney(summaryRow?.gross_revenue);
    const refundAmount = roundMoney(summaryRow?.refund_amount);
    const data = {
      group_by: groupBy,
      periods: buildZeroFilledBuckets({
        from: range.from,
        groupBy,
        rows: periodRows,
        to: range.to,
        valueFactory: ({
          periodKey,
          row,
        }) => {
          const periodGrossRevenue = roundMoney(row?.gross_revenue);
          const periodRefundAmount = roundMoney(row?.refund_amount);

          return {
            gross_revenue: periodGrossRevenue,
            net_revenue: roundMoney(periodGrossRevenue - periodRefundAmount),
            payment_count: Number(row?.payment_count || 0),
            period: periodKey,
            refund_amount: periodRefundAmount,
          };
        },
      }),
      range: buildRangePayload(range),
      summary: {
        gross_revenue: grossRevenue,
        net_revenue: roundMoney(grossRevenue - refundAmount),
        payment_count: Number(summaryRow?.payment_count || 0),
        refund_amount: refundAmount,
        refund_count: Number(summaryRow?.refund_count || 0),
      },
    };

    if (missingPaidAtCount > 0) {
      data.warnings = [
        {
          code: 'PAYMENTS_MISSING_PAID_AT',
          count: missingPaidAtCount,
          message: 'Successful or reconciled payments without paid_at are excluded from revenue buckets',
        },
      ];
    }

    return data;
  };

  const getBookingReport = async ({
    auth,
    query,
  } = {}) => {
    ensureReportReadAccess(auth);

    const range = normalizeRequiredRange(query || {});
    const status = parseOptionalEnum('status', query?.status, BOOKING_STATUS_VALUES);
    const [summaryRow, statusRows, recentRows] = await Promise.all([
      repository.getBookingSummary({
        from: range.from.toISOString(),
        status,
        to: range.to.toISOString(),
      }),
      repository.getBookingStatusBreakdown({
        from: range.from.toISOString(),
        status,
        to: range.to.toISOString(),
      }),
      repository.listRecentBookings({
        from: range.from.toISOString(),
        limit: DEFAULT_RECENT_LIMIT,
        status,
        to: range.to.toISOString(),
      }),
    ]);

    return {
      filters: {
        status,
      },
      range: buildRangePayload(range),
      recent_bookings: recentRows.map(sanitizeRecentBooking),
      status_breakdown: buildEnumBreakdown(BOOKING_STATUS_VALUES, statusRows, {
        keyField: 'status',
      }),
      summary: {
        total_booking_value: roundMoney(summaryRow?.total_booking_value),
        total_bookings: Number(summaryRow?.total_bookings || 0),
      },
    };
  };

  const getServiceReport = async ({
    auth,
    query,
  } = {}) => {
    ensureReportReadAccess(auth);

    const serviceType = parseOptionalEnum('type', query?.type, SERVICE_TYPE_VALUES);
    const serviceStatus = parseOptionalEnum('status', query?.status, SERVICE_STATUS_VALUES);
    const [summaryRow, statusRows, typeRows, inventoryRow, topServiceRows] = await Promise.all([
      repository.getServiceSummary({
        serviceStatus,
        serviceType,
      }),
      repository.getServiceStatusBreakdown({
        serviceStatus,
        serviceType,
      }),
      repository.getServiceTypeBreakdown({
        serviceStatus,
        serviceType,
      }),
      repository.getServiceInventorySummary({
        serviceStatus,
        serviceType,
      }),
      repository.getTopBookedServices({
        limit: DEFAULT_TOP_SERVICE_LIMIT,
        serviceStatus,
        serviceType,
      }),
    ]);

    return {
      filters: {
        status: serviceStatus,
        type: serviceType,
      },
      inventory: {
        flight_available_seats: Number(inventoryRow?.flight_available_seats || 0),
        hotel_available_rooms: Number(inventoryRow?.hotel_available_rooms || 0),
        train_available_seats: Number(inventoryRow?.train_available_seats || 0),
      },
      status_breakdown: buildEnumBreakdown(SERVICE_STATUS_VALUES, statusRows, {
        keyField: 'status',
      }),
      summary: {
        active_services: Number(summaryRow?.active_services || 0),
        total_services: Number(summaryRow?.total_services || 0),
      },
      top_services: topServiceRows.map(sanitizeTopService),
      type_breakdown: buildEnumBreakdown(SERVICE_TYPE_VALUES, typeRows, {
        keyField: 'service_type',
      }),
    };
  };

  const getPaymentReport = async ({
    auth,
    query,
  } = {}) => {
    ensureReportReadAccess(auth);

    const range = normalizeRequiredRange(query || {});
    const status = parseOptionalEnum('status', query?.status, PAYMENT_STATUS_VALUES);
    const [summaryRow, statusRows, methodRows, recentRows] = await Promise.all([
      repository.getPaymentSummary({
        from: range.from.toISOString(),
        status,
        to: range.to.toISOString(),
      }),
      repository.getPaymentStatusBreakdown({
        from: range.from.toISOString(),
        status,
        to: range.to.toISOString(),
      }),
      repository.getPaymentMethodBreakdown({
        from: range.from.toISOString(),
        status,
        to: range.to.toISOString(),
      }),
      repository.listRecentPayments({
        from: range.from.toISOString(),
        limit: DEFAULT_RECENT_LIMIT,
        status,
        to: range.to.toISOString(),
      }),
    ]);
    const successAmount = roundMoney(summaryRow?.success_amount);
    const reconciledAmount = roundMoney(summaryRow?.reconciled_amount);

    return {
      filters: {
        status,
      },
      method_breakdown: buildEnumBreakdown(PAYMENT_METHOD_VALUES, methodRows, {
        keyField: 'payment_method',
      }),
      range: buildRangePayload(range),
      recent_payments: recentRows.map(sanitizeRecentPayment),
      status_breakdown: buildEnumBreakdown(PAYMENT_STATUS_VALUES, statusRows, {
        keyField: 'status',
      }),
      summary: {
        collected_amount: roundMoney(successAmount + reconciledAmount),
        reconciled_amount: reconciledAmount,
        reconciled_count: Number(summaryRow?.reconciled_count || 0),
        success_amount: successAmount,
        success_count: Number(summaryRow?.success_count || 0),
        total_amount: roundMoney(summaryRow?.total_amount),
        total_payments: Number(summaryRow?.total_payments || 0),
      },
    };
  };

  return {
    getBookingReport,
    getPaymentReport,
    getRevenueReport,
    getServiceReport,
  };
};

module.exports = Object.assign(createAdminReportService(), {
  GROUP_BY_VALUES,
  MAX_RANGE_DAYS,
  REPORT_ALLOWED_ROLES,
  REPORT_REQUIRED_PERMISSION,
  REPORT_TIMEZONE,
  createAdminReportService,
});
