const test = require('node:test');
const assert = require('node:assert/strict');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const { createReviewService } = require('../services/reviewService');

const bookingId = '11111111-1111-4111-8111-111111111111';
const bookingItemId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
const auth = {
  role: 'customer',
  userId: '44444444-4444-4444-8444-444444444444',
};

test('completeBooking allows customer confirmation only after the tour ended', async () => {
  let completionContext;
  const service = createReviewService({
    now: () => new Date('2026-07-23T12:00:00.000Z'),
    repository: {
      completeBooking: async (context) => {
        completionContext = context;
        return {
          booking_code: 'BK-REVIEW',
          id: bookingId,
          status: 'completed',
        };
      },
      getBooking: async () => ({
        id: bookingId,
        status: 'confirmed',
      }),
      listTourItems: async () => [
        {
          end_at: new Date('2026-07-22T18:00:00.000Z'),
          id: bookingItemId,
        },
      ],
    },
  });

  const result = await service.completeBooking({ auth, bookingId });

  assert.equal(result.status, 'completed');
  assert.equal(completionContext.bookingId, bookingId);
  assert.equal(completionContext.fromStatus, 'confirmed');
  assert.equal(completionContext.userId, auth.userId);
});

test('completeBooking rejects confirmation before the tour end time', async () => {
  const service = createReviewService({
    now: () => new Date('2026-07-23T12:00:00.000Z'),
    repository: {
      getBooking: async () => ({
        id: bookingId,
        status: 'confirmed',
      }),
      listTourItems: async () => [
        {
          end_at: new Date('2026-07-24T18:00:00.000Z'),
          id: bookingItemId,
        },
      ],
    },
  });

  await assert.rejects(
    () => service.completeBooking({ auth, bookingId }),
    (error) =>
      error.code === API_ERROR_CODES.INVALID_STATE_TRANSITION &&
      error.message === 'Tour has not ended yet',
  );
});

test('createBookingReview persists one verified review for a completed tour item', async () => {
  let createContext;
  const service = createReviewService({
    now: () => new Date('2026-07-23T12:00:00.000Z'),
    repository: {
      createReview: async (context) => {
        createContext = context;
        return {
          comment: context.comment,
          id: '55555555-5555-4555-8555-555555555555',
          rating: context.rating,
        };
      },
      findReviewByBookingItem: async () => null,
      getBookingTourItem: async () => ({
        booking_status: 'completed',
        end_at: new Date('2026-07-22T18:00:00.000Z'),
        id: bookingItemId,
        service_id: serviceId,
      }),
    },
  });

  const result = await service.createBookingReview({
    auth,
    bookingId,
    body: {
      booking_item_id: bookingItemId,
      comment: 'Hướng dẫn viên nhiệt tình và lịch trình rất hợp lý.',
      rating: 5,
    },
  });

  assert.equal(result.rating, 5);
  assert.equal(createContext.serviceId, serviceId);
  assert.equal(createContext.userId, auth.userId);
});

test('createBookingReview rejects duplicate booking item reviews', async () => {
  const service = createReviewService({
    now: () => new Date('2026-07-23T12:00:00.000Z'),
    repository: {
      findReviewByBookingItem: async () => ({ id: 'existing-review' }),
      getBookingTourItem: async () => ({
        booking_status: 'completed',
        end_at: new Date('2026-07-22T18:00:00.000Z'),
        id: bookingItemId,
        service_id: serviceId,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.createBookingReview({
        auth,
        bookingId,
        body: {
          booking_item_id: bookingItemId,
          comment: 'Tour rất tốt và đáng để trải nghiệm.',
          rating: 5,
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});

test('createBookingReview handles concurrent duplicate inserts safely', async () => {
  const service = createReviewService({
    now: () => new Date('2026-07-23T12:00:00.000Z'),
    repository: {
      createReview: async () => null,
      findReviewByBookingItem: async () => null,
      getBookingTourItem: async () => ({
        booking_status: 'completed',
        end_at: new Date('2026-07-22T18:00:00.000Z'),
        id: bookingItemId,
        service_id: serviceId,
      }),
    },
  });

  await assert.rejects(
    () =>
      service.createBookingReview({
        auth,
        bookingId,
        body: {
          booking_item_id: bookingItemId,
          comment: 'Tour rất tốt và đáng để trải nghiệm.',
          rating: 5,
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});

test('listServiceReviews returns aggregate rating and masks reviewer names', async () => {
  const service = createReviewService({
    repository: {
      getPublicTour: async () => ({ id: serviceId }),
      getReviewSummary: async () => ({
        average_rating: '4.5',
        review_count: 2,
      }),
      listPublicReviews: async () => [
        {
          comment: 'Dịch vụ chu đáo.',
          created_at: new Date('2026-07-23T10:00:00.000Z'),
          full_name: 'Nguyễn Văn An',
          id: 'review-1',
          rating: 5,
        },
      ],
    },
  });

  const result = await service.listServiceReviews({
    query: {},
    serviceId,
  });

  assert.equal(result.summary.average_rating, 4.5);
  assert.equal(result.summary.review_count, 2);
  assert.equal(result.items[0].author_name, 'Nguyễn A.');
  assert.equal(result.items[0].rating_value, 5);
});
