const isTruthy = (value) => {
  if (value == null) {
    return false;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
};

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const isProduction = env === 'production';

const port = Number(process.env.PORT) || 3000;
const apiPrefix = process.env.API_PREFIX || '/api';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
const corsOrigin = process.env.CORS_ORIGIN || frontendUrl;

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

module.exports = {
  apiPrefix,
  backendUrl,
  cloudinary,
  corsOrigin,
  env,
  frontendUrl,
  isProduction,
  isTest,
  isTruthy,
  port,
  sendgrid,
  supabase,
};
