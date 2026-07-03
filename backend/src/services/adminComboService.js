const crypto = require('node:crypto');
const {
  API_ERROR_CODES,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminComboRepository,
} = require('../database/adminComboRepository');
const adminServiceCatalogService = require('./adminServiceCatalogService');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const SERVICE_CODE_PATTERN = /^[A-Z0-9-]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_COMBO_FIELDS = Object.freeze([
  'service_type',
  'title',
  'slug',
  'service_code',
  'short_description',
  'description',
  'provider_name',
  'location_text',
  'base_price',
  'sale_price',
  'currency',
  'cancellation_policy',
  'metadata',
  'combo_items',
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

const buildDuplicateError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    field,
    message,
    statusCode: 409,
  });

const buildResourceNotFoundError = (message = 'Combo service not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const slugify = (value) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'combo';
};

const parseRequiredString = ({
  field,
  maxLength = 255,
  value,
}) => {
  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} is required`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    throw buildValidationError(field, `${field} is required`);
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

const parseMoney = ({
  allowNull = false,
  field,
  value,
}) => {
  if (value == null) {
    if (allowNull) {
      return null;
    }

    throw buildValidationError(field, `${field} is required`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw buildValidationError(
      field,
      `${field} must be a number greater than or equal to 0`,
    );
  }

  return parsed;
};

const parseOptionalInteger = ({
  field,
  min = 0,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (
    (typeof value === 'string' && !/^\d+$/.test(value)) ||
    !Number.isInteger(Number(value))
  ) {
    throw buildValidationError(field, `${field} must be an integer`);
  }

  const parsed = Number(value);

  if (parsed < min) {
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to ${min}`,
    );
  }

  return parsed;
};

const parseRequiredInteger = (options) => {
  const parsed = parseOptionalInteger(options);

  if (parsed == null) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseOptionalPlainObject = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw buildValidationError(field, `${field} must be an object`);
  }

  return value;
};

const parseOptionalArray = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw buildValidationError(field, `${field} must be an array`);
  }

  return value;
};

const parseSlug = ({
  required = false,
  value,
}) => {
  if (value == null) {
    if (required) {
      throw buildValidationError('slug', 'slug is required');
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(
      'slug',
      'slug must contain only lowercase letters, numbers, and hyphens',
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    if (required) {
      throw buildValidationError('slug', 'slug is required');
    }

    return null;
  }

  if (normalized.length > 280) {
    throw buildValidationError(
      'slug',
      'slug must be at most 280 characters long',
    );
  }

  if (!SLUG_PATTERN.test(normalized)) {
    throw buildValidationError(
      'slug',
      'slug must contain only lowercase letters, numbers, and hyphens',
    );
  }

  return normalized;
};

const parseServiceCode = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError('service_code', 'service_code must be a valid code');
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 30 || !SERVICE_CODE_PATTERN.test(normalized)) {
    throw buildValidationError('service_code', 'service_code must be a valid code');
  }

  return normalized;
};

const parseCurrency = (value) => {
  if (value == null || value === '') {
    return DEFAULT_CURRENCY;
  }

  if (typeof value !== 'string') {
    throw buildValidationError('currency', 'currency must be a 3-letter code');
  }

  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw buildValidationError('currency', 'currency must be a 3-letter code');
  }

  return normalized;
};

