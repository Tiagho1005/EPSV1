// ============================================================
//  Reminder Scheduler — Persistente en MySQL
//  Los recordatorios enviados se registran en `reminder_sent_log`
//  para sobrevivir reinicios del servidor.
// ============================================================
const cron = require('node-cron');
const { pool } = require('../config/mysql');
const { sendMedicationReminder } = require('../config/mailer');
const logger = require('../config/logger');

const fmtTime = (t) => {
  if (!t) return null;
  if (typeof t === 'string') return t.slice(0, 5);
  const h = String(t.hours ?? 0).padStart(2, '0');
  const m = String(t.minutes ?? 0).padStart(2, '0');
  return h + ':' + m;
};

// Crea la tabla de log si no existe (idempotente, se ejecuta al arrancar)
const initTable = async () => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reminder_sent_log (
      reminder_key VARCHAR(150) NOT NULL,
      sent_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (reminder_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  logger.info('[Reminder] Tabla reminder_sent_log verificada');
};

// Comprueba si un recordatorio ya fue enviado hoy
const wasAlreadySent = async (key) => {
  const [rows] = await pool.execute(
    'SELECT 1 FROM reminder_sent_log WHERE reminder_key = ?',
    [key]
  );
  return rows.length > 0;
};

// Marca un recordatorio como enviado en la BD
const markAsSent = async (key) => {
  // INSERT IGNORE evita errores si dos workers concurrentes intentan insertar la misma key
  await pool.execute(
    'INSERT IGNORE INTO reminder_sent_log (reminder_key) VALUES (?)',
    [key]
  );
};

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Medicamentos activos con sus horarios y datos del usuario
    const [rows] = await pool.execute(
      `SELECT m.id, m.nombre, m.dosis, m.instrucciones, m.user_id,
              mh.hora,
              u.email, u.nombre AS user_nombre, u.activo,
              u.reminder_email, u.reminder_advance_min
       FROM medications m
       JOIN medication_horarios mh ON mh.medication_id = m.id
       JOIN users u ON u.id = m.user_id
       WHERE m.fecha_fin >= ? AND u.activo = 1 AND u.reminder_email = 1`,
      [today]
    );

    for (const row of rows) {
      const horario = fmtTime(row.hora);
      if (!horario) continue;

      const [hStr, mStr] = horario.split(':');
      const scheduleMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
      const advanceMinutes  = row.reminder_advance_min ?? 15;
      const targetMinutes   = scheduleMinutes - advanceMinutes;
      const diff = currentMinutes - targetMinutes;

      // Ventana de envío: entre 5 min antes y 10 min después del momento objetivo
      if (diff < -5 || diff >= 10) continue;

      const key = `${row.user_id}-${row.id}-${horario}-${today}`;

      // Verificar en BD si ya fue enviado (persiste entre reinicios)
      if (await wasAlreadySent(key)) continue;

      try {
        await sendMedicationReminder({
          to: row.email,
          nombre: row.user_nombre || 'Afiliado',
          medicamento: row.nombre,
          dosis: row.dosis,
          horario,
          instrucciones: row.instrucciones || '',
        });

        await markAsSent(key);
        logger.info(`[Reminder] Enviado a ${row.email}: ${row.nombre} ${horario}`);
      } catch (err) {
        logger.error(`[Reminder] Error enviando a ${row.email}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[Reminder] Error en checkAndSendReminders: ${err.message}`);
  }
};

// Limpia entradas antiguas (más de 2 días) para no acumular registros indefinidamente
const cleanupOldLogs = async () => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM reminder_sent_log WHERE sent_at < DATE_SUB(NOW(), INTERVAL 2 DAY)'
    );
    logger.info(`[Reminder] Limpieza completada: ${result.affectedRows} entradas eliminadas`);
  } catch (err) {
    logger.error(`[Reminder] Error en cleanupOldLogs: ${err.message}`);
  }
};

const startReminderScheduler = async () => {
  await initTable();
  // Verificar y enviar cada 15 minutos
  cron.schedule('*/15 * * * *', checkAndSendReminders);
  // Limpiar log de días anteriores a medianoche
  cron.schedule('0 0 * * *', cleanupOldLogs);
  logger.info('[Reminder] Scheduler iniciado con persistencia en BD');
};

module.exports = { startReminderScheduler };
