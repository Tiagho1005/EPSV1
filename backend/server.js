require('dotenv').config();
const { testConnection } = require('./src/config/mysql');
const logger = require('./src/config/logger');
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

testConnection().then(() => {
  app.listen(PORT, () => {
    logger.info(`EPS Backend corriendo en http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
  });

  const { startReminderScheduler } = require('./src/services/reminderScheduler');
  startReminderScheduler();
  logger.info('Scheduler de recordatorios iniciado');
}).catch(err => {
  logger.error('Error iniciando base de datos', { stack: err.stack });
  process.exit(1);
});
