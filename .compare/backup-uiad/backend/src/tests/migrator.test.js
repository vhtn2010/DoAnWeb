const assert = require('node:assert/strict');
const test = require('node:test');

const { createMigrator, checksumFor } = require('../database/migrator');

const createDirent = (name) => ({
  isFile: () => true,
  name,
});

const createClientDouble = (queries, appliedRows) =>
  class ClientDouble {
    async connect() {}

    async end() {}

    async query(sql, params) {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('SELECT filename, checksum, applied_at')) {
        return {
          rows: appliedRows,
        };
      }

      return {
        rows: [],
      };
    }
  };

test('runMigrations re-applies and reconciles checksum mismatches outside strict mode', async () => {
  const queries = [];
  const warnings = [];
  const sql = 'SELECT 1;';
  const currentChecksum = checksumFor(sql);

  const migrator = createMigrator({
    ClientImpl: createClientDouble(queries, [
      {
        applied_at: '2026-06-30T00:00:00.000Z',
        checksum: 'outdated-checksum',
        filename: '001_initial_schema.up.sql',
      },
    ]),
    config: {
      getDatabaseConfig: () => ({
        connectionString: 'postgres://example.test/db',
      }),
      isDatabaseConfigured: () => true,
      isMigrationStrict: () => false,
    },
    fsImpl: {
      readFile: async () => sql,
      readdir: async () => [createDirent('001_initial_schema.up.sql')],
    },
    logger: {
      warn: (...args) => warnings.push(args.join(' ')),
    },
  });

  const result = await migrator.runMigrations();

  assert.equal(result.status, 'changed');
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.reconciled, ['001_initial_schema.up.sql']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Re-applying 001_initial_schema\.up\.sql/);

  const executedSqlQueries = queries.filter((entry) => entry.sql === sql);
  assert.equal(executedSqlQueries.length, 1);

  const checksumUpdateQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE app_schema_migrations'),
  );

  assert.ok(checksumUpdateQuery);
  assert.deepEqual(checksumUpdateQuery.params, [
    '001_initial_schema.up.sql',
    currentChecksum,
  ]);
});

test('runMigrations keeps failing on checksum mismatches in strict mode', async () => {
  const queries = [];
  const sql = 'SELECT 1;';

  const migrator = createMigrator({
    ClientImpl: createClientDouble(queries, [
      {
        applied_at: '2026-06-30T00:00:00.000Z',
        checksum: 'outdated-checksum',
        filename: '001_initial_schema.up.sql',
      },
    ]),
    config: {
      getDatabaseConfig: () => ({
        connectionString: 'postgres://example.test/db',
      }),
      isDatabaseConfigured: () => true,
      isMigrationStrict: () => true,
    },
    fsImpl: {
      readFile: async () => sql,
      readdir: async () => [createDirent('001_initial_schema.up.sql')],
    },
    logger: {
      warn: () => {},
    },
  });

  await assert.rejects(
    () => migrator.runMigrations(),
    (error) => error.code === 'MIGRATION_CHECKSUM_MISMATCH',
  );

  const checksumUpdateQuery = queries.find((entry) =>
    entry.sql.includes('UPDATE app_schema_migrations'),
  );
  const executedSqlQueries = queries.filter((entry) => entry.sql === sql);

  assert.equal(executedSqlQueries.length, 0);
  assert.equal(checksumUpdateQuery, undefined);
});
