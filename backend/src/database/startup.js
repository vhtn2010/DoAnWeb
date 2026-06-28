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

  if (result.status === 'applied') {
    console.log(
      `Applied ${result.applied.length} database migration(s): ${result.applied.join(', ')}`,
    );
    return;
  }

  if (result.status === 'up_to_date') {
    console.log('Database schema is already up to date.');
  }
};

module.exports = {
  initializeDatabase,
};
