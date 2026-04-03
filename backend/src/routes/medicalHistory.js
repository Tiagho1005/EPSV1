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

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM medical_history WHERE user_id = ? ORDER BY fecha DESC',
      [req.user.userId]
    );
    const result = await Promise.all(rows.map(async (h) => {
      const [recetas]  = await pool.execute('SELECT receta FROM medical_history_recetas WHERE history_id = ?', [h.id]);
      const [examenes] = await pool.execute('SELECT examen FROM medical_history_examenes WHERE history_id = ?', [h.id]);
      return {
        id: h.id,
        fecha: fmtDate(h.fecha),
        especialidad: h.especialidad,
        medico: h.medico,
        sede: h.sede,
        diagnostico: h.diagnostico,
        notas: h.notas,
        recetas:  recetas.map(r => r.receta),
        examenes: examenes.map(e => e.examen),
      };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
