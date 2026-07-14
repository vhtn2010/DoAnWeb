const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const {
  cloudinary: defaultCloudinaryConfig,
  isTruthy,
} = require('../config');
const { createUploadRepository } = require('../database/uploadRepository');
const AppError = require('../utils/AppError');

const UPLOAD_COMPLETE_ACTION = 'upload.completed';
const UPLOAD_COMPLETE_ALLOWED_ROLES = Object.freeze([
  'customer',
  'staff',
  'admin',
  'system_admin',
]);
const ALLOWED_RESOURCE_TYPES = Object.freeze([
  'image',
  'video',
  'raw',
]);
const ALLOWED_PURPOSES = Object.freeze([
  'avatar',
  'service_image',
  'service_video',
  'payment_proof',
  'report_file',
  'invoice_pdf',
  'support_reply',
]);
const PURPOSE_POLICIES = Object.freeze({
  avatar: Object.freeze({
    allowedRoles: Object.freeze(['customer', 'staff', 'admin', 'system_admin']),
    folderSegment: 'avatars',
    resourceTypes: Object.freeze(['image']),
    scope: 'self',
  }),
  invoice_pdf: Object.freeze({
    allowedRoles: Object.freeze(['admin', 'system_admin']),
    folderSegment: 'system-assets',
    resourceTypes: Object.freeze(['raw']),
    scope: 'system_assets',
  }),
  payment_proof: Object.freeze({
    allowedRoles: Object.freeze(['customer', 'staff', 'admin', 'system_admin']),
    folderSegment: 'payments',
    resourceTypes: Object.freeze(['image', 'raw']),
    scope: 'self_or_payments',
  }),
  report_file: Object.freeze({
    allowedRoles: Object.freeze(['admin', 'system_admin']),
    folderSegment: 'reports',
    resourceTypes: Object.freeze(['raw']),
    scope: 'reports',
  }),
  service_image: Object.freeze({
    allowedRoles: Object.freeze(['staff', 'admin', 'system_admin']),
    folderSegment: 'services',
    resourceTypes: Object.freeze(['image']),
    scope: 'services',
  }),
  service_video: Object.freeze({
    allowedRoles: Object.freeze(['staff', 'admin', 'system_admin']),
    folderSegment: 'services',
    resourceTypes: Object.freeze(['video']),
    scope: 'services',
  }),
  support_reply: Object.freeze({
    allowedRoles: Object.freeze(['staff', 'admin', 'system_admin']),
    folderSegment: 'support',
    resourceTypes: Object.freeze(['image']),
    scope: 'support',
  }),
});
const PERMISSION_GROUPS = Object.freeze({
  payments: Object.freeze([
    'payment.read_all',
    'payment.confirm',
    'payment.reject',
    'payment.reconcile',
  ]),
  reports: Object.freeze([
    'report.read',
    'dashboard.read',
  ]),
  services: Object.freeze([
    'service.update',
    'service.create',
  ]),
  support: Object.freeze([
    'support.reply',
  ]),
  systemAssets: Object.freeze([
    'settings.update',
  ]),
});
const UNSAFE_PUBLIC_ID_PATTERN = /(?:\.\.|\\|[\u0000-\u001F\u007F])/;
const PUBLIC_ID_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const COMPLETE_VERIFY_ASSET_ENV = 'CLOUDINARY_VERIFY_COMPLETED_UPLOADS';
const CLOUDINARY_HOSTNAME = 'res.cloudinary.com';

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

const buildDuplicateError = (message = 'Resource already exists') =>
  new AppError(message, {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    statusCode: 409,
  });

const buildInternalError = () =>
  new AppError('Internal server error', {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const buildNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const sanitizePathSegment = (value, fallback = 'net-viet-travel') => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-');
};

const normalizePermissionCodes = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
        .filter(Boolean)
    : [];

const parseHttpUrl = (value) => {
  try {
    const parsedUrl = new URL(value);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('invalid-protocol');
    }

    return parsedUrl;
  } catch {
    return null;
  }
};

