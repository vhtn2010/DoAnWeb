const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const {
  cloudinary: defaultCloudinaryConfig,
  isTruthy,
} = require('../config');
const { createUploadRepository } = require('../database/uploadRepository');
const { deleteImage: defaultDeleteImage } = require('./cloudinaryService');
const AppError = require('../utils/AppError');

const UPLOAD_CLOUDINARY_DELETED_ACTION = 'upload.cloudinary_deleted';
const UPLOAD_CLOUDINARY_DELETE_FAILED_ACTION =
  'upload.cloudinary_delete_failed';
const UPLOAD_DELETE_ALLOWED_ROLES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);
const ALLOWED_RESOURCE_TYPES = Object.freeze([
  'image',
  'video',
  'raw',
]);
const PUBLIC_ID_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const UNSAFE_PUBLIC_ID_PATTERN = /(?:\.\.|\\|[\u0000-\u001F\u007F])/;
const PERMISSION_GROUPS = Object.freeze({
  payments: Object.freeze([
    'payment.read_all',
    'payment.confirm',
    'payment.reject',
    'payment.reconcile',
    'system_setting.manage',
  ]),
  reports: Object.freeze([
    'report.read',
    'dashboard.read',
    'system_setting.manage',
  ]),
  services: Object.freeze([
    'service.update',
    'service.create',
    'service.manage',
    'booking.manage',
    'system_setting.manage',
  ]),
  systemAssets: Object.freeze([
    'settings.update',
    'system_setting.manage',
  ]),
});
const PREFIX_POLICY_BY_SEGMENT = Object.freeze({
  avatars: Object.freeze({
    allowedRoles: Object.freeze(['admin', 'system_admin']),
    field: 'public_id',
    fieldLabel: 'avatars',
    resourceTypes: Object.freeze(['image']),
    scope: 'avatars',
  }),
  payments: Object.freeze({
    allowedRoles: Object.freeze(['staff', 'admin', 'system_admin']),
    field: 'public_id',
    fieldLabel: 'payments',
    resourceTypes: Object.freeze(['image', 'raw']),
    scope: 'payments',
  }),
  reports: Object.freeze({
    allowedRoles: Object.freeze(['admin', 'system_admin']),
    field: 'public_id',
    fieldLabel: 'reports',
    resourceTypes: Object.freeze(['raw']),
    scope: 'reports',
  }),
  services: Object.freeze({
    allowedRoles: Object.freeze(['staff', 'admin', 'system_admin']),
    field: 'public_id',
    fieldLabel: 'services',
    resourceTypes: Object.freeze(['image', 'video']),
    scope: 'services',
  }),
  'system-assets': Object.freeze({
    allowedRoles: Object.freeze(['admin', 'system_admin']),
    field: 'public_id',
    fieldLabel: 'system-assets',
    resourceTypes: Object.freeze(['image', 'raw']),
    scope: 'system_assets',
  }),
});

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

