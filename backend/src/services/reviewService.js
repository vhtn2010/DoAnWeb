const {
  API_ERROR_CODES,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const { createReviewRepository } = require('../database/reviewRepository');
const AppError = require('../utils/AppError');

const COMPLETABLE_STATUSES = new Set([
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.PARTIALLY_REFUNDED,
]);
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

const validateCustomer = (auth) => {
  if ((auth?.role || auth?.roleCode) !== 'customer' || !auth?.userId) {
    throw createError('Forbidden', API_ERROR_CODES.FORBIDDEN, 403);
  }
};

const parseReviewBody = (body = {}) => {
  const bookingItemId = parseUuid('booking_item_id', body.booking_item_id);
  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();
  const details = [];

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    details.push({ field: 'rating', message: 'rating must be an integer from 1 to 5' });
  }

  if (comment.length < 10 || comment.length > 2000) {
    details.push({
      field: 'comment',
      message: 'comment must contain between 10 and 2000 characters',
    });
  }

  if (details.length) {
    throw createError('Validation failed', API_ERROR_CODES.VALIDATION_ERROR, 400, details);
  }

  return { bookingItemId, comment, rating };
};

const getTourEndTime = (item) => {
  const value = item?.end_at || item?.start_at;
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const maskReviewerName = (fullName) => {
  const parts = String(fullName || 'Khách hàng')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || 'Khách hàng';
  }

  return `${parts[0]} ${parts.at(-1).slice(0, 1)}.`;
};

const mapReview = (row) => {
  const authorName = maskReviewerName(row.full_name);

  return {
    author_initials: authorName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    author_name: authorName,
    content: row.comment,
    created_at: row.created_at,
    id: row.id,
    month_label: new Intl.DateTimeFormat('vi-VN', {
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(row.created_at)),
    rating_value: Number(row.rating),
  };
};

const createReviewService = ({
  now = () => new Date(),
  repository = createReviewRepository(),
} = {}) => {
  const completeBooking = async ({ auth, bookingId }) => {
    validateCustomer(auth);
    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBooking({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw createError('Booking not found', API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }

    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return booking;
    }

    if (!COMPLETABLE_STATUSES.has(booking.status)) {
      throw createError(
        'Booking cannot be completed by customer',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    const tourItems = await repository.listTourItems(parsedBookingId);
    const endTimes = tourItems.map(getTourEndTime);

    if (!tourItems.length || endTimes.some((value) => !value)) {
      throw createError(
        'Booking has no reviewable completed tour',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    if (endTimes.some((value) => now() <= value)) {
      throw createError(
        'Tour has not ended yet',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    const updated = await repository.completeBooking({
      bookingId: parsedBookingId,
      fromStatus: booking.status,
      userId: auth.userId,
    });

    if (!updated) {
      throw createError(
        'Booking state no longer allows this action',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    return updated;
  };

  const createBookingReview = async ({ auth, body, bookingId }) => {
    validateCustomer(auth);
    const parsedBookingId = parseUuid('booking_id', bookingId);
    const parsedBody = parseReviewBody(body);
    const item = await repository.getBookingTourItem({
      bookingId: parsedBookingId,
      bookingItemId: parsedBody.bookingItemId,
      userId: auth.userId,
    });

    if (!item) {
      throw createError('Tour booking item not found', API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }

    if (item.booking_status !== BOOKING_STATUS.COMPLETED) {
      throw createError(
        'Complete the booking before reviewing',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    const endTime = getTourEndTime(item);

    if (!endTime || now() <= endTime) {
      throw createError(
        'Tour has not ended yet',
        API_ERROR_CODES.INVALID_STATE_TRANSITION,
        400,
      );
    }

    const existingReview = await repository.findReviewByBookingItem({
      bookingItemId: parsedBody.bookingItemId,
      userId: auth.userId,
    });

    if (existingReview) {
      throw createError(
        'This tour has already been reviewed',
        API_ERROR_CODES.DUPLICATE_RESOURCE,
        409,
      );
    }

    const review = await repository.createReview({
      bookingId: parsedBookingId,
      bookingItemId: parsedBody.bookingItemId,
      comment: parsedBody.comment,
      rating: parsedBody.rating,
      serviceId: item.service_id,
      userId: auth.userId,
    });

    if (!review) {
      throw createError(
        'This tour has already been reviewed',
        API_ERROR_CODES.DUPLICATE_RESOURCE,
        409,
      );
    }

    return review;
  };

  const listServiceReviews = async ({ query = {}, serviceId }) => {
    const parsedServiceId = parseUuid('service_id', serviceId);
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 50);
    const service = await repository.getPublicTour(parsedServiceId);

    if (!service) {
      throw createError('Tour not found', API_ERROR_CODES.RESOURCE_NOT_FOUND, 404);
    }

    const [summary, rows] = await Promise.all([
      repository.getReviewSummary(parsedServiceId),
      repository.listPublicReviews({
        limit,
        offset: (page - 1) * limit,
        serviceId: parsedServiceId,
      }),
    ]);
    const total = Number(summary.review_count || 0);

    return {
      items: rows.map(mapReview),
      meta: {
        has_next: page * limit < total,
        limit,
        page,
        total,
        total_pages: total ? Math.ceil(total / limit) : 0,
      },
      summary: {
        average_rating: Number(summary.average_rating || 0),
        review_count: total,
      },
    };
  };

  return {
    completeBooking,
    createBookingReview,
    listServiceReviews,
  };
};

module.exports = Object.assign(createReviewService(), {
  createReviewService,
});
