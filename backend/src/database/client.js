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

module.exports = {
  getPool,
  query,
};