const ensureAuthenticatedActiveUser = (auth) => {
  if (!auth?.userId || !auth?.user || !auth?.roleCode) {
    throw buildForbiddenError();
  }

  if (!UPLOAD_DELETE_ALLOWED_ROLES.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (auth.user.status !== USER_STATUS.ACTIVE) {
    throw buildForbiddenError();
  }
};

const resolvePermissionCodes = async ({
  auth,
  repository,
}) => normalizePermissionCodes(
  await repository.listPermissionCodesByRoleId(auth.user.role_id),
);

const parsePublicIdScope = ({
  cloudinaryConfig,
  publicId,
}) => {
  const segments = publicId.split('/');
  const baseFolder = sanitizePathSegment(
    normalizeOptionalString(cloudinaryConfig?.folder) || 'net-viet-travel',
    'net-viet-travel',
  );

  if (segments.length < 2 || segments[0] !== baseFolder) {
    throw buildForbiddenError('public_id is outside the allowed asset scope');
  }

  const folderSegment = segments[1];
  const policy = PREFIX_POLICY_BY_SEGMENT[folderSegment];

  if (!policy) {
    throw buildForbiddenError('public_id is outside the allowed asset scope');
  }

  return {
    baseFolder,
    folderSegment,
    policy,
  };
};

const ensureScopePermission = ({
  auth,
  permissionCodes,
  scope,
}) => {
  if (scope === 'avatars') {
    if (['admin', 'system_admin'].includes(auth.roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (scope === 'payments') {
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

  if (scope === 'services') {
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

  if (scope === 'reports') {
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

  if (scope === 'system_assets') {
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

const verifyReferencePolicy = async ({
  publicId,
  repository,
  scope,
}) => {
  if (scope !== 'services') {
    return;
  }

  const referencedImage = await repository.findServiceImageByPublicId(publicId);

  if (referencedImage) {
    throw buildForbiddenError(
      'Asset is still referenced by a service image. Use the service image API instead.',
    );
  }
};

const defaultVerifyAssetExists = isTruthy(
  process.env.CLOUDINARY_VERIFY_DELETE_ASSET,
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

const logFailureSafely = async ({
  auth,
  error,
  ipAddress,
  publicId,
  repository,
  resourceType,
  userAgent,
}) => {
  try {
    await repository.insertUserLog({
      action: UPLOAD_CLOUDINARY_DELETE_FAILED_ACTION,
      entityName: 'uploads',
      ipAddress,
      metadata: {
        error_code: error?.code || API_ERROR_CODES.INTERNAL_ERROR,
        public_id: publicId,
        resource_type: resourceType,
        role_code: auth?.roleCode || null,
      },
      userAgent,
      userId: auth?.userId || null,
    });
  } catch {}
};

const createUploadDeleteService = ({
  cloudinaryConfig = defaultCloudinaryConfig,
  deleteAsset = ({ publicId, resourceType }) =>
    defaultDeleteImage(publicId, {
      invalidate: true,
      resourceType,
    }),
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

  const deleteCloudinaryAsset = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  } = {}) => {
    ensureAuthenticatedActiveUser(auth);

    const publicId = parsePublicId(body?.public_id);
    const resourceType = parseResourceType(body?.resource_type);
    const { policy } = parsePublicIdScope({
      cloudinaryConfig,
      publicId,
    });

    if (!policy.allowedRoles.includes(auth.roleCode)) {
      throw buildForbiddenError();
    }

    if (!policy.resourceTypes.includes(resourceType)) {
      throw buildValidationError([
        {
          field: 'resource_type',
          message: `resource_type ${resourceType} is not allowed for this asset scope`,
        },
      ]);
    }

    const permissionCodes = await resolvePermissionCodes({
      auth,
      repository,
    });

    ensureScopePermission({
      auth,
      permissionCodes,
      scope: policy.scope,
    });

    await verifyReferencePolicy({
      publicId,
      repository,
      scope: policy.scope,
    });

    if (verifyAssetEnabled) {
      let assetExists;

      try {
        assetExists = await verifyAssetExistsImpl({
          publicId,
          resourceType,
        });
      } catch (error) {
        await logFailureSafely({
          auth,
          error,
          ipAddress,
          publicId,
          repository,
          resourceType,
          userAgent,
        });

        if (error instanceof AppError) {
          throw error;
        }

        throw buildInternalError();
      }

      if (!assetExists) {
        throw buildNotFoundError('Cloudinary asset not found');
      }
    }

    const deletedAt = now().toISOString();

    try {
      await deleteAsset({
        publicId,
        resourceType,
      });
    } catch (error) {
      await logFailureSafely({
        auth,
        error,
        ipAddress,
        publicId,
        repository,
        resourceType,
        userAgent,
      });

      if (
        error instanceof AppError &&
        error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND
      ) {
        throw error;
      }

      throw buildInternalError();
    }

    try {
      await repository.insertUserLog({
        action: UPLOAD_CLOUDINARY_DELETED_ACTION,
        entityName: 'uploads',
        ipAddress,
        metadata: {
          deleted_at: deletedAt,
          public_id: publicId,
          resource_type: resourceType,
          role_code: auth.roleCode,
        },
        userAgent,
        userId: auth.userId,
      });
    } catch {}

    return {
      deleted: true,
      deleted_at: deletedAt,
      public_id: publicId,
      resource_type: resourceType,
    };
  };

  return {
    deleteCloudinaryAsset,
  };
};

module.exports = Object.assign(createUploadDeleteService(), {
  ALLOWED_RESOURCE_TYPES,
  PREFIX_POLICY_BY_SEGMENT,
  UPLOAD_CLOUDINARY_DELETED_ACTION,
  UPLOAD_CLOUDINARY_DELETE_FAILED_ACTION,
  UPLOAD_DELETE_ALLOWED_ROLES,
  createUploadDeleteService,
});
