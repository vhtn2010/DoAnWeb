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

const isDirectPaymentMethodEnabled = (method, fallbackEnvName) => {
  if (directPaymentEnabledMethods.size > 0) {
    return directPaymentEnabledMethods.has(method);
  }

  return isTruthy(process.env[fallbackEnvName]);
};

const directPayment = {
  hotline: normalizeOptionalString(process.env.DIRECT_PAYMENT_HOTLINE),
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
      ),
      bank_name: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BANK_NAME,
      ),
      account_number: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_NUMBER,
      ),
      account_holder: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_ACCOUNT_HOLDER,
      ),
      branch: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_BRANCH,
      ),
      transfer_content_template: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_TRANSFER_CONTENT_TEMPLATE,
      ),
      instructions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_MANUAL_BANK_TRANSFER_INSTRUCTIONS,
      ),
    },
    staff_collect: {
      enabled: isDirectPaymentMethodEnabled(
        'staff_collect',
        'DIRECT_PAYMENT_STAFF_COLLECT_ENABLED',
      ),
      hotline: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_HOTLINE,
      ),
      conditions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_CONDITIONS,
      ),
      instructions: normalizeOptionalString(
        process.env.DIRECT_PAYMENT_STAFF_COLLECT_INSTRUCTIONS,
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
