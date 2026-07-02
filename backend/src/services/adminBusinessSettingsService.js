const { API_ERROR_CODES, USER_STATUS } = require('../constants/domainConstraints');
const { createSettingsRepository } = require('../database/settingsRepository');
const AppError = require('../utils/AppError');

const ADMIN_ALLOWED_ROLE_CODES = Object.freeze([
  'admin',
  'system_admin',
]);
const BUSINESS_UPDATE_FIELDS = Object.freeze([
  'company_name',
  'tax_code',
  'address',
  'invoice_email',
  'invoice_phone',
  'legal_representative',
  'business_license_no',
  'invoice_note',
]);
const FORBIDDEN_KEY_PATTERN =
  /(secret|token|password|private[_-]?key|api[_-]?key|webhook|sign(ing|ature)?|certificate|bank|account(_number|_holder|_name|_no)?|payment|qr[_-]?code|card|cvv)/i;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const TAX_CODE_PATTERN = /^\d{10}(\d{3})?$/;
const ADDRESS_REQUIRED_FIELDS = Object.freeze([
  'company_name',
  'tax_code',
  'invoice_email',
  'invoice_phone',
  'legal_representative',
  'business_license_no',
]);

let businessTemplateCacheRevision = 0;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const buildForbiddenError = (
  message = 'You do not have permission to access this resource',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildInternalError = () =>
  new AppError('Internal server error', {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeOptionalText = ({
  field,
  maxLength = 255,
  strict = true,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a string`,
      },
    ]);
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be less than or equal to ${maxLength} characters`,
      },
    ]);
  }

  return normalized;
};

const normalizeRequiredString = ({
  field,
  maxLength = 255,
  value,
}) => {
  const normalized = normalizeOptionalText({
    field,
    maxLength,
    strict: true,
    value,
  });

  if (!normalized) {
    throw buildValidationError([
      {
        field,
        message: `${field} is required`,
      },
    ]);
  }

  return normalized;
};

const parseEmail = (field, value, { strict = true } = {}) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid email address`,
      },
    ]);
  }

  return normalized;
};

const parsePhone = (field, value, { strict = true } = {}) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!PHONE_PATTERN.test(normalized)) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid phone number`,
      },
    ]);
  }

  return normalized;
};

