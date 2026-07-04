const {
  isDatabaseConfigured,
  isMigrationStrict,
  shouldAutoMigrate,
} = require('./config');
const { runMigrations } = require('./migrator');

const isSelfSignedCertificateError = (error) =>
  /self-signed certificate/i.test(error?.message || '');

const formatMigrationFailureMessage = (error) => {
  const baseMessage = `Database auto-migration failed: ${error.message}`;

  if (!isSelfSignedCertificateError(error)) {
    return baseMessage;
  }

  return `${baseMessage}. For local development, set DB_SSL_REJECT_UNAUTHORIZED=false or provide DB_SSL_CA with the trusted certificate chain.`;
};

const createDatabaseInitializer = ({
  config = {
    isDatabaseConfigured,
    isMigrationStrict,
    shouldAutoMigrate,
  },
  logger = console,
  runMigrationsImpl = runMigrations,
} = {}) => {
  const initializeDatabase = async () => {
    if (!config.shouldAutoMigrate()) {
      logger.log('Database auto-migration is disabled.');
      return;
    }

    if (!config.isDatabaseConfigured()) {
      const message =
        'Database auto-migration skipped because SUPABASE_DB_URL/DATABASE_URL is not configured.';

      if (config.isMigrationStrict()) {
        throw new Error(message);
      }

      logger.warn(message);
      return;
    }

    let result;

    try {
      result = await runMigrationsImpl();
    } catch (error) {
      const message = formatMigrationFailureMessage(error);

      error.message = message;

      if (config.isMigrationStrict()) {
        throw error;
      }

      logger.warn(message);
      return;
    }

    if (result.status === 'changed') {
      if (result.applied.length > 0) {
        logger.log(
          `Applied ${result.applied.length} database migration(s): ${result.applied.join(', ')}`,
        );
      }

      if (result.reconciled.length > 0) {
        logger.log(
          `Reconciled ${result.reconciled.length} database migration checksum mismatch(es): ${result.reconciled.join(', ')}`,
        );
      }

      return;
    }

    if (result.status === 'up_to_date') {
      logger.log('Database schema is already up to date.');
    }
  };

  return {
    initializeDatabase,
  };
};

const { initializeDatabase } = createDatabaseInitializer();

module.exports = {
  createDatabaseInitializer,
  formatMigrationFailureMessage,
  initializeDatabase,
};
