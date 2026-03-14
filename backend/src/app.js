const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const sanitize = require('./middleware/sanitize');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: /^http:\/\/localhost:\d+$/, credentials: true }));
app.use(express.json({ limit: '10kb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/recover-password', authLimiter);
app.use(sanitize);

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/medications',    require('./routes/medications'));
app.use('/api/medical-history',require('./routes/medicalHistory'));
app.use('/api/profile',        require('./routes/profile'));
app.use('/api/doctors',        require('./routes/doctors'));
app.use('/api/locations',      require('./routes/locations'));
app.use('/api/specialties',    require('./routes/specialties'));
app.use('/api/departments',    require('./routes/departments'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

app.use(errorHandler);

module.exports = app;
