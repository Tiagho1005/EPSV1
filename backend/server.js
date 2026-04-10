require('dotenv').config();
const { testConnection } = require('./src/config/mysql');
const logger = require('./src/config/logger');
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

testConnection().then(async () => {
  app.listen(PORT, () => {
    logger.info(`EPS Backend corriendo en http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
  });

  const { startBlacklistService } = require('./src/services/tokenBlacklist');
  await startBlacklistService();

  const { startReminderScheduler } = require('./src/services/reminderScheduler');
  await startReminderScheduler();
}).catch(err => {
  logger.error('Error iniciando base de datos', { stack: err.stack });
  process.exit(1);
});
