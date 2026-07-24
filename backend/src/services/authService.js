const bcrypt = require('bcryptjs');
const {
  apiPrefix,
  backendUrl,
  frontendUrl,
  sendgrid,
} = require('../config');
const {
  changeEmail,
  emailVerification,
  passwordHash,
  passwordReset,
} = require('../config/auth');
const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const AppError = require('../utils/AppError');
const {
  createChangeEmailToken,
  verifyChangeEmailToken,
} = require('../utils/changeEmailToken');
const {
  createEmailVerificationToken,
  hashEmailVerificationToken,
  verifyEmailVerificationToken,
} = require('../utils/emailVerificationToken');
const {
  buildPasswordVersion,
  createResetPasswordToken,
  verifyResetPasswordToken,
} = require('../utils/resetPasswordToken');
const {
  buildEmailVersion,
  buildSessionTokens,
  createTokenExpiredError,
  hashSessionToken,
  verifyRefreshToken,
} = require('../utils/sessionToken');
const {
  escapeHtml,
  renderEmailButton,
  renderEmailInfoRows,
  renderEmailLayout,
  renderEmailSection,
} = require('../utils/emailTemplate');
const { sendEmail } = require('./sendgridService');

const AUTH_CHANGE_EMAIL_CONFIRMED_ACTION = 'auth.change_email_confirmed';
const AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE = 'AUTH_CHANGE_EMAIL_CONFIRM';
const AUTH_CHANGE_EMAIL_REQUESTED_ACTION = 'auth.change_email_requested';
const AUTH_LOGIN_FAILED_ACTION = 'auth.login_failed';
const AUTH_LOGIN_SUCCESS_ACTION = 'auth.login_success';
const AUTH_FORGOT_PASSWORD_REQUESTED_ACTION = 'auth.forgot_password_requested';
const AUTH_LOGOUT_ACTION = 'auth.logout';
const AUTH_REFRESH_TOKEN_ACTION = 'auth.refresh_token';
const AUTH_REGISTER_ACTION = 'auth.register';
const AUTH_RESET_PASSWORD_ACTION = 'auth.reset_password';
const AUTH_RESET_PASSWORD_TEMPLATE_CODE = 'AUTH_RESET_PASSWORD';
const AUTH_RESEND_VERIFICATION_ACTION = 'auth.resend_verification';
const AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE = 'AUTH_RESEND_VERIFY_EMAIL';
const AUTH_VERIFY_EMAIL_ACTION = 'auth.verify_email';
const AUTH_VERIFY_EMAIL_TEMPLATE_CODE = 'AUTH_VERIFY_EMAIL';
const AUTH_VERIFY_EMAIL_LOGO_URL =
  'https://res.cloudinary.com/dm5kyfyrl/image/upload/v1784049011/net-viet-travel/email/templates/auth-verify/logo.png';
const AUTH_VERIFY_EMAIL_HERO_URL =
  'https://res.cloudinary.com/dm5kyfyrl/image/upload/v1784049018/net-viet-travel/email/templates/auth-verify/hero.png';
const CUSTOMER_ROLE_CODE = 'customer';
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createInternalError = (message = 'Unable to complete authentication request') =>
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

const createInvalidCredentialsError = () =>
  new AppError('Email or password is incorrect', {
    code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    statusCode: 401,
  });

const createEmailNotVerifiedError = () =>
  new AppError('Email is not verified', {
    code: API_ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
    statusCode: 401,
  });

