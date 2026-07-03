const {
  API_ERROR_CODES,
  BOOKING_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminDashboardRepository,
} = require('../database/adminDashboardRepository');
const AppError = require('../utils/AppError');

const DASHBOARD_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const DASHBOARD_REQUIRED_PERMISSION = 'dashboard.read';
const DASHBOARD_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DASHBOARD_TIMEZONE_OFFSET_MINUTES = 7 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
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

const ensureDashboardReadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !DASHBOARD_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (!permissionCodes.includes(DASHBOARD_REQUIRED_PERMISSION)) {
    throw buildForbiddenError();
  }

  return actor;
};

const toTimezoneShiftedDate = (date) =>
  new Date(date.getTime() + (DASHBOARD_TIMEZONE_OFFSET_MINUTES * 60 * 1000));

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
    ) - (DASHBOARD_TIMEZONE_OFFSET_MINUTES * 60 * 1000),
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

const normalizeRange = ({
  now,
  query = {},
}) => {
  const parsedFrom = parseDateQuery({
    field: 'from',
    rangeEdge: 'start',
    value: query.from,
  });
  const parsedTo = parseDateQuery({
    field: 'to',
    rangeEdge: 'end',
    value: query.to,
  });
  const effectiveTo = parsedTo || now;
  const effectiveFrom = parsedFrom || startOfTimezoneDay(
    addTimezoneDays(effectiveTo, -(DEFAULT_RANGE_DAYS - 1)),
  );

  if (effectiveFrom.getTime() > effectiveTo.getTime()) {
    throw buildValidationError('from', 'from must be less than or equal to to');
  }

  if ((effectiveTo.getTime() - effectiveFrom.getTime()) > (MAX_RANGE_DAYS * DAY_MS)) {
    throw buildValidationError(
      'to',
      `The requested date range must be less than or equal to ${MAX_RANGE_DAYS} days`,
    );
  }

  return {
    from: effectiveFrom,
    to: effectiveTo,
  };
};

const normalizeOverviewSnapshot = (row = {}) => {
  const totalRevenue = roundMoney(row.total_revenue);
  const refundSuccessAmount = roundMoney(row.refund_success_amount);

  return {
    active_services: Number(row.active_services || 0),
    net_revenue: roundMoney(totalRevenue - refundSuccessAmount),
    new_users: Number(row.new_users || 0),
    pending_payments: Number(row.pending_payments || 0),
    refund_requests: Number(row.refund_requests || 0),
    refund_success_amount: refundSuccessAmount,
    total_bookings: Number(row.total_bookings || 0),
    total_revenue: totalRevenue,
  };
};

const normalizeBookingStatusBreakdown = (rows = []) => {
  const breakdown = BOOKING_STATUS_VALUES.reduce((accumulator, status) => {
    accumulator[status] = 0;
    return accumulator;
  }, {});

  for (const row of rows) {
    if (!row?.status || !Object.prototype.hasOwnProperty.call(breakdown, row.status)) {
      continue;
    }

    breakdown[row.status] = Number(row.total_count || 0);
  }

  return breakdown;
};

const buildBaseRangePayload = ({
  from,
  to,
}) => ({
  from: formatRangeDateTime(from),
  timezone: DASHBOARD_TIMEZONE,
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

const createAdminDashboardService = ({
  now = () => new Date(),
  repository = createAdminDashboardRepository(),
} = {}) => {
  const getOverview = async ({
    auth,
    query,
  } = {}) => {
    ensureDashboardReadAccess(auth);

    const normalizedRange = normalizeRange({
      now: now(),
      query: query || {},
    });
    const [snapshotRow, statusRows] = await Promise.all([
      repository.getOverviewSnapshot({
        from: normalizedRange.from.toISOString(),
        to: normalizedRange.to.toISOString(),
      }),
      repository.getOverviewBookingStatusBreakdown({
        from: normalizedRange.from.toISOString(),
        to: normalizedRange.to.toISOString(),
      }),
    ]);

    return {
      data: {
        booking_status_breakdown: normalizeBookingStatusBreakdown(statusRows),
        kpis: normalizeOverviewSnapshot(snapshotRow),
        range: buildBaseRangePayload(normalizedRange),
      },
    };
  };

  const getRevenueChart = async ({
    auth,
    query,
  } = {}) => {
    ensureDashboardReadAccess(auth);

    const normalizedRange = normalizeRange({
      now: now(),
      query: query || {},
    });
    const groupBy = parseGroupBy(query?.group_by);
    const rows = await repository.getRevenueChartSummary({
      from: normalizedRange.from.toISOString(),
      groupBy,
      timezone: DASHBOARD_TIMEZONE,
      to: normalizedRange.to.toISOString(),
    });

    return {
      data: {
        charts: buildZeroFilledBuckets({
          from: normalizedRange.from,
          groupBy,
          rows,
          to: normalizedRange.to,
          valueFactory: ({
            periodKey,
            row,
          }) => {
            const grossRevenue = roundMoney(row?.gross_revenue);
            const refundAmount = roundMoney(row?.refund_amount);

            return {
              gross_revenue: grossRevenue,
              net_revenue: roundMoney(grossRevenue - refundAmount),
              payment_count: Number(row?.payment_count || 0),
              period: periodKey,
              refund_amount: refundAmount,
            };
          },
        }),
        group_by: groupBy,
        range: buildBaseRangePayload(normalizedRange),
      },
    };
  };

  const getBookingChart = async ({
    auth,
    query,
  } = {}) => {
    ensureDashboardReadAccess(auth);

    const normalizedRange = normalizeRange({
      now: now(),
      query: query || {},
    });
    const groupBy = parseGroupBy(query?.group_by);
    const rows = await repository.getBookingChartSummary({
      from: normalizedRange.from.toISOString(),
      groupBy,
      timezone: DASHBOARD_TIMEZONE,
      to: normalizedRange.to.toISOString(),
    });

    return {
      data: {
        charts: buildZeroFilledBuckets({
          from: normalizedRange.from,
          groupBy,
          rows,
          to: normalizedRange.to,
          valueFactory: ({
            periodKey,
            row,
          }) => ({
            cancelled_bookings: Number(row?.cancelled_bookings || 0),
            completed_bookings: Number(row?.completed_bookings || 0),
            confirmed_bookings: Number(row?.confirmed_bookings || 0),
            period: periodKey,
            total_bookings: Number(row?.total_bookings || 0),
          }),
        }),
        group_by: groupBy,
        range: buildBaseRangePayload(normalizedRange),
      },
    };
  };

  return {
    getBookingChart,
    getOverview,
    getRevenueChart,
  };
};

module.exports = Object.assign(createAdminDashboardService(), {
  DASHBOARD_ALLOWED_ROLES,
  DASHBOARD_REQUIRED_PERMISSION,
  DASHBOARD_TIMEZONE,
  DEFAULT_RANGE_DAYS,
  GROUP_BY_VALUES,
  MAX_RANGE_DAYS,
  createAdminDashboardService,
});
