const router = require('express').Router();
const { getStore, save } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);
router.use(requireRole('medico'));

// GET /medico/dashboard
router.get('/dashboard', (req, res, next) => {
  try {
    const store = getStore();
    const medicoId = req.user.medicoId;
    const today = new Date().toISOString().split('T')[0];

    const myApts = store.appointments.filter(a => a.medico_id === medicoId);
    const todayApts = myApts.filter(a => a.fecha === today && a.estado !== 'cancelada');
    const completedToday = todayApts.filter(a => a.estado === 'completada').length;
    const pendingToday = todayApts.filter(a => a.estado !== 'completada').length;

    const doctor = store.doctors.find(d => d.id === medicoId);
    const doctorName = doctor?.nombre || '';
    const myMedIds = store.medications.filter(m => m.medico === doctorName).map(m => m.id);
    const pendingRenewals = store.renewal_requests.filter(r =>
      myMedIds.includes(r.medication_id) && r.estado === 'pendiente'
    ).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentPatients = [...new Set(
      myApts.filter(a => new Date(a.fecha) >= weekAgo && a.estado !== 'cancelada').map(a => a.user_id)
    )].length;

    // Upcoming: next 7 days, not cancelled
    const upcoming = myApts
      .filter(a => a.fecha >= today && a.estado !== 'cancelada')
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
      .slice(0, 8)
      .map(apt => {
        const patient = store.users.find(u => u.id === apt.user_id);
        return {
          ...apt,
          paciente: patient
            ? { nombreCompleto: patient.nombreCompleto || `${patient.nombre || ''} ${patient.apellido || ''}`.trim(), cedula: patient.cedula }
            : { nombreCompleto: 'Paciente desconocido', cedula: '' },
        };
      });

    res.json({ todayTotal: todayApts.length, completedToday, pendingToday, pendingRenewals, recentPatients, upcoming });
  } catch (err) { next(err); }
});

// GET /medico/appointments
router.get('/appointments', (req, res, next) => {
  try {
    const { date, status } = req.query;
    const store = getStore();
    const medicoId = req.user.medicoId;

    let apts = store.appointments.filter(a => a.medico_id === medicoId);
    if (date) apts = apts.filter(a => a.fecha === date);
    if (status) apts = apts.filter(a => a.estado === status);

    const enriched = apts.map(apt => {
      const patient = store.users.find(u => u.id === apt.user_id);
      return {
        ...apt,
        paciente: patient
          ? {
              id: patient.id,
              nombreCompleto: patient.nombreCompleto || `${patient.nombre || ''} ${patient.apellido || ''}`.trim(),
              cedula: patient.cedula,
              email: patient.email,
              celular: patient.celular,
              fechaNacimiento: patient.fecha_nacimiento,
            }
          : { id: apt.user_id, nombreCompleto: 'Paciente desconocido', cedula: '' },
      };
    });

    enriched.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.hora.localeCompare(b.hora));
    res.json(enriched);
  } catch (err) { next(err); }
});

// PATCH /medico/appointments/:id/complete
router.patch('/appointments/:id/complete', (req, res, next) => {
  try {
    const { diagnostico, notas } = req.body;
    if (!diagnostico || !diagnostico.trim()) return res.status(400).json({ error: 'El diagnóstico es requerido' });
    const store = getStore();
    const apt = store.appointments.find(a => a.id === req.params.id && a.medico_id === req.user.medicoId);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (apt.estado === 'cancelada') return res.status(400).json({ error: 'No se puede completar una cita cancelada' });
    if (apt.estado === 'completada') return res.status(400).json({ error: 'La cita ya fue completada' });

    apt.estado = 'completada';
    apt.diagnostico = diagnostico.trim();
    apt.notas = notas ? notas.trim() : '';

    if (!store.medical_history) store.medical_history = [];
    const doctor = store.doctors.find(d => d.id === req.user.medicoId);
    store.medical_history.push({
      id: uuidv4(),
      user_id: apt.user_id,
      fecha: apt.fecha,
      especialidad: apt.especialidad_nombre,
      medico: doctor?.nombre || apt.medico,
      sede: apt.sede,
      diagnostico: diagnostico.trim(),
      notas: notas ? notas.trim() : '',
      recetas: [],
      examenes: [],
    });

    save();
    res.json({ success: true, appointment: apt });
  } catch (err) { next(err); }
});

