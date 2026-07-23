require('dotenv').config();

const { port } = require('./config');
const app = require('./app');
const { isDatabaseConfigured } = require('./database/config');
const { initializeDatabase } = require('./database/startup');
const {
  syncExpiredPromotionStatuses,
} = require('./services/promotionExpirationService');

let server;
let promotionExpirationTimer;
const PROMOTION_EXPIRATION_INTERVAL_MS = 60 * 1000;

const syncPromotionExpiration = async () => {
  try {
    const result = await syncExpiredPromotionStatuses();

    if (result.promotionCount > 0 || result.voucherCount > 0) {
      console.log(
        `Expired ${result.promotionCount} promotion(s) and ${result.voucherCount} voucher(s).`,
      );
    }
  } catch (error) {
    console.error('Failed to synchronize promotion expiration:', error.message);
  }
};

const startServer = async () => {
  await initializeDatabase();

  if (isDatabaseConfigured()) {
    await syncPromotionExpiration();
    promotionExpirationTimer = setInterval(
      syncPromotionExpiration,
      PROMOTION_EXPIRATION_INTERVAL_MS,
    );
    promotionExpirationTimer.unref?.();
  }

  server = app.listen(port, () => {
    console.log(`Net Viet Travel API listening on port ${port}`);
  });
};

const shutdown = (signal) => {
  console.log(`${signal} received. Closing HTTP server.`);

  if (promotionExpirationTimer) {
    clearInterval(promotionExpirationTimer);
    promotionExpirationTimer = null;
  }

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
