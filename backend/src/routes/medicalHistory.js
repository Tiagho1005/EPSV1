const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStore } = require('../config/db');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const { medical_history } = getStore();
    const result = medical_history
      .filter(h => h.user_id === req.user.userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map(h => ({ id: h.id, fecha: h.fecha, especialidad: h.especialidad, medico: h.medico, sede: h.sede, diagnostico: h.diagnostico, notas: h.notas, recetas: h.recetas, examenes: h.examenes }));
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
