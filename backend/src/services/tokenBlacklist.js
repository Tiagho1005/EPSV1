// ============================================================
//  Token Blacklist — Persistente en MySQL
//  Gestiona la invalidación de JWTs en el logout.
//  Los JTIs revocados sobreviven reinicios del servidor.
// ============================================================
const cron = require('node-cron');
const { pool } = require('../config/mysql');
const logger = require('../config/logger');

// Crea la tabla si no existe (idempotente)
const initTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      jti        VARCHAR(36) NOT NULL
        COMMENT 'JWT ID único generado en el login',
      expires_at DATETIME    NOT NULL
        COMMENT 'Momento en que el token original expiraría — se usa para limpiar filas obsoletas',
      PRIMARY KEY (jti),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info('[TokenBlacklist] Tabla token_blacklist verificada');
};

/**
 * Registra un JTI como invalidado.
 * @param {string} jti   — claim `jti` del JWT
 * @param {Date}   expiresAt — fecha de expiración original del token
 */
const addToBlacklist = async (jti, expiresAt) => {
  // INSERT IGNORE: si por alguna razón el JTI ya existe, no falla
  await pool.execute(
    'INSERT IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
    [jti, expiresAt]
  );
};

/**
 * Comprueba si un JTI está en la blacklist.
 * Solo considera filas cuyo token no haya expirado aún;
 * los tokens expirados son inválidos por propia firma de JWT,
 * por lo que no necesitan estar en la blacklist.
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
const isBlacklisted = async (jti) => {
  const [rows] = await pool.execute(
    'SELECT 1 FROM token_blacklist WHERE jti = ? AND expires_at > NOW() LIMIT 1',
    [jti]
  );
  return rows.length > 0;
};

// Elimina filas cuyo token ya expiró — no hace falta guardarlas
const cleanupExpired = async () => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM token_blacklist WHERE expires_at <= NOW()'
    );
    if (result.affectedRows > 0) {
      logger.info(`[TokenBlacklist] Limpieza: ${result.affectedRows} tokens expirados eliminados`);
    }
  } catch (err) {
    logger.error(`[TokenBlacklist] Error en cleanupExpired: ${err.message}`);
  }
};

const startBlacklistService = async () => {
  await initTable();
  // Limpiar tokens expirados cada hora
  cron.schedule('0 * * * *', cleanupExpired);
  logger.info('[TokenBlacklist] Servicio iniciado con persistencia en BD');
};

module.exports = { startBlacklistService, addToBlacklist, isBlacklisted };
