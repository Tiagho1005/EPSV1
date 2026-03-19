const cron = require('node-cron');
const { getStore } = require('../config/db');
const { sendMedicationReminder } = require('../config/mailer');
const logger = require('../config/logger');

// key: 'userId-medId-horario-fecha'  →  true
const sentReminders = new Map();

const checkAndSendReminders = async () => {
  try {
    const store = getStore();
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const activeMeds = (store.medications || []).filter(med => {
      return med.fecha_fin >= today;
    });

    const sendQueue = [];

    for (const med of activeMeds) {
      const horarios = Array.isArray(med.horarios) ? med.horarios : [];

      for (const horario of horarios) {
        // Parse horario 'HH:MM'
        const [hStr, mStr] = horario.split(':');
        if (!hStr || !mStr) continue;
        const scheduleMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

        const key = `${med.usuario_id}-${med.id}-${horario}-${today}`;
        if (sentReminders.has(key)) continue;

        const user = (store.users || []).find(u => u.id === med.usuario_id);
        if (!user || !user.email || !user.activo) continue;
        if (!user.reminder_preferences?.email_enabled) continue;

        const advanceMinutes = user.reminder_preferences?.advance_minutes ?? 15;
        // Fire when current time is within [-5, +10) minutes of (schedule - advance)
        const targetMinutes = scheduleMinutes - advanceMinutes;
        const diff = currentMinutes - targetMinutes;
        if (diff < -5 || diff >= 10) continue;

        sendQueue.push({ user, med, horario, key });
      }
    }

    for (const { user, med, horario, key } of sendQueue) {
      try {
        await sendMedicationReminder({
          to: user.email,
          nombre: user.nombre || user.nombreCompleto || 'Afiliado',
          medicamento: med.nombre,
          dosis: med.dosis,
          horario,
          instrucciones: med.instrucciones || '',
        });
        sentReminders.set(key, true);
        logger.info(`[Reminder] Enviado a ${user.email}: ${med.nombre} ${horario}`);
      } catch (err) {
        logger.error(`[Reminder] Error enviando a ${user.email}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[Reminder] Error en checkAndSendReminders: ${err.message}`);
  }
};

const startReminderScheduler = () => {
  // Revisar cada 15 minutos
  cron.schedule('*/15 * * * *', checkAndSendReminders);

  // Limpiar duplicados a medianoche
  cron.schedule('0 0 * * *', () => {
    sentReminders.clear();
    logger.info('[Reminder] Mapa de recordatorios limpiado');
  });
};

module.exports = { startReminderScheduler };
