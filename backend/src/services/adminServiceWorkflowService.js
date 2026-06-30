const {
  API_ERROR_CODES,
  SERVICE_STATUS,
  SERVICE_TYPE,
} = require('../constants/domainConstraints');
const {
  createAdminServiceCatalogRepository,
} = require('../database/adminServiceCatalogRepository');
const {
  createAdminServiceWorkflowRepository,
} = require('../database/adminServiceWorkflowRepository');
const adminServiceCatalogService = require('./adminServiceCatalogService');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const RESTORE_TARGET_STATUS_VALUES = Object.freeze([
  SERVICE_STATUS.ACTIVE,
  SERVICE_STATUS.DRAFT,
]);
const WORKFLOW_STATUS_VALUES = Object.freeze([
  SERVICE_STATUS.DRAFT,
  SERVICE_STATUS.PENDING_REVIEW,
  SERVICE_STATUS.ACTIVE,
  SERVICE_STATUS.HIDDEN,
  SERVICE_STATUS.ARCHIVED,
]);
const REQUIRED_BASE_FIELDS = Object.freeze([
  'title',
  'slug',
  'short_description',
  'description',
  'location_text',
  'base_price',
  'currency',
]);

const buildAppError = ({
  code,
  field,
  message,
  statusCode,
}) =>
  new AppError(message, {
    code,
    details: field
      ? [
          {
            field,
            message,
          },
        ]
      : undefined,
    statusCode,
  });

const buildValidationError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.VALIDATION_ERROR,
    field,
    message,
    statusCode: 400,
  });

const buildInvalidStateError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    field,
    message,
    statusCode: 400,
  });

const buildResourceNotFoundError = (message = 'Service not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseServiceId = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError('service_id', 'service_id must be a valid UUID');
  }

  return value.trim();
};

const parseBodyObject = (body) => {
  if (body == null) {
    return {};
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return body;
};

const ensureAllowedKeys = ({
  allowedKeys,
  body,
}) => {
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      throw buildValidationError(key, `${key} is not supported in this endpoint`);
    }
  }
};

