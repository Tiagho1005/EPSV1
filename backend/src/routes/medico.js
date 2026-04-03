const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendConsultaCompletada, sendRenewalResult } = require('../config/mailer');

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
router.use(requireRole('medico'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const medicoId = req.user.medicoId;
    const today = new Date().toISOString().split('T')[0];

    // Citas de hoy
    const [todayApts] = await pool.execute(
      "SELECT * FROM appointments WHERE medico_id = ? AND fecha = ? AND estado != 'cancelada'",
      [medicoId, today]
    );
    const completedToday = todayApts.filter(a => a.estado === 'completada').length;
    const pendingToday   = todayApts.filter(a => a.estado !== 'completada').length;

    // Renovaciones pendientes (medicamentos recetados por este médico)
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [medicoId]);
    const doctorName = doctor?.nombre || '';
    const [[renCount]] = await pool.execute(
      "SELECT COUNT(*) as cnt FROM renewal_requests rr JOIN medications m ON rr.medication_id = m.id WHERE m.medico = ? AND rr.estado = 'pendiente'",
      [doctorName]
    );
    const pendingRenewals = renCount.cnt;

    // Pacientes atendidos en los últimos 7 días
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const [[rpCount]] = await pool.execute(
      "SELECT COUNT(DISTINCT user_id) as cnt FROM appointments WHERE medico_id = ? AND fecha >= ? AND estado != 'cancelada'",
      [medicoId, weekAgoStr]
    );
    const recentPatients = rpCount.cnt;

    // Próximas 8 citas (hoy en adelante, no canceladas)
    const [upcoming] = await pool.execute(
      "SELECT a.*, CONCAT(u.nombre,' ',u.apellido) AS pac_nombre, u.cedula AS pac_cedula FROM appointments a JOIN users u ON a.user_id = u.id WHERE a.medico_id = ? AND a.fecha >= ? AND a.estado != 'cancelada' ORDER BY a.fecha ASC, a.hora ASC LIMIT 8",
      [medicoId, today]
    );

    res.json({
      todayTotal:     todayApts.length,
      completedToday,
      pendingToday,
      pendingRenewals,
      recentPatients,
      upcoming: upcoming.map(a => ({
        ...a,
        fecha: fmtDate(a.fecha), hora: fmtTime(a.hora),
        paciente: { nombreCompleto: a.pac_nombre, cedula: a.pac_cedula },
      })),
    });
  } catch (err) { next(err); }
});

router.get('/appointments', async (req, res, next) => {
  try {
    const { date, status } = req.query;
    let sql = "SELECT a.*, CONCAT(u.nombre,' ',u.apellido) AS pac_nombre, u.cedula AS pac_cedula, u.id AS pac_id, u.email AS pac_email, u.celular AS pac_celular, u.fecha_nacimiento AS pac_fn FROM appointments a JOIN users u ON a.user_id = u.id WHERE a.medico_id = ?";
    const params = [req.user.medicoId];
    if (date)   { sql += ' AND a.fecha = ?';    params.push(date); }
    if (status) { sql += ' AND a.estado = ?';   params.push(status); }
    sql += ' ORDER BY a.fecha DESC, a.hora ASC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(a => ({
      ...a, fecha: fmtDate(a.fecha), hora: fmtTime(a.hora),
      paciente: { id: a.pac_id, nombreCompleto: a.pac_nombre, cedula: a.pac_cedula, email: a.pac_email, celular: a.pac_celular, fechaNacimiento: fmtDate(a.pac_fn) },
    })));
  } catch (err) { next(err); }
});