const parseAssetUrl = ({
  cloudinaryConfig,
  publicId,
  resourceType,
  value,
}) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url is required',
      },
    ]);
  }

  if (!cloudinaryConfig?.cloudName) {
    throw buildInternalError();
  }

  const parsedUrl = parseHttpUrl(normalized);

  if (!parsedUrl) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url must be a valid http or https URL',
      },
    ]);
  }

  if (parsedUrl.hostname !== CLOUDINARY_HOSTNAME) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url must be a valid Cloudinary delivery URL',
      },
    ]);
  }

  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  if (
    pathSegments.length < 4 ||
    pathSegments[0] !== cloudinaryConfig.cloudName ||
    pathSegments[1] !== resourceType ||
    pathSegments[2] !== 'upload'
  ) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url must be a valid Cloudinary delivery URL',
      },
    ]);
  }

  const assetPathSegments =
    pathSegments[3]?.startsWith('v') ? pathSegments.slice(4) : pathSegments.slice(3);

  if (assetPathSegments.length === 0) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url must match public_id',
      },
    ]);
  }

  const deliveredAssetPath = assetPathSegments.join('/');
  const deliveredWithoutExtension =
    resourceType === 'raw'
      ? deliveredAssetPath
      : deliveredAssetPath.replace(/\.[^/.]+$/, '');

  if (
    deliveredAssetPath !== publicId &&
    deliveredWithoutExtension !== publicId
  ) {
    throw buildValidationError([
      {
        field: 'asset_url',
        message: 'asset_url must match public_id',
      },
    ]);
  }

  return parsedUrl.toString();
};

const parsePublicId = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field: 'public_id',
        message: 'public_id is required',
      },
    ]);
  }

  if (
    UNSAFE_PUBLIC_ID_PATTERN.test(normalized) ||
    normalized.startsWith('/') ||
    normalized.endsWith('/') ||
    normalized.includes('//')
  ) {
    throw buildValidationError([
      {
        field: 'public_id',
        message: 'public_id is not allowed',
      },
    ]);
  }

  const segments = normalized.split('/');

  if (
    segments.some(
      (segment) => !segment || !PUBLIC_ID_SEGMENT_PATTERN.test(segment),
    )
  ) {
    throw buildValidationError([
      {
        field: 'public_id',
        message: 'public_id is not allowed',
      },
    ]);
  }

  return normalized;
};

const parseResourceType = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field: 'resource_type',
        message: 'resource_type is required',
      },
    ]);
  }

  if (!ALLOWED_RESOURCE_TYPES.includes(normalized)) {
    throw buildValidationError([
      {
        field: 'resource_type',
        message: `resource_type must be one of: ${ALLOWED_RESOURCE_TYPES.join(', ')}`,
      },
    ]);
  }

  return normalized;
};

const parsePurpose = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field: 'purpose',
        message: 'purpose is required',
      },
    ]);
  }

  if (!ALLOWED_PURPOSES.includes(normalized)) {
    throw buildValidationError([
      {
        field: 'purpose',
        message: `purpose must be one of: ${ALLOWED_PURPOSES.join(', ')}`,
      },
    ]);
  }

  return normalized;
};

