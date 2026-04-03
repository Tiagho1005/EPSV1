/**
 * Genera reminderScheduler.js migrado a MySQL.
 */
const fs = require('fs');
const path = require('path');

const content = `const cron = require('node-cron');
const { pool } = require('../config/mysql');
const { sendMedicationReminder } = require('../config/mailer');
const logger = require('../config/logger');

const sentReminders = new Map();

const fmtTime = (t) => {
  if (!t) return null;
  if (typeof t === 'string') return t.slice(0, 5);
  const h = String(t.hours ?? 0).padStart(2, '0');
  const m = String(t.minutes ?? 0).padStart(2, '0');
  return h + ':' + m;
};

const fmtDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d);
};

const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Medicamentos activos con sus horarios y datos del usuario
    const [rows] = await pool.execute(
      \`SELECT m.id, m.nombre, m.dosis, m.instrucciones, m.user_id,
              mh.hora,
              u.email, u.nombre AS user_nombre, u.activo,
              u.reminder_email, u.reminder_advance_min
       FROM medications m
       JOIN medication_horarios mh ON mh.medication_id = m.id
       JOIN users u ON u.id = m.user_id
       WHERE m.fecha_fin >= ? AND u.activo = 1 AND u.reminder_email = 1\`,
      [today]
    );

    const sendQueue = [];

    for (const row of rows) {
      const horario = fmtTime(row.hora);
      if (!horario) continue;
      const [hStr, mStr] = horario.split(':');
      const scheduleMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
      const advanceMinutes  = row.reminder_advance_min ?? 15;
      const targetMinutes   = scheduleMinutes - advanceMinutes;
      const diff = currentMinutes - targetMinutes;
      if (diff < -5 || diff >= 10) continue;

      const key = \`\${row.user_id}-\${row.id}-\${horario}-\${today}\`;
      if (sentReminders.has(key)) continue;

      sendQueue.push({ row, horario, key });
    }

    for (const { row, horario, key } of sendQueue) {
      try {
        await sendMedicationReminder({
          to: row.email,
          nombre: row.user_nombre || 'Afiliado',
          medicamento: row.nombre,
          dosis: row.dosis,
          horario,
          instrucciones: row.instrucciones || '',
        });
        sentReminders.set(key, true);
        logger.info(\`[Reminder] Enviado a \${row.email}: \${row.nombre} \${horario}\`);
      } catch (err) {
        logger.error(\`[Reminder] Error enviando a \${row.email}: \${err.message}\`);
      }
    }
  } catch (err) {
    logger.error(\`[Reminder] Error en checkAndSendReminders: \${err.message}\`);
  }
};

const startReminderScheduler = () => {
  cron.schedule('*/15 * * * *', checkAndSendReminders);
  cron.schedule('0 0 * * *', () => {
    sentReminders.clear();
    logger.info('[Reminder] Mapa de recordatorios limpiado');
  });
};

module.exports = { startReminderScheduler };
`;

fs.writeFileSync(
  path.join(__dirname, '../src/services/reminderScheduler.js'),
  content, 'utf8'
);
console.log('✓ reminderScheduler.js');
