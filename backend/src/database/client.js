const { Pool } = require('pg');
const { getDatabaseConfig } = require('./config');

let pool;

const getPool = () => {
  if (!pool) {
    const config = getDatabaseConfig();

    if (!config) {
      throw new Error('Database connection is not configured');
    }

    pool = new Pool(config);
  }

  return pool;
};

const query = (text, params) => getPool().query(text, params);

const withTransaction = async (callback) => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback errors and surface the original failure.
    }

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPool,
  query,
  withTransaction,
};
