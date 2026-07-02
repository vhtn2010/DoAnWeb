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
const emailLogService = require('../services/emailLogService');
const { createAccessToken } = require('../utils/sessionToken');

const EMAIL_LOG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOKING_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const originalGetAdminEmailLogDetail = emailLogService.getAdminEmailLogDetail;
const originalListAdminEmailLogs = emailLogService.listAdminEmailLogs;

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
  emailLogService.getAdminEmailLogDetail = originalGetAdminEmailLogDetail;
  emailLogService.listAdminEmailLogs = originalListAdminEmailLogs;
});

test.afterEach(() => {
  clearRateLimitStore('admin-email-log-catalog');
  emailLogService.getAdminEmailLogDetail = originalGetAdminEmailLogDetail;
  emailLogService.listAdminEmailLogs = originalListAdminEmailLogs;
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
