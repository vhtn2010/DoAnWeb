const { sendgrid } = require('../config');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const {
  ADMIN_PUBLIC_FIELD_NAMES,
  createSettingsRepository,
  isSettingsStorageUnavailableError,
} = require('../database/settingsRepository');
const settingsService = require('./settingsService');
const AppError = require('../utils/AppError');

const ADMIN_PUBLIC_UPDATE_FIELDS = Object.freeze([
  'site_name',
  'logo_url',
  'hotline',
  'support_email',
  'address',
  'social_links',
  'business_hours',
  'seo_title',
  'seo_description',
  'footer_text',
]);
const ADMIN_PUBLIC_READ_FIELDS = Object.freeze([
  ...new Set(ADMIN_PUBLIC_FIELD_NAMES),
]);
const ADMIN_ALLOWED_ROLE_CODES = Object.freeze([
  'admin',
  'system_admin',
]);
const FORBIDDEN_KEY_PATTERN =
  /(secret|token|password|api[_-]?key|webhook|private|internal|bank|account|invoice|billing|payment|direct_payment)/i;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;

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

const normalizeRequiredString = ({
  field,
  maxLength,
  strict = true,
  value,
}) => {
  if (typeof value !== 'string') {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} is required`,
      },
    ]);
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} is required`,
      },
    ]);
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