router.patch('/appointments/:id/complete', async (req, res, next) => {
  try {
    const { diagnostico, notas, recetas, examenes } = req.body;
    if (!diagnostico || !diagnostico.trim()) return res.status(400).json({ error: 'El diagnóstico es requerido' });
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND medico_id = ?', [req.params.id, req.user.medicoId]);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (apt.estado === 'cancelada')  return res.status(400).json({ error: 'No se puede completar una cita cancelada' });
    if (apt.estado === 'completada') return res.status(400).json({ error: 'La cita ya fue completada' });

    await pool.execute(
      "UPDATE appointments SET estado = 'completada', diagnostico = ?, notas = ? WHERE id = ?",
      [diagnostico.trim(), notas ? notas.trim() : '', req.params.id]
    );

    // Insertar en historial médico
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [req.user.medicoId]);
    const histId = uuidv4();
    await pool.execute(
      'INSERT INTO medical_history (id,user_id,fecha,especialidad,medico,sede,diagnostico,notas) VALUES (?,?,?,?,?,?,?,?)',
      [histId, apt.user_id, fmtDate(apt.fecha), apt.especialidad_nombre, doctor?.nombre || apt.medico_nombre, apt.sede_nombre, diagnostico.trim(), notas ? notas.trim() : '']
    );
    if (Array.isArray(recetas) && recetas.length) {
      for (const r of recetas) await pool.execute('INSERT INTO medical_history_recetas (history_id,receta) VALUES (?,?)', [histId, r]);
    }
    if (Array.isArray(examenes) && examenes.length) {
      for (const e of examenes) await pool.execute('INSERT INTO medical_history_examenes (history_id,examen) VALUES (?,?)', [histId, e]);
    }

    const [[patient]] = await pool.execute('SELECT email, nombre FROM users WHERE id = ?', [apt.user_id]);
    if (patient?.email) {
      sendConsultaCompletada({
        to: patient.email, nombre: patient.nombre || 'Paciente',
        appointment: { especialidad: apt.especialidad_nombre, medico: doctor?.nombre || apt.medico_nombre, fecha: fmtDate(apt.fecha), diagnostico: diagnostico.trim() },
      }).catch(e => console.error('[Mailer] Error consulta completada:', e.message));
    }
    const [[updated]] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true, appointment: { ...updated, fecha: fmtDate(updated.fecha), hora: fmtTime(updated.hora) } });
  } catch (err) { next(err); }
});

router.get('/patients/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const [[patient]] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    const [[hasApt]] = await pool.execute('SELECT id FROM appointments WHERE user_id = ? AND medico_id = ?', [userId, req.user.medicoId]);
    if (!hasApt) return res.status(403).json({ error: 'No tienes acceso a este paciente' });

    const [histRows] = await pool.execute('SELECT * FROM medical_history WHERE user_id = ? ORDER BY fecha DESC', [userId]);
    const historial = await Promise.all(histRows.map(async h => {
      const [rec] = await pool.execute('SELECT receta FROM medical_history_recetas WHERE history_id = ?', [h.id]);
      const [exa] = await pool.execute('SELECT examen FROM medical_history_examenes WHERE history_id = ?', [h.id]);
      return { ...h, fecha: fmtDate(h.fecha), recetas: rec.map(r => r.receta), examenes: exa.map(e => e.examen) };
    }));
    const [medications] = await pool.execute('SELECT * FROM medications WHERE user_id = ?', [userId]);
    const [apts] = await pool.execute('SELECT * FROM appointments WHERE user_id = ? AND medico_id = ? ORDER BY fecha DESC', [userId, req.user.medicoId]);

    res.json({
      paciente: { id: patient.id, nombreCompleto: (patient.nombre + ' ' + patient.apellido).trim(), cedula: patient.cedula, email: patient.email, celular: patient.celular, fechaNacimiento: fmtDate(patient.fecha_nacimiento), departamento: patient.departamento, municipio: patient.municipio },
      historialMedico: historial,
      medicamentos: medications.map(m => ({ ...m, fecha_inicio: fmtDate(m.fecha_inicio), fecha_fin: fmtDate(m.fecha_fin) })),
      citas: apts.map(a => ({ ...a, fecha: fmtDate(a.fecha), hora: fmtTime(a.hora) })),
    });
  } catch (err) { next(err); }
});

