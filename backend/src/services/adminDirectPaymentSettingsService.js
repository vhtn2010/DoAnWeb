const { API_ERROR_CODES, USER_STATUS } = require('../constants/domainConstraints');
const {
  createSettingsRepository,
  isSettingsStorageUnavailableError,
} = require('../database/settingsRepository');
const paymentService = require('./paymentService');
const AppError = require('../utils/AppError');

const ADMIN_ALLOWED_ROLE_CODES = Object.freeze([
  'admin',
  'system_admin',
]);
const DIRECT_PAYMENT_METHOD_CODES = Object.freeze([
  'cash_at_office',
  'manual_bank_transfer',
  'staff_collect',
]);
const FORBIDDEN_FIELD_PATTERN =
  /(secret|token|password|private[_-]?key|webhook|api[_-]?key|gateway|vnpay|momo|visa|mastercard|card|cvv|pci|pan)/i;
const INSTRUCTION_PATTERN = /[\u0000-\u001F\u007F<>]/;
const METHOD_ALLOWED_FIELDS = Object.freeze({
  cash_at_office: Object.freeze([
    'code',
    'enabled',
    'display_name',
    'office_address',
    'working_hours',
    'instructions',
    'hotline',
    'sort_order',
  ]),
  manual_bank_transfer: Object.freeze([
    'code',
    'enabled',
    'display_name',
    'bank_name',
    'account_holder',
    'account_number',
    'branch',
    'transfer_content_template',
    'qr_code_url',
    'instructions',
    'sort_order',
  ]),
  staff_collect: Object.freeze([
    'code',
    'enabled',
    'display_name',
    'conditions',
    'instructions',
    'hotline',
    'sort_order',
  ]),
});
const METHOD_DISPLAY_NAMES = Object.freeze({
  cash_at_office: 'Cash at office',
  manual_bank_transfer: 'Manual bank transfer',
  staff_collect: 'Staff collect',
});

const createDefaultMethodConfig = (code) => ({
  code,
  display_name: METHOD_DISPLAY_NAMES[code],
  enabled: false,
  sort_order: 0,
});

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

const buildSettingsStorageUnavailableError = () =>
  new AppError('Settings storage is not configured', {
    code: API_ERROR_CODES.SETTINGS_STORAGE_UNAVAILABLE,
    statusCode: 503,
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
  maxLength = 2000,
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

  if (INSTRUCTION_PATTERN.test(normalized)) {
    throw buildValidationError([
      {
        field,
        message: `${field} contains unsupported characters`,
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

const parseBoolean = (field, value, { strict = true } = {}) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (!strict) {
    return false;
  }

  throw buildValidationError([
    {
      field,
      message: `${field} must be a boolean`,
    },
  ]);
};

const parseSortOrder = (field, value, { strict = true } = {}) => {
  if (value == null || value === '') {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    if (!strict) {
      return 0;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a non-negative integer`,
      },
    ]);
  }

  return value;
};

const parseHttpUrl = (field, value, { strict = true } = {}) => {
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
        message: `${field} must be a valid http or https URL`,
      },
    ]);
  }

  try {
    const parsedUrl = new URL(value.trim());

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid-protocol');
    }

    return parsedUrl.toString();
  } catch (error) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid http or https URL`,
      },
    ]);
  }
};

const parsePhone = (field, value, { strict = true } = {}) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!/^[0-9+()\-\s]{8,20}$/.test(normalized)) {
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

const parseAccountNumber = (field, value) => {
  const normalized = normalizeRequiredString({
    field,
    maxLength: 50,
    value,
  });

  if (!/^[A-Za-z0-9 .-]{6,50}$/.test(normalized)) {
    throw buildValidationError([
      {
        field,
        message: `${field} must contain only valid bank account characters`,
      },
    ]);
  }

  return normalized;
};

const ensureNoForbiddenFields = (value, path = '') => {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      ensureNoForbiddenFields(value[index], `${path}[${index}]`);
    }

    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;

    if (FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw buildValidationError([
        {
          field: path || key,
          message: `${nextPath} is not allowed in direct payment settings`,
        },
      ]);
    }

    ensureNoForbiddenFields(entry, nextPath);
  }
};

const toAdminMethodArray = (input = {}) => {
  const normalizedConfig = paymentService.normalizeDirectPaymentConfig(input);

  return DIRECT_PAYMENT_METHOD_CODES.map((code) => {
    const method = normalizedConfig.methods[code] || {};

    return {
      code,
      display_name:
        normalizeOptionalString(method.display_name) ||
        METHOD_DISPLAY_NAMES[code],
      enabled: Boolean(method.enabled),
      sort_order:
        Number.isInteger(method.sort_order) && method.sort_order >= 0
          ? method.sort_order
          : 0,
      hotline: normalizeOptionalString(method.hotline) || null,
      office_address: normalizeOptionalString(method.office_address) || null,
      working_hours:
        normalizeOptionalString(method.working_hours) ||
        normalizeOptionalString(method.office_hours) ||
        null,
      instructions: normalizeOptionalString(method.instructions) || null,
      bank_name: normalizeOptionalString(method.bank_name) || null,
      account_holder: normalizeOptionalString(method.account_holder) || null,
      account_number: normalizeOptionalString(method.account_number) || null,
      branch: normalizeOptionalString(method.branch) || null,
      transfer_content_template:
        normalizeOptionalString(method.transfer_content_template) || null,
      qr_code_url: normalizeOptionalString(method.qr_code_url) || null,
      conditions: normalizeOptionalString(method.conditions) || null,
    };
  }).sort((left, right) =>
    left.sort_order === right.sort_order
      ? left.code.localeCompare(right.code)
      : left.sort_order - right.sort_order,
  );
};

const validateAllowedMethodFields = (method, index) => {
  const allowedFields = METHOD_ALLOWED_FIELDS[method.code];
  const unknownFields = Object.keys(method).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length > 0) {
    throw buildValidationError(
      unknownFields.map((field) => ({
        field: `methods[${index}].${field}`,
        message: `${field} is not allowed for ${method.code}`,
      })),
    );
  }
};

