const {
  isDatabaseConfigured,
  isMigrationStrict,
  shouldAutoMigrate,
} = require('./config');
const { runMigrations } = require('./migrator');

const initializeDatabase = async () => {
  if (!shouldAutoMigrate()) {
    console.log('Database auto-migration is disabled.');
    return;
  }

  if (!isDatabaseConfigured()) {
    const message =
      'Database auto-migration skipped because SUPABASE_DB_URL/DATABASE_URL is not configured.';

    if (isMigrationStrict()) {
      throw new Error(message);
    }

    console.warn(message);
    return;
  }

  const result = await runMigrations();

  if (result.status === 'changed') {
    if (result.applied.length > 0) {
      console.log(
        `Applied ${result.applied.length} database migration(s): ${result.applied.join(', ')}`,
      );
    }

    if (result.reconciled.length > 0) {
      console.log(
        `Reconciled ${result.reconciled.length} database migration checksum mismatch(es): ${result.reconciled.join(', ')}`,
      );
    }

    return;
  }

  if (result.status === 'up_to_date') {
    console.log('Database schema is already up to date.');
  }
};

module.exports = {
  initializeDatabase,
};