const parseServiceId = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const ensureSalePriceWithinBasePrice = ({
  basePrice,
  salePrice,
}) => {
  if (salePrice != null && salePrice > basePrice) {
    throw buildValidationError(
      'sale_price',
      'sale_price must be less than or equal to base_price',
    );
  }
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const sanitizeMetadata = (metadata) => (metadata ? { ...metadata } : {});

const buildPublicPrice = (service) =>
  service.sale_price == null
    ? Number(service.base_price)
    : Number(service.sale_price);

const parseBasePayload = ({
  currentService,
  isCreate,
  payload,
}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw buildValidationError('body', 'body must be an object');
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_COMBO_FIELDS.includes(key)) {
      throw buildValidationError(key, `${key} is not supported in this endpoint`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'service_type')) {
    if (payload.service_type !== SERVICE_TYPE.COMBO) {
      throw buildValidationError(
        'service_type',
        'service_type must be combo in this endpoint',
      );
    }

    if (!isCreate) {
      throw buildValidationError(
        'service_type',
        'service_type cannot be changed through this endpoint',
      );
    }
  }

  const title = Object.prototype.hasOwnProperty.call(payload, 'title')
    ? parseRequiredString({
        field: 'title',
        maxLength: 255,
        value: payload.title,
      })
    : null;
  const shortDescription = Object.prototype.hasOwnProperty.call(payload, 'short_description')
    ? parseOptionalString({
        field: 'short_description',
        maxLength: 1000,
        value: payload.short_description,
      })
    : undefined;
  const description = Object.prototype.hasOwnProperty.call(payload, 'description')
    ? parseOptionalString({
        field: 'description',
        maxLength: 10000,
        value: payload.description,
      })
    : undefined;
  const providerName = Object.prototype.hasOwnProperty.call(payload, 'provider_name')
    ? parseOptionalString({
        field: 'provider_name',
        maxLength: 200,
        value: payload.provider_name,
      })
    : undefined;
  const locationText = Object.prototype.hasOwnProperty.call(payload, 'location_text')
    ? parseOptionalString({
        field: 'location_text',
        maxLength: 255,
        value: payload.location_text,
      })
    : undefined;
  const cancellationPolicy = Object.prototype.hasOwnProperty.call(payload, 'cancellation_policy')
    ? parseOptionalString({
        field: 'cancellation_policy',
        maxLength: 5000,
        value: payload.cancellation_policy,
      })
    : undefined;
  const metadata = Object.prototype.hasOwnProperty.call(payload, 'metadata')
    ? parseOptionalPlainObject({
        field: 'metadata',
        value: payload.metadata,
      })
    : undefined;
  const comboItems = Object.prototype.hasOwnProperty.call(payload, 'combo_items')
    ? parseOptionalArray({
        field: 'combo_items',
        value: payload.combo_items,
      })
    : undefined;
  const slug = Object.prototype.hasOwnProperty.call(payload, 'slug')
    ? parseSlug({
        value: payload.slug,
      })
    : undefined;
  const serviceCode = Object.prototype.hasOwnProperty.call(payload, 'service_code')
    ? parseServiceCode(payload.service_code)
    : undefined;
  const basePrice = isCreate || Object.prototype.hasOwnProperty.call(payload, 'base_price')
    ? parseMoney({
        field: 'base_price',
        value: payload.base_price,
      })
    : undefined;
  const salePrice = Object.prototype.hasOwnProperty.call(payload, 'sale_price')
    ? parseMoney({
        allowNull: true,
        field: 'sale_price',
        value: payload.sale_price,
      })
    : undefined;

  if (isCreate) {
    if (!title) {
      throw buildValidationError('title', 'title is required');
    }

    ensureSalePriceWithinBasePrice({
      basePrice,
      salePrice,
    });
  } else if (salePrice !== undefined || basePrice !== undefined) {
    ensureSalePriceWithinBasePrice({
      basePrice: basePrice ?? Number(currentService.base_price),
      salePrice:
        salePrice === undefined
          ? (currentService.sale_price == null ? null : Number(currentService.sale_price))
          : salePrice,
    });
  }

  const currency = isCreate || Object.prototype.hasOwnProperty.call(payload, 'currency')
    ? parseCurrency(payload.currency)
    : undefined;

  return {
    baseFields: {
      base_price: basePrice,
      cancellation_policy: cancellationPolicy,
      currency,
      description,
      location_text: locationText,
      metadata,
      provider_name: providerName,
      sale_price: salePrice,
      service_code: serviceCode,
      short_description: shortDescription,
      slug,
      title,
    },
    comboItems,
  };
};