const sanitizeMethodInput = (method, index) => {
  if (!isPlainObject(method)) {
    throw buildValidationError([
      {
        field: `methods[${index}]`,
        message: 'each method must be an object',
      },
    ]);
  }

  ensureNoForbiddenFields(method, `methods[${index}]`);

  const code = normalizeRequiredString({
    field: `methods[${index}].code`,
    maxLength: 50,
    value: method.code,
  });

  if (!DIRECT_PAYMENT_METHOD_CODES.includes(code)) {
    throw buildValidationError([
      {
        field: `methods[${index}].code`,
        message: `code must be one of: ${DIRECT_PAYMENT_METHOD_CODES.join(', ')}`,
      },
    ]);
  }

  validateAllowedMethodFields({ ...method, code }, index);

  const enabled = parseBoolean(`methods[${index}].enabled`, method.enabled);
  const result = {
    code,
    display_name:
      normalizeOptionalText({
        field: `methods[${index}].display_name`,
        maxLength: 150,
        value: method.display_name,
      }) || METHOD_DISPLAY_NAMES[code],
    enabled,
    sort_order: parseSortOrder(`methods[${index}].sort_order`, method.sort_order),
  };

  if (code === 'manual_bank_transfer') {
    result.bank_name = normalizeOptionalText({
      field: `methods[${index}].bank_name`,
      maxLength: 150,
      value: method.bank_name,
    });
    result.account_holder = normalizeOptionalText({
      field: `methods[${index}].account_holder`,
      maxLength: 150,
      value: method.account_holder,
    });
    result.account_number =
      method.account_number == null || method.account_number === ''
        ? null
        : parseAccountNumber(
            `methods[${index}].account_number`,
            method.account_number,
          );
    result.branch = normalizeOptionalText({
      field: `methods[${index}].branch`,
      maxLength: 150,
      value: method.branch,
    });
    result.transfer_content_template = normalizeOptionalText({
      field: `methods[${index}].transfer_content_template`,
      maxLength: 255,
      value: method.transfer_content_template,
    });
    result.qr_code_url = parseHttpUrl(
      `methods[${index}].qr_code_url`,
      method.qr_code_url,
      { strict: true },
    );
    result.instructions = normalizeOptionalText({
      field: `methods[${index}].instructions`,
      maxLength: 2000,
      value: method.instructions,
    });

    if (enabled) {
      if (!result.display_name) {
        throw buildValidationError([
          {
            field: `methods[${index}].display_name`,
            message: 'display_name is required when method is enabled',
          },
        ]);
      }

      for (const requiredField of [
        'bank_name',
        'account_holder',
        'account_number',
        'transfer_content_template',
      ]) {
        if (!result[requiredField]) {
          throw buildValidationError([
            {
              field: `methods[${index}].${requiredField}`,
              message: `${requiredField} is required when method is enabled`,
            },
          ]);
        }
      }
    }
  }

  if (code === 'cash_at_office') {
    result.office_address = normalizeOptionalText({
      field: `methods[${index}].office_address`,
      maxLength: 255,
      value: method.office_address,
    });
    result.working_hours = normalizeOptionalText({
      field: `methods[${index}].working_hours`,
      maxLength: 255,
      value: method.working_hours,
    });
    result.instructions = normalizeOptionalText({
      field: `methods[${index}].instructions`,
      maxLength: 2000,
      value: method.instructions,
    });
    result.hotline = parsePhone(
      `methods[${index}].hotline`,
      method.hotline,
      { strict: true },
    );

    if (enabled) {
      if (!result.display_name) {
        throw buildValidationError([
          {
            field: `methods[${index}].display_name`,
            message: 'display_name is required when method is enabled',
          },
        ]);
      }

      if (
        !result.office_address ||
        (!result.working_hours && !result.instructions)
      ) {
        throw buildValidationError([
          {
            field: `methods[${index}]`,
            message:
              'cash_at_office requires office_address and working_hours or instructions when enabled',
          },
        ]);
      }
    }
  }

  if (code === 'staff_collect') {
    result.conditions = normalizeOptionalText({
      field: `methods[${index}].conditions`,
      maxLength: 1000,
      value: method.conditions,
    });
    result.instructions = normalizeOptionalText({
      field: `methods[${index}].instructions`,
      maxLength: 2000,
      value: method.instructions,
    });
    result.hotline = parsePhone(
      `methods[${index}].hotline`,
      method.hotline,
      { strict: true },
    );

    if (enabled) {
      if (!result.display_name) {
        throw buildValidationError([
          {
            field: `methods[${index}].display_name`,
            message: 'display_name is required when method is enabled',
          },
        ]);
      }

      if (!result.instructions && !result.conditions) {
        throw buildValidationError([
          {
            field: `methods[${index}]`,
            message:
              'staff_collect requires instructions or conditions when enabled',
          },
        ]);
      }
    }
  }

  return result;
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

  if (!Object.prototype.hasOwnProperty.call(body, 'methods')) {
    throw buildValidationError([
      {
        field: 'methods',
        message: 'methods is required',
      },
    ]);
  }

  if (!Array.isArray(body.methods)) {
    throw buildValidationError([
      {
        field: 'methods',
        message: 'methods must be an array',
      },
    ]);
  }

  const methods = body.methods.map((method, index) =>
    sanitizeMethodInput(method, index),
  );
  const seenCodes = new Set();

  for (const method of methods) {
    if (seenCodes.has(method.code)) {
      throw buildValidationError([
        {
          field: 'methods',
          message: `Duplicate method code is not allowed: ${method.code}`,
        },
      ]);
    }

    seenCodes.add(method.code);
  }

  return {
    methods: DIRECT_PAYMENT_METHOD_CODES.map((code) =>
      methods.find((entry) => entry.code === code) || createDefaultMethodConfig(code),
    ).sort((left, right) =>
      left.sort_order === right.sort_order
        ? left.code.localeCompare(right.code)
        : left.sort_order - right.sort_order,
    ),
  };
};

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

