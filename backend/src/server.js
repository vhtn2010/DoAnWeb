require('dotenv').config();

const { port } = require('./config');
const app = require('./app');
const { initializeDatabase } = require('./database/startup');

let server;

const startServer = async () => {
  await initializeDatabase();

  server = app.listen(port, () => {
    console.log(`Net Viet Travel API listening on port ${port}`);
  });
};

const shutdown = (signal) => {
  console.log(`${signal} received. Closing HTTP server.`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer().catch((error) => {
  console.error('Failed to start Net Viet Travel API:', error.message);
  process.exit(1);
});
