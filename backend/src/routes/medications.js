const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
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

// Reconstruye el objeto medicamento con sus horarios
const buildMed = async (m) => {
  const [horarios] = await pool.execute('SELECT hora FROM medication_horarios WHERE medication_id = ? ORDER BY hora', [m.id]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endDate = new Date(fmtDate(m.fecha_fin) + 'T00:00:00');
  return {
    id: m.id,
    nombre: m.nombre,
    dosis: m.dosis,
    presentacion: m.presentacion,
    frecuencia: m.frecuencia,
    horarios: horarios.map(h => fmtTime(h.hora)),
    diasRestantes: Math.max(0, Math.ceil((endDate - today) / 86400000)),
    fechaInicio: fmtDate(m.fecha_inicio),
    fechaFin: fmtDate(m.fecha_fin),
    medico: m.medico,
    renovable: m.renovable === 1 || m.renovable === true,
    instrucciones: m.instrucciones || '',
  };
};

router.get('/', async (req, res, next) => {
  try {
    const [meds] = await pool.execute('SELECT * FROM medications WHERE user_id = ?', [req.user.userId]);
    const result = await Promise.all(meds.map(buildMed));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/taken', async (req, res, next) => {
  try {
    const [[med]] = await pool.execute('SELECT id FROM medications WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    await pool.execute(
      'INSERT INTO medication_taken_log (id,medication_id,user_id,horario,taken_at,fecha) VALUES (?,?,?,?,?,?)',
      [uuidv4(), req.params.id, req.user.userId, req.body.horario, now.toISOString().slice(0, 19).replace('T', ' '), today]
    );
    res.json({ success: true, timestamp: now.toISOString() });
  } catch (err) { next(err); }
});

router.get('/taken-today', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [logs] = await pool.execute(
      'SELECT medication_id, horario, taken_at FROM medication_taken_log WHERE user_id = ? AND fecha = ?',
      [req.user.userId, today]
    );
    const map = {};
    logs.forEach(l => { map[l.medication_id + '-' + fmtTime(l.horario)] = l.taken_at instanceof Date ? l.taken_at.toISOString() : l.taken_at; });
    res.json(map);
  } catch (err) { next(err); }
});

router.post('/:id/renewal', async (req, res, next) => {
  try {
    const [[med]] = await pool.execute('SELECT * FROM medications WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    if (!med.renovable) return res.status(400).json({ error: 'Este medicamento no es renovable' });
    const [[pending]] = await pool.execute(
      "SELECT id FROM renewal_requests WHERE medication_id = ? AND user_id = ? AND estado = 'pendiente'",
      [med.id, req.user.userId]
    );
    if (pending) return res.status(409).json({ error: 'Ya tienes una solicitud de renovación pendiente para este medicamento' });
    const id = uuidv4();
    // Buscar doctor por nombre para asociar medico_id (puede ser NULL si no se encuentra)
    const [[doctor]] = await pool.execute('SELECT id FROM doctors WHERE nombre = ?', [med.medico || '']);
    await pool.execute(
      "INSERT INTO renewal_requests (id,user_id,medication_id,medico_id,estado,created_at) VALUES (?,?,?,?,  'pendiente',NOW())",
      [id, req.user.userId, med.id, doctor ? doctor.id : null]
    );
    res.json({ success: true, renewalId: id, message: 'Solicitud de renovación enviada exitosamente' });
  } catch (err) { next(err); }
});

module.exports = router;
