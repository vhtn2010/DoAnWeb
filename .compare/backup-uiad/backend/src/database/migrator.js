const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const {
  getDatabaseConfig,
  isDatabaseConfigured,
  isMigrationStrict,
} = require('./config');

const migrationsDir = path.join(__dirname, 'migrations');
const migrationsTable = 'app_schema_migrations';
const migrationLockKey = 824513901;

const checksumFor = (content) =>
  crypto.createHash('sha256').update(content).digest('hex');

const createMigrator = ({
  ClientImpl = Client,
  fsImpl = fs,
  config = {
    getDatabaseConfig,
    isDatabaseConfigured,
    isMigrationStrict,
  },
  lockKey = migrationLockKey,
  logger = console,
  migrationsDirectory = migrationsDir,
  tableName = migrationsTable,
} = {}) => {
  const getMigrationFiles = async () => {
    const entries = await fsImpl.readdir(migrationsDirectory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.up.sql'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  };

  const ensureMigrationsTable = async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  };

  const getAppliedMigrations = async (client) => {
    const result = await client.query(`
      SELECT filename, checksum, applied_at
      FROM ${tableName}
      ORDER BY filename ASC
    `);

    return new Map(
      result.rows.map((row) => [
        row.filename,
        {
          checksum: row.checksum,
          appliedAt: row.applied_at,
        },
      ]),
    );
  };

  const applyMigration = async (client, filename, sql, checksum) => {
    await client.query(sql);
    await client.query(
      `
        INSERT INTO ${tableName} (filename, checksum)
        VALUES ($1, $2)
      `,
      [filename, checksum],
    );
  };

  const reconcileMigration = async (client, filename, sql, checksum) => {
    await client.query(sql);
    await client.query(
      `
        UPDATE ${tableName}
        SET checksum = $2
        WHERE filename = $1
      `,
      [filename, checksum],
    );
  };

  const runMigrations = async () => {
    if (!config.isDatabaseConfigured()) {
      return {
        status: 'skipped',
        reason: 'missing_database_url',
        applied: [],
        reconciled: [],
      };
    }

    const client = new ClientImpl(config.getDatabaseConfig());
    const applied = [];
    const reconciled = [];
    const strictMode = config.isMigrationStrict();

    try {
      await client.connect();
    } catch (error) {
      if (error && error.code === 'ENOTFOUND') {
        error.message = `${error.message}. Supabase direct DB hosts often require IPv6. Use SUPABASE_DB_POOLER_URL or an IPv4-compatible pooler connection string from the Supabase dashboard.`;
      }

      throw error;
    }

    try {
      await client.query('SELECT pg_advisory_lock($1)', [lockKey]);
      await ensureMigrationsTable(client);

      const files = await getMigrationFiles();
      const appliedMigrations = await getAppliedMigrations(client);

      for (const filename of files) {
        const migrationPath = path.join(migrationsDirectory, filename);
        const sql = await fsImpl.readFile(migrationPath, 'utf8');
        const checksum = checksumFor(sql);
        const appliedRecord = appliedMigrations.get(filename);

        if (appliedRecord) {
          if (appliedRecord.checksum !== checksum) {
            const error = new Error(
              `Migration checksum mismatch for ${filename}. The file was changed after being applied.`,
            );

            error.code = 'MIGRATION_CHECKSUM_MISMATCH';

            if (strictMode) {
              throw error;
            }

            logger.warn(
              `Re-applying ${filename} because its stored checksum no longer matches the canonical schema file.`,
            );
            await reconcileMigration(client, filename, sql, checksum);
            reconciled.push(filename);
          }

          continue;
        }

        await applyMigration(client, filename, sql, checksum);
        applied.push(filename);
      }

      return {
        status:
          applied.length > 0 || reconciled.length > 0 ? 'changed' : 'up_to_date',
        applied,
        reconciled,
      };
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [lockKey]);
      } catch (error) {
        logger.warn('Failed to release migration advisory lock:', error.message);
      }

      await client.end();
    }
  };

  return {
    getMigrationFiles,
    runMigrations,
  };
};

const migrator = createMigrator();

module.exports = {
  checksumFor,
  createMigrator,
  getMigrationFiles: migrator.getMigrationFiles,
  runMigrations: migrator.runMigrations,
};
