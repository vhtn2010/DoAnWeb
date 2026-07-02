const { directPayment, sendgrid } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createSettingsRepository } = require('../database/settingsRepository');
const AppError = require('../utils/AppError');

const PUBLIC_SETTINGS_CACHE_SECONDS = 5 * 60;
const ALLOWED_PUBLIC_FIELDS = Object.freeze([
  'site_name',
  'logo_url',
  'hotline',
  'support_email',
  'address',
  'social_links',
  'business_hours',
  'business_info_public',
]);
const FORBIDDEN_NESTED_KEY_PATTERN =
  /(secret|token|webhook|private|internal|bank|account|payment|direct_payment)/i;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const sanitizeEmail = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
};

const sanitizePublicUrl = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalized);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch (error) {
    return null;
  }
};

const sanitizeStructuredValue = (value, keyName = '') => {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeStructuredValue(item, keyName))
      .filter((item) => item != null);

    return items.length > 0 ? items : null;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).reduce((accumulator, [key, entry]) => {
      if (FORBIDDEN_NESTED_KEY_PATTERN.test(key)) {
        return accumulator;
      }

      const sanitizedEntry = sanitizeStructuredValue(entry, key);

      if (sanitizedEntry != null) {
        accumulator[key] = sanitizedEntry;
      }

      return accumulator;
    }, {});

    return Object.keys(entries).length > 0 ? entries : null;
  }

  if (typeof value === 'string') {
    if (/(^|_)(url|link|href)$/i.test(keyName)) {
      return sanitizePublicUrl(value);
    }

    return normalizeOptionalString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return null;
};

const sanitizeSocialLinkEntry = (entry, keyName = 'social_link') => {
  if (typeof entry === 'string') {
    return sanitizePublicUrl(entry);
  }

  if (!isPlainObject(entry)) {
    return null;
  }

  const nestedUrl =
    sanitizePublicUrl(entry.url) ||
    sanitizePublicUrl(entry.href) ||
    sanitizePublicUrl(entry.link);
  const sanitizedEntry = sanitizeStructuredValue(entry, keyName);

  if (!sanitizedEntry || !nestedUrl) {
    return null;
  }

  return {
    ...sanitizedEntry,
    url: nestedUrl,
  };
};

const sanitizeSocialLinks = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry, index) =>
        sanitizeSocialLinkEntry(entry, `social_links_${index}`),
      )
      .filter((entry) => entry != null);
  }

  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [key, entry]) => {
    const normalizedKey = normalizeOptionalString(key);

    if (!normalizedKey) {
      return accumulator;
    }

    const sanitizedEntry = sanitizeSocialLinkEntry(entry, normalizedKey);

    if (sanitizedEntry) {
      accumulator[normalizedKey] = sanitizedEntry;
    }

    return accumulator;
  }, {});
};

const buildDefaultPublicSettings = ({
  directPaymentConfig = directPayment,
  sendgridConfig = sendgrid,
} = {}) => ({
  address: null,
  business_hours: null,
  business_info_public: null,
  hotline: normalizeOptionalString(directPaymentConfig?.hotline),
  logo_url: null,
  site_name: normalizeOptionalString(sendgridConfig?.fromName) || 'Net Viet Travel',
  social_links: {},
  support_email: sanitizeEmail(sendgridConfig?.fromEmail),
});

const sanitizePublicSettings = (rawSettings, defaults) => {
  const source = isPlainObject(rawSettings) ? rawSettings : {};

  return {
    address: normalizeOptionalString(source.address) ?? defaults.address,
    business_hours:
      sanitizeStructuredValue(source.business_hours, 'business_hours') ??
      defaults.business_hours,
    business_info_public:
      sanitizeStructuredValue(
        source.business_info_public,
        'business_info_public',
      ) ?? defaults.business_info_public,
    hotline: normalizeOptionalString(source.hotline) ?? defaults.hotline,
    logo_url: sanitizePublicUrl(source.logo_url) ?? defaults.logo_url,
    site_name: normalizeOptionalString(source.site_name) ?? defaults.site_name,
    social_links: sanitizeSocialLinks(source.social_links),
    support_email: sanitizeEmail(source.support_email) ?? defaults.support_email,
  };
};

const buildInternalError = () =>
  new AppError('Internal server error', {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const createSettingsService = ({
  directPaymentConfig = directPayment,
  repository = createSettingsRepository(),
  sendgridConfig = sendgrid,
} = {}) => {
  const defaults = buildDefaultPublicSettings({
    directPaymentConfig,
    sendgridConfig,
  });
  let publicSettingsCache = null;
  let publicSettingsCacheExpiresAt = 0;

  const invalidatePublicSettingsCache = () => {
    publicSettingsCache = null;
    publicSettingsCacheExpiresAt = 0;
  };

  const getPublicSettings = async () => {
    const now = Date.now();

    if (publicSettingsCache && publicSettingsCacheExpiresAt > now) {
      return publicSettingsCache;
    }

    try {
      const storedSettings = await repository.getPublicSettings();
      const sanitizedSettings = sanitizePublicSettings(
        storedSettings || defaults,
        defaults,
      );

      publicSettingsCache = sanitizedSettings;
      publicSettingsCacheExpiresAt =
        now + PUBLIC_SETTINGS_CACHE_SECONDS * 1000;

      return sanitizedSettings;
    } catch (error) {
      throw buildInternalError();
    }
  };

  return {
    getPublicSettings,
    invalidatePublicSettingsCache,
  };
};

const settingsService = createSettingsService();

module.exports = Object.assign(settingsService, {
  ALLOWED_PUBLIC_FIELDS,
  PUBLIC_SETTINGS_CACHE_SECONDS,
  buildDefaultPublicSettings,
  createSettingsService,
  invalidatePublicSettingsCache: () =>
    settingsService.invalidatePublicSettingsCache(),
  sanitizePublicSettings,
});
