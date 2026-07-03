const {
  API_ERROR_CODES,
  BOOKING_STATUS_VALUES,
  EMAIL_STATUS_VALUES,
  NOTIFICATION_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  REFUND_STATUS_VALUES,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE_VALUES,
  USER_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminSystemStatsRepository,
} = require('../database/adminSystemStatsRepository');
const {
  CONNECTION_STATUS,
  testCloudinaryConnection,
  testSendgridConnection,
} = require('./systemService');
const AppError = require('../utils/AppError');

const SYSTEM_ADMIN_ROLE = 'system_admin';
const SYSTEM_HEALTH_STATUS = Object.freeze({
  DEGRADED: 'degraded',
  OK: 'ok',
});

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

const buildInternalError = (message = 'System stats are unavailable') =>
  new AppError(message, {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const ensureSystemAdminAccess = (auth) => {
  if (auth?.role !== SYSTEM_ADMIN_ROLE || !auth?.userId) {
    throw buildForbiddenError();
  }
};

const validateEmptyQuery = (query = {}) => {
  if (Object.keys(query).length > 0) {
    throw buildValidationError(
      'query',
      'This endpoint does not accept query parameters',
    );
  }
};

const buildEnumBreakdown = (values, rows, keyField) => {
  const breakdown = values.reduce((accumulator, value) => {
    accumulator[value] = 0;
    return accumulator;
  }, {});

  for (const row of rows || []) {
    const key = row?.[keyField];

    if (!key || !Object.prototype.hasOwnProperty.call(breakdown, key)) {
      continue;
    }

    breakdown[key] = Number(row.total_count || 0);
  }

  return breakdown;
};

const sumBreakdownValues = (breakdown) =>
  Object.values(breakdown).reduce(
    (total, value) => total + Number(value || 0),
    0,
  );

const buildStatusSection = (values, rows, keyField = 'status') => {
  const byStatus = buildEnumBreakdown(values, rows, keyField);

  return {
    by_status: byStatus,
    total: sumBreakdownValues(byStatus),
  };
};

const buildServiceSection = ({
  byStatusRows,
  byTypeRows,
}) => {
  const byStatus = buildEnumBreakdown(
    SERVICE_STATUS_VALUES,
    byStatusRows,
    'status',
  );
  const byType = buildEnumBreakdown(
    SERVICE_TYPE_VALUES,
    byTypeRows,
    'service_type',
  );

  return {
    by_status: byStatus,
    by_type: byType,
    total: Math.max(
      sumBreakdownValues(byStatus),
      sumBreakdownValues(byType),
    ),
  };
};

const createConnectedCheck = (service, message) => ({
  message,
  ready: true,
  service,
  status: CONNECTION_STATUS.CONNECTED,
});

const createFailedCheck = (service, message) => ({
  message,
  ready: false,
  service,
  status: CONNECTION_STATUS.CONNECTION_FAILED,
});

const extractErrorMessage = (error, fallbackMessage) =>
  error?.message
    ? `${fallbackMessage}: ${error.message}`
    : fallbackMessage;

const runSafeAuxiliaryCheck = async (service, checkFn) => {
  try {
    return await checkFn();
  } catch (error) {
    return createFailedCheck(
      service,
      extractErrorMessage(error, `${service} probe failed`),
    );
  }
};

const createAdminSystemStatsService = ({
  cloudinaryCheck = testCloudinaryConnection,
  now = () => new Date(),
  repository = createAdminSystemStatsRepository(),
  sendgridCheck = testSendgridConnection,
} = {}) => {
  const getSystemStats = async ({
    auth,
    query,
  } = {}) => {
    ensureSystemAdminAccess(auth);
    validateEmptyQuery(query || {});

    let snapshot;

    try {
      snapshot = await repository.getSystemStatsSnapshot();
    } catch (error) {
      throw buildInternalError();
    }

    const [cloudinary, sendgrid] = await Promise.all([
      runSafeAuxiliaryCheck('cloudinary', cloudinaryCheck),
      runSafeAuxiliaryCheck('sendgrid', sendgridCheck),
    ]);
    const database = createConnectedCheck(
      'database',
      'Database aggregation is working',
    );
    const systemHealthStatus = [cloudinary, sendgrid].every((check) => check.ready)
      ? SYSTEM_HEALTH_STATUS.OK
      : SYSTEM_HEALTH_STATUS.DEGRADED;

    return {
      bookings: buildStatusSection(BOOKING_STATUS_VALUES, snapshot.bookings),
      generated_at: now().toISOString(),
      mail: buildStatusSection(EMAIL_STATUS_VALUES, snapshot.mail),
      notifications: buildStatusSection(
        NOTIFICATION_STATUS_VALUES,
        snapshot.notifications,
      ),
      payments: buildStatusSection(PAYMENT_STATUS_VALUES, snapshot.payments),
      refunds: buildStatusSection(REFUND_STATUS_VALUES, snapshot.refunds),
      services: buildServiceSection({
        byStatusRows: snapshot.services_by_status,
        byTypeRows: snapshot.services_by_type,
      }),
      system_health: {
        checks: {
          cloudinary,
          database,
          sendgrid,
        },
        status: systemHealthStatus,
      },
      users: buildStatusSection(USER_STATUS_VALUES, snapshot.users),
    };
  };

  return {
    getSystemStats,
  };
};

module.exports = Object.assign(createAdminSystemStatsService(), {
  SYSTEM_ADMIN_ROLE,
  SYSTEM_HEALTH_STATUS,
  createAdminSystemStatsService,
});
