const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
} = require('../constants/domainConstraints');
const { cloudinary, ensureCloudinaryConfigured } = require('../config/cloudinary');
const AppError = require('../utils/AppError');
const {
  appendFormDataValue,
  buildCloudinarySignature,
  buildCloudinaryUploadParams,
  buildCloudinaryUrl,
  mapUploadResponse,
  normalizeUploadSource,
  serializeTransformation,
} = require('../utils/cloudinary');

const CLOUDINARY_DELIVERY_BASE_URL = 'https://res.cloudinary.com';

const fetchWithTimeout = async (url, options = {}) => {
  const timeoutMs =
    options.timeoutMs ||
    cloudinary.requestTimeoutMs ||
    DOMAIN_CONSTRAINTS.cloudinaryRequestTimeoutMs;

  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
};

const getSignedParams = (params) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    ...params,
    timestamp,
  };

  return {
    ...paramsToSign,
    api_key: cloudinary.apiKey,
    signature: buildCloudinarySignature(paramsToSign, cloudinary.apiSecret),
  };
};

const parseCloudinaryResponse = async (response, errorCode, fallbackMessage) => {
  const payload = await response.json().catch(() => null);

  if (response.ok) {
    return payload;
  }

  throw new AppError(
    payload?.error?.message || payload?.message || fallbackMessage,
    {
      code: errorCode,
      details: payload?.error?.message
        ? [
            {
              field: 'cloudinary',
              message: payload.error.message,
            },
          ]
        : undefined,
      statusCode: 502,
    },
  );
};

const uploadImage = async (source, options = {}) => {
  ensureCloudinaryConfigured();

  const normalizedSource = await normalizeUploadSource(source, {
    fileName: options.fileName,
    mimeType: options.mimeType,
  });
  const uploadParams = buildCloudinaryUploadParams(options, {
    folder: cloudinary.folder,
    resourceType: options.resourceType || 'image',
  });
  const { resource_type: resourceType, ...signableParams } = uploadParams;
  const signedParams = getSignedParams(signableParams);
  const formData = new FormData();

  if (normalizedSource.kind === 'blob') {
    formData.append(
      'file',
      normalizedSource.value,
      normalizedSource.fileName || 'upload.bin',
    );
  } else {
    formData.append('file', normalizedSource.value);
  }

  Object.entries(signedParams).forEach(([key, value]) => {
    appendFormDataValue(formData, key, value);
  });

  const response = await fetchWithTimeout(
    buildCloudinaryUrl(cloudinary.cloudName, resourceType, 'upload'),
    {
      body: formData,
      method: 'POST',
      timeoutMs: options.timeoutMs,
    },
  );
  const payload = await parseCloudinaryResponse(
    response,
    API_ERROR_CODES.CLOUDINARY_UPLOAD_FAILED,
    'Cloudinary upload failed',
  );

  return mapUploadResponse(payload);
};

const uploadImages = async (sources, options = {}) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new AppError('At least one upload source is required', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
    });
  }

  return Promise.all(
    sources.map((source, index) =>
      uploadImage(source, {
        ...options,
        fileName: options.fileNames?.[index] || options.fileName,
      }),
    ),
  );
};

const deleteImage = async (publicId, options = {}) => {
  ensureCloudinaryConfigured();

  if (!publicId) {
    throw new AppError('publicId is required to delete an image', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
    });
  }

  const resourceType = options.resourceType || 'image';
  const signedParams = getSignedParams({
    invalidate: options.invalidate ?? true,
    public_id: publicId,
  });
  const formData = new FormData();

  Object.entries(signedParams).forEach(([key, value]) => {
    appendFormDataValue(formData, key, value);
  });

  const response = await fetchWithTimeout(
    buildCloudinaryUrl(cloudinary.cloudName, resourceType, 'destroy'),
    {
      body: formData,
      method: 'POST',
      timeoutMs: options.timeoutMs,
    },
  );
  const payload = await parseCloudinaryResponse(
    response,
    API_ERROR_CODES.CLOUDINARY_DELETE_FAILED,
    'Cloudinary delete failed',
  );

  return {
    publicId,
    result: payload.result,
  };
};

const buildImageUrl = (publicId, options = {}) => {
  ensureCloudinaryConfigured();

  if (!publicId) {
    throw new AppError('publicId is required to build a Cloudinary URL', {
      code: API_ERROR_CODES.INVALID_UPLOAD_SOURCE,
      statusCode: 400,
    });
  }

  const resourceType = options.resourceType || 'image';
  const deliveryType = options.deliveryType || 'upload';
  const version = options.version ? `v${options.version}/` : '';
  const transformation = serializeTransformation(options.transformation);
  const transformationSegment = transformation ? `${transformation}/` : '';

  return `${CLOUDINARY_DELIVERY_BASE_URL}/${cloudinary.cloudName}/${resourceType}/${deliveryType}/${transformationSegment}${version}${publicId}`;
};

module.exports = {
  buildImageUrl,
  deleteImage,
  uploadImage,
  uploadImages,
};
