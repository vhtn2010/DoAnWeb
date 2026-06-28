const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const { getDatabaseConfig, isDatabaseConfigured } = require('./config');

const migrationsDir = path.join(__dirname, 'migrations');
const migrationsTable = 'app_schema_migrations';
const migrationLockKey = 824513901;

const getMigrationFiles = async () => {
  const entries = await fs.readdir(migrationsDir, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.up.sql'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
};

const checksumFor = (content) =>
  crypto.createHash('sha256').update(content).digest('hex');

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
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
    FROM ${migrationsTable}
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

const applyMigration = async (client, filename) => {
  const migrationPath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(migrationPath, 'utf8');
  const checksum = checksumFor(sql);

  await client.query(sql);
  await client.query(
    `
      INSERT INTO ${migrationsTable} (filename, checksum)
      VALUES ($1, $2)
    `,
    [filename, checksum],
  );
};

const runMigrations = async () => {
  if (!isDatabaseConfigured()) {
    return {
      status: 'skipped',
      reason: 'missing_database_url',
      applied: [],
    };
  }

  const client = new Client(getDatabaseConfig());
  const applied = [];

  try {
    await client.connect();
  } catch (error) {
    if (error && error.code === 'ENOTFOUND') {
      error.message = `${error.message}. Supabase direct DB hosts often require IPv6. Use SUPABASE_DB_POOLER_URL or an IPv4-compatible pooler connection string from the Supabase dashboard.`;
    }

    throw error;
  }

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockKey]);
    await ensureMigrationsTable(client);

    const files = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations(client);

    for (const filename of files) {
      const migrationPath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(migrationPath, 'utf8');
      const checksum = checksumFor(sql);
      const appliedRecord = appliedMigrations.get(filename);

      if (appliedRecord) {
        if (appliedRecord.checksum !== checksum) {
          const error = new Error(
            `Migration checksum mismatch for ${filename}. The file was changed after being applied.`,
          );

          error.code = 'MIGRATION_CHECKSUM_MISMATCH';
          throw error;
        }

        continue;
      }

      await applyMigration(client, filename);
      applied.push(filename);
    }

    return {
      status: applied.length > 0 ? 'applied' : 'up_to_date',
      applied,
    };
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [migrationLockKey]);
    } catch (error) {
      console.warn('Failed to release migration advisory lock:', error.message);
    }

    await client.end();
  }
};

module.exports = {
  getMigrationFiles,
  runMigrations,
};
