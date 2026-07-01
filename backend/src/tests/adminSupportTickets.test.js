const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-support-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const supportService = require('../services/supportService');
const { createSupportService } = require('../services/supportService');
const { createAccessToken } = require('../utils/sessionToken');

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STAFF_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ASSIGNED_STAFF_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TICKET_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const REPLY_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const BOOKING_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const SERVICE_ID = '11111111-1111-4111-8111-111111111111';

const originalAssignAdminTicket = supportService.assignAdminTicket;
const originalGetAdminTicketDetail = supportService.getAdminTicketDetail;
const originalListAdminTickets = supportService.listAdminTickets;
const originalUpdateAdminTicket = supportService.updateAdminTicket;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body == null
      ? null
      : (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body));
    const headers = {
      ...(options.headers || {}),
    };

    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        headers,
      },
      (res) => {
        let responseBody = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(responseBody),
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end(body);
  });

test.afterEach(() => {
  supportService.assignAdminTicket = originalAssignAdminTicket;
  supportService.getAdminTicketDetail = originalGetAdminTicketDetail;
  supportService.listAdminTickets = originalListAdminTickets;
  supportService.updateAdminTicket = originalUpdateAdminTicket;
});

test('supportService.listAdminTickets validates filters and applies staff assignment scope', async () => {
  const service = createSupportService({
    repository: {
      listTicketsForAdmin: async (filters) => {
        assert.deepEqual(filters, {
          assignedTo: ASSIGNED_STAFF_ID,
          limit: 2,
          offset: 2,
          priority: 'urgent',
          staffScopeUserId: STAFF_ID,
          status: 'open',
        });

        return {
          rows: [
            {
              assigned_to: ASSIGNED_STAFF_ID,
              assigned_user_full_name: 'Support Staff',
              assigned_user_role_code: 'staff',
              booking_code: 'BK202607010001',
              booking_id: BOOKING_ID,
              booking_status: 'pending_payment',
              closed_at: null,
              created_at: '2026-07-01T10:00:00.000Z',
              customer_email: 'guest@example.com',
              customer_name: 'Guest User',
              customer_phone: '+84901234567',
              customer_user_email: null,
              customer_user_full_name: null,
              customer_user_phone: null,
              id: TICKET_ID,
              priority: 'urgent',
              service_id: SERVICE_ID,
              service_slug: 'tour-da-nang',
              service_title: 'Tour Da Nang',
              service_type: 'tour',
              status: 'open',
              subject: 'Need urgent help',
              ticket_code: 'TK20260701AAAA0001',
              updated_at: '2026-07-01T10:10:00.000Z',
              user_id: null,
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listAdminTickets({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: STAFF_ID,
    },
    query: {
      assigned_to: ASSIGNED_STAFF_ID,
      limit: '2',
      page: '2',
      priority: 'urgent',
      status: 'open',
    },
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].assigned_to.id, ASSIGNED_STAFF_ID);
  assert.equal(result.items[0].customer.full_name, 'Guest User');
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 2,
    page: 2,
    total: 3,
    total_pages: 2,
  });
});

test('supportService.listAdminTickets rejects invalid priority and missing permission', async () => {
  const service = createSupportService({
    repository: {
      listTicketsForAdmin: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listAdminTickets({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['booking.read_all'],
        },
        userId: STAFF_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      assert.equal(error.statusCode, 403);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminTickets({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.read_all'],
        },
        userId: ADMIN_ID,
      },
      query: {
        priority: 'critical',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
      return true;
    },
  );
});

test('supportService.getAdminTicketDetail filters internal notes for staff without permission and includes them for admin', async () => {
  const repository = {
    getTicketByIdForAdmin: async ({
      staffScopeUserId,
      ticketId,
    }) => {
      assert.equal(ticketId, TICKET_ID);

      if (staffScopeUserId != null) {
        assert.equal(staffScopeUserId, STAFF_ID);
      }

      return {
        assigned_to: ASSIGNED_STAFF_ID,
        assigned_user_full_name: 'Support Staff',
        assigned_user_role_code: 'staff',
        booking_code: 'BK202607010001',
        booking_id: BOOKING_ID,
        booking_status: 'pending_payment',
        closed_at: null,
        created_at: '2026-07-01T10:00:00.000Z',
        customer_email: 'customer@example.com',
        customer_name: 'Customer Name',
        customer_phone: '+84901234567',
        customer_user_email: 'customer@example.com',
        customer_user_full_name: 'Customer Name',
        customer_user_phone: '+84901234567',
        id: TICKET_ID,
        priority: 'high',
        service_id: SERVICE_ID,
        service_slug: 'tour-da-nang',
        service_title: 'Tour Da Nang',
        service_type: 'tour',
        status: 'assigned',
        subject: 'Need support',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:10:00.000Z',
        user_id: '99999999-9999-4999-8999-999999999999',
      };
    },
    listRepliesByTicketIdForAdmin: async (ticketId) => {
      assert.equal(ticketId, TICKET_ID);

      return [
        {
          created_at: '2026-07-01T10:00:00.000Z',
          id: REPLY_ID,
          is_internal_note: false,
          message: 'Customer message',
          sender_full_name: 'Customer Name',
          sender_id: '99999999-9999-4999-8999-999999999999',
          sender_role_code: 'customer',
          sender_type: 'customer',
        },
        {
          created_at: '2026-07-01T10:05:00.000Z',
          id: '12121212-1212-4121-8121-121212121212',
          is_internal_note: true,
          message: 'Internal follow-up',
          sender_full_name: 'Support Staff',
          sender_id: ASSIGNED_STAFF_ID,
          sender_role_code: 'staff',
          sender_type: 'staff',
        },
      ];
    },
  };
  const service = createSupportService({
    repository,
  });

  const staffResult = await service.getAdminTicketDetail({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: STAFF_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(staffResult.replies.length, 1);
  assert.equal(staffResult.replies[0].is_internal_note, false);

  const adminResult = await service.getAdminTicketDetail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.read_all'],
      },
      userId: ADMIN_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(adminResult.replies.length, 2);
  assert.equal(adminResult.replies[1].is_internal_note, true);
  assert.equal(adminResult.assigned_to.full_name, 'Support Staff');
});

test('supportService.updateAdminTicket validates permission, assignable user, and auto-assigns open tickets', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async (userId) => {
        assert.equal(userId, ASSIGNED_STAFF_ID);

        return {
          deleted_at: null,
          id: userId,
          role_code: 'staff',
          status: 'active',
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: payload.updates.assigned_to,
          closed_at: null,
          id: TICKET_ID,
          priority: payload.updates.priority,
          status: payload.updates.status,
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:10:00.000Z',
        };
      },
    },
  });

  const result = await service.updateAdminTicket({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['support.assign'],
      },
      userId: ADMIN_ID,
    },
    body: {
      assigned_to: ASSIGNED_STAFF_ID,
      priority: 'high',
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_update');
  assert.equal(updatePayload.updates.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(updatePayload.updates.priority, 'high');
  assert.equal(updatePayload.updates.status, 'assigned');
  assert.equal(result.status, 'assigned');
  assert.equal(result.priority, 'high');
});

test('supportService.updateAdminTicket rejects empty body, forbidden status, and closed tickets', async () => {
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => null,
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: '2026-07-01T10:10:00.000Z',
        id: TICKET_ID,
        priority: 'normal',
        status: 'closed',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:10:00.000Z',
      }),
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {},
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        status: 'closed',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        priority: 'high',
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('supportService.assignAdminTicket validates assign target and moves open ticket to assigned', async () => {
  let updatePayload = null;
  const service = createSupportService({
    repository: {
      getAssignableAdminUserById: async (userId) => {
        assert.equal(userId, ASSIGNED_STAFF_ID);

        return {
          deleted_at: null,
          id: userId,
          role_code: 'staff',
          status: 'active',
        };
      },
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'open',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async (payload) => {
        updatePayload = payload;

        return {
          assigned_to: payload.updates.assigned_to,
          closed_at: null,
          id: TICKET_ID,
          priority: 'normal',
          status: payload.updates.status,
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:11:00.000Z',
        };
      },
    },
  });

  const result = await service.assignAdminTicket({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['support.assign'],
      },
      userId: STAFF_ID,
    },
    body: {
      assigned_to: ASSIGNED_STAFF_ID,
    },
    ticketId: TICKET_ID,
  });

  assert.equal(updatePayload.action, 'admin.support.ticket_assign');
  assert.equal(updatePayload.updates.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(updatePayload.updates.status, 'assigned');
  assert.equal(result.assigned_to, ASSIGNED_STAFF_ID);
  assert.equal(result.status, 'assigned');
});

test('supportService.assignAdminTicket rejects invalid assign target and missing permission', async () => {
  const invalidUserService = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => ({
        deleted_at: null,
        id: ASSIGNED_STAFF_ID,
        role_code: 'customer',
        status: 'active',
      }),
      getTicketByIdForAdmin: async () => ({
        assigned_to: null,
        closed_at: null,
        id: TICKET_ID,
        priority: 'normal',
        status: 'waiting_staff',
        ticket_code: 'TK20260701AAAA0001',
        updated_at: '2026-07-01T10:00:00.000Z',
      }),
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => invalidUserService.assignAdminTicket({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['support.assign'],
        },
        userId: ADMIN_ID,
      },
      body: {
        assigned_to: ASSIGNED_STAFF_ID,
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  const forbiddenService = createSupportService({
    repository: {
      getAssignableAdminUserById: async () => null,
      getTicketByIdForAdmin: async () => null,
      updateTicketForAdmin: async () => null,
    },
  });

  await assert.rejects(
    () => forbiddenService.assignAdminTicket({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['support.read_all'],
        },
        userId: STAFF_ID,
      },
      body: {
        assigned_to: ASSIGNED_STAFF_ID,
      },
      ticketId: TICKET_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('GET /admin/support/tickets requires admin authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets`,
      {
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /admin/support/tickets returns paginated admin ticket summaries', async () => {
  const server = app.listen(0);
  supportService.listAdminTickets = async ({ auth, query }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(auth.userId, STAFF_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['support.read_all']);
    assert.equal(query.status, 'open');

    return {
      items: [
        {
          assigned_to: null,
          closed_at: null,
          created_at: '2026-07-01T10:00:00.000Z',
          customer: {
            email: 'guest@example.com',
            full_name: 'Guest User',
            id: null,
            phone: '+84901234567',
          },
          id: TICKET_ID,
          priority: 'normal',
          status: 'open',
          subject: 'Need support',
          ticket_code: 'TK20260701AAAA0001',
          updated_at: '2026-07-01T10:10:00.000Z',
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
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets?status=open`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.meta.total, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /admin/support/tickets/{ticket_id} returns admin-safe detail and blocks customer role', async () => {
  const server = app.listen(0);
  supportService.getAdminTicketDetail = async ({ auth, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);

    return {
      assigned_to: {
        full_name: 'Support Staff',
        id: ASSIGNED_STAFF_ID,
        role_code: 'staff',
      },
      closed_at: null,
      created_at: '2026-07-01T10:00:00.000Z',
      customer: {
        email: 'customer@example.com',
        full_name: 'Customer Name',
        id: '99999999-9999-4999-8999-999999999999',
        phone: '+84901234567',
      },
      id: TICKET_ID,
      priority: 'high',
      replies: [
        {
          created_at: '2026-07-01T10:00:00.000Z',
          id: REPLY_ID,
          is_internal_note: false,
          message: 'Customer message',
          sender: {
            full_name: 'Customer Name',
            id: '99999999-9999-4999-8999-999999999999',
            role_code: 'customer',
            type: 'customer',
          },
        },
      ],
      status: 'assigned',
      subject: 'Need support',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:10:00.000Z',
    };
  };

  try {
    const okResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.replies.length, 1);

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.read_all'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'GET',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /admin/support/tickets/{ticket_id} updates admin support ticket fields', async () => {
  const server = app.listen(0);
  supportService.updateAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.priority, 'high');
    assert.equal(body.assigned_to, ASSIGNED_STAFF_ID);

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: null,
      id: TICKET_ID,
      priority: 'high',
      status: 'assigned',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:15:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
          priority: 'high',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'admin',
            userId: ADMIN_ID,
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.priority, 'high');
    assert.equal(response.body.data.status, 'assigned');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /admin/support/tickets/{ticket_id}/assign assigns ticket for authorized admin role', async () => {
  const server = app.listen(0);
  supportService.assignAdminTicket = async ({ auth, body, ticketId }) => {
    assert.equal(auth.role, 'staff');
    assert.equal(ticketId, TICKET_ID);
    assert.equal(body.assigned_to, ASSIGNED_STAFF_ID);

    return {
      assigned_to: ASSIGNED_STAFF_ID,
      closed_at: null,
      id: TICKET_ID,
      priority: 'normal',
      status: 'assigned',
      ticket_code: 'TK20260701AAAA0001',
      updated_at: '2026-07-01T10:20:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/assign`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'staff',
            userId: STAFF_ID,
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.assigned_to, ASSIGNED_STAFF_ID);
    assert.equal(response.body.data.status, 'assigned');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('PATCH /admin/support/tickets/{ticket_id} and assign route block customer role', async () => {
  const server = app.listen(0);

  try {
    const patchResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}`,
      {
        body: {
          priority: 'high',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(patchResponse.statusCode, 403);
    assert.equal(patchResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const assignResponse = await request(
      server,
      `${apiPrefix}/admin/support/tickets/${TICKET_ID}/assign`,
      {
        body: {
          assigned_to: ASSIGNED_STAFF_ID,
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['support.assign'],
            roleCode: 'customer',
            userId: '99999999-9999-4999-8999-999999999999',
          })}`,
        },
        method: 'POST',
      },
    );

    assert.equal(assignResponse.statusCode, 403);
    assert.equal(assignResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
