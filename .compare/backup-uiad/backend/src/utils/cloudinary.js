const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { buffer: streamToBuffer } = require('node:stream/consumers');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('./AppError');

const CLOUDINARY_API_BASE_URL = 'https://api.cloudinary.com/v1_1';
const SUPPORTED_REMOTE_URL_PROTOCOLS = ['http:', 'https:'];

const isPlainObject = (value) =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !Buffer.isBuffer(value);

const isReadableStream = (value) =>
  value != null &&
  typeof value === 'object' &&
  typeof value.pipe === 'function' &&
  typeof value.on === 'function';

const serializeScalar = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
};

const serializeTags = (tags) => {
  if (tags == null) {
    return null;
  }

  if (Array.isArray(tags)) {
    return tags.join(',');
  }

  return String(tags);
};

const serializeContext = (context) => {
  if (context == null) {
    return null;
  }

  if (typeof context === 'string') {
    return context;
  }

  if (!isPlainObject(context)) {
    throw new AppError('Cloudinary context must be a string or object', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
    });
  }

  return Object.entries(context)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('|');
};

const serializeTransformation = (transformation) => {
  if (transformation == null) {
    return null;
  }

  if (typeof transformation === 'string') {
    return transformation;
  }

  if (Array.isArray(transformation)) {
    return transformation.join('/');
  }

  throw new AppError('Cloudinary transformation must be a string or array', {
    code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
    statusCode: 400,
  });
};

const buildCloudinaryUrl = (cloudName, resourceType, action) =>
  `${CLOUDINARY_API_BASE_URL}/${cloudName}/${resourceType}/${action}`;

const buildCloudinarySignature = (params, apiSecret) => {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1')
    .update(`${serializedParams}${apiSecret}`)
    .digest('hex');
};

const buildCloudinaryUploadParams = (options = {}, defaults = {}) => {
  const params = {
    folder: options.folder || defaults.folder || null,
    public_id: options.publicId || null,
    asset_folder: options.assetFolder || null,
    display_name: options.displayName || null,
    filename_override: options.filenameOverride || null,
    overwrite: options.overwrite,
    unique_filename: options.uniqueFilename,
    use_filename: options.useFilename,
    invalidate: options.invalidate,
    resource_type: options.resourceType || defaults.resourceType || 'image',
    tags: serializeTags(options.tags),
    context: serializeContext(options.context),
    transformation: serializeTransformation(options.transformation),
  };

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null),
  );
};

const ensureRemoteUrl = (value) => {
  try {
    const parsedUrl = new URL(value);

    if (!SUPPORTED_REMOTE_URL_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }

    return value;
  } catch (error) {
    throw new AppError('Upload source URL is invalid', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
      details: [
        {
          field: 'file',
          message: 'Expected a valid http or https URL',
        },
      ],
    });
  }
};

const createBlobFromBuffer = (buffer, mimeType) =>
  new Blob([buffer], {
    type: mimeType || 'application/octet-stream',
  });

const normalizeFileName = (fileName, fallback = 'upload.bin') =>
  (fileName && path.basename(fileName)) || fallback;

const normalizeUploadSource = async (source, options = {}) => {
  if (!source) {
    throw new AppError('Upload source is required', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
    });
  }

  if (Buffer.isBuffer(source)) {
    return {
      kind: 'blob',
      value: createBlobFromBuffer(source, options.mimeType),
      fileName: normalizeFileName(options.fileName),
    };
  }

  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return {
      kind: 'blob',
      value: source,
      fileName: normalizeFileName(options.fileName),
    };
  }

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      return {
        kind: 'string',
        value: source,
      };
    }

    if (/^https?:\/\//i.test(source)) {
      return {
        kind: 'string',
        value: ensureRemoteUrl(source),
      };
    }

    let fileBuffer;

    try {
      fileBuffer = await fs.readFile(source);
    } catch (error) {
      throw new AppError('Upload source file could not be read', {
        code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
        details: [
          {
            field: 'file',
            message: `Unable to read file at path: ${source}`,
          },
        ],
        statusCode: 400,
      });
    }

    return {
      kind: 'blob',
      value: createBlobFromBuffer(fileBuffer, options.mimeType),
      fileName: normalizeFileName(options.fileName, path.basename(source)),
    };
  }

  if (isReadableStream(source)) {
    const fileBuffer = await streamToBuffer(source);

    return {
      kind: 'blob',
      value: createBlobFromBuffer(fileBuffer, options.mimeType),
      fileName: normalizeFileName(options.fileName),
    };
  }

  if (isPlainObject(source)) {
    if (Buffer.isBuffer(source.buffer)) {
      return normalizeUploadSource(source.buffer, {
        fileName: source.fileName || options.fileName,
        mimeType: source.mimeType || options.mimeType,
      });
    }

    if (source.path) {
      return normalizeUploadSource(source.path, {
        fileName: source.fileName || options.fileName,
        mimeType: source.mimeType || options.mimeType,
      });
    }

    if (source.url) {
      return normalizeUploadSource(source.url, options);
    }

    if (source.stream) {
      return normalizeUploadSource(source.stream, {
        fileName: source.fileName || options.fileName,
        mimeType: source.mimeType || options.mimeType,
      });
    }

    if (source.base64) {
      const dataUri = source.base64.startsWith('data:')
        ? source.base64
        : `data:${source.mimeType || 'application/octet-stream'};base64,${source.base64}`;

      return normalizeUploadSource(dataUri, options);
    }
  }

  throw new AppError('Upload source is not supported', {
    code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
    statusCode: 400,
  });
};

const appendFormDataValue = (formData, key, value) => {
  if (value == null) {
    return;
  }

  formData.append(key, serializeScalar(value));
};

const mapUploadResponse = (payload) => ({
  assetId: payload.asset_id,
  bytes: payload.bytes,
  createdAt: payload.created_at,
  format: payload.format,
  height: payload.height,
  originalFilename: payload.original_filename,
  placeholder: payload.placeholder,
  publicId: payload.public_id,
  resourceType: payload.resource_type,
  secureUrl: payload.secure_url,
  signature: payload.signature,
  tags: payload.tags,
  type: payload.type,
  url: payload.url,
  version: payload.version,
  width: payload.width,
});

module.exports = {
  appendFormDataValue,
  buildCloudinarySignature,
  buildCloudinaryUploadParams,
  buildCloudinaryUrl,
  mapUploadResponse,
  normalizeUploadSource,
  serializeContext,
  serializeScalar,
  serializeTags,
  serializeTransformation,
};
