const { env, isProduction, isTruthy } = require('../config');

const resolveDatabaseUrl = () =>
  process.env.SUPABASE_DB_POOLER_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  null;

const isDatabaseConfigured = () => Boolean(resolveDatabaseUrl());

const shouldAutoMigrate = () => {
  if (env === 'test') {
    return false;
  }

  if (process.env.DB_AUTO_MIGRATE == null) {
    return true;
  }

  return isTruthy(process.env.DB_AUTO_MIGRATE);
};

const isMigrationStrict = () => {
  if (process.env.DB_MIGRATE_STRICT == null) {
    return isProduction;
  }

  return isTruthy(process.env.DB_MIGRATE_STRICT);
};

const shouldUseSsl = (databaseUrl) => {
  if (process.env.DB_SSL == null) {
    return databaseUrl.includes('supabase.com') || databaseUrl.includes('supabase.co');
  }

  return isTruthy(process.env.DB_SSL);
};

const getDatabaseConfig = () => {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    return null;
  }

  const config = {
    connectionString,
  };

  if (shouldUseSsl(connectionString)) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  return config;
};

module.exports = {
  getDatabaseConfig,
  isDatabaseConfigured,
  isMigrationStrict,
  resolveDatabaseUrl,
  shouldAutoMigrate,
};