const calculateChangedMethodCodes = (beforeMethods, afterMethods) => {
  const beforeMap = new Map(beforeMethods.map((method) => [method.code, method]));
  const afterMap = new Map(afterMethods.map((method) => [method.code, method]));

  return DIRECT_PAYMENT_METHOD_CODES.filter(
    (code) =>
      stableSerialize(beforeMap.get(code) || null) !==
      stableSerialize(afterMap.get(code) || null),
  );
};

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

const normalizePermissionCodes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
        .filter(Boolean)
    : [];

const createAdminDirectPaymentSettingsService = ({
  invalidateDirectPaymentCache = () =>
    paymentService.invalidateDirectPaymentConfigCache(),
  repository = createSettingsRepository(),
} = {}) => {
  const getDirectPaymentSettings = async ({
    auth,
  } = {}) => {
    ensureAdminAccess(auth);

    try {
      const permissionCodes = normalizePermissionCodes(
        await repository.listPermissionCodesByRoleId(auth.user.role_id),
      );

      ensurePermission(permissionCodes, ['settings.read', 'system_setting.manage']);

      let record;

      try {
        record = await repository.getDirectPaymentSettings();
      } catch (error) {
        if (!isSettingsStorageUnavailableError(error)) {
          throw error;
        }

        record = {
          metadata: {
            updated_at: null,
            updated_by: null,
          },
          settings: null,
        };
      }

      return {
        methods: toAdminMethodArray(record.settings || {}),
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

  const updateDirectPaymentSettings = async ({
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

      const parsedBody = parseUpdateBody(body || {});
      let currentRecord;

      try {
        currentRecord = await repository.getDirectPaymentSettings();
      } catch (error) {
        if (!isSettingsStorageUnavailableError(error)) {
          throw error;
        }

        throw buildSettingsStorageUnavailableError();
      }

      const currentMethods = toAdminMethodArray(currentRecord.settings || {});
      const changedMethodCodes = calculateChangedMethodCodes(
        currentMethods,
        parsedBody.methods,
      );
      const savedRecord = await repository.saveDirectPaymentSettings({
        actorUserId: auth.userId,
        changedMethodCodes,
        ipAddress,
        settings: {
          methods: parsedBody.methods,
        },
        userAgent,
      });

      invalidateDirectPaymentCache();
      paymentService.hydrateDirectPaymentConfigCache(savedRecord.settings);

      return {
        methods: toAdminMethodArray(savedRecord.settings || {}),
        updated_at: savedRecord.metadata.updated_at || null,
        updated_by: savedRecord.metadata.updated_by || auth.userId,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (isSettingsStorageUnavailableError(error)) {
        throw buildSettingsStorageUnavailableError();
      }

      throw buildInternalError();
    }
  };

  return {
    getDirectPaymentSettings,
    updateDirectPaymentSettings,
  };
};

module.exports = Object.assign(createAdminDirectPaymentSettingsService(), {
  DIRECT_PAYMENT_METHOD_CODES,
  METHOD_DISPLAY_NAMES,
  createAdminDirectPaymentSettingsService,
  toAdminMethodArray,
});
