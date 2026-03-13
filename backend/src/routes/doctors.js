const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStore } = require('../config/db');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const { doctors } = getStore();
    const { especialidadId } = req.query;
    const result = especialidadId ? doctors.filter(d => d.especialidad_id === especialidadId) : doctors;
    res.json(result.map(d => ({ id: d.id, nombre: d.nombre, especialidad: d.especialidad_id, foto: d.foto, experiencia: d.experiencia, rating: d.rating, sedes: d.sedes, disponibilidad: d.disponibilidad })));
  } catch (err) { next(err); }
});

router.get('/:id/available-times', (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' });
    const { doctors } = getStore();
    const doctor = doctors.find(d => d.id === req.params.id);
    if (!doctor) return res.json([]);
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dia = dayNames[new Date(date + 'T00:00:00').getDay()];
    res.json(doctor.disponibilidad[dia] || []);
  } catch (err) { next(err); }
});

module.exports = router;
