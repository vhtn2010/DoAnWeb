const { Pool } = require('pg');
const { getDatabaseConfig, isDatabaseConfigured } = require('./config');

let pool = null;

const getPool = () => {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'Database connection is not configured. Set SUPABASE_DB_POOLER_URL, SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.',
    );
  }

  if (!pool) {
    pool = new Pool(getDatabaseConfig());
  }

  return pool;
};

const query = (text, params = []) => getPool().query(text, params);

const closePool = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
};

module.exports = {
  closePool,
  getPool,
  query,
};
