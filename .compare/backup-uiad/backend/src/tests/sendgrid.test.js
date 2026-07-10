const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { sendgrid } = require('../config/sendgrid');
const { sendEmail } = require('../services/sendgridService');
const {
  buildEmailAddress,
  buildSendgridPayload,
  normalizeAttachment,
} = require('../utils/sendgrid');

const originalFetch = global.fetch;
const originalSendgridConfig = { ...sendgrid };

test.afterEach(() => {
  global.fetch = originalFetch;
  Object.assign(sendgrid, originalSendgridConfig);
});

test('buildEmailAddress normalizes a string email address', () => {
  assert.deepEqual(buildEmailAddress('Customer@Example.com '), {
    email: 'customer@example.com',
  });
});

test('normalizeAttachment accepts local file path input', async () => {
  const tempFilePath = path.join(os.tmpdir(), `sendgrid-test-${Date.now()}.txt`);

  await fs.writeFile(tempFilePath, 'net-viet');

  try {
    const result = await normalizeAttachment({
      filename: 'mail.txt',
      path: tempFilePath,
      type: 'text/plain',
    });

    assert.deepEqual(result, {
      content: Buffer.from('net-viet').toString('base64'),
      disposition: 'attachment',
      filename: 'mail.txt',
      type: 'text/plain',
    });
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
});

test('buildSendgridPayload maps transactional email payload', async () => {
  const payload = await buildSendgridPayload(
    {
      attachments: [
        {
          content: 'booking-confirmed',
          filename: 'booking.txt',
          type: 'text/plain',
        },
      ],
      categories: ['booking', 'confirmation'],
      customArgs: {
        bookingId: 1001,
      },
      dynamicTemplateData: {
        bookingCode: 'BK-1001',
      },
      html: '<strong>Booking confirmed</strong>',
      subject: 'Booking confirmed',
      text: 'Booking confirmed',
      to: [
        {
          email: 'customer@example.com',
          name: 'Customer',
        },
      ],
    },
    {
      defaultFrom: {
        email: 'noreply@example.com',
        name: 'Net Viet Travel',
      },
    },
  );

  assert.deepEqual(payload, {
    attachments: [
      {
        content: Buffer.from('booking-confirmed').toString('base64'),
        disposition: 'attachment',
        filename: 'booking.txt',
        type: 'text/plain',
      },
    ],
    categories: ['booking', 'confirmation'],
    content: [
      {
        type: 'text/plain',
        value: 'Booking confirmed',
      },
      {
        type: 'text/html',
        value: '<strong>Booking confirmed</strong>',
      },
    ],
    from: {
      email: 'noreply@example.com',
      name: 'Net Viet Travel',
    },
    personalizations: [
      {
        custom_args: {
          bookingId: '1001',
        },
        dynamic_template_data: {
          bookingCode: 'BK-1001',
        },
        to: [
          {
            email: 'customer@example.com',
            name: 'Customer',
          },
        ],
      },
    ],
    subject: 'Booking confirmed',
  });
});

test('sendEmail sends request to SendGrid and returns accepted result', async () => {
  sendgrid.apiKey = 'sg-test-key';
  sendgrid.fromEmail = 'noreply@example.com';
  sendgrid.fromName = 'Net Viet Travel';

  let capturedUrl;
  let capturedOptions;

  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;

    return new Response(null, {
      headers: {
        'x-message-id': 'sg-message-1',
      },
      status: 202,
    });
  };

  const result = await sendEmail({
    subject: 'Welcome',
    text: 'Hello customer',
    to: 'customer@example.com',
  });

  assert.equal(capturedUrl, 'https://api.sendgrid.com/v3/mail/send');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer sg-test-key');
  assert.equal(capturedOptions.headers['Content-Type'], 'application/json');

  const parsedBody = JSON.parse(capturedOptions.body);

  assert.deepEqual(parsedBody.from, {
    email: 'noreply@example.com',
    name: 'Net Viet Travel',
  });
  assert.deepEqual(parsedBody.personalizations, [
    {
      to: [
        {
          email: 'customer@example.com',
        },
      ],
    },
  ]);
  assert.equal(parsedBody.subject, 'Welcome');
  assert.deepEqual(parsedBody.content, [
    {
      type: 'text/plain',
      value: 'Hello customer',
    },
  ]);
  assert.deepEqual(result, {
    accepted: true,
    messageId: 'sg-message-1',
    provider: 'sendgrid',
    statusCode: 202,
  });
});

test('sendEmail surfaces SendGrid provider errors with shared AppError metadata', async () => {
  sendgrid.apiKey = 'sg-test-key';
  sendgrid.fromEmail = 'noreply@example.com';

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [
          {
            field: 'personalizations.0.to',
            message: 'The to array is required for all personalization objects.',
          },
        ],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 400,
      },
    );

  await assert.rejects(
    () =>
      sendEmail({
        subject: 'Welcome',
        text: 'Hello customer',
        to: 'customer@example.com',
      }),
    (error) =>
      error.code === API_ERROR_CODES.SENDGRID_SEND_FAILED &&
      error.statusCode === 502 &&
      error.details?.[0]?.field === 'personalizations.0.to',
  );
});

test('sendEmail fails with shared error code when SendGrid is not configured', async () => {
  sendgrid.apiKey = null;
  sendgrid.fromEmail = null;

  await assert.rejects(
    () =>
      sendEmail({
        subject: 'Welcome',
        text: 'Hello customer',
        to: 'customer@example.com',
      }),
    (error) =>
      error.code === API_ERROR_CODES.SENDGRID_NOT_CONFIGURED &&
      error.statusCode === 503,
  );
});
