const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-mail-log-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  EMAIL_STATUS,
} = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const emailLogService = require('../services/emailLogService');
const { createAccessToken } = require('../utils/sessionToken');

const EMAIL_LOG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOKING_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetAdminEmailLogDetail = emailLogService.getAdminEmailLogDetail;
const originalGetAdminMailStats = emailLogService.getAdminMailStats;
const originalListAdminMailTemplates = emailLogService.listAdminMailTemplates;
const originalListAdminEmailLogs = emailLogService.listAdminEmailLogs;
const originalResendAdminEmailLog = emailLogService.resendAdminEmailLog;

const createAdminAuthResolver = () => async (tokenPayload) => ({
  permissions:
    tokenPayload.permissions ||
    tokenPayload.permission_codes ||
    [],
  roleCode:
    tokenPayload.roleCode ||
    tokenPayload.role_code ||
    tokenPayload.role ||
    'admin',
  serviceScopeIds:
    tokenPayload.serviceScopeIds ||
    tokenPayload.service_scope_ids ||
    null,
  tokenId: tokenPayload.jti || 'email-log-jti-1',
  user: {
    email: `${tokenPayload.userId || tokenPayload.user_id || tokenPayload.sub || USER_ID}@example.com`,
    id: tokenPayload.userId || tokenPayload.user_id || tokenPayload.sub || USER_ID,
    role_code:
      tokenPayload.roleCode ||
      tokenPayload.role_code ||
      tokenPayload.role ||
      'admin',
  },
  userId:
    tokenPayload.userId ||
    tokenPayload.user_id ||
    tokenPayload.sub ||
    USER_ID,
});

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = options.body == null
      ? null
      : JSON.stringify(options.body);
    const headers = {
      ...(options.headers || {}),
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(`http://127.0.0.1:${port}${path}`, {
      ...options,
      headers,
    }, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body: JSON.parse(body),
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore('admin-email-log-catalog');
  clearRateLimitStore('admin-mail-template-catalog');
  clearRateLimitStore('admin-mail-stats');
  clearRateLimitStore('admin-email-log-resend');
  authService.resolveAuthenticatedUser = createAdminAuthResolver();
  emailLogService.clearMailStatsCache();
  emailLogService.getAdminEmailLogDetail = originalGetAdminEmailLogDetail;
  emailLogService.getAdminMailStats = originalGetAdminMailStats;
  emailLogService.listAdminMailTemplates = originalListAdminMailTemplates;
  emailLogService.listAdminEmailLogs = originalListAdminEmailLogs;
  emailLogService.resendAdminEmailLog = originalResendAdminEmailLog;
});

test.afterEach(() => {
  clearRateLimitStore('admin-email-log-catalog');
  clearRateLimitStore('admin-mail-template-catalog');
  clearRateLimitStore('admin-mail-stats');
  clearRateLimitStore('admin-email-log-resend');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  emailLogService.clearMailStatsCache();
  emailLogService.getAdminEmailLogDetail = originalGetAdminEmailLogDetail;
  emailLogService.getAdminMailStats = originalGetAdminMailStats;
  emailLogService.listAdminMailTemplates = originalListAdminMailTemplates;
  emailLogService.listAdminEmailLogs = originalListAdminEmailLogs;
  emailLogService.resendAdminEmailLog = originalResendAdminEmailLog;
});

