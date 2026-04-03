const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');

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

const buildDoctor = async (d) => {
  const [sedesRows] = await pool.execute('SELECT sede_id FROM doctor_sedes WHERE doctor_id = ?', [d.id]);
  const [dispRows]  = await pool.execute('SELECT dia, hora FROM doctor_disponibilidad WHERE doctor_id = ? ORDER BY dia, hora', [d.id]);
  const disponibilidad = {};
  dispRows.forEach(r => {
    if (!disponibilidad[r.dia]) disponibilidad[r.dia] = [];
    disponibilidad[r.dia].push(fmtTime(r.hora));
  });
  return { id: d.id, nombre: d.nombre, especialidad: d.especialidad_id, foto: d.foto, experiencia: d.experiencia, rating: parseFloat(d.rating), sedes: sedesRows.map(s => s.sede_id), disponibilidad };
};

router.get('/', async (req, res, next) => {
  try {
    const { especialidadId } = req.query;
    const [rows] = especialidadId
      ? await pool.execute('SELECT * FROM doctors WHERE especialidad_id = ?', [especialidadId])
      : await pool.execute('SELECT * FROM doctors');
    const result = await Promise.all(rows.map(buildDoctor));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id/available-times', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' });
    const [[doctor]] = await pool.execute('SELECT id FROM doctors WHERE id = ?', [req.params.id]);
    if (!doctor) return res.json([]);
    const dayNames = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const dia = dayNames[new Date(date + 'T00:00:00').getDay()];
    const [dispRows] = await pool.execute('SELECT hora FROM doctor_disponibilidad WHERE doctor_id = ? AND dia = ?', [req.params.id, dia]);
    const [bookedRows] = await pool.execute(
      "SELECT hora FROM appointments WHERE medico_id = ? AND fecha = ? AND estado != 'cancelada'",
      [req.params.id, date]
    );
    const booked = new Set(bookedRows.map(r => fmtTime(r.hora)));
    res.json(dispRows.map(r => fmtTime(r.hora)).filter(t => !booked.has(t)));
  } catch (err) { next(err); }
});

module.exports = router;