const parseTaxCode = (field, value, { strict = true } = {}) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!TAX_CODE_PATTERN.test(normalized)) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid Vietnamese tax code with 10 or 13 digits`,
      },
    ]);
  }

  return normalized;
};

const containsForbiddenKeys = (value, path = '') => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const match = containsForbiddenKeys(value[index], `${path}[${index}]`);

      if (match) {
        return match;
      }
    }

    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;

    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      return nextPath;
    }

    const nestedMatch = containsForbiddenKeys(entry, nextPath);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

const buildDefaultBusinessSettings = () => ({
  address: null,
  business_license_no: null,
  company_name: null,
  invoice_email: null,
  invoice_note: null,
  invoice_phone: null,
  legal_representative: null,
  tax_code: null,
});

const sanitizeStoredBusinessSettings = ({
  input = {},
  strict = false,
} = {}) => {
  const source = isPlainObject(input) ? input : {};
  const defaults = buildDefaultBusinessSettings();

  return {
    company_name:
      (source.company_name != null
        ? normalizeRequiredString({
            field: 'company_name',
            maxLength: 255,
            value: source.company_name,
          })
        : defaults.company_name) ?? defaults.company_name,
    tax_code:
      (source.tax_code != null
        ? parseTaxCode('tax_code', source.tax_code, { strict })
        : defaults.tax_code) ?? defaults.tax_code,
    address:
      (source.address != null
        ? normalizeRequiredString({
            field: 'address',
            maxLength: 500,
            value: source.address,
          })
        : defaults.address) ?? defaults.address,
    invoice_email:
      (source.invoice_email != null
        ? parseEmail('invoice_email', source.invoice_email, { strict })
        : defaults.invoice_email) ?? defaults.invoice_email,
    invoice_phone:
      (source.invoice_phone != null
        ? parsePhone('invoice_phone', source.invoice_phone, { strict })
        : defaults.invoice_phone) ?? defaults.invoice_phone,
    legal_representative:
      (source.legal_representative != null
        ? normalizeOptionalText({
            field: 'legal_representative',
            maxLength: 150,
            strict,
            value: source.legal_representative,
          })
        : defaults.legal_representative) ?? defaults.legal_representative,
    business_license_no:
      (source.business_license_no != null
        ? normalizeOptionalText({
            field: 'business_license_no',
            maxLength: 100,
            strict,
            value: source.business_license_no,
          })
        : defaults.business_license_no) ?? defaults.business_license_no,
    invoice_note:
      (source.invoice_note != null
        ? normalizeOptionalText({
            field: 'invoice_note',
            maxLength: 2000,
            strict,
            value: source.invoice_note,
          })
        : defaults.invoice_note) ?? defaults.invoice_note,
  };
};

const validateFinalBusinessSettings = (settings) => {
  const requiresAddress = ADDRESS_REQUIRED_FIELDS.some(
    (field) => settings[field] != null,
  );

  if (requiresAddress && !settings.address) {
    throw buildValidationError([
      {
        field: 'address',
        message: 'address is required when invoice business information is configured',
      },
    ]);
  }

  return settings;
};

const parseUpdateBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError([
      {
        field: 'body',
        message: 'body must be an object',
      },
    ]);
  }

  const forbiddenPath = containsForbiddenKeys(body);

  if (forbiddenPath) {
    throw buildValidationError([
      {
        field: forbiddenPath,
        message: `${forbiddenPath} is not allowed in business settings`,
      },
    ]);
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !BUSINESS_UPDATE_FIELDS.includes(field),
  );

  if (unknownFields.length > 0) {
    throw buildValidationError(
      unknownFields.map((field) => ({
        field,
        message: `${field} is not allowed`,
      })),
    );
  }

  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'company_name')) {
    patch.company_name = normalizeRequiredString({
      field: 'company_name',
      maxLength: 255,
      value: body.company_name,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tax_code')) {
    patch.tax_code =
      body.tax_code == null ? null : parseTaxCode('tax_code', body.tax_code);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'address')) {
    patch.address =
      body.address == null
        ? null
        : normalizeRequiredString({
            field: 'address',
            maxLength: 500,
            value: body.address,
          });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'invoice_email')) {
    patch.invoice_email =
      body.invoice_email == null
        ? null
        : parseEmail('invoice_email', body.invoice_email);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'invoice_phone')) {
    patch.invoice_phone =
      body.invoice_phone == null
        ? null
        : parsePhone('invoice_phone', body.invoice_phone);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'legal_representative')) {
    patch.legal_representative = normalizeOptionalText({
      field: 'legal_representative',
      maxLength: 150,
      value: body.legal_representative,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'business_license_no')) {
    patch.business_license_no = normalizeOptionalText({
      field: 'business_license_no',
      maxLength: 100,
      value: body.business_license_no,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'invoice_note')) {
    patch.invoice_note = normalizeOptionalText({
      field: 'invoice_note',
      maxLength: 2000,
      value: body.invoice_note,
    });
  }

  return patch;
};

const normalizePermissionCodes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
        .filter(Boolean)
    : [];

const stableSerialize = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const calculateChangedFields = (before, after) =>
  BUSINESS_UPDATE_FIELDS.filter(
    (field) => stableSerialize(before?.[field]) !== stableSerialize(after?.[field]),
  );

const ensureAdminAccess = (auth) => {
  if (!auth?.userId || !auth?.user || !auth?.roleCode) {
    throw buildForbiddenError();
  }

  if (!ADMIN_ALLOWED_ROLE_CODES.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (auth.user.status !== USER_STATUS.ACTIVE) {
    throw buildForbiddenError();
  }
};

const ensurePermission = (permissionCodes, requiredCodes) => {
  if (requiredCodes.some((code) => permissionCodes.includes(code))) {
    return;
  }

  throw buildForbiddenError();
};

const invalidateBusinessTemplateConfigCache = () => {
  businessTemplateCacheRevision += 1;
  return businessTemplateCacheRevision;
};

const getBusinessTemplateCacheRevision = () => businessTemplateCacheRevision;

const createAdminBusinessSettingsService = ({
  invalidateBusinessTemplateCache = invalidateBusinessTemplateConfigCache,
  repository = createSettingsRepository(),
} = {}) => {
  const getBusinessSettings = async ({
    auth,
  } = {}) => {
    ensureAdminAccess(auth);

    try {
      const permissionCodes = normalizePermissionCodes(
        await repository.listPermissionCodesByRoleId(auth.user.role_id),
      );

      ensurePermission(permissionCodes, ['settings.read', 'system_setting.manage']);

      const record = await repository.getBusinessSettings();
      const settings = sanitizeStoredBusinessSettings({
        input: record.settings || buildDefaultBusinessSettings(),
        strict: false,
      });

      return {
        ...settings,
        updated_at: record.metadata.updated_at || null,
        updated_by: record.metadata.updated_by || null,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw buildInternalError();
    }
  };

  const updateBusinessSettings = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  } = {}) => {
    ensureAdminAccess(auth);

    try {
      const permissionCodes = normalizePermissionCodes(
        await repository.listPermissionCodesByRoleId(auth.user.role_id),
      );

      ensurePermission(permissionCodes, [
        'settings.update',
        'system_setting.manage',
      ]);

      const patch = parseUpdateBody(body || {});
      const currentRecord = await repository.getBusinessSettings();
      const currentSettings = sanitizeStoredBusinessSettings({
        input: currentRecord.settings || buildDefaultBusinessSettings(),
        strict: false,
      });
      const mergedSettings = validateFinalBusinessSettings(
        sanitizeStoredBusinessSettings({
          input: {
            ...currentSettings,
            ...patch,
          },
          strict: true,
        }),
      );
      const changedFields = calculateChangedFields(
        currentSettings,
        mergedSettings,
      );
      const savedRecord = await repository.saveBusinessSettings({
        actorUserId: auth.userId,
        changedFields,
        ipAddress,
        settings: mergedSettings,
        userAgent,
      });

      invalidateBusinessTemplateCache();

      return {
        ...sanitizeStoredBusinessSettings({
          input: savedRecord.settings || buildDefaultBusinessSettings(),
          strict: false,
        }),
        updated_at: savedRecord.metadata.updated_at || null,
        updated_by: savedRecord.metadata.updated_by || auth.userId,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw buildInternalError();
    }
  };

  return {
    getBusinessSettings,
    updateBusinessSettings,
  };
};

module.exports = Object.assign(createAdminBusinessSettingsService(), {
  BUSINESS_UPDATE_FIELDS,
  buildDefaultBusinessSettings,
  createAdminBusinessSettingsService,
  getBusinessTemplateCacheRevision,
  invalidateBusinessTemplateConfigCache,
  sanitizeStoredBusinessSettings,
});