const ensureAuthenticatedActiveUser = (auth) => {
  if (!auth?.userId || !auth?.user || !auth?.roleCode) {
    throw buildForbiddenError();
  }

  if (!UPLOAD_COMPLETE_ALLOWED_ROLES.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (auth.user.status !== USER_STATUS.ACTIVE) {
    throw buildForbiddenError();
  }
};

const parsePublicIdScope = ({
  cloudinaryConfig,
  policy,
  publicId,
}) => {
  const segments = publicId.split('/');
  const baseFolder = sanitizePathSegment(
    normalizeOptionalString(cloudinaryConfig?.folder) || 'net-viet-travel',
    'net-viet-travel',
  );

  if (
    segments.length < 2 ||
    segments[0] !== baseFolder ||
    segments[1] !== policy.folderSegment
  ) {
    throw buildForbiddenError('public_id is outside the allowed asset scope');
  }

  return {
    baseFolder,
    segments,
  };
};

const resolvePermissionCodes = async ({
  auth,
  purpose,
  repository,
}) => {
  if (
    purpose === 'avatar' ||
    (purpose === 'payment_proof' && auth.roleCode === 'customer')
  ) {
    return [];
  }

  return normalizePermissionCodes(
    await repository.listPermissionCodesByRoleId(auth.user.role_id),
  );
};

const ensurePurposeScope = ({
  auth,
  permissionCodes,
  policy,
}) => {
  if (!policy.allowedRoles.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (policy.scope === 'self') {
    return;
  }

  if (policy.scope === 'self_or_payments') {
    if (auth.roleCode === 'customer') {
      return;
    }

    if (
      auth.roleCode === 'staff' &&
      permissionCodes.some((code) => PERMISSION_GROUPS.payments.includes(code))
    ) {
      return;
    }

    if (['admin', 'system_admin'].includes(auth.roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (policy.scope === 'services') {
    if (
      auth.roleCode === 'staff' &&
      permissionCodes.some((code) => PERMISSION_GROUPS.services.includes(code))
    ) {
      return;
    }

    if (['admin', 'system_admin'].includes(auth.roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (policy.scope === 'support') {
    if (
      auth.roleCode === 'staff' &&
      permissionCodes.some((code) => PERMISSION_GROUPS.support.includes(code))
    ) {
      return;
    }

    if (['admin', 'system_admin'].includes(auth.roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (policy.scope === 'reports') {
    if (!['admin', 'system_admin'].includes(auth.roleCode)) {
      throw buildForbiddenError();
    }

    if (
      permissionCodes.some((code) => PERMISSION_GROUPS.reports.includes(code)) ||
      ['admin', 'system_admin'].includes(auth.roleCode)
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  if (policy.scope === 'system_assets') {
    if (!['admin', 'system_admin'].includes(auth.roleCode)) {
      throw buildForbiddenError();
    }

    if (
      permissionCodes.some((code) =>
        PERMISSION_GROUPS.systemAssets.includes(code),
      ) ||
      ['admin', 'system_admin'].includes(auth.roleCode)
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  throw buildForbiddenError();
};

const ensureSelfScopedPublicId = ({
  auth,
  policy,
  publicId,
}) => {
  if (!['self', 'self_or_payments'].includes(policy.scope)) {
    return;
  }

  const expectedPrefix = `${policy.folderSegment}/${sanitizePathSegment(
    auth.userId,
    auth.userId,
  )}`;
  const publicIdWithoutBase = publicId.split('/').slice(1).join('/');

  if (!publicIdWithoutBase.startsWith(expectedPrefix)) {
    if (policy.scope === 'self_or_payments' && auth.roleCode !== 'customer') {
      return;
    }

    throw buildForbiddenError('public_id is outside the allowed asset scope');
  }
};

const defaultVerifyAssetExists = isTruthy(
  process.env[COMPLETE_VERIFY_ASSET_ENV],
);

const createCloudinaryAssetVerifier = ({
  cloudinaryConfig = defaultCloudinaryConfig,
} = {}) => async ({ publicId, resourceType }) => {
  if (
    !cloudinaryConfig?.cloudName ||
    !cloudinaryConfig?.apiKey ||
    !cloudinaryConfig?.apiSecret
  ) {
    throw buildInternalError();
  }

  const encodedPublicId = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudinaryConfig.cloudName,
    )}/resources/${encodeURIComponent(resourceType)}/upload/${encodedPublicId}`,
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

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw buildInternalError();
  }

  return true;
};

const normalizeLoggedAssetPayload = (metadata = {}) => ({
  asset_url: normalizeOptionalString(metadata.asset_url),
  public_id: normalizeOptionalString(metadata.public_id),
  purpose: normalizeOptionalString(metadata.purpose),
  resource_type: normalizeOptionalString(metadata.resource_type),
});

const createUploadCompleteService = ({
  cloudinaryConfig = defaultCloudinaryConfig,
  now = () => new Date(),
  repository = createUploadRepository(),
  verifyAssetEnabled = defaultVerifyAssetExists,
  verifyAssetExists,
} = {}) => {
  const verifyAssetExistsImpl =
    verifyAssetExists ||
    createCloudinaryAssetVerifier({
      cloudinaryConfig,
    });

  const completeUpload = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  } = {}) => {
    ensureAuthenticatedActiveUser(auth);

    const publicId = parsePublicId(body?.public_id);
    const resourceType = parseResourceType(body?.resource_type);
    const purpose = parsePurpose(body?.purpose);
    const policy = PURPOSE_POLICIES[purpose];

    if (!policy.resourceTypes.includes(resourceType)) {
      throw buildValidationError([
        {
          field: 'resource_type',
          message: `resource_type ${resourceType} is not allowed for purpose ${purpose}`,
        },
      ]);
    }

    parsePublicIdScope({
      cloudinaryConfig,
      policy,
      publicId,
    });

    const permissionCodes = await resolvePermissionCodes({
      auth,
      purpose,
      repository,
    });

    ensurePurposeScope({
      auth,
      permissionCodes,
      policy,
    });
    ensureSelfScopedPublicId({
      auth,
      policy,
      publicId,
    });

    const assetUrl = parseAssetUrl({
      cloudinaryConfig,
      publicId,
      resourceType,
      value: body?.asset_url,
    });

    if (verifyAssetEnabled) {
      let assetExists;

      try {
        assetExists = await verifyAssetExistsImpl({
          publicId,
          resourceType,
        });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        throw buildInternalError();
      }

      if (!assetExists) {
        throw buildNotFoundError('Cloudinary asset not found');
      }
    }

    const existingLog = await repository.findLatestUploadLogByPublicId({
      action: UPLOAD_COMPLETE_ACTION,
      publicId,
    });

    if (existingLog) {
      const previousPayload = normalizeLoggedAssetPayload(existingLog.metadata);
      const sameActor = existingLog.user_id === auth.userId;
      const samePurpose = previousPayload.purpose === purpose;

      if (!sameActor || !samePurpose) {
        throw buildDuplicateError(
          'public_id has already been completed by another upload context',
        );
      }

      return {
        asset_url: previousPayload.asset_url || assetUrl,
        public_id: previousPayload.public_id || publicId,
        purpose: previousPayload.purpose || purpose,
        resource_type: previousPayload.resource_type || resourceType,
      };
    }

    try {
      await repository.insertUserLog({
        action: UPLOAD_COMPLETE_ACTION,
        entityName: 'uploads',
        ipAddress,
        metadata: {
          asset_url: assetUrl,
          public_id: publicId,
          purpose,
          resource_type: resourceType,
          role_code: auth.roleCode,
          uploaded_at: now().toISOString(),
        },
        userAgent,
        userId: auth.userId,
      });
    } catch {
      throw buildInternalError();
    }

    return {
      asset_url: assetUrl,
      public_id: publicId,
      purpose,
      resource_type: resourceType,
    };
  };

  return {
    completeUpload,
  };
};

module.exports = Object.assign(createUploadCompleteService(), {
  ALLOWED_PURPOSES,
  ALLOWED_RESOURCE_TYPES,
  PURPOSE_POLICIES,
  UPLOAD_COMPLETE_ACTION,
  UPLOAD_COMPLETE_ALLOWED_ROLES,
  createUploadCompleteService,
});
