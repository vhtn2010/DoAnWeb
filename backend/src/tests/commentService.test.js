const assert = require('node:assert/strict');
const test = require('node:test');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { createCommentService } = require('../services/commentService');

const serviceId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';

test('createServiceComment allows a guest without a booking', async () => {
  let createContext;
  const service = createCommentService({
    repository: {
      createComment: async (context) => {
        createContext = context;
        return {
          content: context.content,
          created_at: new Date('2026-07-23T10:00:00.000Z'),
          display_name_snapshot: context.displayName,
          id: 'comment-1',
          user_id: null,
        };
      },
      getPublicTour: async () => ({ id: serviceId }),
    },
  });

  const result = await service.createServiceComment({
    auth: null,
    body: {
      content: 'Tour này có phù hợp với trẻ nhỏ không?',
      display_name: 'Minh Anh',
    },
    serviceId,
  });

  assert.equal(result.author_name, 'Minh Anh');
  assert.equal(result.is_registered, false);
  assert.equal(createContext.userId, null);
});

test('createServiceComment uses the account name for a signed-in user', async () => {
  let createContext;
  const service = createCommentService({
    repository: {
      createComment: async (context) => {
        createContext = context;
        return {
          content: context.content,
          created_at: new Date('2026-07-23T10:00:00.000Z'),
          display_name_snapshot: context.displayName,
          id: 'comment-2',
          user_id: userId,
        };
      },
      getPublicTour: async () => ({ id: serviceId }),
      getUserDisplayName: async () => 'Nguyễn Văn An',
    },
  });

  const result = await service.createServiceComment({
    auth: { userId },
    body: {
      content: 'Mình muốn hỏi thêm về lịch khởi hành.',
      display_name: 'Tên không được sử dụng',
    },
    serviceId,
  });

  assert.equal(result.author_name, 'Nguyễn Văn An');
  assert.equal(result.is_registered, true);
  assert.equal(createContext.displayName, 'Nguyễn Văn An');
});

test('createServiceComment validates guest display name and content', async () => {
  const service = createCommentService({
    repository: {},
  });

  await assert.rejects(
    () =>
      service.createServiceComment({
        auth: null,
        body: {
          content: '',
          display_name: '',
        },
        serviceId,
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details.length === 2,
  );
});

test('listServiceComments returns public discussion separately from reviews', async () => {
  const service = createCommentService({
    repository: {
      countPublicComments: async () => 2,
      getPublicTour: async () => ({ id: serviceId }),
      listPublicComments: async () => [
        {
          content: 'Mình cũng đang quan tâm lịch tháng sau.',
          created_at: new Date('2026-07-23T10:00:00.000Z'),
          display_name_snapshot: 'Lan Chi',
          id: 'comment-3',
          user_id: null,
        },
      ],
    },
  });

  const result = await service.listServiceComments({
    query: {},
    serviceId,
  });

  assert.equal(result.meta.comment_count, 2);
  assert.equal(result.items[0].author_name, 'Lan Chi');
  assert.equal(result.items[0].rating_value, undefined);
});
