// ============================================================
//  Conexión a MySQL con pool de conexiones
//  Archivo: backend/src/config/mysql.js
// ============================================================

const mysql = require('mysql2/promise');

// Pool reutiliza conexiones en lugar de abrir una nueva por cada query.
// connectionLimit: 10 significa que hasta 10 queries pueden correr en paralelo.
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'eps_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: 'Z',           // almacena fechas en UTC
  charset:  'utf8mb4',
});

// Verifica la conexión al arrancar el servidor.
// Si falla, el proceso termina con error para no correr sin base de datos.
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('[MySQL] Conexión exitosa →', process.env.DB_NAME || 'eps_db');
    conn.release();
  } catch (err) {
    console.error('[MySQL] Error de conexión:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