test('emailLogService.listAdminEmailLogs validates permission, filters, and pagination', async () => {
  const service = emailLogService.createEmailLogService({
    repository: {
      listAdminEmailLogs: async ({
        limit,
        offset,
        status,
        templateCode,
        toEmail,
      }) => {
        assert.equal(limit, 20);
        assert.equal(offset, 0);
        assert.equal(status, EMAIL_STATUS.SENT);
        assert.equal(templateCode, 'BOOKING_CONFIRMATION_RESEND');
        assert.equal(toEmail, 'customer');

        return {
          rows: [
            {
              booking_code: 'BK202607020001',
              booking_id: BOOKING_ID,
              created_at: '2026-07-02T09:00:00.000Z',
              id: EMAIL_LOG_ID,
              provider: 'sendgrid',
              sent_at: '2026-07-02T09:01:00.000Z',
              status: EMAIL_STATUS.SENT,
              subject: 'Booking confirmed',
              template_code: 'BOOKING_CONFIRMATION_RESEND',
              to_email: 'customer@example.com',
              total_count: 1,
              user_email: 'customer@example.com',
              user_full_name: 'Customer User',
              user_id: USER_ID,
            },
          ],
          total: 1,
        };
      },
    },
  });

  const result = await service.listAdminEmailLogs({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['email_log.read'],
      },
      userId: USER_ID,
    },
    query: {
      status: EMAIL_STATUS.SENT,
      template_code: 'BOOKING_CONFIRMATION_RESEND',
      to_email: 'customer',
    },
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].to_email, 'customer@example.com');
  assert.equal(result.items[0].booking.booking_code, 'BK202607020001');
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 1,
    total_pages: 1,
  });

  await assert.rejects(
    () => service.listAdminEmailLogs({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['notification.manage'],
        },
        userId: USER_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminEmailLogs({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email_log.read'],
        },
        userId: USER_ID,
      },
      query: {
        to_email: 'bad email',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminEmailLogs({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email_log.read'],
        },
        userId: USER_ID,
      },
      query: {
        template_code: 'bad code!',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('emailLogService.listAdminMailTemplates returns fixed safe metadata for authorized admin users', async () => {
  const service = emailLogService.createEmailLogService();

  const result = await service.listAdminMailTemplates({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['email_log.read'],
      },
      userId: USER_ID,
    },
  });

  assert.ok(Array.isArray(result));
  assert.ok(result.length >= 10);
  assert.deepEqual(result[0], {
    description: 'Email xac thuc tai khoan sau khi dang ky.',
    display_name: 'Verify Email',
    required_variables: [
      'full_name',
      'token',
      'verification_url',
      'api_verify_url',
      'expires_in_minutes',
    ],
    template_code: 'AUTH_VERIFY_EMAIL',
  });
  assert.equal(
    result.some((template) => template.template_code === 'SUPPORT_MANUAL_EMAIL'),
    true,
  );
  assert.equal(
    result.some((template) => Object.prototype.hasOwnProperty.call(template, 'provider')),
    false,
  );
  assert.equal(
    result.some((template) => Object.prototype.hasOwnProperty.call(template, 'html')),
    false,
  );

  await assert.rejects(
    () => service.listAdminMailTemplates({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email.send'],
        },
        userId: USER_ID,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminMailTemplates({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.reply'],
        },
        userId: USER_ID,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('emailLogService.getAdminMailStats validates range, aggregates status and template counts, and caches short-lived results', async () => {
  let statsCalls = 0;
  const cacheStore = new Map();
  const service = emailLogService.createEmailLogService({
    cacheStore,
    now: () => new Date('2026-07-02T12:00:00.000Z'),
    repository: {
      getAdminEmailStats: async ({
        from,
        to,
      }) => {
        statsCalls += 1;
        assert.equal(from.toISOString(), '2026-06-25T12:00:00.000Z');
        assert.equal(to.toISOString(), '2026-07-02T12:00:00.000Z');

        return {
          byStatusRows: [
            { count: 10, status: 'sent' },
            { count: 3, status: 'failed' },
            { count: 2, status: 'bounced' },
            { count: 1, status: 'spam_reported' },
          ],
          byTemplateRows: [
            { count: 8, template_code: 'AUTH_VERIFY_EMAIL' },
            { count: 5, template_code: 'SUPPORT_MANUAL_EMAIL' },
            { count: 3, template_code: 'UNSPECIFIED' },
          ],
          total: 16,
        };
      },
    },
  });

  const result = await service.getAdminMailStats({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {},
  });

  assert.equal(result.total, 16);
  assert.equal(result.from, '2026-06-25T12:00:00.000Z');
  assert.equal(result.to, '2026-07-02T12:00:00.000Z');
  assert.deepEqual(result.by_status, {
    bounced: 2,
    delivered: 0,
    failed: 3,
    opened: 0,
    queued: 0,
    sent: 10,
    spam_reported: 1,
  });
  assert.deepEqual(result.by_template_code, {
    AUTH_VERIFY_EMAIL: 8,
    SUPPORT_MANUAL_EMAIL: 5,
    UNSPECIFIED: 3,
  });
  assert.equal(result.failed_rate, 0.1875);
  assert.equal(result.bounced_rate, 0.125);
  assert.equal(result.spam_reported_rate, 0.0625);

  const cachedResult = await service.getAdminMailStats({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {},
  });

  assert.equal(statsCalls, 1);
  assert.deepEqual(cachedResult, result);

  await assert.rejects(
    () => service.getAdminMailStats({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.reply'],
        },
        userId: USER_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.getAdminMailStats({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.read'],
        },
        userId: USER_ID,
      },
      query: {
        from: 'bad-date',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getAdminMailStats({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['report.read'],
        },
        userId: USER_ID,
      },
      query: {
        from: '2026-07-03',
        to: '2026-07-02',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getAdminMailStats({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['report.read'],
        },
        userId: USER_ID,
      },
      query: {
        from: '2025-01-01',
        to: '2026-07-02',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('emailLogService.getAdminEmailLogDetail validates UUID, permission, and not found state', async () => {
  const service = emailLogService.createEmailLogService({
    repository: {
      getAdminEmailLogById: async (emailLogId) => {
        if (emailLogId !== EMAIL_LOG_ID) {
          return null;
        }

        return {
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T09:00:00.000Z',
          error_message: null,
          id: EMAIL_LOG_ID,
          provider: 'sendgrid',
          provider_message_id: 'provider-123',
          sent_at: '2026-07-02T09:01:00.000Z',
          status: EMAIL_STATUS.SENT,
          subject: 'Booking confirmed',
          template_code: 'BOOKING_CONFIRMATION_RESEND',
          to_email: 'customer@example.com',
          user_email: 'customer@example.com',
          user_full_name: 'Customer User',
          user_id: USER_ID,
        };
      },
    },
  });

  const result = await service.getAdminEmailLogDetail({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['email_log.read'],
      },
      userId: USER_ID,
    },
    emailLogId: EMAIL_LOG_ID,
  });

  assert.equal(result.id, EMAIL_LOG_ID);
  assert.equal(result.provider_message_id, 'provider-123');
  assert.equal(result.recipient_user.email, 'customer@example.com');

  await assert.rejects(
    () => service.getAdminEmailLogDetail({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['email_log.read'],
        },
        userId: USER_ID,
      },
      emailLogId: 'bad-uuid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getAdminEmailLogDetail({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['email_log.read'],
        },
        userId: USER_ID,
      },
      emailLogId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('emailLogService.resendAdminEmailLog resends booking confirmation email with a new email log', async () => {
  const queuedAt = new Date('2026-07-02T10:30:00.000Z');
  const sentAt = new Date('2026-07-02T10:31:00.000Z');
  const sendPayloads = [];
  const createdLogs = [];
  const service = emailLogService.createEmailLogService({
    now: () => sentAt,
    repository: {
      createResendEmailLog: async (payload) => {
        createdLogs.push(payload);

        return {
          booking_id: BOOKING_ID,
          created_at: queuedAt.toISOString(),
          error_message: null,
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          provider: 'sendgrid',
          provider_message_id: null,
          sent_at: null,
          status: 'queued',
          subject: payload.subject,
          template_code: payload.templateCode,
          to_email: payload.toEmail,
          user_id: USER_ID,
        };
      },
      getAdminEmailLogById: async () => ({
        booking_code: 'BK202607020001',
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T09:00:00.000Z',
        id: EMAIL_LOG_ID,
        provider: 'sendgrid',
        status: 'sent',
        subject: 'Booking confirmed',
        template_code: 'BOOKING_CONFIRMATION_RESEND',
        to_email: 'customer@example.com',
        user_id: USER_ID,
      }),
      getBookingEmailContextById: async () => ({
        booking_code: 'BK202607020001',
        contact_name: 'Customer User',
        currency: 'VND',
        discount_amount: 100000,
        id: BOOKING_ID,
        status: 'confirmed',
        subtotal_amount: 1000000,
        total_amount: 900000,
        user_id: USER_ID,
      }),
      listBookingItemsByBookingId: async () => ([
        {
          end_at: '2026-07-15T12:00:00.000Z',
          quantity: 2,
          service_type: 'tour',
          start_at: '2026-07-15T08:00:00.000Z',
          title_snapshot: 'Ha Long Tour',
        },
      ]),
      markEmailLogFailed: async () => {
        throw new Error('should not mark failed');
      },
      markEmailLogSent: async ({ emailLogId, messageId, sentAt: actualSentAt }) => {
        assert.equal(emailLogId, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
        assert.equal(messageId, 'provider-789');
        assert.equal(actualSentAt.toISOString(), sentAt.toISOString());

        return {
          booking_id: BOOKING_ID,
          created_at: queuedAt.toISOString(),
          error_message: null,
          id: emailLogId,
          provider: 'sendgrid',
          provider_message_id: messageId,
          sent_at: actualSentAt.toISOString(),
          status: 'sent',
          subject: createdLogs[0].subject,
          template_code: createdLogs[0].templateCode,
          to_email: createdLogs[0].toEmail,
          user_id: USER_ID,
        };
      },
    },
    sendEmailImpl: async (payload) => {
      sendPayloads.push(payload);

      return {
        messageId: 'provider-789',
      };
    },
  });

  const result = await service.resendAdminEmailLog({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['email.resend'],
      },
      userId: USER_ID,
    },
    emailLogId: EMAIL_LOG_ID,
  });

  assert.equal(sendPayloads.length, 1);
  assert.equal(sendPayloads[0].to.email, 'customer@example.com');
  assert.match(sendPayloads[0].subject, /Gui lai email xac nhan/);
  assert.equal(createdLogs.length, 1);
  assert.equal(createdLogs[0].templateCode, 'BOOKING_CONFIRMATION_RESEND');
  assert.equal(result.id, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  assert.equal(result.source_email_log_id, EMAIL_LOG_ID);
  assert.equal(result.status, 'sent');
  assert.equal(result.to_email, 'customer@example.com');
});

test('emailLogService.resendAdminEmailLog regenerates verification emails with a fresh token', async () => {
  const createdLogs = [];
  const service = emailLogService.createEmailLogService({
    createEmailVerificationTokenImpl: () => 'fresh-token',
    repository: {
      createResendEmailLog: async (payload) => {
        createdLogs.push(payload);

        return {
          booking_id: null,
          created_at: '2026-07-02T10:40:00.000Z',
          error_message: null,
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          provider: 'sendgrid',
          provider_message_id: null,
          sent_at: null,
          status: 'queued',
          subject: payload.subject,
          template_code: payload.templateCode,
          to_email: payload.toEmail,
          user_id: USER_ID,
        };
      },
      getAdminEmailLogById: async () => ({
        booking_id: null,
        created_at: '2026-07-02T09:00:00.000Z',
        id: EMAIL_LOG_ID,
        provider: 'sendgrid',
        status: 'sent',
        subject: 'Verify your account',
        template_code: 'AUTH_VERIFY_EMAIL',
        to_email: 'customer@example.com',
        user_id: USER_ID,
      }),
      getUserEmailContextById: async () => ({
        deleted_at: null,
        email: 'customer@example.com',
        email_verified_at: null,
        full_name: 'Customer User',
        id: USER_ID,
        password_hash: 'hash',
        status: 'pending_verification',
      }),
      markEmailLogFailed: async () => {
        throw new Error('should not mark failed');
      },
      markEmailLogSent: async ({ emailLogId }) => ({
        booking_id: null,
        created_at: '2026-07-02T10:40:00.000Z',
        error_message: null,
        id: emailLogId,
        provider: 'sendgrid',
        provider_message_id: 'provider-999',
        sent_at: '2026-07-02T10:41:00.000Z',
        status: 'sent',
        subject: createdLogs[0].subject,
        template_code: createdLogs[0].templateCode,
        to_email: createdLogs[0].toEmail,
        user_id: USER_ID,
      }),
    },
    sendEmailImpl: async (payload) => {
      assert.match(payload.html, /fresh-token/);
      assert.match(payload.text, /fresh-token/);
      assert.equal(payload.to.email, 'customer@example.com');

      return {
        messageId: 'provider-999',
      };
    },
  });

  const result = await service.resendAdminEmailLog({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['email.resend'],
      },
      userId: USER_ID,
    },
    emailLogId: EMAIL_LOG_ID,
  });

  assert.equal(createdLogs[0].templateCode, 'AUTH_RESEND_VERIFY_EMAIL');
  assert.equal(result.template_code, 'AUTH_RESEND_VERIFY_EMAIL');
});

test('GET /api/admin/mail/templates returns fixed template metadata and blocks customer role', async () => {
  const server = app.listen(0);

  emailLogService.listAdminMailTemplates = async ({ auth }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['email_log.read']);

    return [
      {
        description: 'Email xac thuc tai khoan sau khi dang ky.',
        display_name: 'Verify Email',
        required_variables: [
          'full_name',
          'token',
          'verification_url',
          'api_verify_url',
          'expires_in_minutes',
        ],
        template_code: 'AUTH_VERIFY_EMAIL',
      },
      {
        description: 'Email ho tro thu cong do staff hoac admin gui trong ngu canh support ticket.',
        display_name: 'Support Manual Email',
        required_variables: [
          'customer_name',
          'ticket_code',
          'subject',
          'message',
        ],
        template_code: 'SUPPORT_MANUAL_EMAIL',
      },
    ];
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/mail/templates`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.length, 2);
    assert.equal(okResponse.body.data[0].template_code, 'AUTH_VERIFY_EMAIL');
    assert.equal(okResponse.body.data[1].template_code, 'SUPPORT_MANUAL_EMAIL');

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/mail/templates`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/mail/stats returns aggregate stats for admin roles and blocks staff role', async () => {
  const server = app.listen(0);

  emailLogService.getAdminMailStats = async ({ auth, query }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['report.read']);
    assert.equal(query.from, '2026-06-01');
    assert.equal(query.to, '2026-06-30');

    return {
      by_status: {
        bounced: 1,
        delivered: 0,
        failed: 2,
        opened: 4,
        queued: 0,
        sent: 10,
        spam_reported: 1,
      },
      by_template_code: {
        AUTH_VERIFY_EMAIL: 8,
        SUPPORT_MANUAL_EMAIL: 10,
      },
      bounced_rate: 0.0556,
      failed_rate: 0.1111,
      from: '2026-06-01T00:00:00.000Z',
      spam_reported_rate: 0.0556,
      to: '2026-06-30T23:59:59.999Z',
      total: 18,
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/mail/stats?from=2026-06-01&to=2026-06-30`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.total, 18);
    assert.equal(okResponse.body.data.by_status.failed, 2);
    assert.equal(okResponse.body.data.by_template_code.SUPPORT_MANUAL_EMAIL, 10);

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/mail/stats`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/mail/stats validates date query and requires report.read', async () => {
  const server = app.listen(0);

  emailLogService.getAdminMailStats = async ({ auth, query }) => {
    assert.equal(auth.role, 'system_admin');
    assert.deepEqual(auth.tokenPayload.permissions, ['report.read']);
    assert.equal(query.from, '2026-07-01T00:00:00.000Z');
    assert.equal(query.to, undefined);

    return {
      by_status: {
        bounced: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        queued: 1,
        sent: 2,
        spam_reported: 0,
      },
      by_template_code: {
        AUTH_VERIFY_EMAIL: 3,
      },
      bounced_rate: 0,
      failed_rate: 0,
      from: '2026-07-01T00:00:00.000Z',
      spam_reported_rate: 0,
      to: '2026-07-02T12:00:00.000Z',
      total: 3,
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/mail/stats?from=2026-07-01T00:00:00.000Z`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.total, 3);

    emailLogService.getAdminMailStats = originalGetAdminMailStats;

    const validationResponse = await request(server, `${apiPrefix}/admin/mail/stats?from=not-a-date`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  } finally {
    server.close();
  }
});

test('GET /api/admin/email-logs returns admin-safe email log list and blocks customer role', async () => {
  const server = app.listen(0);

  emailLogService.listAdminEmailLogs = async ({ auth, query }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['email_log.read']);
    assert.equal(query.status, EMAIL_STATUS.SENT);
    assert.equal(query.template_code, 'BOOKING_CONFIRMATION_RESEND');
    assert.equal(query.to_email, 'customer');

    return {
      items: [
        {
          booking: {
            booking_code: 'BK202607020001',
            id: BOOKING_ID,
          },
          created_at: '2026-07-02T09:00:00.000Z',
          id: EMAIL_LOG_ID,
          provider: 'sendgrid',
          recipient_user: {
            email: 'customer@example.com',
            full_name: 'Customer User',
            id: USER_ID,
          },
          sent_at: '2026-07-02T09:01:00.000Z',
          status: EMAIL_STATUS.SENT,
          subject: 'Booking confirmed',
          template_code: 'BOOKING_CONFIRMATION_RESEND',
          to_email: 'customer@example.com',
        },
      ],
      meta: {
        has_next: false,
        limit: 20,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/email-logs?status=sent&to_email=customer&template_code=BOOKING_CONFIRMATION_RESEND`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.length, 1);
    assert.equal(okResponse.body.data[0].id, EMAIL_LOG_ID);
    assert.equal(okResponse.body.meta.total, 1);

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/email-logs`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/email-logs/{email_log_id} returns detail and validates UUID', async () => {
  const server = app.listen(0);

  emailLogService.getAdminEmailLogDetail = async ({ auth, emailLogId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['email_log.read']);
    assert.equal(emailLogId, EMAIL_LOG_ID);

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
      },
      created_at: '2026-07-02T09:00:00.000Z',
      error_message: null,
      id: EMAIL_LOG_ID,
      provider: 'sendgrid',
      provider_message_id: 'provider-123',
      recipient_user: {
        email: 'customer@example.com',
        full_name: 'Customer User',
        id: USER_ID,
      },
      sent_at: '2026-07-02T09:01:00.000Z',
      status: EMAIL_STATUS.SENT,
      subject: 'Booking confirmed',
      template_code: 'BOOKING_CONFIRMATION_RESEND',
      to_email: 'customer@example.com',
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/email-logs/${EMAIL_LOG_ID}`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.id, EMAIL_LOG_ID);
    assert.equal(okResponse.body.data.provider_message_id, 'provider-123');

    emailLogService.getAdminEmailLogDetail = originalGetAdminEmailLogDetail;

    const validationResponse = await request(server, `${apiPrefix}/admin/email-logs/not-a-uuid`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email_log.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  } finally {
    server.close();
  }
});

test('POST /api/admin/email-logs/{email_log_id}/resend returns resend result and validates UUID', async () => {
  const server = app.listen(0);

  emailLogService.resendAdminEmailLog = async ({ auth, emailLogId }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['email.resend']);
    assert.equal(emailLogId, EMAIL_LOG_ID);

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
      },
      created_at: '2026-07-02T10:40:00.000Z',
      error_message: null,
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      provider: 'sendgrid',
      provider_message_id: 'provider-123',
      recipient_user: {
        email: 'customer@example.com',
        full_name: 'Customer User',
        id: USER_ID,
      },
      sent_at: '2026-07-02T10:41:00.000Z',
      source_email_log_id: EMAIL_LOG_ID,
      status: 'sent',
      subject: 'Booking BK202607020001 - Gui lai email xac nhan',
      template_code: 'BOOKING_CONFIRMATION_RESEND',
      to_email: 'customer@example.com',
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/email-logs/${EMAIL_LOG_ID}/resend`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email.resend'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.source_email_log_id, EMAIL_LOG_ID);
    assert.equal(okResponse.body.data.template_code, 'BOOKING_CONFIRMATION_RESEND');

    emailLogService.resendAdminEmailLog = originalResendAdminEmailLog;

    const validationResponse = await request(server, `${apiPrefix}/admin/email-logs/not-a-uuid/resend`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['email.resend'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
  } finally {
    server.close();
  }
});
