require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: /^http:\/\/localhost:\d+$/,
  credentials: true,
}));
app.use(express.json());

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
    console.log(`\n🚀 EPS Backend corriendo en http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Error iniciando base de datos:', err);
  process.exit(1);
});
