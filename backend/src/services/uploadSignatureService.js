const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { cloudinary: defaultCloudinaryConfig } = require('../config');
const { createUploadRepository } = require('../database/uploadRepository');
const AppError = require('../utils/AppError');
const { buildCloudinarySignature } = require('../utils/cloudinary');

const UPLOAD_SIGNATURE_REQUESTED_ACTION = 'upload.signature_requested';
const UPLOAD_SIGNATURE_ALLOWED_ROLES = Object.freeze([
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
const SHORT_LIVED_SIGNATURE_TTL_SECONDS = 5 * 60;
const UNSAFE_FOLDER_PATTERN = /(?:\.\.|[\\/]|[\u0000-\u001F\u007F])/;
const SAFE_FOLDER_KEY_PATTERN = /^[a-z0-9-]+$/;
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
  refunds: Object.freeze([
    'refund.read_all',
    'refund.process',
    'refund.approve',
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
const FOLDER_POLICIES = Object.freeze({
  avatar: Object.freeze({
    resourceTypes: Object.freeze(['image']),
    resolvedSegment: 'avatars',
    scope: 'self',
  }),
  payments: Object.freeze({
    resourceTypes: Object.freeze(['image', 'raw']),
    resolvedSegment: 'payments',
    scope: 'self',
  }),
  refunds: Object.freeze({
    resourceTypes: Object.freeze(['image']),
    resolvedSegment: 'refunds',
    scope: 'self',
  }),
  reports: Object.freeze({
    resourceTypes: Object.freeze(['raw']),
    resolvedSegment: 'reports',
    scope: 'admin_reports',
  }),
  services: Object.freeze({
    resourceTypes: Object.freeze(['image', 'video']),
    resolvedSegment: 'services',
    scope: 'service_assets',
  }),
  support: Object.freeze({
    resourceTypes: Object.freeze(['image']),
    resolvedSegment: 'support',
    scope: 'support_assets',
  }),
  'system-assets': Object.freeze({
    resourceTypes: Object.freeze(['image', 'raw']),
    resolvedSegment: 'system-assets',
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

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const sanitizePathSegment = (value, fallback = 'user') => {
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

const parseFolder = (value) => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    throw buildValidationError([
      {
        field: 'folder',
        message: 'folder is required',
      },
    ]);
  }

  if (UNSAFE_FOLDER_PATTERN.test(normalized) || !SAFE_FOLDER_KEY_PATTERN.test(normalized)) {
    throw buildForbiddenError('folder is not allowed');
  }

  if (!Object.prototype.hasOwnProperty.call(FOLDER_POLICIES, normalized)) {
    throw buildForbiddenError('folder is not allowed');
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

const ensureAuthenticatedActiveUser = (auth) => {
  if (!auth?.userId || !auth?.user || !auth?.roleCode) {
    throw buildForbiddenError();
  }

  if (!UPLOAD_SIGNATURE_ALLOWED_ROLES.includes(auth.roleCode)) {
    throw buildForbiddenError();
  }

  if (auth.user.status !== USER_STATUS.ACTIVE) {
    throw buildForbiddenError();
  }
};

const ensureRoleScope = ({
  auth,
  folder,
  permissionCodes,
}) => {
  const roleCode = auth.roleCode;

  if (folder === 'avatar') {
    return;
  }

  if (folder === 'payments') {
    if (roleCode === 'customer') {
      return;
    }

    if (
      ['staff', 'admin', 'system_admin'].includes(roleCode) &&
      (
        permissionCodes.some((code) => PERMISSION_GROUPS.payments.includes(code)) ||
        ['admin', 'system_admin'].includes(roleCode)
      )
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  if (folder === 'services') {
    if (
      roleCode === 'staff' &&
      permissionCodes.some((code) => PERMISSION_GROUPS.services.includes(code))
    ) {
      return;
    }

    if (['admin', 'system_admin'].includes(roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (folder === 'refunds') {
    if (roleCode === 'customer') {
      return;
    }

    if (
      ['staff', 'admin', 'system_admin'].includes(roleCode) &&
      (
        permissionCodes.some((code) => PERMISSION_GROUPS.refunds.includes(code)) ||
        ['admin', 'system_admin'].includes(roleCode)
      )
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  if (folder === 'support') {
    if (
      roleCode === 'staff' &&
      permissionCodes.some((code) => PERMISSION_GROUPS.support.includes(code))
    ) {
      return;
    }

    if (['admin', 'system_admin'].includes(roleCode)) {
      return;
    }

    throw buildForbiddenError();
  }

  if (folder === 'reports') {
    if (!['admin', 'system_admin'].includes(roleCode)) {
      throw buildForbiddenError();
    }

    if (
      permissionCodes.some((code) => PERMISSION_GROUPS.reports.includes(code)) ||
      ['admin', 'system_admin'].includes(roleCode)
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  if (folder === 'system-assets') {
    if (!['admin', 'system_admin'].includes(roleCode)) {
      throw buildForbiddenError();
    }

    if (
      permissionCodes.some((code) => PERMISSION_GROUPS.systemAssets.includes(code)) ||
      ['admin', 'system_admin'].includes(roleCode)
    ) {
      return;
    }

    throw buildForbiddenError();
  }

  throw buildForbiddenError();
};

const resolvePermissionCodes = async ({
  auth,
  folder,
  repository,
}) => {
  if (
    folder === 'avatar' ||
    ((folder === 'payments' || folder === 'refunds') &&
      auth.roleCode === 'customer')
  ) {
    return [];
  }

  return normalizePermissionCodes(
    await repository.listPermissionCodesByRoleId(auth.user.role_id),
  );
};

const resolveTargetFolder = ({
  auth,
  cloudinaryConfig,
  folder,
}) => {
  const policy = FOLDER_POLICIES[folder];
  const baseFolder = sanitizePathSegment(
    normalizeOptionalString(cloudinaryConfig.folder) || 'net-viet-travel',
    'net-viet-travel',
  );

  if (policy.scope === 'self') {
    return `${baseFolder}/${policy.resolvedSegment}/${sanitizePathSegment(auth.userId)}`;
  }

  return `${baseFolder}/${policy.resolvedSegment}`;
};

const createUploadSignatureService = ({
  cloudinaryConfig = defaultCloudinaryConfig,
  now = () => new Date(),
  repository = createUploadRepository(),
} = {}) => {
  const createSignature = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  } = {}) => {
    ensureAuthenticatedActiveUser(auth);

    const folder = parseFolder(body?.folder);
    const resourceType = parseResourceType(body?.resource_type);
    const folderPolicy = FOLDER_POLICIES[folder];

    if (!folderPolicy.resourceTypes.includes(resourceType)) {
      throw buildValidationError([
        {
          field: 'resource_type',
          message: `resource_type ${resourceType} is not allowed for folder ${folder}`,
        },
      ]);
    }

    const permissionCodes = await resolvePermissionCodes({
      auth,
      folder,
      repository,
    });

    ensureRoleScope({
      auth,
      folder,
      permissionCodes,
    });

    try {
      if (
        !cloudinaryConfig?.cloudName ||
        !cloudinaryConfig?.apiKey ||
        !cloudinaryConfig?.apiSecret
      ) {
        throw new Error('cloudinary-not-configured');
      }

      const resolvedFolder = resolveTargetFolder({
        auth,
        cloudinaryConfig,
        folder,
      });
      const timestamp = Math.floor(now().getTime() / 1000);
      const signature = buildCloudinarySignature(
        {
          folder: resolvedFolder,
          timestamp,
        },
        cloudinaryConfig.apiSecret,
      );

      await repository.insertUserLog({
        action: UPLOAD_SIGNATURE_REQUESTED_ACTION,
        entityName: 'uploads',
        ipAddress,
        metadata: {
          folder,
          resource_type: resourceType,
          role_code: auth.roleCode,
          target_folder: resolvedFolder,
          ttl_seconds: SHORT_LIVED_SIGNATURE_TTL_SECONDS,
        },
        userAgent,
        userId: auth.userId,
      });

      return {
        api_key: cloudinaryConfig.apiKey,
        cloud_name: cloudinaryConfig.cloudName,
        folder: resolvedFolder,
        resource_type: resourceType,
        signature,
        timestamp,
      };
    } catch (error) {
      if (
        error instanceof AppError &&
        [API_ERROR_CODES.VALIDATION_ERROR, API_ERROR_CODES.FORBIDDEN].includes(
          error.code,
        )
      ) {
        throw error;
      }

      throw buildInternalError();
    }
  };

  return {
    createSignature,
  };
};

module.exports = Object.assign(createUploadSignatureService(), {
  ALLOWED_RESOURCE_TYPES,
  FOLDER_POLICIES,
  SHORT_LIVED_SIGNATURE_TTL_SECONDS,
  UPLOAD_SIGNATURE_ALLOWED_ROLES,
  UPLOAD_SIGNATURE_REQUESTED_ACTION,
  createUploadSignatureService,
});
