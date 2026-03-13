const logger = require('../config/logger');

module.exports = (err, req, res, _next) => {
  const status = err.status || 500;
  logger.error(`${req.method} ${req.path} → ${status}: ${err.message}`, { stack: err.stack });
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : (err.message || 'Error interno del servidor'),
  });
};