const normalizeOptionalText = ({
  field,
  maxLength,
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

  const normalized = value.trim();

  try {
    const parsedUrl = new URL(normalized);

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

const sanitizeStructuredValue = ({
  field,
  strict = true,
  value,
}) => {
  if (value == null) {
    return null;
  }

  const forbiddenPath = containsForbiddenKeys(value, field);

  if (forbiddenPath) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${forbiddenPath} is not allowed in public settings`,
      },
    ]);
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      sanitizeStructuredValue({
        field: `${field}[${index}]`,
        strict,
        value: entry,
      }),
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, entry]) => {
      accumulator[key] = sanitizeStructuredValue({
        field: `${field}.${key}`,
        strict,
        value: entry,
      });
      return accumulator;
    }, {});
  }

  if (!strict) {
    return null;
  }

  throw buildValidationError([
    {
      field,
      message: `${field} must be a valid JSON-compatible value`,
    },
  ]);
};

const sanitizeSocialLinkEntry = ({
  field,
  strict = true,
  value,
}) => {
  if (typeof value === 'string') {
    return parseHttpUrl(field, value, { strict });
  }

  if (!isPlainObject(value)) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid URL or object`,
      },
    ]);
  }

  const forbiddenPath = containsForbiddenKeys(value, field);

  if (forbiddenPath) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${forbiddenPath} is not allowed in public settings`,
      },
    ]);
  }

  const url =
    value.url != null
      ? parseHttpUrl(`${field}.url`, value.url, { strict })
      : value.href != null
        ? parseHttpUrl(`${field}.href`, value.href, { strict })
        : value.link != null
          ? parseHttpUrl(`${field}.link`, value.link, { strict })
          : null;

  if (!url) {
    if (!strict) {
      return null;
    }

    throw buildValidationError([
      {
        field,
        message: `${field} must include a valid url, href, or link`,
      },
    ]);
  }

  const result = {};

  for (const [key, entry] of Object.entries(value)) {
    if (key === 'url' || key === 'href' || key === 'link') {
      continue;
    }

    result[key] = sanitizeStructuredValue({
      field: `${field}.${key}`,
      strict,
      value: entry,
    });
  }

  result.url = url;
  return result;
};

const sanitizeSocialLinks = (value, { strict = true } = {}) => {
  if (value == null) {
    return {};
  }

  if (Array.isArray(value)) {
    return value
      .map((entry, index) =>
        sanitizeSocialLinkEntry({
          field: `social_links[${index}]`,
          strict,
          value: entry,
        }),
      )
      .filter((entry) => entry != null);
  }

  if (!isPlainObject(value)) {
    if (!strict) {
      return {};
    }

    throw buildValidationError([
      {
        field: 'social_links',
        message: 'social_links must be an object or array',
      },
    ]);
  }

  const forbiddenPath = containsForbiddenKeys(value, 'social_links');

  if (forbiddenPath) {
    if (!strict) {
      return Object.entries(value).reduce((accumulator, [key, entry]) => {
        const sanitizedEntry = sanitizeSocialLinkEntry({
          field: `social_links.${key}`,
          strict,
          value: entry,
        });

        if (sanitizedEntry != null) {
          accumulator[key] = sanitizedEntry;
        }

        return accumulator;
      }, {});
    }

    throw buildValidationError([
      {
        field: 'social_links',
        message: `${forbiddenPath} is not allowed in public settings`,
      },
    ]);
  }

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    const sanitizedEntry = sanitizeSocialLinkEntry({
      field: `social_links.${key}`,
      strict,
      value: entry,
    });

    if (sanitizedEntry != null) {
      accumulator[key] = sanitizedEntry;
    }

    return accumulator;
  }, {});
};

const buildAdminDefaultSettings = ({
  sendgridConfig = sendgrid,
} = {}) => ({
  address: null,
  business_hours: null,
  business_info_public: null,
  footer_text: null,
  hotline: null,
  logo_url: null,
  seo_description: null,
  seo_title: null,
  site_name: normalizeOptionalString(sendgridConfig?.fromName) || 'Net Viet Travel',
  social_links: {},
  support_email: parseEmail('support_email', sendgridConfig?.fromEmail),
});

const sanitizeStoredAdminPublicSettings = ({
  input = {},
  strict = false,
  sendgridConfig = sendgrid,
} = {}) => {
  const source = isPlainObject(input) ? input : {};
  const defaults = buildAdminDefaultSettings({
    sendgridConfig,
  });

  return {
    address:
      normalizeOptionalText({
        field: 'address',
        maxLength: 500,
        strict,
        value: source.address,
      }) ?? defaults.address,
    business_hours:
      sanitizeStructuredValue({
        field: 'business_hours',
        strict,
        value: source.business_hours,
      }) ?? defaults.business_hours,
    business_info_public:
      sanitizeStructuredValue({
        field: 'business_info_public',
        strict,
        value: source.business_info_public,
      }) ?? defaults.business_info_public,
    footer_text:
      normalizeOptionalText({
        field: 'footer_text',
        maxLength: 2000,
        strict,
        value: source.footer_text,
      }) ?? defaults.footer_text,
    hotline: parsePhone('hotline', source.hotline, { strict }) ?? defaults.hotline,
    logo_url:
      (source.logo_url != null
        ? parseHttpUrl('logo_url', source.logo_url, { strict })
        : null) ?? defaults.logo_url,
    seo_description:
      normalizeOptionalText({
        field: 'seo_description',
        maxLength: 500,
        strict,
        value: source.seo_description,
      }) ?? defaults.seo_description,
    seo_title:
      normalizeOptionalText({
        field: 'seo_title',
        maxLength: 255,
        strict,
        value: source.seo_title,
      }) ?? defaults.seo_title,
    site_name:
      (source.site_name != null
        ? normalizeRequiredString({
            field: 'site_name',
            maxLength: 150,
            strict,
            value: source.site_name,
          })
        : defaults.site_name) || defaults.site_name,
    social_links:
      (source.social_links != null
        ? sanitizeSocialLinks(source.social_links, { strict })
        : defaults.social_links) || {},
    support_email:
      (source.support_email != null
        ? parseEmail('support_email', source.support_email, { strict })
        : defaults.support_email) ?? defaults.support_email,
  };
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

  const unknownFields = Object.keys(body).filter(
    (field) => !ADMIN_PUBLIC_UPDATE_FIELDS.includes(field),
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

  if (Object.prototype.hasOwnProperty.call(body, 'site_name')) {
    patch.site_name = normalizeRequiredString({
      field: 'site_name',
      maxLength: 150,
      value: body.site_name,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'hotline')) {
    patch.hotline = parsePhone('hotline', body.hotline);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'support_email')) {
    patch.support_email = parseEmail('support_email', body.support_email);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'logo_url')) {
    patch.logo_url =
      body.logo_url == null ? null : parseHttpUrl('logo_url', body.logo_url);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'address')) {
    patch.address = normalizeOptionalText({
      field: 'address',
      maxLength: 500,
      value: body.address,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'social_links')) {
    patch.social_links = sanitizeSocialLinks(body.social_links);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'business_hours')) {
    patch.business_hours = sanitizeStructuredValue({
      field: 'business_hours',
      value: body.business_hours,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'seo_title')) {
    patch.seo_title = normalizeOptionalText({
      field: 'seo_title',
      maxLength: 255,
      value: body.seo_title,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'seo_description')) {
    patch.seo_description = normalizeOptionalText({
      field: 'seo_description',
      maxLength: 500,
      value: body.seo_description,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'footer_text')) {
    patch.footer_text = normalizeOptionalText({
      field: 'footer_text',
      maxLength: 2000,
      value: body.footer_text,
    });
  }

  return patch;
};

const normalizePermissionCodes = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter(Boolean);
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

const calculateChangedFields = (before, after) =>
  ADMIN_PUBLIC_UPDATE_FIELDS.filter(
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

const ensurePermission = ({
  permissionCodes,
  requiredCodes,
}) => {
  if (requiredCodes.some((code) => permissionCodes.includes(code))) {
    return;
  }

  throw buildForbiddenError();
};

const createAdminSettingsService = ({
  invalidatePublicSettingsCache = () =>
    settingsService.invalidatePublicSettingsCache(),
  repository = createSettingsRepository(),
  sendgridConfig = sendgrid,
} = {}) => {
  const getPublicSettings = async ({
    auth,
  } = {}) => {
    ensureAdminAccess(auth);

    try {
      const permissionCodes = normalizePermissionCodes(
        await repository.listPermissionCodesByRoleId(auth.user.role_id),
      );

      ensurePermission({
        permissionCodes,
        requiredCodes: ['settings.read'],
      });

      let record;

      try {
        record = await repository.getAdminPublicSettings();
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

      const settings = sanitizeStoredAdminPublicSettings({
        input: record.settings || buildAdminDefaultSettings({ sendgridConfig }),
        strict: false,
        sendgridConfig,
      });

      return {
        ...Object.fromEntries(
          ADMIN_PUBLIC_READ_FIELDS.map((field) => [field, settings[field] ?? null]),
        ),
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

  const updatePublicSettings = async ({
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

      ensurePermission({
        permissionCodes,
        requiredCodes: ['settings.update'],
      });

      const patch = parseUpdateBody(body || {});
      let currentRecord;

      try {
        currentRecord = await repository.getAdminPublicSettings();
      } catch (error) {
        if (!isSettingsStorageUnavailableError(error)) {
          throw error;
        }

        throw buildSettingsStorageUnavailableError();
      }

      const currentSettings = sanitizeStoredAdminPublicSettings({
        input: currentRecord.settings || buildAdminDefaultSettings({ sendgridConfig }),
        strict: false,
        sendgridConfig,
      });
      const mergedSettings = sanitizeStoredAdminPublicSettings({
        input: {
          ...currentSettings,
          ...patch,
        },
        strict: true,
        sendgridConfig,
      });
      const changedFields = calculateChangedFields(currentSettings, mergedSettings);
      const savedRecord = await repository.saveAdminPublicSettings({
        actorUserId: auth.userId,
        changedFields,
        ipAddress,
        settings: mergedSettings,
        userAgent,
      });

      invalidatePublicSettingsCache();

      return {
        ...Object.fromEntries(
          ADMIN_PUBLIC_READ_FIELDS.map((field) => [
            field,
            savedRecord.settings?.[field] ?? null,
          ]),
        ),
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
    getPublicSettings,
    updatePublicSettings,
  };
};

module.exports = Object.assign(createAdminSettingsService(), {
  ADMIN_PUBLIC_READ_FIELDS,
  ADMIN_PUBLIC_UPDATE_FIELDS,
  buildAdminDefaultSettings,
  createAdminSettingsService,
  sanitizeStoredAdminPublicSettings,
});
