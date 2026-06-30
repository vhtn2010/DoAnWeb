const { Pool } = require('pg');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const { getDatabaseConfig, isDatabaseConfigured } = require('./config');

let pool;

const getPool = () => {
  if (!isDatabaseConfigured()) {
    throw new AppError('Database is not configured', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }

  if (!pool) {
    pool = new Pool(getDatabaseConfig());
  }

  return pool;
};

const query = (text, params) => getPool().query(text, params);

const releaseClient = async (client) => {
  if (typeof client.release === 'function') {
    client.release();
    return;
  }

  if (typeof client.end === 'function') {
    await client.end();
  }
};

const withTransaction = async (callback, options = {}) => {
  const activePool = options.pool || getPool();
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }

    throw error;
  } finally {
    await releaseClient(client);
  }
};

module.exports = {
  getPool,
  query,
  withTransaction,
};
