const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
const { sendAppointmentConfirmation } = require('../config/mailer');

const fmtDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d);
};
const fmtTime = (t) => {
  if (!t) return null;
  if (typeof t === 'string') return t.slice(0, 5);
  const h = String(t.hours ?? 0).padStart(2, '0');
  const m = String(t.minutes ?? 0).padStart(2, '0');
  return h + ':' + m;
};

router.use(auth);

const fmt = (a) => ({
  id: a.id,
  especialidad: a.especialidad_id,
  especialidadNombre: a.especialidad_nombre,
  medico: a.medico_nombre,
  medicoId: a.medico_id,
  sede: a.sede_nombre,
  sedeId: a.sede_id,
  fecha: fmtDate(a.fecha),
  hora: fmtTime(a.hora),
  estado: a.estado,
  reagendamientos: a.reagendamientos,
  notas: a.notas || '',
  ...(a.diagnostico && { diagnostico: a.diagnostico }),
  ...(a.motivo_cancelacion && { motivoCancelacion: a.motivo_cancelacion }),
});

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM appointments WHERE user_id = ? ORDER BY fecha DESC, hora DESC',
      [req.user.userId]
    );
    res.json(rows.map(fmt));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { especialidad, especialidadNombre, medico, medicoId, sede, sedeId, fecha, hora, notas } = req.body;
    const [[conflict]] = await pool.execute(
      "SELECT id FROM appointments WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'",
      [medicoId, fecha, hora]
    );
    if (conflict) return res.status(409).json({ error: 'Este horario ya no está disponible. Selecciona otro horario.' });
    const id = uuidv4();
    await pool.execute(
      "INSERT INTO appointments (id,user_id,especialidad_id,especialidad_nombre,medico_id,medico_nombre,sede_id,sede_nombre,fecha,hora,estado,reagendamientos,notas) VALUES (?,?,?,?,?,?,?,?,?,?,'confirmada',0,?)",
      [id, req.user.userId, especialidad, especialidadNombre, medicoId, medico, sedeId, sede, fecha, hora, notas || '']
    );
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [id]);
    const [[user]] = await pool.execute('SELECT email, nombre FROM users WHERE id = ?', [req.user.userId]);
    if (user) {
      sendAppointmentConfirmation({ to: user.email, nombre: user.nombre, appointment: fmt(apt) })
        .catch(e => console.error('[Mailer] Error confirmación cita:', e.message));
    }
    res.status(201).json(fmt(apt));
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (apt.estado === 'cancelada') return res.status(400).json({ error: 'La cita ya está cancelada' });
    const aptDT = new Date(fmtDate(apt.fecha) + 'T' + fmtTime(apt.hora) + ':00');
    const hoursUntil = (aptDT - new Date()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil < 24)
      return res.status(400).json({ error: 'No puedes cancelar con menos de 24 horas de anticipación. Contacta a tu sede.' });
    await pool.execute("UPDATE appointments SET estado = 'cancelada', motivo_cancelacion = ? WHERE id = ?", [req.body.motivo || '', req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/reschedule', async (req, res, next) => {
  try {
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    const { newDate, newTime } = req.body;
    if (!newDate || !newTime) return res.status(400).json({ error: 'newDate y newTime son requeridos' });
    if (apt.estado === 'cancelada' || apt.estado === 'completada')
      return res.status(400).json({ error: 'No puedes reagendar una cita cancelada o completada' });
    if ((apt.reagendamientos || 0) >= 2)
      return res.status(400).json({ error: 'Has alcanzado el límite de reagendamientos para esta cita' });
    if (new Date(newDate + 'T' + newTime + ':00') < new Date())
      return res.status(400).json({ error: 'No puedes reagendar a una fecha pasada' });
    const [[conflict]] = await pool.execute(
      "SELECT id FROM appointments WHERE id != ? AND medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'",
      [apt.id, apt.medico_id, newDate, newTime]
    );
    if (conflict) return res.status(409).json({ error: 'Este horario ya no está disponible. Selecciona otro horario.' });
    await pool.execute('UPDATE appointments SET fecha = ?, hora = ?, reagendamientos = reagendamientos + 1 WHERE id = ?', [newDate, newTime, req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
