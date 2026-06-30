const bcrypt = require('bcryptjs');
const {
  apiPrefix,
  backendUrl,
  frontendUrl,
} = require('../config');
const { emailVerification, passwordHash } = require('../config/auth');
const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const AppError = require('../utils/AppError');
const { createEmailVerificationToken } = require('../utils/emailVerificationToken');
const { sendEmail } = require('./sendgridService');

const AUTH_VERIFY_EMAIL_TEMPLATE_CODE = 'AUTH_VERIFY_EMAIL';
const CUSTOMER_ROLE_CODE = 'customer';
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createInternalError = (message = 'Unable to complete registration') =>
  new AppError(message, {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const createDuplicateEmailError = () =>
  new AppError('Email already exists', {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    details: [
      {
        field: 'email',
        message: 'Email already exists',
      },
    ],
    statusCode: 409,
  });

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const normalizeRegisterPayload = (payload = {}) => {
  const details = [];

  if (
    Object.prototype.hasOwnProperty.call(payload, 'role_code') &&
    payload.role_code != null
  ) {
    details.push({
      field: 'role_code',
      message: 'role_code is not allowed for public registration',
    });
  }

  const email = String(payload.email || '').trim().toLowerCase();

  if (!email) {
    details.push({
      field: 'email',
      message: 'Email is required',
    });
  } else if (!EMAIL_ADDRESS_REGEX.test(email)) {
    details.push({
      field: 'email',
      message: 'Email is invalid',
    });
  }

  const password = String(payload.password || '');

  if (!password) {
    details.push({
      field: 'password',
      message: 'Password is required',
    });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: 'password',
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  const fullName = String(payload.full_name || '').trim();

  if (!fullName) {
    details.push({
      field: 'full_name',
      message: 'Full name is required',
    });
  } else if (fullName.length > 150) {
    details.push({
      field: 'full_name',
      message: 'Full name must be at most 150 characters',
    });
  }

  const phone = trimToNull(payload.phone);

  if (phone && phone.length > 20) {
    details.push({
      field: 'phone',
      message: 'Phone must be at most 20 characters',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    email,
    fullName,
    password,
    phone,
  };
};

const hashPassword = async (plainTextPassword) =>
  bcrypt.hash(plainTextPassword, passwordHash.bcryptSaltRounds);

const buildVerificationLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiVerifyUrl: `${normalizedBackendUrl}${apiPrefix}/auth/verify-email`,
    verificationUrl: `${normalizedFrontendUrl}/verify-email?token=${encodeURIComponent(token)}`,
  };
};

const buildVerificationEmail = ({
  apiVerifyUrl,
  expiresInMinutes,
  fullName,
  token,
  verificationUrl,
}) => ({
  html: [
    `<p>Xin chao ${fullName},</p>`,
    '<p>Tai khoan Net Viet Travel cua ban da duoc tao thanh cong.</p>',
    `<p>Vui long xac thuc email trong vong ${expiresInMinutes} phut bang cach mo lien ket sau:</p>`,
    `<p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
    '<p>Neu can goi API truc tiep, hay gui token nay toi POST /auth/verify-email:</p>',
    `<p><code>${token}</code></p>`,
    `<p>API: <code>${apiVerifyUrl}</code></p>`,
  ].join(''),
  subject: 'Xac thuc tai khoan Net Viet Travel',
  text: [
    `Xin chao ${fullName},`,
    'Tai khoan Net Viet Travel cua ban da duoc tao thanh cong.',
    `Vui long xac thuc email trong vong ${expiresInMinutes} phut tai:`,
    verificationUrl,
    'Neu can goi API truc tiep, gui token nay toi POST /auth/verify-email:',
    token,
    `API: ${apiVerifyUrl}`,
  ].join('\n\n'),
});

const mapRegisteredUser = (user) => ({
  email: user.email,
  full_name: user.full_name,
  id: user.id,
  phone: user.phone,
  role: CUSTOMER_ROLE_CODE,
  status: user.status,
});

const isUniqueViolation = (error) =>
  error?.code === '23505' || error?.constraint === 'users_email_key';

const createAuthService = ({
  createEmailVerificationTokenImpl = createEmailVerificationToken,
  now = () => new Date(),
  sendEmailImpl = sendEmail,
  withTransactionImpl = withTransaction,
} = {}) => {
  const register = async (payload, context = {}) => {
    const input = normalizeRegisterPayload(payload);

    try {
      return await withTransactionImpl(async (client) => {
        const existingUserResult = await client.query(
          `
            SELECT id
            FROM users
            WHERE email = $1
            LIMIT 1
          `,
          [input.email],
        );

        if (existingUserResult.rowCount > 0) {
          throw createDuplicateEmailError();
        }

        const roleResult = await client.query(
          `
            SELECT id, code
            FROM roles
            WHERE code = $1
            LIMIT 1
          `,
          [CUSTOMER_ROLE_CODE],
        );

        if (roleResult.rowCount === 0) {
          throw createInternalError('Default customer role is not configured');
        }

        const createdAt = now();
        const passwordHashValue = await hashPassword(input.password);
        const userResult = await client.query(
          `
            INSERT INTO users (
              role_id,
              email,
              phone,
              password_hash,
              full_name,
              status,
              email_verified_at,
              last_login_at,
              is_system_protected,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, FALSE, $7, $7)
            RETURNING id, email, phone, full_name, status
          `,
          [
            roleResult.rows[0].id,
            input.email,
            input.phone,
            passwordHashValue,
            input.fullName,
            USER_STATUS.PENDING_VERIFICATION,
            createdAt,
          ],
        );
        const user = userResult.rows[0];
        const token = createEmailVerificationTokenImpl({
          email: user.email,
          userId: user.id,
        });
        const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
        const emailContent = buildVerificationEmail({
          apiVerifyUrl,
          expiresInMinutes: emailVerification.expiresInMinutes,
          fullName: user.full_name,
          token,
          verificationUrl,
        });
        const emailLogResult = await client.query(
          `
            INSERT INTO email_logs (
              user_id,
              booking_id,
              to_email,
              subject,
              template_code,
              status,
              provider,
              provider_message_id,
              error_message,
              sent_at,
              created_at
            )
            VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7)
            RETURNING id
          `,
          [
            user.id,
            user.email,
            emailContent.subject,
            AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
            EMAIL_STATUS.QUEUED,
            DOMAIN_CONSTRAINTS.emailProvider,
            createdAt,
          ],
        );
        const sendResult = await sendEmailImpl({
          html: emailContent.html,
          subject: emailContent.subject,
          text: emailContent.text,
          to: {
            email: user.email,
            name: user.full_name,
          },
        });
        const sentAt = now();

        await client.query(
          `
            UPDATE email_logs
            SET
              status = $2,
              provider_message_id = $3,
              error_message = NULL,
              sent_at = $4
            WHERE id = $1
          `,
          [
            emailLogResult.rows[0].id,
            EMAIL_STATUS.SENT,
            sendResult.messageId,
            sentAt,
          ],
        );

        await client.query(
          `
            INSERT INTO user_logs (
              user_id,
              action,
              entity_name,
              entity_id,
              ip_address,
              user_agent,
              metadata,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
          `,
          [
            user.id,
            'auth.register',
            'users',
            user.id,
            context.ipAddress || null,
            trimToNull(context.userAgent),
            JSON.stringify({
              email: user.email,
              role_code: CUSTOMER_ROLE_CODE,
              status: user.status,
            }),
            sentAt,
          ],
        );

        return mapRegisteredUser(user);
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.SENDGRID_NOT_CONFIGURED) {
        throw createInternalError('Email verification service is not configured');
      }

      if (error.code === API_ERROR_CODES.SENDGRID_SEND_FAILED) {
        throw createInternalError('Failed to send verification email');
      }

      if (isUniqueViolation(error)) {
        throw createDuplicateEmailError();
      }

      throw error;
    }
  };

  return {
    register,
  };
};

const authService = createAuthService();

module.exports = authService;
module.exports.AUTH_VERIFY_EMAIL_TEMPLATE_CODE = AUTH_VERIFY_EMAIL_TEMPLATE_CODE;
module.exports.CUSTOMER_ROLE_CODE = CUSTOMER_ROLE_CODE;
module.exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
module.exports.buildVerificationEmail = buildVerificationEmail;
module.exports.createAuthService = createAuthService;
module.exports.normalizeRegisterPayload = normalizeRegisterPayload;
