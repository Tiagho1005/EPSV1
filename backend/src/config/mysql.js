// ============================================================
//  Conexión a MySQL con pool de conexiones
//  Archivo: backend/src/config/mysql.js
// ============================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eps_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4',
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[MySQL] Conexión exitosa →', process.env.DB_NAME || 'eps_db');
    connection.release();
  } catch (err) {
    console.error('[MySQL] Error de conexión:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