const parseOptionalString = ({
  field,
  maxLength = 1000,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be at most ${maxLength} characters long`,
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseRequiredString = (options) => {
  const parsed = parseOptionalString(options);

  if (!parsed) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseTargetStatus = (value) => {
  if (typeof value !== 'string' || !RESTORE_TARGET_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'target_status',
      `target_status must be one of: ${RESTORE_TARGET_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseWorkflowStatus = (value) => {
  if (typeof value !== 'string' || !WORKFLOW_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${WORKFLOW_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const isPresentValue = (value) => {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return normalizeWhitespace(value).length > 0;
  }

  return true;
};

const validateBaseCompleteness = (service) => {
  const missingFields = REQUIRED_BASE_FIELDS.filter((field) => !isPresentValue(service[field]));

  if (missingFields.length > 0) {
    throw buildValidationError(
      'service',
      `service is missing required fields: ${missingFields.join(', ')}`,
    );
  }

  const basePrice = Number(service.base_price);
  const salePrice = service.sale_price == null ? null : Number(service.sale_price);

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw buildValidationError('service', 'service base_price must be greater than or equal to 0');
  }

  if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > basePrice)) {
    throw buildValidationError(
      'service',
      'service sale_price must be greater than or equal to 0 and less than or equal to base_price',
    );
  }
};

const validateRequiredDetailFields = ({
  detail,
  detailLabel,
  requiredFields,
}) => {
  if (!detail) {
    throw buildValidationError(
      'service',
      `service is missing ${detailLabel}`,
    );
  }

  const missingFields = requiredFields.filter((field) => !isPresentValue(detail[field]));

  if (missingFields.length > 0) {
    throw buildValidationError(
      'service',
      `${detailLabel} is missing required fields: ${missingFields.join(', ')}`,
    );
  }
};

const createAdminServiceWorkflowService = ({
  catalogRepository = createAdminServiceCatalogRepository(),
  catalogService = adminServiceCatalogService,
  repository = createAdminServiceWorkflowRepository(),
} = {}) => {
  const loadService = async ({
    auth,
    serviceId,
  }) => {
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId,
    });

    if (!service) {
      throw buildResourceNotFoundError();
    }

    return service;
  };

  const ensurePublicReady = async (service) => {
    validateBaseCompleteness(service);

    if (service.deleted_at != null || service.status === SERVICE_STATUS.DELETED) {
      throw buildInvalidStateError(
        'service',
        'deleted services cannot enter the public workflow',
      );
    }

    if (service.service_type === SERVICE_TYPE.TOUR) {
      const detail = await catalogRepository.getTourDetail(service.id);
      validateRequiredDetailFields({
        detail,
        detailLabel: 'tour detail',
        requiredFields: [
          'departure_location',
          'destination_location',
          'duration_days',
          'duration_nights',
          'transport_type',
        ],
      });
      return;
    }

    if (service.service_type === SERVICE_TYPE.HOTEL) {
      const detail = await catalogRepository.getHotelDetail(service.id);
      validateRequiredDetailFields({
        detail,
        detailLabel: 'hotel detail',
        requiredFields: [
          'address',
          'checkin_time',
          'checkout_time',
        ],
      });
      return;
    }

    if (service.service_type === SERVICE_TYPE.FLIGHT) {
      const details = await catalogRepository.listFlightDetailsByService(service.id);
      validateRequiredDetailFields({
        detail: details[0] || null,
        detailLabel: 'flight detail',
        requiredFields: [
          'airline_name',
          'flight_number',
          'departure_airport',
          'arrival_airport',
          'departure_at',
          'arrival_at',
          'cabin_class',
          'fare_price',
        ],
      });
      return;
    }

    if (service.service_type === SERVICE_TYPE.TRAIN) {
      const details = await catalogRepository.listTrainDetailsByService(service.id);
      validateRequiredDetailFields({
        detail: details[0] || null,
        detailLabel: 'train detail',
        requiredFields: [
          'train_number',
          'departure_station',
          'arrival_station',
          'departure_at',
          'arrival_at',
          'seat_class',
          'fare_price',
        ],
      });
    }
  };

  const applyWorkflowTransition = async ({
    action,
    auth,
    metadata,
    service,
    serviceId,
    updates,
  }) => {
    await repository.updateWorkflowStatus({
      action,
      actorUserId: auth.userId,
      metadata,
      serviceId,
      updates,
    });

    return catalogService.getServiceDetail({
      auth,
      service_id: service.id,
    });
  };

  const submitReview = async ({
    auth,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (service.status !== SERVICE_STATUS.DRAFT) {
      throw buildInvalidStateError(
        'status',
        'submit-review is only allowed from draft status',
      );
    }

    await ensurePublicReady(service);

    return applyWorkflowTransition({
      action: 'admin.service.submit_review',
      auth,
      metadata: {
        from_status: service.status,
        to_status: SERVICE_STATUS.PENDING_REVIEW,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        status: SERVICE_STATUS.PENDING_REVIEW,
      },
    });
  };

  const approveService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBodyObject(body);
    ensureAllowedKeys({
      allowedKeys: new Set(['note']),
      body: parsedBody,
    });
    const note = parseOptionalString({
      field: 'note',
      maxLength: 1000,
      value: parsedBody.note,
    });
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (service.status !== SERVICE_STATUS.PENDING_REVIEW) {
      throw buildInvalidStateError(
        'status',
        'approve is only allowed from pending_review status',
      );
    }

    await ensurePublicReady(service);

    return applyWorkflowTransition({
      action: 'admin.service.approve',
      auth,
      metadata: {
        from_status: service.status,
        note,
        to_status: SERVICE_STATUS.ACTIVE,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        approved_at: { __raw: 'NOW()' },
        approved_by: auth.userId,
        status: SERVICE_STATUS.ACTIVE,
      },
    });
  };

  const rejectService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBodyObject(body);
    ensureAllowedKeys({
      allowedKeys: new Set(['reason']),
      body: parsedBody,
    });
    const reason = parseRequiredString({
      field: 'reason',
      maxLength: 500,
      value: parsedBody.reason,
    });
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (service.status !== SERVICE_STATUS.PENDING_REVIEW) {
      throw buildInvalidStateError(
        'status',
        'reject is only allowed from pending_review status',
      );
    }

    return applyWorkflowTransition({
      action: 'admin.service.reject',
      auth,
      metadata: {
        from_status: service.status,
        reason,
        to_status: SERVICE_STATUS.DRAFT,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        status: SERVICE_STATUS.DRAFT,
      },
    });
  };

  const hideService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBodyObject(body);
    ensureAllowedKeys({
      allowedKeys: new Set(['reason']),
      body: parsedBody,
    });
    const reason = parseRequiredString({
      field: 'reason',
      maxLength: 500,
      value: parsedBody.reason,
    });
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (service.status !== SERVICE_STATUS.ACTIVE) {
      throw buildInvalidStateError(
        'status',
        'hide is only allowed from active status',
      );
    }

    return applyWorkflowTransition({
      action: 'admin.service.hide',
      auth,
      metadata: {
        from_status: service.status,
        reason,
        to_status: SERVICE_STATUS.HIDDEN,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        status: SERVICE_STATUS.HIDDEN,
      },
    });
  };

  const restoreService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBodyObject(body);
    ensureAllowedKeys({
      allowedKeys: new Set(['target_status']),
      body: parsedBody,
    });
    const targetStatus = parseTargetStatus(parsedBody.target_status);
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (![SERVICE_STATUS.HIDDEN, SERVICE_STATUS.ARCHIVED].includes(service.status)) {
      throw buildInvalidStateError(
        'status',
        'restore is only allowed from hidden or archived status',
      );
    }

    if (targetStatus === SERVICE_STATUS.ACTIVE) {
      await ensurePublicReady(service);
    }

    return applyWorkflowTransition({
      action: 'admin.service.restore',
      auth,
      metadata: {
        from_status: service.status,
        target_status: targetStatus,
        to_status: targetStatus,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        status: targetStatus,
      },
    });
  };

  const updateStatus = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBodyObject(body);
    ensureAllowedKeys({
      allowedKeys: new Set(['reason', 'status']),
      body: parsedBody,
    });
    const nextStatus = parseWorkflowStatus(parsedBody.status);
    const reason = parseOptionalString({
      field: 'reason',
      maxLength: 500,
      value: parsedBody.reason,
    });
    const service = await loadService({
      auth,
      serviceId: resolvedServiceId,
    });

    if (service.deleted_at != null || service.status === SERVICE_STATUS.DELETED) {
      throw buildInvalidStateError(
        'status',
        'deleted services cannot be restored through this endpoint',
      );
    }

    if (service.status === nextStatus) {
      throw buildInvalidStateError(
        'status',
        'status transition is not allowed',
      );
    }

    let setApprovalAudit = false;
    let requireCompleteness = false;

    if (nextStatus === SERVICE_STATUS.PENDING_REVIEW) {
      if (service.status !== SERVICE_STATUS.DRAFT) {
        throw buildInvalidStateError(
          'status',
          'status transition is not allowed',
        );
      }

      requireCompleteness = true;
    } else if (nextStatus === SERVICE_STATUS.ACTIVE) {
      if (service.status === SERVICE_STATUS.PENDING_REVIEW) {
        requireCompleteness = true;
        setApprovalAudit = true;
      } else if (
        service.status === SERVICE_STATUS.HIDDEN ||
        service.status === SERVICE_STATUS.ARCHIVED
      ) {
        requireCompleteness = true;
      } else if (service.status === SERVICE_STATUS.DRAFT) {
        if (auth.role !== 'system_admin') {
          throw buildInvalidStateError(
            'status',
            'draft cannot be moved directly to active through this endpoint',
          );
        }

        if (!reason) {
          throw buildValidationError(
            'reason',
            'reason is required when SYSTEM_ADMIN overrides draft to active',
          );
        }

        requireCompleteness = true;
        setApprovalAudit = true;
      } else {
        throw buildInvalidStateError(
          'status',
          'status transition is not allowed',
        );
      }
    } else if (nextStatus === SERVICE_STATUS.DRAFT) {
      if (
        service.status !== SERVICE_STATUS.PENDING_REVIEW &&
        service.status !== SERVICE_STATUS.HIDDEN &&
        service.status !== SERVICE_STATUS.ARCHIVED
      ) {
        throw buildInvalidStateError(
          'status',
          'status transition is not allowed',
        );
      }
    } else if (nextStatus === SERVICE_STATUS.HIDDEN) {
      if (service.status !== SERVICE_STATUS.ACTIVE) {
        throw buildInvalidStateError(
          'status',
          'status transition is not allowed',
        );
      }

      if (!reason) {
        throw buildValidationError(
          'reason',
          'reason is required when hiding a service',
        );
      }
    } else if (nextStatus === SERVICE_STATUS.ARCHIVED) {
      if (
        service.status !== SERVICE_STATUS.ACTIVE &&
        service.status !== SERVICE_STATUS.HIDDEN
      ) {
        throw buildInvalidStateError(
          'status',
          'status transition is not allowed',
        );
      }
    }

    if (requireCompleteness) {
      await ensurePublicReady(service);
    }

    return applyWorkflowTransition({
      action: 'admin.service.status_update',
      auth,
      metadata: {
        from_status: service.status,
        override: true,
        reason,
        to_status: nextStatus,
      },
      service,
      serviceId: resolvedServiceId,
      updates: {
        approved_at: setApprovalAudit ? { __raw: 'NOW()' } : undefined,
        approved_by: setApprovalAudit ? auth.userId : undefined,
        status: nextStatus,
      },
    });
  };

  return {
    approveService,
    hideService,
    rejectService,
    restoreService,
    submitReview,
    updateStatus,
  };
};

module.exports = Object.assign(createAdminServiceWorkflowService(), {
  createAdminServiceWorkflowService,
});