const createAdminComboService = ({
  catalogService = adminServiceCatalogService,
  repository = createAdminComboRepository(),
} = {}) => {
  const ensureUniqueSlug = async ({
    excludeServiceId,
    providedSlug,
    title,
  }) => {
    if (providedSlug) {
      const existing = await repository.getServiceBySlug({
        excludeServiceId,
        slug: providedSlug,
      });

      if (existing) {
        throw buildDuplicateError('slug', 'slug already exists');
      }

      return providedSlug;
    }

    const baseSlug = slugify(title);
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const existing = await repository.getServiceBySlug({
        excludeServiceId,
        slug: candidate,
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
    }
  };

  const ensureUniqueServiceCode = async ({
    excludeServiceId,
    providedCode,
  }) => {
    if (providedCode) {
      const existing = await repository.getServiceByCode({
        excludeServiceId,
        serviceCode: providedCode,
      });

      if (existing) {
        throw buildDuplicateError('service_code', 'service_code already exists');
      }

      return providedCode;
    }

    while (true) {
      const candidate = `CBO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await repository.getServiceByCode({
        excludeServiceId,
        serviceCode: candidate,
      });

      if (!existing) {
        return candidate;
      }
    }
  };

  const buildSanitizedComboItems = async ({
    allowedServiceIds,
    comboItems,
    currentComboId = null,
  }) => {
    const parsedItems = parseOptionalArray({
      field: 'combo_items',
      value: comboItems,
    });

    if (!parsedItems || parsedItems.length === 0) {
      throw buildValidationError(
        'combo_items',
        'combo_items must contain at least one item',
      );
    }

    const normalizedItems = parsedItems.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw buildValidationError(
          `combo_items[${index}]`,
          `combo_items[${index}] must be an object`,
        );
      }

      const serviceId = parseServiceId(
        `combo_items[${index}].service_id`,
        item.service_id,
      );
      const serviceType = (() => {
        if (
          typeof item.service_type !== 'string' ||
          !SERVICE_TYPE_VALUES.includes(item.service_type)
        ) {
          throw buildValidationError(
            `combo_items[${index}].service_type`,
            `combo_items[${index}].service_type must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
          );
        }

        return item.service_type;
      })();
      const quantity = parseRequiredInteger({
        field: `combo_items[${index}].quantity`,
        min: 1,
        value: item.quantity,
      });

      if (currentComboId && serviceId === currentComboId) {
        throw buildValidationError(
          `combo_items[${index}].service_id`,
          'combo cannot reference itself',
        );
      }

      return {
        quantity,
        service_id: serviceId,
        service_type: serviceType,
      };
    });

    const uniqueServiceIds = [...new Set(normalizedItems.map((item) => item.service_id))];
    const childServices = await repository.getServicesByIds({
      allowedServiceIds,
      serviceIds: uniqueServiceIds,
    });
    const childServicesById = new Map(
      childServices.map((service) => [service.id, service]),
    );

    return normalizedItems.map((item, index) => {
      const childService = childServicesById.get(item.service_id);

      if (!childService) {
        throw buildResourceNotFoundError(
          `Referenced combo item service not found for combo_items[${index}].service_id`,
        );
      }

      if (childService.deleted_at != null || childService.status === 'deleted') {
        throw buildValidationError(
          `combo_items[${index}].service_id`,
          'combo item service must not be deleted',
        );
      }

      if (childService.service_type !== item.service_type) {
        throw buildValidationError(
          `combo_items[${index}].service_type`,
          'combo item service_type must match the referenced service',
        );
      }

      if (childService.service_type === SERVICE_TYPE.COMBO) {
        throw buildValidationError(
          `combo_items[${index}].service_id`,
          'nested combo items are not supported',
        );
      }

      return {
        base_price: Number(childService.base_price),
        location_text: childService.location_text,
        public_price: buildPublicPrice(childService),
        quantity: item.quantity,
        sale_price:
          childService.sale_price == null
            ? null
            : Number(childService.sale_price),
        service_id: childService.id,
        service_type: childService.service_type,
        short_description: childService.short_description,
        slug: childService.slug,
        title: childService.title,
      };
    });
  };

  const createCombo = async ({
    auth,
    body,
  } = {}) => {
    const parsed = parseBasePayload({
      isCreate: true,
      payload: body,
    });
    const slug = await ensureUniqueSlug({
      providedSlug: parsed.baseFields.slug,
      title: parsed.baseFields.title,
    });
    const serviceCode = await ensureUniqueServiceCode({
      providedCode: parsed.baseFields.service_code,
    });
    const sanitizedComboItems = await buildSanitizedComboItems({
      allowedServiceIds: resolveScopeServiceIds(auth),
      comboItems: parsed.comboItems,
    });
    const metadata = sanitizeMetadata(parsed.baseFields.metadata);
    metadata.combo_items = sanitizedComboItems;

    const created = await repository.createCombo({
      actorUserId: auth.userId,
      logMetadata: {
        combo_items_count: sanitizedComboItems.length,
        operation: 'create',
      },
      servicePayload: {
        ...parsed.baseFields,
        currency: parsed.baseFields.currency,
        metadata,
        service_code: serviceCode,
        slug,
        title: parsed.baseFields.title,
      },
    }).catch((error) => {
      if (error?.code === '23505') {
        throw buildDuplicateError('resource', 'slug or service_code already exists');
      }

      throw error;
    });

    return catalogService.getServiceDetail({
      auth,
      service_id: created.id,
    });
  };

  const updateCombo = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId('service_id', serviceId);
    const currentService = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      includeDeleted: false,
      serviceId: resolvedServiceId,
    });

    if (!currentService) {
      throw buildResourceNotFoundError();
    }

    if (currentService.service_type !== SERVICE_TYPE.COMBO) {
      throw buildResourceNotFoundError();
    }

    const parsed = parseBasePayload({
      currentService,
      isCreate: false,
      payload: body,
    });
    const nextSlug = parsed.baseFields.slug === undefined
      ? undefined
      : await ensureUniqueSlug({
          excludeServiceId: resolvedServiceId,
          providedSlug: parsed.baseFields.slug,
          title: parsed.baseFields.title || currentService.title,
        });
    const nextServiceCode = parsed.baseFields.service_code === undefined
      ? undefined
      : await ensureUniqueServiceCode({
          excludeServiceId: resolvedServiceId,
          providedCode: parsed.baseFields.service_code,
        });
    const metadata = parsed.baseFields.metadata === undefined
      ? sanitizeMetadata(currentService.metadata)
      : sanitizeMetadata(parsed.baseFields.metadata);
    const resolvedComboItems = parsed.comboItems === undefined
      ? metadata.combo_items
      : parsed.comboItems;
    const sanitizedComboItems = await buildSanitizedComboItems({
      allowedServiceIds: resolveScopeServiceIds(auth),
      comboItems: resolvedComboItems,
      currentComboId: resolvedServiceId,
    });
    metadata.combo_items = sanitizedComboItems;

    const servicePayload = {};

    for (const [key, value] of Object.entries(parsed.baseFields)) {
      if (value !== undefined && key !== 'metadata') {
        servicePayload[key] = value;
      }
    }

    servicePayload.metadata = metadata;

    if (nextSlug !== undefined) {
      servicePayload.slug = nextSlug;
    }

    if (nextServiceCode !== undefined) {
      servicePayload.service_code = nextServiceCode;
    }

    if (Object.keys(servicePayload).length === 1 && servicePayload.metadata) {
      const currentMetadata = JSON.stringify(currentService.metadata || {});
      const nextMetadata = JSON.stringify(servicePayload.metadata || {});

      if (currentMetadata === nextMetadata) {
        throw buildValidationError('body', 'no updatable fields were provided');
      }
    }

    await repository.updateCombo({
      actorUserId: auth.userId,
      logMetadata: {
        combo_items_count: sanitizedComboItems.length,
        operation: 'update',
        updated_fields: Object.keys(servicePayload),
      },
      serviceId: resolvedServiceId,
      servicePayload,
    }).catch((error) => {
      if (error?.code === '23505') {
        throw buildDuplicateError('resource', 'slug or service_code already exists');
      }

      throw error;
    });

    return catalogService.getServiceDetail({
      auth,
      service_id: resolvedServiceId,
    });
  };

  return {
    createCombo,
    updateCombo,
  };
};

module.exports = Object.assign(createAdminComboService(), {
  createAdminComboService,
});
