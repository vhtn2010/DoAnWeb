const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createCommentRepository } = require('../database/commentRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createError = (message, code, statusCode, details) =>
  new AppError(message, {
    code,
    details,
    statusCode,
  });

const parseUuid = (field, value) => {
  const normalized = String(value || '').trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw createError('Validation failed', API_ERROR_CODES.VALIDATION_ERROR, 400, [
      { field, message: `${field} must be a valid UUID` },
    ]);
  }

  return normalized;
};

const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const parseCommentBody = (body = {}, { requiresDisplayName }) => {
  const content = normalizeText(body.content);
  const displayName = normalizeText(body.display_name);
  const details = [];

  if (content.length < 2 || content.length > 1000) {
    details.push({
      field: 'content',
      message: 'content must contain between 2 and 1000 characters',
    });
  }

  if (requiresDisplayName && (displayName.length < 2 || displayName.length > 80)) {
    details.push({
      field: 'display_name',
      message: 'display_name must contain between 2 and 80 characters',
    });
  }

  if (details.length) {
    throw createError('Validation failed', API_ERROR_CODES.VALIDATION_ERROR, 400, details);
  }

  return {
    content,
    displayName: displayName || null,
  };
};

const getInitials = (displayName) =>
  String(displayName || 'Khách')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const mapComment = (row) => ({
  author_initials: getInitials(row.display_name_snapshot),
  author_name: row.display_name_snapshot,
  content: row.content,
  created_at: row.created_at,
  date_label: new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(row.created_at)),
  id: row.id,
  is_registered: Boolean(row.user_id),
});

const createCommentService = ({
  repository = createCommentRepository(),
} = {}) => {
  const ensurePublicTour = async (serviceId) => {
    const tour = await repository.getPublicTour(serviceId);

    if (!tour) {
      throw createError('Tour not found', API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }
  };

  const createServiceComment = async ({ auth, body, serviceId }) => {
    const parsedServiceId = parseUuid('service_id', serviceId);
    const userId = auth?.userId || null;
    const parsedBody = parseCommentBody(body, {
      requiresDisplayName: !userId,
    });

    await ensurePublicTour(parsedServiceId);

    let displayName = parsedBody.displayName;

    if (userId) {
      displayName = await repository.getUserDisplayName(userId);

      if (!displayName) {
        throw createError('User not found', API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
      }
    }

    const comment = await repository.createComment({
      content: parsedBody.content,
      displayName,
      serviceId: parsedServiceId,
      userId,
    });

    return mapComment(comment);
  };

  const listServiceComments = async ({ query = {}, serviceId }) => {
    const parsedServiceId = parseUuid('service_id', serviceId);
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 50);

    await ensurePublicTour(parsedServiceId);

    const [total, rows] = await Promise.all([
      repository.countPublicComments(parsedServiceId),
      repository.listPublicComments({
        limit,
        offset: (page - 1) * limit,
        serviceId: parsedServiceId,
      }),
    ]);

    return {
      items: rows.map(mapComment),
      meta: {
        comment_count: total,
        has_next: page * limit < total,
        limit,
        page,
        total,
        total_pages: total ? Math.ceil(total / limit) : 0,
      },
    };
  };

  return {
    createServiceComment,
    listServiceComments,
  };
};

module.exports = Object.assign(createCommentService(), {
  createCommentService,
});
