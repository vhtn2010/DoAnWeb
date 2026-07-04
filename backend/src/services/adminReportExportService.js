const AppError = require('../utils/AppError');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const adminReportService = require('./adminReportService');
const {
  createReportExportRepository,
} = require('../database/reportExportRepository');
const {
  createReportFileStorageService,
} = require('./reportFileStorageService');
const {
  buildFileName,
  buildPdfBuffer,
  buildReportHeaderRows,
  buildWorkbookDescriptorSheet,
  buildXlsxBuffer,
  flattenRowsToPdfLines,
} = require('../utils/reportExportFormats');

const REPORT_EXPORT_ACTION = 'report.export';
const REPORT_EXPORT_REQUIRED_PERMISSION = 'report.export';
const REPORT_EXPORT_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const REPORT_TYPE_VALUES = Object.freeze([
  'revenue',
  'bookings',
  'services',
  'payments',
]);
const EXPORT_FORMAT_VALUES = Object.freeze([
  'xlsx',
  'pdf',
]);
const MAX_EXPORT_ROWS_BY_FORMAT = Object.freeze({
  pdf: 200,
  xlsx: 5000,
});
const PDF_REVENUE_PERIOD_LIMIT = 120;

const buildValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildInternalError = (message = 'Internal server error') =>
  new AppError(message, {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const buildNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

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

const ensureExportAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !REPORT_EXPORT_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissions = normalizePermissionCodes(actor);

  if (!permissions.includes(REPORT_EXPORT_REQUIRED_PERMISSION)) {
    throw buildForbiddenError();
  }

  return actor;
};

const ensureDownloadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !REPORT_EXPORT_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissions = normalizePermissionCodes(actor);

  if (permissions.includes(REPORT_EXPORT_REQUIRED_PERMISSION)) {
    return actor;
  }

  throw buildForbiddenError();
};

const buildReportReadAuth = (auth) => {
  const actor = normalizeAuth(auth);
  const permissions = normalizePermissionCodes(actor);

  if (
    permissions.includes(REPORT_EXPORT_REQUIRED_PERMISSION) &&
    !permissions.includes('report.read')
  ) {
    return {
      ...auth,
      tokenPayload: {
        ...(auth?.tokenPayload || {}),
        permissions: [
          ...permissions,
          'report.read',
        ],
      },
    };
  }

  return auth;
};

const normalizeTrimmedString = (value) =>
  typeof value === 'string'
    ? value.trim()
    : '';

const ensurePlainObject = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value);

