const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStore, save } = require('../config/db');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const { medications } = getStore();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const result = medications
      .filter(m => m.user_id === req.user.userId)
      .map(m => {
        const endDate = new Date(m.fecha_fin + 'T00:00:00');
        const diasRestantes = Math.max(0, Math.ceil((endDate - today) / 86400000));
        return { id: m.id, nombre: m.nombre, dosis: m.dosis, presentacion: m.presentacion, frecuencia: m.frecuencia, horarios: m.horarios, diasRestantes, fechaInicio: m.fecha_inicio, fechaFin: m.fecha_fin, medico: m.medico, renovable: m.renovable, instrucciones: m.instrucciones };
      });
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/taken', (req, res, next) => {
  try {
    const store = getStore();
    const med = store.medications.find(m => m.id === req.params.id && m.user_id === req.user.userId);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    const now = new Date();
    store.medication_taken_log.push({ id: Date.now().toString(), medication_id: req.params.id, user_id: req.user.userId, horario: req.body.horario, taken_at: now.toISOString(), fecha: now.toISOString().split('T')[0] });
    save();
    res.json({ success: true, timestamp: now.toISOString() });
  } catch (err) { next(err); }
});

router.post('/:id/renewal', (req, res, next) => {
  try {
    const store = getStore();
    const med = store.medications.find(m => m.id === req.params.id && m.user_id === req.user.userId);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json({ success: true, message: 'Solicitud de renovacion enviada exitosamente' });
  } catch (err) { next(err); }
});

module.exports = router;
