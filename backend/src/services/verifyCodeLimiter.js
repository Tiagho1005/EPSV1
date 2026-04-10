'use strict';

const crypto = require('crypto');
const cron   = require('node-cron');
const { pool } = require('../config/mysql');
const logger   = require('../config/logger');

// ── Configuración ─────────────────────────────────────────────
// Sobreponible desde variables de entorno para ajustar sin redeployar.

const MAX_ATTEMPTS    = Number(process.env.VERIFY_CODE_MAX_ATTEMPTS)    || 5;
const WINDOW_MINUTES  = Number(process.env.VERIFY_CODE_WINDOW_MINUTES)  || 15;
const BLOCK_MINUTES   = Number(process.env.VERIFY_CODE_BLOCK_MINUTES)   || 15;

// ── Helpers ───────────────────────────────────────────────────

/**
 * Extrae la IP del cliente, respetando cabeceras de proxy.
 * En producción detrás de un reverse proxy, configura `app.set('trust proxy', true)`
 * para que Express normalice req.ip correctamente.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Construye una clave de bucket combinando IP + identificador normalizado.
 * Se hashea con SHA-256 para:
 *   - No almacenar emails/cédulas ni IPs en texto plano en la DB.
 *   - Mantener longitud fija (64 hex chars) para el PRIMARY KEY.
 *
 * Combinar IP + identifier impide que un atacante bloquee a un usuario
 * desde otras IPs (DoS de cuenta), mientras que limita el brute-force
 * desde una misma IP sobre una cuenta específica.
 */
function buildBucketKey(ip, identifier) {
  const raw = `${ip}:${identifier.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── Inicialización de tabla ───────────────────────────────────

async function initTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS verify_code_attempts (
      bucket_key    VARCHAR(64)      NOT NULL PRIMARY KEY,
      attempts      TINYINT UNSIGNED NOT NULL DEFAULT 1,
      blocked_until DATETIME         NULL,
      window_start  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_blocked_until (blocked_until),
      INDEX idx_window_start  (window_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info('verifyCodeLimiter: tabla verify_code_attempts lista');
}

// ── Lógica de rate limiting ───────────────────────────────────

/**
 * Verifica si la combinación (IP, identifier) está bloqueada.
 *
 * @param {string} ip
 * @param {string} identifier  Cédula o email del usuario.
 * @returns {{ allowed: boolean, retryAfterSeconds?: number }}
 */
async function checkRateLimit(ip, identifier) {
  const key = buildBucketKey(ip, identifier);
  const [[row]] = await pool.execute(
    'SELECT blocked_until FROM verify_code_attempts WHERE bucket_key = ?',
    [key]
  );

  if (!row || !row.blocked_until) return { allowed: true };

  const blockedUntil = new Date(row.blocked_until);
  if (blockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((blockedUntil - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

/**
 * Registra un intento fallido.
 * Usa un único INSERT … ON DUPLICATE KEY UPDATE atómico para:
 *   - Crear la fila si no existe (attempts = 1).
 *   - Reiniciar la ventana si ha expirado (attempts = 1, blocked_until = NULL).
 *   - Incrementar el contador si la ventana sigue activa.
 *   - Establecer blocked_until cuando se alcanza MAX_ATTEMPTS.
 *
 * Al ser una sola sentencia SQL no hay TOCTOU entre la lectura y la escritura.
 *
 * @param {string} ip
 * @param {string} identifier
 */
async function recordFailedAttempt(ip, identifier) {
  const key = buildBucketKey(ip, identifier);

  // Explicación de la expresión blocked_until:
  //   Si la ventana expiró → NULL (borrón y cuenta nueva).
  //   Si la ventana sigue activa y attempts+1 alcanza el límite → fijar bloqueo.
  //   En cualquier otro caso → mantener el valor actual.
  // IMPORTANTE: en ON DUPLICATE KEY UPDATE, todas las referencias a columnas
  // del lado derecho usan el valor ANTES de la actualización (valor antiguo),
  // por lo que `attempts + 1` aquí representa el NUEVO conteo correcto.
  await pool.execute(
    `INSERT INTO verify_code_attempts (bucket_key, attempts, window_start, blocked_until)
     VALUES (?, 1, NOW(), NULL)
     ON DUPLICATE KEY UPDATE
       attempts = IF(
         window_start < DATE_SUB(NOW(), INTERVAL ? MINUTE),
         1,
         attempts + 1
       ),
       window_start = IF(
         window_start < DATE_SUB(NOW(), INTERVAL ? MINUTE),
         NOW(),
         window_start
       ),
       blocked_until = IF(
         window_start < DATE_SUB(NOW(), INTERVAL ? MINUTE),
         NULL,
         IF(attempts + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), blocked_until)
       )`,
    [key, WINDOW_MINUTES, WINDOW_MINUTES, MAX_ATTEMPTS, BLOCK_MINUTES]
  );
}

/**
 * Elimina el registro de intentos tras una verificación exitosa.
 * Reinicia el contador para que el usuario no quede penalizado en el futuro.
 *
 * @param {string} ip
 * @param {string} identifier
 */
async function resetAttempts(ip, identifier) {
  const key = buildBucketKey(ip, identifier);
  await pool.execute('DELETE FROM verify_code_attempts WHERE bucket_key = ?', [key]);
}

// ── Limpieza periódica ────────────────────────────────────────

async function cleanupExpired() {
  const [result] = await pool.execute(
    `DELETE FROM verify_code_attempts
     WHERE window_start < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  if (result.affectedRows > 0) {
    logger.info(`verifyCodeLimiter: ${result.affectedRows} registros expirados eliminados`);
  }
}

/**
 * Inicia el servicio: crea la tabla y programa la limpieza diaria.
 * Llamar desde server.js tras conectar a la DB.
 */
async function startLimiterService() {
  await initTable();
  // Limpieza diaria a las 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    try { await cleanupExpired(); }
    catch (err) { logger.error('verifyCodeLimiter cleanup error', { stack: err.stack }); }
  });
  logger.info('verifyCodeLimiter: servicio iniciado');
}

// ── Middleware Express ────────────────────────────────────────

/**
 * Middleware listo para usar en cualquier ruta.
 * Extrae IP + identifier del body, verifica el límite y devuelve 429 si
 * está bloqueado (con el header Retry-After estándar).
 *
 * Uso:
 *   router.post('/verify-code', verifyCodeLimiterMiddleware, handler)
 */
const verifyCodeLimiterMiddleware = async (req, res, next) => {
  try {
    const identifier = req.body?.identifier;
    if (!identifier) return next(); // Si no hay identifier, el handler lo validará

    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(ip, identifier);

    if (!allowed) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Por favor espera ${minutes} minuto${minutes !== 1 ? 's' : ''} antes de intentarlo de nuevo.`,
        retryAfterSeconds,
      });
    }

    next();
  } catch (err) {
    // Si el servicio falla, no bloqueamos al usuario — fail open con log.
    logger.error('verifyCodeLimiter middleware error', { stack: err.stack });
    next();
  }
};

module.exports = {
  startLimiterService,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  verifyCodeLimiterMiddleware,
  getClientIp,
};
