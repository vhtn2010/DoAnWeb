const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { cloudinary: defaultCloudinaryConfig } = require('../config');
const { createUploadRepository } = require('../database/uploadRepository');
const AppError = require('../utils/AppError');

const UPLOAD_USAGE_VIEWED_ACTION = 'upload.usage_viewed';
const UPLOAD_USAGE_VIEW_FAILED_ACTION = 'upload.usage_view_failed';
const UPLOAD_USAGE_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const UPLOAD_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const UPLOAD_USAGE_REQUIRED_PERMISSION_CODES = Object.freeze([
  'dashboard.read',
]);

let uploadUsageCache = null;

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

const normalizePermissionCodes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
        .filter(Boolean)
    : [];

const toNullableNumber = (value) => {
  if (value == null || value === '') {
    return null;
  }

  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : null;
};

const pickUsageNumber = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }

    if (typeof candidate === 'number') {
      return Number.isFinite(candidate) ? candidate : null;
    }

    if (typeof candidate === 'string') {
      const parsed = toNullableNumber(candidate);

      if (parsed != null) {
        return parsed;
      }

      continue;
    }

    if (typeof candidate === 'object') {
      const nested = pickUsageNumber(
        candidate.usage,
        candidate.used,
        candidate.used_bytes,
        candidate.bytes,
        candidate.count,
        candidate.total,
        candidate.value,
      );

      if (nested != null) {
        return nested;
      }
    }
  }

  return null;
};