// GET /medico/patients/:userId
router.get('/patients/:userId', (req, res, next) => {
  try {
    const store = getStore();
    const { userId } = req.params;
    const patient = store.users.find(u => u.id === userId);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    const hasApt = store.appointments.some(a => a.user_id === userId && a.medico_id === req.user.medicoId);
    if (!hasApt) return res.status(403).json({ error: 'No tienes acceso a este paciente' });

    const history = (store.medical_history || [])
      .filter(h => h.user_id === userId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const medications = store.medications.filter(m => m.user_id === userId);
    const appointments = store.appointments
      .filter(a => a.user_id === userId && a.medico_id === req.user.medicoId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    res.json({
      paciente: {
        id: patient.id,
        nombreCompleto: patient.nombreCompleto || `${patient.nombre || ''} ${patient.apellido || ''}`.trim(),
        cedula: patient.cedula,
        email: patient.email,
        celular: patient.celular,
        fechaNacimiento: patient.fecha_nacimiento,
        departamento: patient.departamento,
        municipio: patient.municipio,
      },
      historialMedico: history,
      medicamentos: medications,
      citas: appointments,
    });
  } catch (err) { next(err); }
});

// GET /medico/renewals
router.get('/renewals', (req, res, next) => {
  try {
    const store = getStore();
    const doctor = store.doctors.find(d => d.id === req.user.medicoId);
    const doctorName = doctor?.nombre || '';
    const myMedIds = store.medications.filter(m => m.medico === doctorName).map(m => m.id);

    const requests = store.renewal_requests
      .filter(r => myMedIds.includes(r.medication_id))
      .map(r => {
        const med = store.medications.find(m => m.id === r.medication_id);
        const patient = store.users.find(u => u.id === r.user_id);
        return {
          ...r,
          medicamento: med ? { nombre: med.nombre, dosis: med.dosis, frecuencia: med.frecuencia } : null,
          paciente: patient
            ? { nombreCompleto: patient.nombreCompleto || `${patient.nombre || ''} ${patient.apellido || ''}`.trim(), cedula: patient.cedula }
            : { nombreCompleto: 'Desconocido', cedula: '' },
        };
      })
      .sort((a, b) => b.fecha_solicitud.localeCompare(a.fecha_solicitud));

    res.json(requests);
  } catch (err) { next(err); }
});

// PATCH /medico/renewals/:id
router.patch('/renewals/:id', (req, res, next) => {
  try {
    const { action, nota } = req.body;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });
    const store = getStore();
    const renewal = store.renewal_requests.find(r => r.id === req.params.id);
    if (!renewal) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (renewal.estado !== 'pendiente') return res.status(400).json({ error: 'Esta solicitud ya fue procesada' });

    const doctor = store.doctors.find(d => d.id === req.user.medicoId);
    const med = store.medications.find(m => m.id === renewal.medication_id);
    if (!med || med.medico !== doctor?.nombre) return res.status(403).json({ error: 'No tienes permiso para gestionar esta solicitud' });

    renewal.estado = action === 'approve' ? 'aprobada' : 'rechazada';
    renewal.nota_medico = nota ? nota.trim() : '';
    renewal.fecha_respuesta = new Date().toISOString();

    if (action === 'approve') {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 30);
      med.fecha_fin = newEnd.toISOString().split('T')[0];
    }

    save();
    res.json({ success: true, renewal });
  } catch (err) { next(err); }
});

module.exports = router;
