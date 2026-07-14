const {
  DIRECT_PAYMENT_METHOD_VALUES,
} = require('../constants/domainConstraints');

const isTruthy = (value) => {
  if (value == null) {
    return false;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
};

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const parseCsv = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const hasOwnEnvValue = (name) =>
  Object.prototype.hasOwnProperty.call(process.env, name) &&
  String(process.env[name] ?? '').trim() !== '';

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const isProduction = env === 'production';

const port = Number(process.env.PORT) || 3000;
const apiPrefix = process.env.API_PREFIX || '/api';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
const corsOrigin = process.env.CORS_ORIGIN || frontendUrl;
const enableDemoRoutes = process.env.ENABLE_DEMO_ROUTES == null
  ? !isProduction
  : isTruthy(process.env.ENABLE_DEMO_ROUTES);
const enableSupabaseTestRoute = process.env.ENABLE_SUPABASE_TEST_ROUTE == null
  ? !isProduction
  : isTruthy(process.env.ENABLE_SUPABASE_TEST_ROUTE);

const supabase = {
  url: process.env.SUPABASE_URL || null,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
};

supabase.isConfigured = Boolean(supabase.url && supabase.serviceRoleKey);

const cloudinary = {
  apiKey: process.env.CLOUDINARY_API_KEY || null,
  apiSecret: process.env.CLOUDINARY_API_SECRET || null,
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  folder: process.env.CLOUDINARY_FOLDER || 'net-viet-travel',
  requestTimeoutMs: Number(process.env.CLOUDINARY_REQUEST_TIMEOUT_MS) || 20000,
};

cloudinary.isConfigured = Boolean(
  cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret,
);

const sendgrid = {
  apiKey: process.env.SENDGRID_API_KEY || null,
  fromEmail: process.env.MAIL_FROM_EMAIL || null,
  fromName: process.env.MAIL_FROM_NAME || 'Net Viet Travel',
  requestTimeoutMs: Number(process.env.SENDGRID_REQUEST_TIMEOUT_MS) || 20000,
};

sendgrid.isConfigured = Boolean(sendgrid.apiKey && sendgrid.fromEmail);

const directPaymentEnabledMethods = new Set(
  parseCsv(process.env.DIRECT_PAYMENT_ENABLED_METHODS).filter((method) =>
    DIRECT_PAYMENT_METHOD_VALUES.includes(method),
  ),
);

const hasExplicitDirectPaymentEnv =
  directPaymentEnabledMethods.size > 0 ||
  [
    'DIRECT_PAYMENT_CASH_AT_OFFICE_ENABLED',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ENABLED',
    'DIRECT_PAYMENT_STAFF_COLLECT_ENABLED',
    'DIRECT_PAYMENT_HOTLINE',
    'DIRECT_PAYMENT_CASH_AT_OFFICE_OFFICE_ADDRESS',
    'DIRECT_PAYMENT_CASH_AT_OFFICE_OFFICE_HOURS',
    'DIRECT_PAYMENT_CASH_AT_OFFICE_HOTLINE',
    'DIRECT_PAYMENT_CASH_AT_OFFICE_INSTRUCTIONS',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BANK_NAME',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_NUMBER',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_HOLDER',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BRANCH',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_TRANSFER_CONTENT_TEMPLATE',
    'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_INSTRUCTIONS',
    'DIRECT_PAYMENT_STAFF_COLLECT_HOTLINE',
    'DIRECT_PAYMENT_STAFF_COLLECT_CONDITIONS',
    'DIRECT_PAYMENT_STAFF_COLLECT_INSTRUCTIONS',
  ].some(hasOwnEnvValue);

const useLocalDirectPaymentDefaults = env === 'development' && !hasExplicitDirectPaymentEnv;

const isDirectPaymentMethodEnabled = (
  method,
  fallbackEnvName,
  localDefaultEnabled = false,
) => {
  if (directPaymentEnabledMethods.size > 0) {
    return directPaymentEnabledMethods.has(method);
  }

  if (hasOwnEnvValue(fallbackEnvName)) {
    return isTruthy(process.env[fallbackEnvName]);
  }

  if (useLocalDirectPaymentDefaults) {
    return localDefaultEnabled;
  }

  return isTruthy(process.env[fallbackEnvName]);
};

const directPayment = {
  hotline:
    normalizeOptionalString(process.env.DIRECT_PAYMENT_HOTLINE) ||
    (useLocalDirectPaymentDefaults ? '1900 8080' : null),
  methods: {
    cash_at_office: {
      enabled: isDirectPaymentMethodEnabled(
        'cash_at_office',
        'DIRECT_PAYMENT_CASH_AT_OFFICE_ENABLED',
      ),
      office_address: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_CASH_AT_OFFICE_OFFICE_ADDRESS,
      ),
      office_hours: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_CASH_AT_OFFICE_OFFICE_HOURS,
      ),
      hotline: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_CASH_AT_OFFICE_HOTLINE,
      ),
      instructions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_CASH_AT_OFFICE_INSTRUCTIONS,
      ),
    },
    manual_bank_transfer: {
      enabled: isDirectPaymentMethodEnabled(
        'manual_bank_transfer',
        'DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ENABLED',
        true,
      ),
      bank_name: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BANK_NAME,
      ) || (useLocalDirectPaymentDefaults ? 'Vietcombank' : null),
      account_number: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_NUMBER,
      ) || (useLocalDirectPaymentDefaults ? '0123456789' : null),
      account_holder: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_HOLDER,
      ) || (useLocalDirectPaymentDefaults ? 'CONG TY NET VIET TRAVEL' : null),
      branch: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BRANCH,
      ) || (useLocalDirectPaymentDefaults ? 'Chi nhánh TP.HCM' : null),
      transfer_content_template: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_TRANSFER_CONTENT_TEMPLATE,
      ) || (useLocalDirectPaymentDefaults ? 'NVT {booking_code}' : null),
      instructions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_INSTRUCTIONS,
      ) || (
        useLocalDirectPaymentDefaults
          ? 'Vui lòng chuyển đúng số tiền, đúng nội dung và tải bill lên hệ thống để admin duyệt thủ công.'
          : null
      ),
    },
    staff_collect: {
      enabled: isDirectPaymentMethodEnabled(
        'staff_collect',
        'DIRECT_PAYMENT_STAFF_COLLECT_ENABLED',
        true,
      ),
      hotline: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_HOTLINE,
      ) || (useLocalDirectPaymentDefaults ? '1900 8080' : null),
      conditions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_CONDITIONS,
      ) || (
        useLocalDirectPaymentDefaults
          ? 'Nhân viên sẽ chủ động liên hệ để hướng dẫn thanh toán thủ công.'
          : null
      ),
      instructions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_INSTRUCTIONS,
      ) || (
        useLocalDirectPaymentDefaults
          ? 'Vui lòng giữ liên lạc qua số điện thoại đã đặt để nhân viên hỗ trợ xác nhận.'
          : null
      ),
    },
  },
};

module.exports = {
  apiPrefix,
  backendUrl,
  cloudinary,
  corsOrigin,
  directPayment,
  enableDemoRoutes,
  enableSupabaseTestRoute,
  env,
  frontendUrl,
  isProduction,
  isTest,
  isTruthy,
  port,
  sendgrid,
  supabase,
};
