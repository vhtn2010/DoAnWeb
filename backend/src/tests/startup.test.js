const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createDatabaseInitializer,
} = require('../database/startup');

test('initializeDatabase warns and continues when migration fails outside strict mode', async () => {
  const logs = [];
  const warnings = [];
  const error = new Error('self-signed certificate in certificate chain');
  const { initializeDatabase } = createDatabaseInitializer({
    config: {
      isDatabaseConfigured: () => true,
      isMigrationStrict: () => false,
      shouldAutoMigrate: () => true,
    },
    logger: {
      log: (...args) => logs.push(args.join(' ')),
      warn: (...args) => warnings.push(args.join(' ')),
    },
    runMigrationsImpl: async () => {
      throw error;
    },
  });

  await initializeDatabase();

  assert.deepEqual(logs, []);
  assert.equal(warnings.length, 1);
  assert.match(
    warnings[0],
    /Database auto-migration failed: self-signed certificate in certificate chain/,
  );
  assert.match(warnings[0], /DB_SSL_REJECT_UNAUTHORIZED=false/);
});

test('initializeDatabase keeps failing in strict mode when migration fails', async () => {
  const originalMessage = 'self-signed certificate in certificate chain';
  const { initializeDatabase } = createDatabaseInitializer({
    config: {
      isDatabaseConfigured: () => true,
      isMigrationStrict: () => true,
      shouldAutoMigrate: () => true,
    },
    logger: {
      log: () => {},
      warn: () => {},
    },
    runMigrationsImpl: async () => {
      throw new Error(originalMessage);
    },
  });

  await assert.rejects(
    () => initializeDatabase(),
    (error) =>
      error.message.includes(originalMessage) &&
      error.message.includes('DB_SSL_REJECT_UNAUTHORIZED=false'),
  );
});
