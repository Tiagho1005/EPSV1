const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { getStore, save } = require('../config/db');
const { sendAppointmentConfirmation } = require('../config/mailer');

router.use(auth);

const fmt = (a) => ({
  id: a.id, especialidad: a.especialidad_id, especialidadNombre: a.especialidad_nombre,
  medico: a.medico, medicoId: a.medico_id, sede: a.sede, sedeId: a.sede_id,
  fecha: a.fecha, hora: a.hora, estado: a.estado, reagendamientos: a.reagendamientos,
  notas: a.notas || '',
  ...(a.diagnostico && { diagnostico: a.diagnostico }),
  ...(a.motivo_cancelacion && { motivoCancelacion: a.motivo_cancelacion }),
});

router.get('/', (req, res, next) => {
  try {
    const { appointments } = getStore();
    const result = appointments
      .filter(a => a.user_id === req.user.userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));
    res.json(result.map(fmt));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const store = getStore();
    const { especialidad, especialidadNombre, medico, medicoId, sede, sedeId, fecha, hora, notas } = req.body;

    // Validación de doble reserva: mismo médico, fecha, hora y no cancelada
    const conflict = store.appointments.find(a =>
      a.medico_id === medicoId &&
      a.fecha === fecha &&
      a.hora === hora &&
      a.estado !== 'cancelada'
    );
    if (conflict) {
      return res.status(409).json({ error: 'Este horario ya no está disponible. Selecciona otro horario.' });
    }

    const apt = {
      id: uuidv4(), user_id: req.user.userId,
      especialidad_id: especialidad, especialidad_nombre: especialidadNombre,
      medico, medico_id: medicoId, sede, sede_id: sedeId,
      fecha, hora, estado: 'confirmada', reagendamientos: 0,
      notas: notas || '', diagnostico: null, motivo_cancelacion: null,
    };
    store.appointments.push(apt);
    save();

    // Enviar email de confirmación (no bloquear la respuesta si falla)
    const user = store.users.find(u => u.id === req.user.userId);
    if (user) {
      sendAppointmentConfirmation({ to: user.email, nombre: user.nombre, appointment: fmt(apt) })
        .catch(err => console.error('[Mailer] Error al enviar confirmación de cita:', err.message));
    }

    res.status(201).json(fmt(apt));
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', (req, res, next) => {
  try {
    const store = getStore();
    const apt = store.appointments.find(a => a.id === req.params.id && a.user_id === req.user.userId);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (apt.estado === 'cancelada') return res.status(400).json({ error: 'La cita ya está cancelada' });

    // Validar ventana de cancelación de 24 horas
    const appointmentDateTime = new Date(`${apt.fecha}T${apt.hora}:00`);
    const hoursUntil = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil < 24) {
      return res.status(400).json({ error: 'No puedes cancelar con menos de 24 horas de anticipación. Contacta a tu sede.' });
    }

    apt.estado = 'cancelada';
    apt.motivo_cancelacion = req.body.motivo || '';
    save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/reschedule', (req, res, next) => {
  try {
    const store = getStore();
    const apt = store.appointments.find(a => a.id === req.params.id && a.user_id === req.user.userId);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    apt.fecha = req.body.newDate;
    apt.hora = req.body.newTime;
    apt.reagendamientos = (apt.reagendamientos || 0) + 1;
    save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