const parseRequiredBodyString = ({
  allowedValues,
  field,
  value,
}) => {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field,
        message: `${field} is required`,
      },
    ]);
  }

  if (!allowedValues.includes(normalized)) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be one of: ${allowedValues.join(', ')}`,
      },
    ]);
  }

  return normalized;
};

const normalizeExportRequest = (body = {}) => {
  if (!ensurePlainObject(body)) {
    throw buildValidationError([
      {
        field: 'body',
        message: 'body must be an object',
      },
    ]);
  }

  const reportType = parseRequiredBodyString({
    allowedValues: REPORT_TYPE_VALUES,
    field: 'report_type',
    value: body.report_type,
  });
  const format = parseRequiredBodyString({
    allowedValues: EXPORT_FORMAT_VALUES,
    field: 'format',
    value: body.format,
  });
  const filters = body.filters == null
    ? {}
    : body.filters;

  if (!ensurePlainObject(filters)) {
    throw buildValidationError([
      {
        field: 'filters',
        message: 'filters must be an object',
      },
    ]);
  }

  const normalized = {
    filters: {},
    format,
    from: body.from,
    report_type: reportType,
    to: body.to,
  };

  if (reportType === 'revenue') {
    const allowedFilterKeys = ['group_by'];
    const unknownFilterKey = Object.keys(filters).find((key) => !allowedFilterKeys.includes(key));

    if (unknownFilterKey) {
      throw buildValidationError([
        {
          field: `filters.${unknownFilterKey}`,
          message: `filters.${unknownFilterKey} is not supported for revenue export`,
        },
      ]);
    }

    if (filters.group_by != null) {
      normalized.filters.group_by = filters.group_by;
    }
  }

  if (reportType === 'bookings') {
    const allowedFilterKeys = ['status'];
    const unknownFilterKey = Object.keys(filters).find((key) => !allowedFilterKeys.includes(key));

    if (unknownFilterKey) {
      throw buildValidationError([
        {
          field: `filters.${unknownFilterKey}`,
          message: `filters.${unknownFilterKey} is not supported for bookings export`,
        },
      ]);
    }

    if (filters.status != null) {
      normalized.filters.status = filters.status;
    }
  }

  if (reportType === 'services') {
    const allowedFilterKeys = ['status', 'type'];
    const unknownFilterKey = Object.keys(filters).find((key) => !allowedFilterKeys.includes(key));

    if (unknownFilterKey) {
      throw buildValidationError([
        {
          field: `filters.${unknownFilterKey}`,
          message: `filters.${unknownFilterKey} is not supported for services export`,
        },
      ]);
    }

    if (filters.status != null) {
      normalized.filters.status = filters.status;
    }

    if (filters.type != null) {
      normalized.filters.type = filters.type;
    }
  }

  if (reportType === 'payments') {
    const allowedFilterKeys = ['status'];
    const unknownFilterKey = Object.keys(filters).find((key) => !allowedFilterKeys.includes(key));

    if (unknownFilterKey) {
      throw buildValidationError([
        {
          field: `filters.${unknownFilterKey}`,
          message: `filters.${unknownFilterKey} is not supported for payments export`,
        },
      ]);
    }

    if (filters.status != null) {
      normalized.filters.status = filters.status;
    }
  }

  return normalized;
};

const toSafeTimestamp = (date) =>
  new Date(date).toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

const toRangeDateLabel = (value) => {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return 'current';
  }

  return normalized.replace(/[^\dA-Za-z_-]/g, '-');
};

const ensureWithinExportLimit = ({
  format,
  reportType,
  rowCount,
}) => {
  const maxRows = MAX_EXPORT_ROWS_BY_FORMAT[format];

  if (rowCount <= maxRows) {
    return;
  }

  throw buildValidationError([
    {
      field: 'range',
      message: `Export dataset for ${reportType} is too large. Please narrow the range or use a lighter format.`,
    },
  ]);
};

const toUtcIsoString = (value) => new Date(value).toISOString();

const buildRevenueDocument = ({
  exportedBy,
  format,
  generatedAt,
  report,
}) => {
  const headerRows = buildReportHeaderRows({
    exportedBy,
    format,
    generatedAt,
    rangeLabel: `${report.range.from} -> ${report.range.to}`,
    reportTitle: 'Revenue Report',
    timezone: report.range.timezone,
  });
  const summaryRows = [
    ['Metric', 'Value'],
    ['gross_revenue', report.summary.gross_revenue],
    ['refund_amount', report.summary.refund_amount],
    ['net_revenue', report.summary.net_revenue],
    ['payment_count', report.summary.payment_count],
    ['refund_count', report.summary.refund_count],
  ];
  const periodRows = [
    ['period', 'gross_revenue', 'refund_amount', 'net_revenue', 'payment_count'],
    ...report.periods.map((row) => [
      row.period,
      row.gross_revenue,
      row.refund_amount,
      row.net_revenue,
      row.payment_count,
    ]),
  ];
  const warningRows = report.warnings?.length
    ? [
        ['code', 'count', 'message'],
        ...report.warnings.map((warning) => [
          warning.code,
          warning.count,
          warning.message,
        ]),
      ]
    : [['No warnings']];

  return {
    pdfLines: [
      ...flattenRowsToPdfLines(headerRows),
      ...flattenRowsToPdfLines(summaryRows),
      '',
      ...flattenRowsToPdfLines(periodRows),
      '',
      ...flattenRowsToPdfLines(warningRows),
    ],
    rowCount: report.periods.length,
    sheets: [
      buildWorkbookDescriptorSheet({
        name: 'Summary',
        rows: [
          ...headerRows,
          ...summaryRows,
        ],
      }),
      buildWorkbookDescriptorSheet({
        name: 'Periods',
        rows: periodRows,
      }),
      buildWorkbookDescriptorSheet({
        name: 'Warnings',
        rows: warningRows,
      }),
    ],
    title: 'Revenue Report',
  };
};

const buildBookingsDocument = ({
  detailRows,
  exportedBy,
  format,
  generatedAt,
  report,
}) => {
  const headerRows = buildReportHeaderRows({
    exportedBy,
    format,
    generatedAt,
    rangeLabel: `${report.range.from} -> ${report.range.to}`,
    reportTitle: 'Bookings Report',
    timezone: report.range.timezone,
  });
  const summaryRows = [
    ['Metric', 'Value'],
    ['total_bookings', report.summary.total_bookings],
    ['total_booking_value', report.summary.total_booking_value],
    ['status_filter', report.filters.status || 'all'],
  ];
  const statusRows = [
    ['status', 'count'],
    ...Object.entries(report.status_breakdown).map(([status, value]) => [
      status,
      value,
    ]),
  ];
  const dataRows = [
    ['booking_code', 'status', 'total_amount', 'currency', 'created_at'],
    ...detailRows.map((row) => [
      row.booking_code,
      row.status,
      row.total_amount,
      row.currency,
      row.created_at,
    ]),
  ];

  return {
    pdfLines: [
      ...flattenRowsToPdfLines(headerRows),
      ...flattenRowsToPdfLines(summaryRows),
      '',
      ...flattenRowsToPdfLines(statusRows),
      '',
      ...flattenRowsToPdfLines(dataRows),
    ],
    rowCount: detailRows.length,
    sheets: [
      buildWorkbookDescriptorSheet({
        name: 'Summary',
        rows: [
          ...headerRows,
          ...summaryRows,
        ],
      }),
      buildWorkbookDescriptorSheet({
        name: 'Status Breakdown',
        rows: statusRows,
      }),
      buildWorkbookDescriptorSheet({
        name: 'Bookings',
        rows: dataRows,
      }),
    ],
    title: 'Bookings Report',
  };
};

const buildServicesDocument = ({
  detailRows,
  exportedBy,
  format,
  generatedAt,
  report,
}) => {
  const headerRows = buildReportHeaderRows({
    exportedBy,
    format,
    generatedAt,
    rangeLabel: 'Current service state',
    reportTitle: 'Services Report',
    timezone: 'Asia/Ho_Chi_Minh',
  });
  const summaryRows = [
    ['Metric', 'Value'],
    ['total_services', report.summary.total_services],
    ['active_services', report.summary.active_services],
    ['type_filter', report.filters.type || 'all'],
    ['status_filter', report.filters.status || 'all'],
  ];
  const inventoryRows = [
    ['inventory_metric', 'value'],
    ['hotel_available_rooms', report.inventory.hotel_available_rooms],
    ['flight_available_seats', report.inventory.flight_available_seats],
    ['train_available_seats', report.inventory.train_available_seats],
  ];
  const dataRows = [
    ['service_code', 'title', 'service_type', 'status', 'base_price', 'sale_price', 'currency', 'is_deleted', 'updated_at'],
    ...detailRows.map((row) => [
      row.service_code,
      row.title,
      row.service_type,
      row.status,
      row.base_price,
      row.sale_price,
      row.currency,
      row.is_deleted,
      row.updated_at,
    ]),
  ];

  return {
    pdfLines: [
      ...flattenRowsToPdfLines(headerRows),
      ...flattenRowsToPdfLines(summaryRows),
      '',
      ...flattenRowsToPdfLines(inventoryRows),
      '',
      ...flattenRowsToPdfLines(dataRows),
    ],
    rowCount: detailRows.length,
    sheets: [
      buildWorkbookDescriptorSheet({
        name: 'Summary',
        rows: [
          ...headerRows,
          ...summaryRows,
        ],
      }),
      buildWorkbookDescriptorSheet({
        name: 'Inventory',
        rows: inventoryRows,
      }),
      buildWorkbookDescriptorSheet({
        name: 'Services',
        rows: dataRows,
      }),
    ],
    title: 'Services Report',
  };
};

const buildPaymentsDocument = ({
  detailRows,
  exportedBy,
  format,
  generatedAt,
  report,
}) => {
  const headerRows = buildReportHeaderRows({
    exportedBy,
    format,
    generatedAt,
    rangeLabel: `${report.range.from} -> ${report.range.to}`,
    reportTitle: 'Payments Report',
    timezone: report.range.timezone,
  });
  const summaryRows = [
    ['Metric', 'Value'],
    ['total_payments', report.summary.total_payments],
    ['total_amount', report.summary.total_amount],
    ['success_count', report.summary.success_count],
    ['success_amount', report.summary.success_amount],
    ['reconciled_count', report.summary.reconciled_count],
    ['reconciled_amount', report.summary.reconciled_amount],
    ['collected_amount', report.summary.collected_amount],
  ];
  const dataRows = [
    ['payment_code', 'booking_code', 'provider', 'payment_method', 'status', 'amount', 'currency', 'has_proof', 'created_at', 'paid_at'],
    ...detailRows.map((row) => [
      row.payment_code,
      row.booking_code,
      row.provider,
      row.payment_method,
      row.status,
      row.amount,
      row.currency,
      row.has_proof,
      row.created_at,
      row.paid_at,
    ]),
  ];

  return {
    pdfLines: [
      ...flattenRowsToPdfLines(headerRows),
      ...flattenRowsToPdfLines(summaryRows),
      '',
      ...flattenRowsToPdfLines(dataRows),
    ],
    rowCount: detailRows.length,
    sheets: [
      buildWorkbookDescriptorSheet({
        name: 'Summary',
        rows: [
          ...headerRows,
          ...summaryRows,
        ],
      }),
      buildWorkbookDescriptorSheet({
        name: 'Payments',
        rows: dataRows,
      }),
    ],
    title: 'Payments Report',
  };
};

const createAdminReportExportService = ({
  fileStorage = createReportFileStorageService(),
  now = () => new Date(),
  renderPdf = buildPdfBuffer,
  renderXlsx = buildXlsxBuffer,
  reportService = adminReportService,
  repository = createReportExportRepository(),
} = {}) => {
  const exportReport = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  } = {}) => {
    const actor = ensureExportAccess(auth);
    const payload = normalizeExportRequest(body || {});
    const generatedAt = now();
    const reportAuth = buildReportReadAuth(auth);
    let document;
    let reportData;

    if (payload.report_type === 'revenue') {
      reportData = await reportService.getRevenueReport({
        auth: reportAuth,
        query: {
          from: payload.from,
          group_by: payload.filters.group_by,
          to: payload.to,
        },
      });
      document = buildRevenueDocument({
        exportedBy: actor.userId,
        format: payload.format,
        generatedAt: generatedAt.toISOString(),
        report: reportData,
      });

      if (payload.format === 'pdf' && document.rowCount > PDF_REVENUE_PERIOD_LIMIT) {
        throw buildValidationError([
          {
            field: 'format',
            message: 'PDF export only supports aggregated revenue reports with limited period rows',
          },
        ]);
      }
    }

    if (payload.report_type === 'bookings') {
      reportData = await reportService.getBookingReport({
        auth: reportAuth,
        query: {
          from: payload.from,
          status: payload.filters.status,
          to: payload.to,
        },
      });
      const maxRows = MAX_EXPORT_ROWS_BY_FORMAT[payload.format];
      const rows = await repository.listExportBookings({
        from: toUtcIsoString(reportData.range.from),
        limit: maxRows + 1,
        status: payload.filters.status || null,
        to: toUtcIsoString(reportData.range.to),
      });

      ensureWithinExportLimit({
        format: payload.format,
        reportType: payload.report_type,
        rowCount: rows.length,
      });

      document = buildBookingsDocument({
        detailRows: rows.map((row) => ({
          booking_code: row.booking_code,
          created_at: row.created_at,
          currency: row.currency || 'VND',
          status: row.status,
          total_amount: Number(Number(row.total_amount || 0).toFixed(2)),
        })),
        exportedBy: actor.userId,
        format: payload.format,
        generatedAt: generatedAt.toISOString(),
        report: reportData,
      });
    }

    if (payload.report_type === 'services') {
      reportData = await reportService.getServiceReport({
        auth: reportAuth,
        query: {
          status: payload.filters.status,
          type: payload.filters.type,
        },
      });
      const maxRows = MAX_EXPORT_ROWS_BY_FORMAT[payload.format];
      const rows = await repository.listExportServices({
        limit: maxRows + 1,
        serviceStatus: payload.filters.status || null,
        serviceType: payload.filters.type || null,
      });

      ensureWithinExportLimit({
        format: payload.format,
        reportType: payload.report_type,
        rowCount: rows.length,
      });

      document = buildServicesDocument({
        detailRows: rows.map((row) => ({
          base_price: Number(Number(row.base_price || 0).toFixed(2)),
          currency: row.currency || 'VND',
          is_deleted: Boolean(row.deleted_at),
          sale_price: row.sale_price == null
            ? null
            : Number(Number(row.sale_price).toFixed(2)),
          service_code: row.service_code,
          service_type: row.service_type,
          status: row.status,
          title: row.title,
          updated_at: row.updated_at,
        })),
        exportedBy: actor.userId,
        format: payload.format,
        generatedAt: generatedAt.toISOString(),
        report: reportData,
      });
    }

    if (payload.report_type === 'payments') {
      reportData = await reportService.getPaymentReport({
        auth: reportAuth,
        query: {
          from: payload.from,
          status: payload.filters.status,
          to: payload.to,
        },
      });
      const maxRows = MAX_EXPORT_ROWS_BY_FORMAT[payload.format];
      const rows = await repository.listExportPayments({
        from: toUtcIsoString(reportData.range.from),
        limit: maxRows + 1,
        status: payload.filters.status || null,
        to: toUtcIsoString(reportData.range.to),
      });

      ensureWithinExportLimit({
        format: payload.format,
        reportType: payload.report_type,
        rowCount: rows.length,
      });

      document = buildPaymentsDocument({
        detailRows: rows.map((row) => ({
          amount: Number(Number(row.amount || 0).toFixed(2)),
          booking_code: row.booking_code,
          created_at: row.created_at,
          currency: row.currency || 'VND',
          has_proof: Boolean(row.has_proof),
          paid_at: row.paid_at || null,
          payment_code: row.payment_code,
          payment_method: row.payment_method,
          provider: row.provider,
          status: row.status,
        })),
        exportedBy: actor.userId,
        format: payload.format,
        generatedAt: generatedAt.toISOString(),
        report: reportData,
      });
    }

    if (!document) {
      throw buildInternalError();
    }

    const fileName = buildFileName({
      extension: payload.format,
      from: toRangeDateLabel(payload.from),
      reportType: payload.report_type,
      timestamp: toSafeTimestamp(generatedAt),
      to: toRangeDateLabel(payload.to),
    });

    let buffer;

    try {
      buffer = payload.format === 'pdf'
        ? renderPdf({
            lines: document.pdfLines,
            title: document.title,
          })
        : renderXlsx({
            author: actor.userId,
            generatedAt,
            sheets: document.sheets,
            title: document.title,
          });
    } catch (error) {
      throw buildInternalError('Failed to generate export file');
    }

    let storedFile;

    try {
      storedFile = await fileStorage.saveFile({
        buffer,
        fileName,
        format: payload.format,
        publicId: fileName.replace(/\.[^.]+$/, ''),
      });
    } catch (error) {
      throw buildInternalError('Failed to store export file');
    }

    await repository.insertUserLog({
      action: REPORT_EXPORT_ACTION,
      entityName: 'reports',
      ipAddress,
      metadata: {
        file_url: storedFile.file_url,
        filters: payload.filters,
        format: payload.format,
        from: payload.from || null,
        report_type: payload.report_type,
        storage: storedFile.storage || null,
        to: payload.to || null,
      },
      userAgent,
      userId: actor.userId,
    });

    return {
      file_url: storedFile.file_url,
      format: payload.format,
      generated_at: generatedAt.toISOString(),
      report_type: payload.report_type,
    };
  };

  const getLocalExportFile = async ({
    auth,
    fileName,
  } = {}) => {
    ensureDownloadAccess(auth);

    try {
      return await fileStorage.getLocalFileDescriptor(fileName);
    } catch {
      throw buildNotFoundError('Export file not found');
    }
  };

  return {
    exportReport,
    getLocalExportFile,
  };
};

module.exports = Object.assign(createAdminReportExportService(), {
  EXPORT_FORMAT_VALUES,
  MAX_EXPORT_ROWS_BY_FORMAT,
  REPORT_EXPORT_ACTION,
  REPORT_EXPORT_ALLOWED_ROLES,
  REPORT_EXPORT_REQUIRED_PERMISSION,
  REPORT_TYPE_VALUES,
  createAdminReportExportService,
});
