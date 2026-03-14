const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
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
        return {
          id: m.id, nombre: m.nombre, dosis: m.dosis, presentacion: m.presentacion,
          frecuencia: m.frecuencia, horarios: m.horarios, diasRestantes,
          fechaInicio: m.fecha_inicio, fechaFin: m.fecha_fin,
          medico: m.medico, renovable: m.renovable, instrucciones: m.instrucciones,
        };
      });
    res.json(result);
  } catch (err) { next(err); }
});

// Registrar dosis tomada
router.post('/:id/taken', (req, res, next) => {
  try {
    const store = getStore();
    const med = store.medications.find(m => m.id === req.params.id && m.user_id === req.user.userId);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    const now = new Date();
    store.medication_taken_log.push({
      id: uuidv4(),
      medication_id: req.params.id,
      user_id: req.user.userId,
      horario: req.body.horario,
      taken_at: now.toISOString(),
      fecha: now.toISOString().split('T')[0],
    });
    save();
    res.json({ success: true, timestamp: now.toISOString() });
  } catch (err) { next(err); }
});

// Obtener dosis tomadas hoy (para sincronizar estado al cargar la página)
router.get('/taken-today', (req, res, next) => {
  try {
    const { medication_taken_log } = getStore();
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = medication_taken_log.filter(
      l => l.user_id === req.user.userId && l.fecha === today
    );
    // Devolver mapa { "medId-horario": timestamp }
    const map = {};
    todayLogs.forEach(l => {
      map[`${l.medication_id}-${l.horario}`] = l.taken_at;
    });
    res.json(map);
  } catch (err) { next(err); }
});

// Solicitar renovación de receta
router.post('/:id/renewal', (req, res, next) => {
  try {
    const store = getStore();
    const med = store.medications.find(m => m.id === req.params.id && m.user_id === req.user.userId);
    if (!med) return res.status(404).json({ error: 'Medicamento no encontrado' });
    if (!med.renovable) return res.status(400).json({ error: 'Este medicamento no es renovable' });

    // Crear registro de solicitud de renovación
    if (!store.renewal_requests) store.renewal_requests = [];

    // Evitar solicitudes duplicadas pendientes
    const pending = store.renewal_requests.find(
      r => r.medication_id === med.id && r.user_id === req.user.userId && r.estado === 'pendiente'
    );
    if (pending) {
      return res.status(409).json({ error: 'Ya tienes una solicitud de renovación pendiente para este medicamento' });
    }

    const request = {
      id: uuidv4(),
      medication_id: med.id,
      medication_nombre: med.nombre,
      medication_dosis: med.dosis,
      user_id: req.user.userId,
      medico: med.medico,
      estado: 'pendiente',
      created_at: new Date().toISOString(),
    };
    store.renewal_requests.push(request);
    save();

    res.json({ success: true, renewalId: request.id, message: 'Solicitud de renovación enviada exitosamente' });
  } catch (err) { next(err); }
});

module.exports = router;
