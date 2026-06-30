const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const {
  createAdminServiceImageRepository,
} = require('../database/adminServiceImageRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;

const buildAppError = ({
  code,
  field,
  message,
  statusCode,
}) =>
  new AppError(message, {
    code,
    details: field
      ? [
          {
            field,
            message,
          },
        ]
      : undefined,
    statusCode,
  });

const buildValidationError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.VALIDATION_ERROR,
    field,
    message,
    statusCode: 400,
  });

const buildResourceNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseOptionalString = ({
  field,
  maxLength = 255,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be at most ${maxLength} characters long`,
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalBoolean = (field, value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw buildValidationError(field, `${field} must be a boolean`);
  }

  return value;
};

const parseOptionalInteger = (field, value) => {
  if (value === undefined) {
    return undefined;
  }

  if (
    (typeof value === 'string' && !/^\d+$/.test(value)) ||
    !Number.isInteger(Number(value))
  ) {
    throw buildValidationError(field, `${field} must be a non-negative integer`);
  }

  const parsed = Number(value);

  if (parsed < 0) {
    throw buildValidationError(field, `${field} must be a non-negative integer`);
  }

  return parsed;
};

const parseImageUrl = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('image_url', 'image_url is required');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError('image_url', 'image_url is required');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw buildValidationError('image_url', 'image_url must be a valid URL');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw buildValidationError('image_url', 'image_url must be a valid URL');
  }

  return normalized;
};

const parseCloudinaryPublicId = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(
      'cloudinary_public_id',
      'cloudinary_public_id must be a string',
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 255) {
    throw buildValidationError(
      'cloudinary_public_id',
      'cloudinary_public_id must be at most 255 characters long',
    );
  }

  return normalized;
};

const mapImage = (image) => ({
  id: image.id,
  image_url: image.image_url,
  cloudinary_public_id: image.cloudinary_public_id,
  alt_text: image.alt_text,
  sort_order: Number(image.sort_order),
  is_primary: Boolean(image.is_primary),
  created_at: image.created_at,
});

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const ensureBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return body;
};

const ensureImageOwnership = ({
  image,
  serviceId,
}) => {
  if (!image) {
    throw buildResourceNotFoundError('Image not found');
  }

  if (image.service_id !== serviceId) {
    throw buildValidationError(
      'image_id',
      'image_id does not belong to the target service',
    );
  }
};

const parseCreatePayload = async ({
  body,
  repository,
  serviceId,
}) => {
  const payload = ensureBodyObject(body);

  for (const key of Object.keys(payload)) {
    if (![
      'image_url',
      'cloudinary_public_id',
      'alt_text',
      'sort_order',
      'is_primary',
    ].includes(key)) {
      throw buildValidationError(key, `${key} is not supported in this endpoint`);
    }
  }

  const existingImages = await repository.listImagesByService(serviceId);
  const sortOrder = parseOptionalInteger('sort_order', payload.sort_order);

  return {
    alt_text: parseOptionalString({
      field: 'alt_text',
      maxLength: 255,
      value: payload.alt_text,
    }),
    cloudinary_public_id: parseCloudinaryPublicId(payload.cloudinary_public_id),
    image_url: parseImageUrl(payload.image_url),
    is_primary: parseOptionalBoolean('is_primary', payload.is_primary) ?? false,
    sort_order:
      sortOrder === undefined
        ? existingImages.length
        : sortOrder,
  };
};

const parseUpdatePayload = (body) => {
  const payload = ensureBodyObject(body);

  for (const key of Object.keys(payload)) {
    if (!['alt_text', 'sort_order', 'is_primary'].includes(key)) {
      throw buildValidationError(key, `${key} is not supported in this endpoint`);
    }
  }

  const updatePayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'alt_text')) {
    updatePayload.alt_text = parseOptionalString({
      field: 'alt_text',
      maxLength: 255,
      value: payload.alt_text,
    });
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'sort_order')) {
    updatePayload.sort_order = parseOptionalInteger('sort_order', payload.sort_order);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'is_primary')) {
    updatePayload.is_primary = parseOptionalBoolean('is_primary', payload.is_primary);
  }

  if (Object.keys(updatePayload).length === 0) {
    throw buildValidationError('body', 'no updatable fields were provided');
  }

  return updatePayload;
};

const parseReorderPayload = (body) => {
  const payload = ensureBodyObject(body);

  for (const key of Object.keys(payload)) {
    if (key !== 'image_orders') {
      throw buildValidationError(key, `${key} is not supported in this endpoint`);
    }
  }

  if (!Array.isArray(payload.image_orders) || payload.image_orders.length === 0) {
    throw buildValidationError('image_orders', 'image_orders must be a non-empty array');
  }

  const seenIds = new Set();

  return payload.image_orders.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw buildValidationError(
        `image_orders[${index}]`,
        'each image order item must be an object',
      );
    }

    const imageId = parseUuid('image_id', item.image_id);
    const sortOrder = parseOptionalInteger('sort_order', item.sort_order);

    if (sortOrder === undefined) {
      throw buildValidationError(
        `image_orders[${index}].sort_order`,
        'sort_order is required',
      );
    }

    if (seenIds.has(imageId)) {
      throw buildValidationError('image_orders', 'image_orders contains duplicate image_id');
    }

    seenIds.add(imageId);

    return {
      image_id: imageId,
      sort_order: sortOrder,
    };
  });
};

const createAdminServiceImageService = ({
  repository = createAdminServiceImageRepository(),
} = {}) => {
  const loadService = async ({
    auth,
    serviceId,
  }) => {
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId,
    });

    if (!service) {
      throw buildResourceNotFoundError('Service not found');
    }

    return service;
  };

  const addImage = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    await loadService({
      auth,
      serviceId: resolvedServiceId,
    });
    const payload = await parseCreatePayload({
      body,
      repository,
      serviceId: resolvedServiceId,
    });
    const created = await repository.createImage({
      actorUserId: auth.userId,
      logMetadata: {
        image_url: payload.image_url,
        is_primary: payload.is_primary,
        operation: 'create',
        sort_order: payload.sort_order,
      },
      payload,
      serviceId: resolvedServiceId,
    });

    return mapImage(created);
  };

  const updateImage = async ({
    auth,
    body,
    image_id: imageId,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    const resolvedImageId = parseUuid('image_id', imageId);
    await loadService({
      auth,
      serviceId: resolvedServiceId,
    });
    const existingImage = await repository.getImageById(resolvedImageId);
    ensureImageOwnership({
      image: existingImage,
      serviceId: resolvedServiceId,
    });
    const payload = parseUpdatePayload(body);
    const updated = await repository.updateImage({
      actorUserId: auth.userId,
      imageId: resolvedImageId,
      logMetadata: {
        image_id: resolvedImageId,
        new_value: payload,
        old_value: {
          alt_text: existingImage.alt_text,
          is_primary: existingImage.is_primary,
          sort_order: existingImage.sort_order,
        },
        operation: 'update',
      },
      payload,
      serviceId: resolvedServiceId,
    });

    return mapImage(updated);
  };

  const deleteImage = async ({
    auth,
    image_id: imageId,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    const resolvedImageId = parseUuid('image_id', imageId);
    await loadService({
      auth,
      serviceId: resolvedServiceId,
    });
    const existingImage = await repository.getImageById(resolvedImageId);
    ensureImageOwnership({
      image: existingImage,
      serviceId: resolvedServiceId,
    });
    const deleted = await repository.deleteImage({
      actorUserId: auth.userId,
      image: existingImage,
      logMetadata: {
        deleted_image_id: resolvedImageId,
        deleted_image_url: existingImage.image_url,
        is_primary: existingImage.is_primary,
        operation: 'delete',
      },
      serviceId: resolvedServiceId,
    });

    return {
      deleted_image_id: resolvedImageId,
      promoted_primary_image: deleted.promotedImage
        ? mapImage(deleted.promotedImage)
        : null,
    };
  };

  const reorderImages = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    await loadService({
      auth,
      serviceId: resolvedServiceId,
    });
    const imageOrders = parseReorderPayload(body);
    const serviceImages = await repository.listImagesByService(resolvedServiceId);
    const serviceImageIds = new Set(serviceImages.map((image) => image.id));

    for (const item of imageOrders) {
      if (!serviceImageIds.has(item.image_id)) {
        const image = await repository.getImageById(item.image_id);

        if (!image) {
          throw buildResourceNotFoundError('Image not found');
        }

        throw buildValidationError(
          'image_orders',
          'image_orders contains an image that does not belong to the target service',
        );
      }
    }

    await repository.reorderImages({
      actorUserId: auth.userId,
      imageOrders,
      logMetadata: {
        image_orders: imageOrders,
        operation: 'reorder',
      },
      serviceId: resolvedServiceId,
    });

    const reorderedImages = await repository.listImagesByService(resolvedServiceId);
    return reorderedImages.map(mapImage);
  };

  return {
    addImage,
    deleteImage,
    reorderImages,
    updateImage,
  };
};

module.exports = Object.assign(createAdminServiceImageService(), {
  createAdminServiceImageService,
});
