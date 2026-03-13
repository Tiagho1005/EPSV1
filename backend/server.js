require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const sanitize = require('./src/middleware/sanitize');
const logger = require('./src/config/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: /^http:\/\/localhost:\d+$/,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/recover-password', authLimiter);
app.use(sanitize);

// HTTP request logger
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/medications', require('./src/routes/medications'));
app.use('/api/medical-history', require('./src/routes/medicalHistory'));
app.use('/api/profile', require('./src/routes/profile'));
app.use('/api/doctors', require('./src/routes/doctors'));
app.use('/api/locations', require('./src/routes/locations'));
app.use('/api/specialties', require('./src/routes/specialties'));
app.use('/api/departments', require('./src/routes/departments'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use(errorHandler);

// Initialize DB (async) then start server
initDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`EPS Backend corriendo en http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
  });
}).catch(err => {
  logger.error('Error iniciando base de datos', { stack: err.stack });
  process.exit(1);
});
