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

module.exports = {
  apiPrefix,
  backendUrl,
  corsOrigin,
  env,
  frontendUrl,
  isProduction,
  isTest,
  isTruthy,
  port,
  supabase,
};