const ensureAuthenticatedAdmin = (auth) => {
  if (!auth?.userId || !auth?.user || !auth?.roleCode) {
    throw buildForbiddenError();
  }

  if (!UPLOAD_USAGE_ALLOWED_ROLES.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (auth.user.status !== USER_STATUS.ACTIVE) {
    throw buildForbiddenError();
  }
};

const validateRequestShape = ({
  body,
  query,
} = {}) => {
  const details = [];
  const hasQuery =
    isPlainObject(query) &&
    Object.keys(query).length > 0;
  const hasBodyObject =
    isPlainObject(body) &&
    Object.keys(body).length > 0;
  const hasInvalidBody =
    body != null &&
    ((Array.isArray(body) && body.length > 0) ||
      (!isPlainObject(body) && body !== ''));

  if (hasQuery) {
    details.push({
      field: 'query',
      message: 'query parameters are not supported',
    });
  }

  if (hasBodyObject || hasInvalidBody) {
    details.push({
      field: 'body',
      message: 'body is not supported',
    });
  }

  if (details.length > 0) {
    throw buildValidationError(details);
  }
};

const ensureUsagePermission = (permissionCodes) => {
  if (
    UPLOAD_USAGE_REQUIRED_PERMISSION_CODES.some((code) =>
      permissionCodes.includes(code),
    )
  ) {
    return;
  }

  throw buildForbiddenError();
};

const createCloudinaryUsageFetcher = ({
  cloudinaryConfig = defaultCloudinaryConfig,
} = {}) => async () => {
  if (
    !cloudinaryConfig?.cloudName ||
    !cloudinaryConfig?.apiKey ||
    !cloudinaryConfig?.apiSecret
  ) {
    throw buildInternalError();
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudinaryConfig.cloudName,
    )}/usage`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${cloudinaryConfig.apiKey}:${cloudinaryConfig.apiSecret}`,
        ).toString('base64')}`,
      },
      method: 'GET',
      signal: AbortSignal.timeout(cloudinaryConfig.requestTimeoutMs || 20000),
    },
  );

  if (!response.ok) {
    throw buildInternalError();
  }

  const payload = await response.json().catch(() => null);

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw buildInternalError();
  }

  return payload;
};

const normalizeUsagePayload = ({
  fetchedAt,
  payload = {},
} = {}) => {
  const storageUsedBytes = pickUsageNumber(
    payload.storage?.usage,
    payload.storage?.used_bytes,
    payload.usage?.storage?.usage,
  );
  const storageLimitBytes = pickUsageNumber(
    payload.storage?.limit,
    payload.storage?.limit_bytes,
    payload.usage?.storage?.limit,
  );
  const bandwidthUsedBytes = pickUsageNumber(
    payload.bandwidth?.usage,
    payload.bandwidth?.used_bytes,
    payload.usage?.bandwidth?.usage,
  );
  const bandwidthLimitBytes = pickUsageNumber(
    payload.bandwidth?.limit,
    payload.bandwidth?.limit_bytes,
    payload.usage?.bandwidth?.limit,
  );
  const assetCount = pickUsageNumber(
    payload.objects?.usage,
    payload.assets?.usage,
    payload.asset_count,
    payload.resources?.usage,
  );
  const breakdownSource =
    (isPlainObject(payload.resources_breakdown) && payload.resources_breakdown) ||
    (isPlainObject(payload.resource_breakdown) && payload.resource_breakdown) ||
    (isPlainObject(payload.resources) && payload.resources) ||
    {};
  const resourceBreakdown = {
    image: pickUsageNumber(
      breakdownSource.image,
      breakdownSource.images,
    ),
    raw: pickUsageNumber(
      breakdownSource.raw,
      breakdownSource.files,
    ),
    video: pickUsageNumber(
      breakdownSource.video,
      breakdownSource.videos,
    ),
  };
  const partial = [
    storageUsedBytes,
    bandwidthUsedBytes,
    assetCount,
    resourceBreakdown.image,
    resourceBreakdown.video,
    resourceBreakdown.raw,
  ].some((value) => value == null);

  return {
    asset_count: assetCount,
    bandwidth_usage: {
      limit_bytes: bandwidthLimitBytes,
      used_bytes: bandwidthUsedBytes,
    },
    cached: false,
    fetched_at: fetchedAt,
    partial,
    provider: 'cloudinary',
    resource_breakdown: resourceBreakdown,
    storage_usage: {
      limit_bytes: storageLimitBytes,
      used_bytes: storageUsedBytes,
    },
  };
};

const getCachedUsage = (nowMs) => {
  if (!uploadUsageCache || uploadUsageCache.expiresAt <= nowMs) {
    return null;
  }

  return {
    ...uploadUsageCache.value,
    cached: true,
  };
};

const saveCachedUsage = ({
  nowMs,
  ttlMs = UPLOAD_USAGE_CACHE_TTL_MS,
  value,
}) => {
  uploadUsageCache = {
    expiresAt: nowMs + ttlMs,
    value: {
      ...value,
      cached: false,
    },
  };
};

const invalidateUploadUsageCache = () => {
  uploadUsageCache = null;
};

const logUsageEventSafely = async ({
  action,
  auth,
  ipAddress,
  metadata,
  repository,
  userAgent,
}) => {
  try {
    await repository.insertUserLog({
      action,
      entityName: 'uploads',
      ipAddress,
      metadata,
      userAgent,
      userId: auth?.userId || null,
    });
  } catch {}
};

const createUploadUsageService = ({
  cloudinaryConfig = defaultCloudinaryConfig,
  fetchUsage,
  now = () => new Date(),
  repository = createUploadRepository(),
  usageCacheTtlMs = UPLOAD_USAGE_CACHE_TTL_MS,
} = {}) => {
  const fetchUsageImpl =
    fetchUsage ||
    createCloudinaryUsageFetcher({
      cloudinaryConfig,
    });

  const getUploadUsage = async ({
    auth,
    body,
    ipAddress,
    query,
    userAgent,
  } = {}) => {
    ensureAuthenticatedAdmin(auth);
    validateRequestShape({
      body,
      query,
    });

    try {
      const permissionCodes = normalizePermissionCodes(
        await repository.listPermissionCodesByRoleId(auth.user.role_id),
      );

      ensureUsagePermission(permissionCodes);

      const nowDate = now();
      const nowMs = nowDate.getTime();
      const cachedUsage = getCachedUsage(nowMs);

      if (cachedUsage) {
        await logUsageEventSafely({
          action: UPLOAD_USAGE_VIEWED_ACTION,
          auth,
          ipAddress,
          metadata: {
            cached: true,
            partial: cachedUsage.partial,
            provider: cachedUsage.provider,
            role_code: auth.roleCode,
          },
          repository,
          userAgent,
        });

        return cachedUsage;
      }

      const payload = await fetchUsageImpl();
      const normalizedUsage = normalizeUsagePayload({
        fetchedAt: nowDate.toISOString(),
        payload,
      });

      saveCachedUsage({
        nowMs,
        ttlMs: usageCacheTtlMs,
        value: normalizedUsage,
      });

      await logUsageEventSafely({
        action: UPLOAD_USAGE_VIEWED_ACTION,
        auth,
        ipAddress,
        metadata: {
          cached: false,
          partial: normalizedUsage.partial,
          provider: normalizedUsage.provider,
          role_code: auth.roleCode,
        },
        repository,
        userAgent,
      });

      return normalizedUsage;
    } catch (error) {
      if (
        error instanceof AppError &&
        [API_ERROR_CODES.FORBIDDEN, API_ERROR_CODES.VALIDATION_ERROR].includes(
          error.code,
        )
      ) {
        throw error;
      }

      await logUsageEventSafely({
        action: UPLOAD_USAGE_VIEW_FAILED_ACTION,
        auth,
        ipAddress,
        metadata: {
          error_code: error?.code || API_ERROR_CODES.INTERNAL_ERROR,
          provider: 'cloudinary',
          role_code: auth.roleCode,
        },
        repository,
        userAgent,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw buildInternalError();
    }
  };

  return {
    getUploadUsage,
  };
};

module.exports = Object.assign(createUploadUsageService(), {
  UPLOAD_USAGE_ALLOWED_ROLES,
  UPLOAD_USAGE_CACHE_TTL_MS,
  UPLOAD_USAGE_REQUIRED_PERMISSION_CODES,
  UPLOAD_USAGE_VIEWED_ACTION,
  UPLOAD_USAGE_VIEW_FAILED_ACTION,
  createUploadUsageService,
  invalidateUploadUsageCache,
  normalizeUsagePayload,
});