const createVerificationTokenInvalidError = () =>
  new AppError('Verification token is invalid or expired', {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const createRefreshTokenInvalidError = () =>
  createTokenExpiredError('Refresh token is invalid or expired');

const createResetPasswordTokenInvalidError = () =>
  new AppError('Reset password token is invalid or expired', {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const createChangeEmailTokenInvalidError = () =>
  new AppError('Change email token is invalid or expired', {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const createAccessTokenInvalidError = () =>
  createTokenExpiredError('Access token is invalid or expired');

const createForbiddenStatusError = (status, action = 'perform this action') =>
  new AppError(`Account with status ${status} is not allowed to ${action}`, {
    code: API_ERROR_CODES.FORBIDDEN,
    details: [
      {
        field: 'status',
        message: `Account status ${status} is not allowed to ${action}`,
      },
    ],
    statusCode: 403,
  });

const createNotFoundError = (message = 'User not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const runDeferredTask = (task) => {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.error('[authService] Deferred task failed', error);
      });
  });
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

const normalizeLoginPayload = (payload = {}) => {
  const details = [];
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

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

  if (!password) {
    details.push({
      field: 'password',
      message: 'Password is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    email,
    password,
  };
};

const normalizeVerifyEmailPayload = (payload = {}) => {
  const token = String(payload.token || '').trim();

  if (!token) {
    throw createValidationError([
      {
        field: 'token',
        message: 'Token is required',
      },
    ]);
  }

  return {
    token,
  };
};

const normalizeResendVerificationPayload = (payload = {}) => {
  const email = String(payload.email || '').trim().toLowerCase();

  if (!email) {
    throw createValidationError([
      {
        field: 'email',
        message: 'Email is required',
      },
    ]);
  }

  if (!EMAIL_ADDRESS_REGEX.test(email)) {
    throw createValidationError([
      {
        field: 'email',
        message: 'Email is invalid',
      },
    ]);
  }

  return {
    email,
  };
};

const normalizeForgotPasswordPayload = (payload = {}) => {
  const email = String(payload.email || '').trim().toLowerCase();

  if (!email) {
    throw createValidationError([
      {
        field: 'email',
        message: 'Email is required',
      },
    ]);
  }

  if (!EMAIL_ADDRESS_REGEX.test(email)) {
    throw createValidationError([
      {
        field: 'email',
        message: 'Email is invalid',
      },
    ]);
  }

  return {
    email,
  };
};

const normalizeChangeEmailRequestPayload = (payload = {}) => {
  const newEmail = String(payload.new_email || '').trim().toLowerCase();
  const currentPassword = String(payload.current_password || '');

  if (!newEmail) {
    throw createValidationError([
      {
        field: 'new_email',
        message: 'new_email is required',
      },
    ]);
  }

  if (!EMAIL_ADDRESS_REGEX.test(newEmail)) {
    throw createValidationError([
      {
        field: 'new_email',
        message: 'new_email is invalid',
      },
    ]);
  }

  if (!currentPassword) {
    throw createValidationError([
      {
        field: 'current_password',
        message: 'current_password is required',
      },
    ]);
  }

  return {
    currentPassword,
    newEmail,
  };
};

const normalizeChangeEmailConfirmPayload = (payload = {}) => {
  const token = String(payload.token || '').trim();

  if (!token) {
    throw createValidationError([
      {
        field: 'token',
        message: 'Token is required',
      },
    ]);
  }

  return {
    token,
  };
};

const normalizeResetPasswordPayload = (payload = {}) => {
  const details = [];
  const token = String(payload.token || '').trim();
  const newPassword = String(payload.new_password || '');

  if (!token) {
    details.push({
      field: 'token',
      message: 'Token is required',
    });
  }

  if (!newPassword) {
    details.push({
      field: 'new_password',
      message: 'new_password is required',
    });
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: 'new_password',
      message: `new_password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    token,
    newPassword,
  };
};

const normalizeRefreshTokenPayload = (payload = {}) => {
  const refreshToken = String(payload.refresh_token || '').trim();

  if (!refreshToken) {
    throw createValidationError([
      {
        field: 'refresh_token',
        message: 'refresh_token is required',
      },
    ]);
  }

  return {
    refreshToken,
  };
};

const normalizeLogoutPayload = (payload = {}) => {
  if (!Object.prototype.hasOwnProperty.call(payload, 'refresh_token')) {
    return {
      refreshToken: null,
    };
  }

  if (payload.refresh_token == null || payload.refresh_token === '') {
    return {
      refreshToken: null,
    };
  }

  if (typeof payload.refresh_token !== 'string') {
    throw createValidationError([
      {
        field: 'refresh_token',
        message: 'refresh_token must be a string when provided',
      },
    ]);
  }

  return {
    refreshToken: payload.refresh_token.trim() || null,
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

const renderVerificationEmailHtml = ({
  expiresInMinutes,
  fullName,
  verificationUrl,
}) => {
  const safeFullName = escapeHtml(fullName || 'bạn');
  const safeVerificationUrl = escapeHtml(verificationUrl);
  const safeExpiresInMinutes = escapeHtml(expiresInMinutes);

  return [
    '<!doctype html>',
    '<html lang="vi">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<title>Xác thực tài khoản Nét Việt</title>',
    '<style>',
    '@media only screen and (max-width: 620px) {',
    '.nv-email-card{width:100% !important;}',
    '.nv-email-content{padding-left:24px !important;padding-right:24px !important;}',
    '.nv-email-title{font-size:30px !important;line-height:36px !important;}',
    '.nv-email-cta{font-size:24px !important;line-height:30px !important;}',
    '.nv-email-hero{padding-left:12px !important;padding-right:12px !important;}',
    '}',
    '</style>',
    '</head>',
    '<body style="margin:0;padding:0;background:#0b0b0b;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;color:#222222;">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Xác thực tài khoản Nét Việt trong ${safeExpiresInMinutes} phút.</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse;background:#0b0b0b;">',
    '<tr>',
    '<td align="center" style="padding:30px 16px;">',
    '<table class="nv-email-card" role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:762px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;box-shadow:0 18px 46px rgba(0,0,0,0.32);">',
    '<tr>',
    '<td align="center" style="padding:30px 24px 24px;background:#ffffff;">',
    `<img src="${escapeHtml(AUTH_VERIFY_EMAIL_LOGO_URL)}" width="383" alt="Nét Việt" style="display:block;width:383px;max-width:100%;height:auto;border:0;">`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="height:25px;background:#ffffff;font-size:0;line-height:0;">&nbsp;</td>',
    '</tr>',
    '<tr>',
    '<td style="height:2px;background:#d62828;font-size:0;line-height:0;">&nbsp;</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:49px 58px 0;background:#ffffff;">',
    '<h1 class="nv-email-title" style="margin:0;text-align:center;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;line-height:44px;">Xác thực tài khoản</h1>',
    '<div style="height:44px;line-height:44px;font-size:0;">&nbsp;</div>',
    `<p style="margin:0 0 32px;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:24px;">Xin chào ${safeFullName},</p>`,
    `<p style="margin:0 0 18px;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:20px;">Cảm ơn bạn đã đăng ký tài khoản trên website Nét Việt.</p>`,
    `<p style="margin:0;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:20px;">Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng nhấp vào liên kết bên dưới.</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-hero" align="center" style="padding:40px 21px 0;background:#ffffff;">',
    `<img src="${escapeHtml(AUTH_VERIFY_EMAIL_HERO_URL)}" width="720" alt="Minh họa Nét Việt" style="display:block;width:100%;max-width:720px;height:auto;border:0;">`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" align="center" style="padding:28px 58px 0;background:#ffffff;">',
    `<a class="nv-email-cta" href="${safeVerificationUrl}" target="_blank" style="display:inline-block;color:#d62828;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;line-height:34px;text-decoration:underline;">Xác thực tại đây</a>`,
    `<p style="margin:10px 0 0;color:#6b7280;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:11px;font-style:italic;line-height:16px;">Liên kết xác thực chỉ có hiệu lực trong vòng ${safeExpiresInMinutes} phút.</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:40px 58px 0;background:#ffffff;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background:#fdeeee;border-radius:8px;">',
    '<tr>',
    '<td width="38" valign="top" style="padding:18px 0 18px 18px;">',
    '<svg aria-hidden="true" width="18" height="22" viewBox="0 0 24 24" style="display:block;width:18px;height:22px;color:#d62828;"><path d="M12 3.75 18.75 6v5.45c0 4.33-2.78 7.54-6.75 8.8-3.97-1.26-6.75-4.47-6.75-8.8V6L12 3.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="m9.2 11.8 1.75 1.75 3.95-4.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
    '</td>',
    '<td style="padding:18px 18px 18px 12px;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;line-height:18px;">',
    'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.<br>',
    'Không chia sẻ liên kết xác thực với bất kỳ ai.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:34px 58px 24px;background:#ffffff;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;">',
    '<p style="margin:0 0 2px;">Trân trọng,</p>',
    '<p style="margin:0;font-weight:700;">Đội ngũ <span style="color:#d62828;">Nét Việt</span></p>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:14px 24px 18px;border-top:1px solid #f2f2f2;background:#ffffff;color:#9ca3af;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;text-align:center;">',
    '© 2026 Nét Việt. All rights reserved.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
};

const buildVerificationEmail = ({
  expiresInMinutes,
  fullName,
  verificationUrl,
}) => ({
  html: renderVerificationEmailHtml({
    expiresInMinutes,
    fullName,
    verificationUrl,
  }),
  subject: 'Xác thực tài khoản Nét Việt',
  text: [
    `Xin chào ${fullName},`,
    'Cảm ơn bạn đã đăng ký tài khoản trên website Nét Việt.',
    'Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng nhấp vào liên kết bên dưới.',
    verificationUrl,
    `Liên kết xác thực chỉ có hiệu lực trong vòng ${expiresInMinutes} phút.`,
    'Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Không chia sẻ liên kết xác thực với bất kỳ ai.',
    'Trân trọng,',
    'Đội ngũ Nét Việt',
  ].join('\n\n'),
});

const buildResetPasswordLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiResetUrl: `${normalizedBackendUrl}${apiPrefix}/auth/reset-password`,
    resetUrl: `${normalizedFrontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
  };
};

const renderResetPasswordEmailHtml = ({
  expiresInMinutes,
  fullName,
  resetUrl,
}) => {
  const safeFullName = escapeHtml(fullName || 'bạn');
  const safeResetUrl = escapeHtml(resetUrl);
  const safeExpiresInMinutes = escapeHtml(expiresInMinutes);

  return [
    '<!doctype html>',
    '<html lang="vi">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<title>Đặt lại mật khẩu Nét Việt</title>',
    '<style>',
    '@media only screen and (max-width: 620px) {',
    '.nv-email-card{width:100% !important;}',
    '.nv-email-content{padding-left:24px !important;padding-right:24px !important;}',
    '.nv-email-title{font-size:30px !important;line-height:36px !important;}',
    '.nv-email-cta{font-size:24px !important;line-height:30px !important;}',
    '.nv-email-hero{padding-left:12px !important;padding-right:12px !important;}',
    '}',
    '</style>',
    '</head>',
    '<body style="margin:0;padding:0;background:#0b0b0b;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;color:#222222;">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Liên kết đặt lại mật khẩu Nét Việt có hiệu lực trong ${safeExpiresInMinutes} phút.</div>`,
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:collapse;background:#0b0b0b;">',
    '<tr>',
    '<td align="center" style="padding:30px 16px;">',
    '<table class="nv-email-card" role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:762px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;box-shadow:0 18px 46px rgba(0,0,0,0.32);">',
    '<tr>',
    '<td align="center" style="padding:30px 24px 24px;background:#ffffff;">',
    `<img src="${escapeHtml(AUTH_VERIFY_EMAIL_LOGO_URL)}" width="383" alt="Nét Việt" style="display:block;width:383px;max-width:100%;height:auto;border:0;">`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="height:25px;background:#ffffff;font-size:0;line-height:0;">&nbsp;</td>',
    '</tr>',
    '<tr>',
    '<td style="height:2px;background:#d62828;font-size:0;line-height:0;">&nbsp;</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:49px 58px 0;background:#ffffff;">',
    '<h1 class="nv-email-title" style="margin:0;text-align:center;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;line-height:44px;">Đặt lại mật khẩu</h1>',
    '<div style="height:44px;line-height:44px;font-size:0;">&nbsp;</div>',
    `<p style="margin:0 0 32px;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:24px;">Xin chào ${safeFullName},</p>`,
    `<p style="margin:0 0 18px;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:20px;">Hệ thống đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Nét Việt của bạn.</p>`,
    `<p style="margin:0;color:#191c1d;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:20px;">Để tiếp tục sử dụng tài khoản an toàn, vui lòng nhấp vào liên kết bên dưới và tạo mật khẩu mới.</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-hero" align="center" style="padding:40px 21px 0;background:#ffffff;">',
    `<img src="${escapeHtml(AUTH_VERIFY_EMAIL_HERO_URL)}" width="720" alt="Minh họa Nét Việt" style="display:block;width:100%;max-width:720px;height:auto;border:0;">`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" align="center" style="padding:28px 58px 0;background:#ffffff;">',
    `<a class="nv-email-cta" href="${safeResetUrl}" target="_blank" style="display:inline-block;color:#d62828;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;line-height:34px;text-decoration:underline;">Đặt lại mật khẩu tại đây</a>`,
    `<p style="margin:10px 0 0;color:#6b7280;font-family:'Be Vietnam Pro',Arial,Helvetica,sans-serif;font-size:11px;font-style:italic;line-height:16px;">Liên kết đặt lại mật khẩu chỉ có hiệu lực trong vòng ${safeExpiresInMinutes} phút.</p>`,
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:40px 58px 0;background:#ffffff;">',
    '<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="width:100%;border-collapse:separate;border-spacing:0;background:#fdeeee;border-radius:8px;">',
    '<tr>',
    '<td width="38" valign="top" style="padding:18px 0 18px 18px;">',
    '<svg aria-hidden="true" width="18" height="22" viewBox="0 0 24 24" style="display:block;width:18px;height:22px;color:#d62828;"><path d="M12 3.75 18.75 6v5.45c0 4.33-2.78 7.54-6.75 8.8-3.97-1.26-6.75-4.47-6.75-8.8V6L12 3.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="m9.2 11.8 1.75 1.75 3.95-4.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
    '</td>',
    '<td style="padding:18px 18px 18px 12px;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:12px;font-weight:400;line-height:18px;">',
    'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.<br>',
    'Không chia sẻ liên kết đặt lại mật khẩu với bất kỳ ai.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td class="nv-email-content" style="padding:34px 58px 24px;background:#ffffff;color:#191c1d;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;">',
    '<p style="margin:0 0 2px;">Trân trọng,</p>',
    '<p style="margin:0;font-weight:700;">Đội ngũ <span style="color:#d62828;">Nét Việt</span></p>',
    '</td>',
    '</tr>',
    '<tr>',
    '<td style="padding:14px 24px 18px;border-top:1px solid #f2f2f2;background:#ffffff;color:#9ca3af;font-family:\'Be Vietnam Pro\',Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;text-align:center;">',
    '© 2026 Nét Việt. All rights reserved.',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
};

const buildResetPasswordEmail = ({
  expiresInMinutes,
  fullName,
  resetUrl,
}) => ({
  html: renderResetPasswordEmailHtml({
    expiresInMinutes,
    fullName,
    resetUrl,
  }),
  subject: 'Đặt lại mật khẩu Net Viet Travel',
  text: [
    `Xin chào ${fullName},`,
    'Hệ thống đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Net Viet Travel của bạn.',
    `Vui lòng đặt lại mật khẩu trong vòng ${expiresInMinutes} phút tại:`,
    resetUrl,
    'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.',
  ].join('\n\n'),
});

const buildChangeEmailConfirmLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiConfirmUrl: `${normalizedBackendUrl}${apiPrefix}/auth/change-email/confirm`,
    confirmUrl: `${normalizedFrontendUrl}/change-email/confirm?token=${encodeURIComponent(token)}`,
  };
};

const buildChangeEmailConfirmEmail = ({
  confirmUrl,
  expiresInMinutes,
  fullName,
  newEmail,
}) => ({
  html: renderEmailLayout({
    badge: 'Đổi email đăng nhập',
    body: [
      renderEmailButton({
        href: confirmUrl,
        label: 'Xác nhận email mới',
      }),
      renderEmailSection({
        title: 'Thông tin thay đổi',
        children: renderEmailInfoRows([
          newEmail
            ? {
                label: 'Email mới',
                value: newEmail,
              }
            : null,
          {
            label: 'Đường dẫn',
            value: confirmUrl,
          },
          {
            label: 'Hạn xác nhận',
            value: `${expiresInMinutes} phut`,
          },
        ]),
      }),
    ].join(''),
    footerNote:
      'Nếu bạn không yêu cầu đổi email đăng nhập, vui lòng liên hệ bộ phận hỗ trợ để kiểm tra tài khoản.',
    greeting: `Xin chào ${fullName},`,
    intro: [
      'Hệ thống đã nhận được yêu cầu đổi email đăng nhập cho tài khoản Net Viet Travel của bạn.',
      `Vui lòng xác nhận email mới trong vòng ${expiresInMinutes} phút để hoàn tất thay đổi.`,
    ],
    preheader: `Xác nhận email đăng nhập mới trong ${expiresInMinutes} phút.`,
    title: 'Xác nhận email đăng nhập mới',
  }),
  subject: 'Xác nhận đổi email đăng nhập Net Viet Travel',
  text: [
    `Xin chào ${fullName},`,
    'Hệ thống đã nhận được yêu cầu đổi email đăng nhập cho tài khoản Net Viet Travel của bạn.',
    `Vui lòng xác nhận email mới trong vòng ${expiresInMinutes} phút tại:`,
    confirmUrl,
    'Nếu bạn không yêu cầu đổi email đăng nhập, vui lòng liên hệ bộ phận hỗ trợ để kiểm tra tài khoản.',
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

const mapAuthenticatedUser = (user) => ({
  email: user.email,
  full_name: user.full_name,
  id: user.id,
  role: user.role_code,
});

const buildVerificationResult = ({
  alreadyVerified = false,
  emailVerifiedAt,
  status,
}) => ({
  already_verified: alreadyVerified,
  email_verified_at: emailVerifiedAt
    ? new Date(emailVerifiedAt).toISOString()
    : null,
  message: alreadyVerified
    ? 'Email already verified.'
    : 'Email verified successfully.',
  status,
});

const isUniqueViolation = (error) =>
  error?.code === '23505' || error?.constraint === 'users_email_key';

const buildVerificationTokenAuditMetadata = ({
  email,
  outcome,
  status,
  tokenHash,
}) =>
  compactObject({
    email,
    outcome,
    status,
    verification_token_hash: tokenHash,
  });

const buildRefreshTokenAuditMetadata = ({
  email,
  outcome,
  previousTokenHash,
  refreshTokenHash,
  roleCode,
  status,
  tokenId,
}) =>
  compactObject({
    access_token_id: tokenId,
    email,
    outcome,
    previous_refresh_token_hash: previousTokenHash,
    refresh_token_hash: refreshTokenHash,
    role_code: roleCode,
    status,
  });

const buildChangeEmailAuditMetadata = ({
  currentEmail,
  newEmail,
  outcome,
  sessionsRevoked,
  status,
}) =>
  compactObject({
    current_email: currentEmail,
    new_email: newEmail,
    outcome,
    sessions_revoked: sessionsRevoked,
    status,
  });

const isPasswordResetRequestAllowed = (user) =>
  ![
    USER_STATUS.DELETED,
    USER_STATUS.DISABLED,
    USER_STATUS.SUSPENDED,
  ].includes(user.status);

const isPasswordResetExecutionAllowed = (user) =>
  ![
    USER_STATUS.DELETED,
    USER_STATUS.DISABLED,
    USER_STATUS.SUSPENDED,
  ].includes(user.status);

const isEmailChangeAllowed = (user) => user.status === USER_STATUS.ACTIVE;

const buildSessionIdentityClaims = (
  user,
  {
    buildEmailVersionImpl,
    buildPasswordVersionImpl,
  },
) => ({
  emlv: buildEmailVersionImpl(user.email),
  pwdv: buildPasswordVersionImpl(user.password_hash),
  roleCode: user.role_code,
  userId: user.id,
});

const insertUserLog = async (
  client,
  {
    action,
    createdAt,
    entityId,
    entityName = 'users',
    ipAddress,
    metadata,
    userAgent,
    userId,
  },
) =>
  client.query(
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
      userId || null,
      action,
      entityName,
      entityId || null,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const queueEmailLog = async (
  client,
  {
    createdAt,
    subject,
    templateCode,
    toEmail,
    userId,
  },
) =>
  client.query(
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
      userId,
      toEmail,
      subject,
      templateCode,
      EMAIL_STATUS.QUEUED,
      DOMAIN_CONSTRAINTS.emailProvider,
      createdAt,
    ],
  );

const markEmailLogSent = async (
  client,
  {
    emailLogId,
    messageId,
    sentAt,
  },
) =>
  client.query(
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
      emailLogId,
      EMAIL_STATUS.SENT,
      messageId || null,
      sentAt,
    ],
  );

const markEmailLogFailed = async (
  client,
  {
    emailLogId,
    errorMessage,
  },
) =>
  client.query(
    `
      UPDATE email_logs
      SET
        status = $2,
        error_message = $3
      WHERE id = $1
    `,
    [
      emailLogId,
      EMAIL_STATUS.FAILED,
      errorMessage || 'Unknown email provider error',
    ],
  );

const loadUserByEmail = async (client, email, { forUpdate = false } = {}) => {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.role_id,
        u.email,
        u.phone,
        u.password_hash,
        u.full_name,
        u.status,
        u.email_verified_at,
        u.last_login_at,
        r.code AS role_code
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [email],
  );

  return result.rows[0] || null;
};

const loadUserById = async (client, userId, { forUpdate = false } = {}) => {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.role_id,
        u.email,
        u.phone,
        u.password_hash,
        u.full_name,
        u.status,
        u.email_verified_at,
        u.last_login_at,
        r.code AS role_code
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [userId],
  );

  return result.rows[0] || null;
};

const loadPermissionsByRoleId = async (client, roleId) => {
  const result = await client.query(
    `
      SELECT p.code
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.code ASC
    `,
    [roleId],
  );

  return result.rows.map((row) => row.code);
};

const loadLatestRefreshTokenHash = async (client, userId) => {
  const result = await client.query(
    `
      SELECT metadata
      FROM user_logs
      WHERE
        user_id = $1
        AND action IN ($2, $3)
        AND metadata ->> 'refresh_token_hash' IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [
      userId,
      AUTH_LOGIN_SUCCESS_ACTION,
      AUTH_REFRESH_TOKEN_ACTION,
    ],
  );

  return result.rows[0]?.metadata?.refresh_token_hash || null;
};

const isRefreshTokenRevoked = async (client, userId, tokenHash) => {
  const result = await client.query(
    `
      SELECT id
      FROM user_logs
      WHERE
        user_id = $1
        AND action = $2
        AND metadata ->> 'refresh_token_hash' = $3
      LIMIT 1
    `,
    [userId, AUTH_LOGOUT_ACTION, tokenHash],
  );

  return result.rowCount > 0;
};

const createAuthService = ({
  bcryptCompareImpl = bcrypt.compare,
  buildEmailVersionImpl = buildEmailVersion,
  buildPasswordVersionImpl = buildPasswordVersion,
  buildSessionTokensImpl = buildSessionTokens,
  createChangeEmailTokenImpl = createChangeEmailToken,
  createEmailVerificationTokenImpl = createEmailVerificationToken,
  createResetPasswordTokenImpl = createResetPasswordToken,
  hashEmailVerificationTokenImpl = hashEmailVerificationToken,
  hashSessionTokenImpl = hashSessionToken,
  now = () => new Date(),
  sendEmailImpl = sendEmail,
  schedulePostCommitTaskImpl = runDeferredTask,
  verifyChangeEmailTokenImpl = verifyChangeEmailToken,
  verifyEmailVerificationTokenImpl = verifyEmailVerificationToken,
  verifyResetPasswordTokenImpl = verifyResetPasswordToken,
  verifyRefreshTokenImpl = verifyRefreshToken,
  withTransactionImpl = withTransaction,
  isEmailDeliveryConfiguredImpl = () => (
    sendEmailImpl !== sendEmail || sendgrid.isConfigured
  ),
} = {}) => {
  const dispatchQueuedEmail = ({
    emailLogId,
    emailPayload,
  }) => {
    Promise.resolve(
      schedulePostCommitTaskImpl(async () => {
        try {
          const sendResult = await sendEmailImpl(emailPayload);

          await withTransactionImpl(async (client) => {
            await markEmailLogSent(client, {
              emailLogId,
              messageId: sendResult.messageId,
              sentAt: now(),
            });
          });
        } catch (error) {
          await withTransactionImpl(async (client) => {
            await markEmailLogFailed(client, {
              emailLogId,
              errorMessage: error?.message || 'Unknown email provider error',
            });
          });
        }
      }),
    ).catch((error) => {
      console.error('[authService] Failed to schedule deferred email', error);
    });
  };

  const register = async (payload, context = {}) => {
    const input = normalizeRegisterPayload(payload);

    if (!isEmailDeliveryConfiguredImpl()) {
      throw createInternalError('Email verification service is not configured');
    }

    try {
      const result = await withTransactionImpl(async (client) => {
        const existingUser = await loadUserByEmail(client, input.email);

        if (existingUser) {
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
        const tokenHash = hashEmailVerificationTokenImpl(token);
        const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
        const emailContent = buildVerificationEmail({
          apiVerifyUrl,
          expiresInMinutes: emailVerification.expiresInMinutes,
          fullName: user.full_name,
          token,
          verificationUrl,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
          toEmail: user.email,
          userId: user.id,
        });

        await insertUserLog(client, {
          action: AUTH_REGISTER_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: {
            email: user.email,
            role_code: CUSTOMER_ROLE_CODE,
            status: user.status,
            verification_token_hash: tokenHash,
          },
          userAgent: context.userAgent,
          userId: user.id,
        });

        return {
          deferredEmail: {
            emailLogId: emailLogResult.rows[0].id,
            emailPayload: {
              html: emailContent.html,
              subject: emailContent.subject,
              text: emailContent.text,
              to: {
                email: user.email,
                name: user.full_name,
              },
            },
          },
          user: mapRegisteredUser(user),
        };
      });

      dispatchQueuedEmail(result.deferredEmail);

      return result.user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createDuplicateEmailError();
      }

      throw error;
    }
  };

  const login = async (payload, context = {}) =>
    withTransactionImpl(async (client) => {
      const input = normalizeLoginPayload(payload);
      const createdAt = now();
      const user = await loadUserByEmail(client, input.email, {
        forUpdate: true,
      });

      if (!user) {
        await insertUserLog(client, {
          action: AUTH_LOGIN_FAILED_ACTION,
          createdAt,
          entityId: null,
          ipAddress: context.ipAddress,
          metadata: {
            email: input.email,
            outcome: 'invalid_credentials',
          },
          userAgent: context.userAgent,
          userId: null,
        });

        throw createInvalidCredentialsError();
      }

      const isPasswordValid = await bcryptCompareImpl(
        input.password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        await insertUserLog(client, {
          action: AUTH_LOGIN_FAILED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: {
            email: user.email,
            outcome: 'invalid_credentials',
            role_code: user.role_code,
            status: user.status,
          },
          userAgent: context.userAgent,
          userId: user.id,
        });

        throw createInvalidCredentialsError();
      }

      if (user.status === USER_STATUS.PENDING_VERIFICATION) {
        await insertUserLog(client, {
          action: AUTH_LOGIN_FAILED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: {
            email: user.email,
            outcome: 'email_not_verified',
            role_code: user.role_code,
            status: user.status,
          },
          userAgent: context.userAgent,
          userId: user.id,
        });

        throw createEmailNotVerifiedError();
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        await insertUserLog(client, {
          action: AUTH_LOGIN_FAILED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: {
            email: user.email,
            outcome: 'forbidden_status',
            role_code: user.role_code,
            status: user.status,
          },
          userAgent: context.userAgent,
          userId: user.id,
        });

        throw createForbiddenStatusError(user.status, 'sign in');
      }

      const permissions = await loadPermissionsByRoleId(client, user.role_id);
      const session = buildSessionTokensImpl(
        buildSessionIdentityClaims(user, {
          buildEmailVersionImpl,
          buildPasswordVersionImpl,
        }),
        {
          issuedAt: createdAt,
        },
      );
      const refreshTokenHash = hashSessionTokenImpl(session.refreshToken);

      await client.query(
        `
          UPDATE users
          SET
            last_login_at = $2,
            updated_at = $2
          WHERE id = $1
        `,
        [user.id, createdAt],
      );

      await insertUserLog(client, {
        action: AUTH_LOGIN_SUCCESS_ACTION,
        createdAt,
        entityId: user.id,
        ipAddress: context.ipAddress,
        metadata: buildRefreshTokenAuditMetadata({
          email: user.email,
          outcome: 'login_success',
          refreshTokenHash,
          roleCode: user.role_code,
          status: user.status,
        }),
        userAgent: context.userAgent,
        userId: user.id,
      });

      return {
        access_token: session.accessToken,
        expires_in: session.expiresIn,
        permissions,
        refresh_expires_in: session.refreshExpiresIn,
        refresh_token: session.refreshToken,
        user: mapAuthenticatedUser(user),
      };
    });

  const refreshToken = async (payload, context = {}) => {
    const input = normalizeRefreshTokenPayload(payload);
    let tokenPayload;

    try {
      tokenPayload = verifyRefreshTokenImpl(input.refreshToken, {
        now: now(),
      });
    } catch (error) {
      throw createRefreshTokenInvalidError();
    }

    const incomingRefreshTokenHash = hashSessionTokenImpl(input.refreshToken);

    return withTransactionImpl(async (client) => {
      const user = await loadUserById(client, tokenPayload.sub, {
        forUpdate: true,
      });

      if (!user) {
        throw createNotFoundError();
      }

      const currentPasswordVersion = buildPasswordVersionImpl(user.password_hash);
      const currentEmailVersion = buildEmailVersionImpl(user.email);

      if (
        !tokenPayload.pwdv ||
        tokenPayload.pwdv !== currentPasswordVersion
      ) {
        throw createRefreshTokenInvalidError();
      }

      if (
        !tokenPayload.emlv ||
        tokenPayload.emlv !== currentEmailVersion
      ) {
        throw createRefreshTokenInvalidError();
      }

      const latestRefreshTokenHash = await loadLatestRefreshTokenHash(
        client,
        user.id,
      );

      if (
        !latestRefreshTokenHash ||
        latestRefreshTokenHash !== incomingRefreshTokenHash
      ) {
        throw createRefreshTokenInvalidError();
      }

      const revoked = await isRefreshTokenRevoked(
        client,
        user.id,
        incomingRefreshTokenHash,
      );

      if (revoked) {
        throw createRefreshTokenInvalidError();
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        throw createForbiddenStatusError(user.status, 'refresh session');
      }

      const permissions = await loadPermissionsByRoleId(client, user.role_id);
      const createdAt = now();
      const session = buildSessionTokensImpl(
        buildSessionIdentityClaims(user, {
          buildEmailVersionImpl,
          buildPasswordVersionImpl,
        }),
        {
          issuedAt: createdAt,
        },
      );
      const newRefreshTokenHash = hashSessionTokenImpl(session.refreshToken);

      await insertUserLog(client, {
        action: AUTH_REFRESH_TOKEN_ACTION,
        createdAt,
        entityId: user.id,
        ipAddress: context.ipAddress,
        metadata: buildRefreshTokenAuditMetadata({
          email: user.email,
          outcome: 'rotated',
          previousTokenHash: incomingRefreshTokenHash,
          refreshTokenHash: newRefreshTokenHash,
          roleCode: user.role_code,
          status: user.status,
        }),
        userAgent: context.userAgent,
        userId: user.id,
      });

      return {
        access_token: session.accessToken,
        expires_in: session.expiresIn,
        permissions,
        refresh_expires_in: session.refreshExpiresIn,
        refresh_token: session.refreshToken,
        user: mapAuthenticatedUser(user),
      };
    });
  };

  const resolveAuthenticatedUser = async (tokenPayload) =>
    withTransactionImpl(async (client) => {
      const user = await loadUserById(client, tokenPayload.sub);

      if (!user) {
        throw createAccessTokenInvalidError();
      }

      const currentPasswordVersion = buildPasswordVersionImpl(user.password_hash);
      const currentEmailVersion = buildEmailVersionImpl(user.email);

      if (!tokenPayload.pwdv || tokenPayload.pwdv !== currentPasswordVersion) {
        throw createAccessTokenInvalidError();
      }

      if (!tokenPayload.emlv || tokenPayload.emlv !== currentEmailVersion) {
        throw createAccessTokenInvalidError();
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        throw createForbiddenStatusError(user.status, 'access this resource');
      }

      const permissions = await loadPermissionsByRoleId(client, user.role_id);

      return {
        permissions,
        roleCode: user.role_code,
        tokenId: tokenPayload.jti,
        user,
        userId: user.id,
      };
    });

  const logout = async (payload, context = {}) =>
    withTransactionImpl(async (client) => {
      const input = normalizeLogoutPayload(payload);
      const createdAt = now();
      const refreshTokenHash = input.refreshToken
        ? hashSessionTokenImpl(input.refreshToken)
        : undefined;

      await insertUserLog(client, {
        action: AUTH_LOGOUT_ACTION,
        createdAt,
        entityId: context.userId,
        ipAddress: context.ipAddress,
        metadata: buildRefreshTokenAuditMetadata({
          outcome: 'logout',
          refreshTokenHash,
          roleCode: context.roleCode,
          tokenId: context.tokenId,
        }),
        userAgent: context.userAgent,
        userId: context.userId,
      });

      return {
        data: {
          acknowledged: true,
        },
        message: 'Logout successful.',
      };
    });

  const changeEmailRequest = async (payload, context = {}) => {
    const input = normalizeChangeEmailRequestPayload(payload);

    if (!isEmailDeliveryConfiguredImpl()) {
      throw createInternalError('Change email service is not configured');
    }

    try {
      const result = await withTransactionImpl(async (client) => {
        const user = await loadUserById(client, context.userId, {
          forUpdate: true,
        });

        if (!user) {
          throw createNotFoundError();
        }

        if (!isEmailChangeAllowed(user)) {
          throw createForbiddenStatusError(user.status, 'change email');
        }

        const isCurrentPasswordValid = await bcryptCompareImpl(
          input.currentPassword,
          user.password_hash,
        );

        if (!isCurrentPasswordValid) {
          throw createInvalidCredentialsError();
        }

        if (input.newEmail === user.email) {
          throw createValidationError([
            {
              field: 'new_email',
              message: 'new_email must be different from current email',
            },
          ]);
        }

        const existingUser = await loadUserByEmail(client, input.newEmail);

        if (existingUser) {
          throw createDuplicateEmailError();
        }

        const createdAt = now();
        const token = createChangeEmailTokenImpl({
          currentEmail: user.email,
          emailVersion: buildEmailVersionImpl(user.email),
          newEmail: input.newEmail,
          userId: user.id,
        });
        const { apiConfirmUrl, confirmUrl } = buildChangeEmailConfirmLinks(token);
        const emailContent = buildChangeEmailConfirmEmail({
          apiConfirmUrl,
          confirmUrl,
          expiresInMinutes: changeEmail.expiresInMinutes,
          fullName: user.full_name,
          newEmail: input.newEmail,
          token,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE,
          toEmail: input.newEmail,
          userId: user.id,
        });

        await insertUserLog(client, {
          action: AUTH_CHANGE_EMAIL_REQUESTED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: buildChangeEmailAuditMetadata({
            currentEmail: user.email,
            newEmail: input.newEmail,
            outcome: 'confirmation_queued',
            sessionsRevoked: false,
            status: user.status,
          }),
          userAgent: context.userAgent,
          userId: user.id,
        });

        return {
          deferredEmail: {
            emailLogId: emailLogResult.rows[0].id,
            emailPayload: {
              html: emailContent.html,
              subject: emailContent.subject,
              text: emailContent.text,
              to: {
                email: input.newEmail,
                name: user.full_name,
              },
            },
          },
          response: {
            data: {
              acknowledged: true,
            },
            message: 'Change email confirmation has been queued for delivery.',
          },
        };
      });

      dispatchQueuedEmail(result.deferredEmail);

      return result.response;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createDuplicateEmailError();
      }

      throw error;
    }
  };

  const changeEmailConfirm = async (payload, context = {}) => {
    const input = normalizeChangeEmailConfirmPayload(payload);
    let tokenPayload;

    try {
      tokenPayload = verifyChangeEmailTokenImpl(input.token, {
        now: now(),
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED) {
        throw error;
      }

      throw createChangeEmailTokenInvalidError();
    }

    if (tokenPayload.sub !== context.userId) {
      throw new AppError('Change email token does not belong to current user', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    }

    try {
      return await withTransactionImpl(async (client) => {
        const user = await loadUserById(client, context.userId, {
          forUpdate: true,
        });

        if (!user) {
          throw createNotFoundError();
        }

        if (!isEmailChangeAllowed(user)) {
          throw createForbiddenStatusError(user.status, 'change email');
        }

        const currentEmailVersion = buildEmailVersionImpl(user.email);

        if (
          user.email !== tokenPayload.current_email ||
          !tokenPayload.emlv ||
          tokenPayload.emlv !== currentEmailVersion
        ) {
          throw createChangeEmailTokenInvalidError();
        }

        const existingUser = await loadUserByEmail(client, tokenPayload.new_email);

        if (existingUser && existingUser.id !== user.id) {
          throw createDuplicateEmailError();
        }

        const createdAt = now();

        await client.query(
          `
            UPDATE users
            SET
              email = $2,
              email_verified_at = $3,
              updated_at = $3
            WHERE id = $1
          `,
          [user.id, tokenPayload.new_email, createdAt],
        );

        await insertUserLog(client, {
          action: AUTH_CHANGE_EMAIL_CONFIRMED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: buildChangeEmailAuditMetadata({
            currentEmail: user.email,
            newEmail: tokenPayload.new_email,
            outcome: 'confirmed',
            sessionsRevoked: true,
            status: user.status,
          }),
          userAgent: context.userAgent,
          userId: user.id,
        });

        return {
          data: {
            acknowledged: true,
            email: tokenPayload.new_email,
          },
          message: 'Email changed successfully.',
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createDuplicateEmailError();
      }

      throw error;
    }
  };

  const forgotPassword = async (payload, context = {}) => {
    const input = normalizeForgotPasswordPayload(payload);

    try {
      const result = await withTransactionImpl(async (client) => {
        const user = await loadUserByEmail(client, input.email, {
          forUpdate: true,
        });
        const genericResponse = {
          data: {
            acknowledged: true,
          },
          message:
            'If the email is eligible, a password reset email will be sent.',
        };

        if (!user) {
          return {
            response: genericResponse,
          };
        }

        const createdAt = now();

        if (!isPasswordResetRequestAllowed(user)) {
          await insertUserLog(client, {
            action: AUTH_FORGOT_PASSWORD_REQUESTED_ACTION,
            createdAt,
            entityId: user.id,
            ipAddress: context.ipAddress,
            metadata: {
              email: user.email,
              outcome: 'skipped_ineligible_status',
              status: user.status,
            },
            userAgent: context.userAgent,
            userId: user.id,
          });

          return {
            response: genericResponse,
          };
        }

        if (!isEmailDeliveryConfiguredImpl()) {
          throw createInternalError('Password reset email service is not configured');
        }

        const token = createResetPasswordTokenImpl({
          email: user.email,
          passwordVersion: buildPasswordVersionImpl(user.password_hash),
          userId: user.id,
        });
        const { apiResetUrl, resetUrl } = buildResetPasswordLinks(token);
        const emailContent = buildResetPasswordEmail({
          apiResetUrl,
          expiresInMinutes: passwordReset.expiresInMinutes,
          fullName: user.full_name,
          resetUrl,
          token,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: AUTH_RESET_PASSWORD_TEMPLATE_CODE,
          toEmail: user.email,
          userId: user.id,
        });

        await insertUserLog(client, {
          action: AUTH_FORGOT_PASSWORD_REQUESTED_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: {
            email: user.email,
            outcome: 'reset_email_queued',
            status: user.status,
          },
          userAgent: context.userAgent,
          userId: user.id,
        });

        return {
          deferredEmail: {
            emailLogId: emailLogResult.rows[0].id,
            emailPayload: {
              html: emailContent.html,
              subject: emailContent.subject,
              text: emailContent.text,
              to: {
                email: user.email,
                name: user.full_name,
              },
            },
          },
          response: genericResponse,
        };
      });

      if (result?.deferredEmail) {
        dispatchQueuedEmail(result.deferredEmail);
      }

      return result.response;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (payload, context = {}) => {
    const input = normalizeResetPasswordPayload(payload);
    let tokenPayload;

    try {
      tokenPayload = verifyResetPasswordTokenImpl(input.token, {
        now: now(),
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED) {
        throw error;
      }

      throw createResetPasswordTokenInvalidError();
    }

    return withTransactionImpl(async (client) => {
      const user = await loadUserById(client, tokenPayload.sub, {
        forUpdate: true,
      });

      if (!user) {
        throw createNotFoundError();
      }

      if (user.email !== tokenPayload.email) {
        throw createResetPasswordTokenInvalidError();
      }

      const currentPasswordVersion = buildPasswordVersionImpl(user.password_hash);

      if (
        !tokenPayload.pwdv ||
        tokenPayload.pwdv !== currentPasswordVersion
      ) {
        throw createResetPasswordTokenInvalidError();
      }

      if (!isPasswordResetExecutionAllowed(user)) {
        throw createForbiddenStatusError(user.status, 'reset password');
      }

      const createdAt = now();
      const newPasswordHash = await hashPassword(input.newPassword);

      await client.query(
        `
          UPDATE users
          SET
            password_hash = $2,
            updated_at = $3
          WHERE id = $1
        `,
        [user.id, newPasswordHash, createdAt],
      );

      await insertUserLog(client, {
        action: AUTH_RESET_PASSWORD_ACTION,
        createdAt,
        entityId: user.id,
        ipAddress: context.ipAddress,
        metadata: {
          email: user.email,
          sessions_revoked: true,
          status: user.status,
        },
        userAgent: context.userAgent,
        userId: user.id,
      });

      return {
        data: {
          acknowledged: true,
        },
        message: 'Password reset successful.',
      };
    });
  };

  const verifyEmail = async (payload, context = {}) => {
    const input = normalizeVerifyEmailPayload(payload);
    let tokenPayload;

    try {
      tokenPayload = verifyEmailVerificationTokenImpl(input.token, {
        now: now(),
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.AUTH_TOKEN_EXPIRED) {
        throw error;
      }

      throw createVerificationTokenInvalidError();
    }

    const tokenHash = hashEmailVerificationTokenImpl(input.token);

    return withTransactionImpl(async (client) => {
      const userResult = await client.query(
        `
          SELECT id, email, full_name, status, email_verified_at
          FROM users
          WHERE id = $1 AND email = $2
          LIMIT 1
          FOR UPDATE
        `,
        [tokenPayload.sub, tokenPayload.email],
      );

      if (userResult.rowCount === 0) {
        throw createVerificationTokenInvalidError();
      }

      const user = userResult.rows[0];

      if (user.status === USER_STATUS.ACTIVE) {
        const createdAt = now();

        await insertUserLog(client, {
          action: AUTH_VERIFY_EMAIL_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: buildVerificationTokenAuditMetadata({
            email: user.email,
            outcome: 'already_verified',
            status: user.status,
            tokenHash,
          }),
          userAgent: context.userAgent,
          userId: user.id,
        });

        return buildVerificationResult({
          alreadyVerified: true,
          emailVerifiedAt: user.email_verified_at,
          status: USER_STATUS.ACTIVE,
        });
      }

      if (user.status !== USER_STATUS.PENDING_VERIFICATION) {
        throw createForbiddenStatusError(user.status, 'verify email');
      }

      const latestTokenLogResult = await client.query(
        `
          SELECT metadata
          FROM user_logs
          WHERE
            user_id = $1
            AND action IN ($2, $3)
            AND metadata ->> 'verification_token_hash' IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [
          user.id,
          AUTH_REGISTER_ACTION,
          AUTH_RESEND_VERIFICATION_ACTION,
        ],
      );

      if (latestTokenLogResult.rowCount === 0) {
        throw createVerificationTokenInvalidError();
      }

      const latestTokenHash =
        latestTokenLogResult.rows[0].metadata?.verification_token_hash || null;

      if (!latestTokenHash || latestTokenHash !== tokenHash) {
        throw createVerificationTokenInvalidError();
      }

      const usedTokenResult = await client.query(
        `
          SELECT id
          FROM user_logs
          WHERE
            user_id = $1
            AND action = $2
            AND metadata ->> 'verification_token_hash' = $3
          LIMIT 1
        `,
        [user.id, AUTH_VERIFY_EMAIL_ACTION, tokenHash],
      );

      if (usedTokenResult.rowCount > 0) {
        throw createVerificationTokenInvalidError();
      }

      const verifiedAt = now();
      const updatedUserResult = await client.query(
        `
          UPDATE users
          SET
            email_verified_at = $2,
            status = $3,
            updated_at = $2
          WHERE id = $1
          RETURNING status, email_verified_at
        `,
        [user.id, verifiedAt, USER_STATUS.ACTIVE],
      );

      await insertUserLog(client, {
        action: AUTH_VERIFY_EMAIL_ACTION,
        createdAt: verifiedAt,
        entityId: user.id,
        ipAddress: context.ipAddress,
        metadata: buildVerificationTokenAuditMetadata({
          email: user.email,
          outcome: 'verified',
          status: USER_STATUS.ACTIVE,
          tokenHash,
        }),
        userAgent: context.userAgent,
        userId: user.id,
      });

      return buildVerificationResult({
        emailVerifiedAt: updatedUserResult.rows[0].email_verified_at,
        status: updatedUserResult.rows[0].status,
      });
    });
  };

  const resendVerification = async (payload, context = {}) => {
    const input = normalizeResendVerificationPayload(payload);

    try {
      const result = await withTransactionImpl(async (client) => {
        const userResult = await client.query(
          `
            SELECT id, email, full_name, status
            FROM users
            WHERE email = $1
            LIMIT 1
            FOR UPDATE
          `,
          [input.email],
        );
        const genericResponse = {
          data: {
            acknowledged: true,
          },
          message:
            'If the email is eligible, a verification email will be sent.',
        };

        if (userResult.rowCount === 0) {
          return {
            response: genericResponse,
          };
        }

        const user = userResult.rows[0];
        const createdAt = now();

        if (user.status !== USER_STATUS.PENDING_VERIFICATION) {
          await insertUserLog(client, {
            action: AUTH_RESEND_VERIFICATION_ACTION,
            createdAt,
            entityId: user.id,
            ipAddress: context.ipAddress,
            metadata: buildVerificationTokenAuditMetadata({
              email: user.email,
              outcome: 'skipped_ineligible_status',
              status: user.status,
            }),
            userAgent: context.userAgent,
            userId: user.id,
          });

          return {
            response: genericResponse,
          };
        }

        if (!isEmailDeliveryConfiguredImpl()) {
          throw createInternalError('Email verification service is not configured');
        }

        const token = createEmailVerificationTokenImpl({
          email: user.email,
          userId: user.id,
        });
        const tokenHash = hashEmailVerificationTokenImpl(token);
        const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
        const emailContent = buildVerificationEmail({
          apiVerifyUrl,
          expiresInMinutes: emailVerification.expiresInMinutes,
          fullName: user.full_name,
          token,
          verificationUrl,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
          toEmail: user.email,
          userId: user.id,
        });

        await insertUserLog(client, {
          action: AUTH_RESEND_VERIFICATION_ACTION,
          createdAt,
          entityId: user.id,
          ipAddress: context.ipAddress,
          metadata: buildVerificationTokenAuditMetadata({
            email: user.email,
            outcome: 'queued',
            status: user.status,
            tokenHash,
          }),
          userAgent: context.userAgent,
          userId: user.id,
        });

        return {
          deferredEmail: {
            emailLogId: emailLogResult.rows[0].id,
            emailPayload: {
              html: emailContent.html,
              subject: emailContent.subject,
              text: emailContent.text,
              to: {
                email: user.email,
                name: user.full_name,
              },
            },
          },
          response: genericResponse,
        };
      });

      if (result?.deferredEmail) {
        dispatchQueuedEmail(result.deferredEmail);
      }

      return result.response;
    } catch (error) {
      throw error;
    }
  };

  return {
    changeEmailConfirm,
    changeEmailRequest,
    forgotPassword,
    login,
    logout,
    resolveAuthenticatedUser,
    refreshToken,
    register,
    resetPassword,
    resendVerification,
    verifyEmail,
  };
};

const authService = createAuthService();

module.exports = authService;
module.exports.AUTH_CHANGE_EMAIL_CONFIRMED_ACTION = AUTH_CHANGE_EMAIL_CONFIRMED_ACTION;
module.exports.AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE = AUTH_CHANGE_EMAIL_CONFIRM_TEMPLATE_CODE;
module.exports.AUTH_CHANGE_EMAIL_REQUESTED_ACTION = AUTH_CHANGE_EMAIL_REQUESTED_ACTION;
module.exports.AUTH_LOGIN_FAILED_ACTION = AUTH_LOGIN_FAILED_ACTION;
module.exports.AUTH_LOGIN_SUCCESS_ACTION = AUTH_LOGIN_SUCCESS_ACTION;
module.exports.AUTH_FORGOT_PASSWORD_REQUESTED_ACTION = AUTH_FORGOT_PASSWORD_REQUESTED_ACTION;
module.exports.AUTH_LOGOUT_ACTION = AUTH_LOGOUT_ACTION;
module.exports.AUTH_REFRESH_TOKEN_ACTION = AUTH_REFRESH_TOKEN_ACTION;
module.exports.AUTH_REGISTER_ACTION = AUTH_REGISTER_ACTION;
module.exports.AUTH_RESET_PASSWORD_ACTION = AUTH_RESET_PASSWORD_ACTION;
module.exports.AUTH_RESET_PASSWORD_TEMPLATE_CODE = AUTH_RESET_PASSWORD_TEMPLATE_CODE;
module.exports.AUTH_RESEND_VERIFICATION_ACTION = AUTH_RESEND_VERIFICATION_ACTION;
module.exports.AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE = AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE;
module.exports.AUTH_VERIFY_EMAIL_ACTION = AUTH_VERIFY_EMAIL_ACTION;
module.exports.AUTH_VERIFY_EMAIL_TEMPLATE_CODE = AUTH_VERIFY_EMAIL_TEMPLATE_CODE;
module.exports.CUSTOMER_ROLE_CODE = CUSTOMER_ROLE_CODE;
module.exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
module.exports.buildChangeEmailConfirmEmail = buildChangeEmailConfirmEmail;
module.exports.buildVerificationEmail = buildVerificationEmail;
module.exports.buildResetPasswordEmail = buildResetPasswordEmail;
module.exports.createAccessTokenInvalidError = createAccessTokenInvalidError;
module.exports.createAuthService = createAuthService;
module.exports.normalizeChangeEmailConfirmPayload = normalizeChangeEmailConfirmPayload;
module.exports.normalizeChangeEmailRequestPayload = normalizeChangeEmailRequestPayload;
module.exports.normalizeForgotPasswordPayload = normalizeForgotPasswordPayload;
module.exports.normalizeLoginPayload = normalizeLoginPayload;
module.exports.normalizeLogoutPayload = normalizeLogoutPayload;
module.exports.normalizeRefreshTokenPayload = normalizeRefreshTokenPayload;
module.exports.normalizeRegisterPayload = normalizeRegisterPayload;
module.exports.normalizeResetPasswordPayload = normalizeResetPasswordPayload;
module.exports.normalizeResendVerificationPayload = normalizeResendVerificationPayload;
module.exports.normalizeVerifyEmailPayload = normalizeVerifyEmailPayload;