router.post('/prescriptions', async (req, res, next) => {
  try {
    const { userId, nombre, dosis, presentacion, frecuencia, horarios, duracionDias, instrucciones, renovable } = req.body;
    const [[patient]] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    const [[hasApt]] = await pool.execute('SELECT id FROM appointments WHERE user_id = ? AND medico_id = ?', [userId, req.user.medicoId]);
    if (!hasApt) return res.status(403).json({ error: 'No tienes acceso a este paciente' });
    if (!nombre || !dosis || !frecuencia) return res.status(400).json({ error: 'nombre, dosis y frecuencia son requeridos' });
    if (!Array.isArray(horarios) || horarios.length === 0) return res.status(400).json({ error: 'horarios debe ser un array no vacío' });
    if (!duracionDias || typeof duracionDias !== 'number' || duracionDias <= 0) return res.status(400).json({ error: 'duracionDias debe ser un número positivo' });
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [req.user.medicoId]);
    const today = new Date();
    const fechaInicio = today.toISOString().split('T')[0];
    const fechaFin = new Date(today); fechaFin.setDate(fechaFin.getDate() + duracionDias);
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO medications (id,user_id,nombre,dosis,presentacion,frecuencia,fecha_inicio,fecha_fin,medico,renovable,instrucciones) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, userId, nombre, dosis, presentacion || 'Tableta', frecuencia, fechaInicio, fechaFin.toISOString().split('T')[0], doctor?.nombre || '', renovable ? 1 : 0, instrucciones || '']
    );
    for (const h of horarios) await pool.execute('INSERT INTO medication_horarios (medication_id,hora) VALUES (?,?)', [id, h]);
    const [[med]] = await pool.execute('SELECT * FROM medications WHERE id = ?', [id]);
    res.status(201).json({ ...med, fecha_inicio: fmtDate(med.fecha_inicio), fecha_fin: fmtDate(med.fecha_fin) });
  } catch (err) { next(err); }
});

router.get('/renewals', async (req, res, next) => {
  try {
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [req.user.medicoId]);
    const doctorName = doctor?.nombre || '';
    const [rows] = await pool.execute(
      "SELECT rr.*, m.nombre AS med_nombre, m.dosis AS med_dosis, m.frecuencia AS med_frecuencia, CONCAT(u.nombre,' ',u.apellido) AS pac_nombre, u.cedula AS pac_cedula FROM renewal_requests rr JOIN medications m ON rr.medication_id = m.id JOIN users u ON rr.user_id = u.id WHERE m.medico = ? ORDER BY rr.created_at DESC",
      [doctorName]
    );
    res.json(rows.map(r => ({
      ...r,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      fecha_respuesta: r.fecha_respuesta instanceof Date ? r.fecha_respuesta.toISOString() : r.fecha_respuesta,
      medicamento: { nombre: r.med_nombre, dosis: r.med_dosis, frecuencia: r.med_frecuencia },
      paciente: { nombreCompleto: r.pac_nombre, cedula: r.pac_cedula },
    })));
  } catch (err) { next(err); }
});

router.patch('/renewals/:id', async (req, res, next) => {
  try {
    const { action, nota } = req.body;
    if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });
    const [[renewal]] = await pool.execute('SELECT * FROM renewal_requests WHERE id = ?', [req.params.id]);
    if (!renewal) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (renewal.estado !== 'pendiente') return res.status(400).json({ error: 'Esta solicitud ya fue procesada' });
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [req.user.medicoId]);
    const [[med]] = await pool.execute('SELECT * FROM medications WHERE id = ?', [renewal.medication_id]);
    if (!med || med.medico !== doctor?.nombre) return res.status(403).json({ error: 'No tienes permiso para gestionar esta solicitud' });
    const estado = action === 'approve' ? 'aprobada' : 'rechazada';
    await pool.execute('UPDATE renewal_requests SET estado = ?, nota_medico = ?, fecha_respuesta = NOW() WHERE id = ?', [estado, nota ? nota.trim() : '', req.params.id]);
    if (action === 'approve') {
      const currentEnd = new Date(fmtDate(med.fecha_fin) + 'T00:00:00');
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
      const base = currentEnd > todayD ? currentEnd : todayD;
      base.setDate(base.getDate() + 30);
      await pool.execute('UPDATE medications SET fecha_fin = ? WHERE id = ?', [base.toISOString().split('T')[0], med.id]);
    }
    const [[patient]] = await pool.execute('SELECT email, nombre FROM users WHERE id = ?', [renewal.user_id]);
    if (patient?.email) {
      sendRenewalResult({
        to: patient.email, nombre: patient.nombre || 'Paciente',
        medicamento: med.nombre, aprobada: action === 'approve', notaMedico: nota ? nota.trim() : '',
      }).catch(e => console.error('[Mailer] Error email renovación:', e.message));
    }
    const [[updated]] = await pool.execute('SELECT * FROM renewal_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, renewal: { ...updated, created_at: updated.created_at instanceof Date ? updated.created_at.toISOString() : updated.created_at } });
  } catch (err) { next(err); }
});

module.exports = router;
