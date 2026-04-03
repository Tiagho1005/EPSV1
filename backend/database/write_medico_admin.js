/**
 * Genera medico.js y admin.js migrados a MySQL.
 * Ejecutar: node backend/database/write_medico_admin.js
 */
const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, '../src/routes');

const HELPERS = `
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
`;

// ─── medico.js ────────────────────────────────────────────────────────────────
const medico = `const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendConsultaCompletada, sendRenewalResult } = require('../config/mailer');
${HELPERS}
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
`;

// ─── admin.js ─────────────────────────────────────────────────────────────────
const admin = `const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
${HELPERS}
router.use(auth);
router.use(requireRole('admin'));

const safeUser = (u) => {
  const { password_hash, reset_code, reset_code_expires, password_history, ...safe } = u;
  return { ...safe, fecha_nacimiento: fmtDate(safe.fecha_nacimiento), fecha_registro: fmtDate(safe.fecha_registro), activo: safe.activo === 1 || safe.activo === true };
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyStr = thirtyAgo.toISOString().split('T')[0];

    const [[totUsers]]    = await pool.execute("SELECT COUNT(*) as c FROM users WHERE role='paciente'");
    const [[totMedicos]]  = await pool.execute("SELECT COUNT(*) as c FROM users WHERE role='medico'");
    const [[totCitas]]    = await pool.execute('SELECT COUNT(*) as c FROM appointments');
    const [[citasHoy]]    = await pool.execute("SELECT COUNT(*) as c FROM appointments WHERE fecha=? AND estado!='cancelada'", [today]);
    const [[completadas]] = await pool.execute("SELECT COUNT(*) as c FROM appointments WHERE estado='completada'");
    const [[canceladas]]  = await pool.execute("SELECT COUNT(*) as c FROM appointments WHERE estado='cancelada'");
    const [[totMeds]]     = await pool.execute('SELECT COUNT(*) as c FROM medications');
    const [[pendRen]]     = await pool.execute("SELECT COUNT(*) as c FROM renewal_requests WHERE estado='pendiente'");
    const [[pendAut]]     = await pool.execute("SELECT COUNT(*) as c FROM authorizations WHERE estado='pendiente'");
    const [[totSedes]]    = await pool.execute('SELECT COUNT(*) as c FROM locations');
    const [[totSpecs]]    = await pool.execute('SELECT COUNT(*) as c FROM specialties');
    const [[reg30]]       = await pool.execute("SELECT COUNT(*) as c FROM users WHERE role='paciente' AND fecha_registro >= ?", [thirtyStr]);

    // Citas por especialidad (top 5)
    const [byEsp] = await pool.execute(
      'SELECT especialidad_nombre AS especialidad, COUNT(*) AS total FROM appointments GROUP BY especialidad_nombre ORDER BY total DESC LIMIT 5'
    );

    // Citas por mes (últimos 6 meses)
    const meses = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      meses[d.toISOString().slice(0, 7)] = 0;
    }
    const [byMes] = await pool.execute(
      "SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes, COUNT(*) AS total FROM appointments WHERE fecha >= ? GROUP BY mes",
      [Object.keys(meses)[0] + '-01']
    );
    byMes.forEach(r => { if (r.mes in meses) meses[r.mes] = r.total; });

    res.json({
      totalUsuarios: totUsers.c, totalMedicos: totMedicos.c, totalCitas: totCitas.c,
      citasHoy: citasHoy.c, citasCompletadas: completadas.c, citasCanceladas: canceladas.c,
      totalMedicamentos: totMeds.c, renovacionesPendientes: pendRen.c, autorizacionesPendientes: pendAut.c,
      totalSedes: totSedes.c, totalEspecialidades: totSpecs.c, registrosUltimos30Dias: reg30.c,
      citasPorEspecialidad: byEsp,
      citasPorMes: Object.entries(meses).map(([mes, total]) => ({ mes, total })),
    });
  } catch (err) { next(err); }
});

// ── USUARIOS ──────────────────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { role, search, activo } = req.query;
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    if (role)   { sql += ' AND role = ?';   params.push(role); }
    if (activo !== undefined) { sql += ' AND activo = ?'; params.push(activo === 'true' ? 1 : 0); }
    if (search) {
      sql += ' AND (nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ? OR email LIKE ?)';
      const q = '%' + search + '%';
      params.push(q, q, q, q);
    }
    sql += ' ORDER BY fecha_registro DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(safeUser));
  } catch (err) { next(err); }
});

router.patch('/users/:id/toggle-active', async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
    const [[user]] = await pool.execute('SELECT activo FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const newActivo = user.activo ? 0 : 1;
    await pool.execute('UPDATE users SET activo = ? WHERE id = ?', [newActivo, req.params.id]);
    res.json({ success: true, activo: newActivo === 1 });
  } catch (err) { next(err); }
});

router.patch('/users/:id/change-role', async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    const { role, medicoId } = req.body;
    if (!['paciente','medico','admin'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    const [[user]] = await pool.execute('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (role === 'medico') {
      if (!medicoId) return res.status(400).json({ error: 'medicoId requerido para rol médico' });
      await pool.execute('UPDATE users SET role = ?, medico_id = ? WHERE id = ?', [role, medicoId, req.params.id]);
    } else {
      await pool.execute('UPDATE users SET role = ?, medico_id = NULL WHERE id = ?', [role, req.params.id]);
    }
    const [[updated]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json(safeUser(updated));
  } catch (err) { next(err); }
});

// ── DOCTORES ──────────────────────────────────────────────────────────────────
router.get('/doctors', async (req, res, next) => {
  try {
    const [doctors] = await pool.execute('SELECT * FROM doctors');
    const result = await Promise.all(doctors.map(async (d) => {
      const [sedes] = await pool.execute('SELECT sede_id FROM doctor_sedes WHERE doctor_id = ?', [d.id]);
      const [disp]  = await pool.execute('SELECT dia, hora FROM doctor_disponibilidad WHERE doctor_id = ? ORDER BY dia, hora', [d.id]);
      const disponibilidad = {};
      disp.forEach(r => { if (!disponibilidad[r.dia]) disponibilidad[r.dia] = []; disponibilidad[r.dia].push(fmtTime(r.hora)); });
      const [[ua]] = await pool.execute('SELECT * FROM users WHERE medico_id = ?', [d.id]);
      return { ...d, rating: parseFloat(d.rating), sedes: sedes.map(s => s.sede_id), disponibilidad, userAccount: ua ? safeUser(ua) : null };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/doctors', async (req, res, next) => {
  try {
    const { nombre, especialidadId, sedes, experiencia, rating } = req.body;
    if (!nombre || !especialidadId) return res.status(400).json({ error: 'nombre y especialidadId son requeridos' });
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO doctors (id,user_id,especialidad_id,nombre,foto,experiencia,rating) VALUES (?,NULL,?,?,NULL,?,?)',
      [id, especialidadId, nombre, Number(experiencia) || 0, Number(rating) || 4.5]
    );
    const defaultDisp = { lunes:['08:00','08:30','09:00','09:30','10:00','10:30','14:00','14:30','15:00'], martes:['08:00','08:30','09:00','09:30','10:00','14:00','14:30'], miercoles:['08:00','08:30','09:00','09:30','10:00','10:30'], jueves:['14:00','14:30','15:00','15:30','16:00'], viernes:['08:00','08:30','09:00','09:30','10:00'] };
    for (const [dia, horas] of Object.entries(defaultDisp)) {
      for (const hora of horas) await pool.execute('INSERT INTO doctor_disponibilidad (doctor_id,dia,hora) VALUES (?,?,?)', [id, dia, hora]);
    }
    if (Array.isArray(sedes)) {
      for (const sedeId of sedes) await pool.execute('INSERT INTO doctor_sedes (doctor_id,sede_id) VALUES (?,?)', [id, sedeId]);
    }
    const [[doc]] = await pool.execute('SELECT * FROM doctors WHERE id = ?', [id]);
    res.status(201).json({ ...doc, rating: parseFloat(doc.rating), sedes: sedes || [], disponibilidad: defaultDisp });
  } catch (err) { next(err); }
});

router.put('/doctors/:id', async (req, res, next) => {
  try {
    const [[doc]] = await pool.execute('SELECT id FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor no encontrado' });
    const { nombre, especialidadId, sedes, experiencia, rating, disponibilidad } = req.body;
    if (nombre !== undefined)       await pool.execute('UPDATE doctors SET nombre = ? WHERE id = ?', [nombre, req.params.id]);
    if (especialidadId !== undefined) await pool.execute('UPDATE doctors SET especialidad_id = ? WHERE id = ?', [especialidadId, req.params.id]);
    if (experiencia !== undefined)  await pool.execute('UPDATE doctors SET experiencia = ? WHERE id = ?', [Number(experiencia), req.params.id]);
    if (rating !== undefined)       await pool.execute('UPDATE doctors SET rating = ? WHERE id = ?', [Number(rating), req.params.id]);
    if (sedes !== undefined) {
      await pool.execute('DELETE FROM doctor_sedes WHERE doctor_id = ?', [req.params.id]);
      for (const s of sedes) await pool.execute('INSERT INTO doctor_sedes (doctor_id,sede_id) VALUES (?,?)', [req.params.id, s]);
    }
    if (disponibilidad !== undefined) {
      await pool.execute('DELETE FROM doctor_disponibilidad WHERE doctor_id = ?', [req.params.id]);
      for (const [dia, horas] of Object.entries(disponibilidad)) {
        for (const hora of horas) await pool.execute('INSERT INTO doctor_disponibilidad (doctor_id,dia,hora) VALUES (?,?,?)', [req.params.id, dia, hora]);
      }
    }
    const [[updated]] = await pool.execute('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    const [sedesRows] = await pool.execute('SELECT sede_id FROM doctor_sedes WHERE doctor_id = ?', [req.params.id]);
    const [dispRows]  = await pool.execute('SELECT dia,hora FROM doctor_disponibilidad WHERE doctor_id = ? ORDER BY dia,hora', [req.params.id]);
    const disp = {};
    dispRows.forEach(r => { if (!disp[r.dia]) disp[r.dia] = []; disp[r.dia].push(fmtTime(r.hora)); });
    res.json({ ...updated, rating: parseFloat(updated.rating), sedes: sedesRows.map(s => s.sede_id), disponibilidad: disp });
  } catch (err) { next(err); }
});

router.delete('/doctors/:id', async (req, res, next) => {
  try {
    const [[doc]] = await pool.execute('SELECT id FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor no encontrado' });
    const today = new Date().toISOString().split('T')[0];
    const [[activeApt]] = await pool.execute(
      "SELECT id FROM appointments WHERE medico_id = ? AND fecha >= ? AND (estado='pendiente' OR estado='confirmada') LIMIT 1",
      [req.params.id, today]
    );
    if (activeApt) return res.status(400).json({ error: 'El doctor tiene citas futuras activas. Cancélalas primero.' });
    await pool.execute('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── SEDES ─────────────────────────────────────────────────────────────────────
router.get('/locations', async (req, res, next) => {
  try { res.json((await pool.execute('SELECT * FROM locations'))[0]); } catch (err) { next(err); }
});

router.post('/locations', async (req, res, next) => {
  try {
    const { nombre, direccion, telefono, horario, lat, lng } = req.body;
    if (!nombre || !direccion) return res.status(400).json({ error: 'nombre y direccion son requeridos' });
    const id = uuidv4();
    await pool.execute('INSERT INTO locations (id,nombre,direccion,telefono,horario,lat,lng) VALUES (?,?,?,?,?,?,?)', [id, nombre, direccion, telefono || '', horario || '', lat ? Number(lat) : null, lng ? Number(lng) : null]);
    const [[loc]] = await pool.execute('SELECT * FROM locations WHERE id = ?', [id]);
    res.status(201).json(loc);
  } catch (err) { next(err); }
});

router.put('/locations/:id', async (req, res, next) => {
  try {
    const [[loc]] = await pool.execute('SELECT id FROM locations WHERE id = ?', [req.params.id]);
    if (!loc) return res.status(404).json({ error: 'Sede no encontrada' });
    const { nombre, direccion, telefono, horario, lat, lng } = req.body;
    const fields = []; const vals = [];
    if (nombre !== undefined)    { fields.push('nombre=?');    vals.push(nombre); }
    if (direccion !== undefined) { fields.push('direccion=?'); vals.push(direccion); }
    if (telefono !== undefined)  { fields.push('telefono=?');  vals.push(telefono); }
    if (horario !== undefined)   { fields.push('horario=?');   vals.push(horario); }
    if (lat !== undefined)       { fields.push('lat=?');       vals.push(Number(lat)); }
    if (lng !== undefined)       { fields.push('lng=?');       vals.push(Number(lng)); }
    if (fields.length) await pool.execute('UPDATE locations SET ' + fields.join(',') + ' WHERE id = ?', [...vals, req.params.id]);
    const [[updated]] = await pool.execute('SELECT * FROM locations WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/locations/:id', async (req, res, next) => {
  try {
    const [[loc]] = await pool.execute('SELECT id FROM locations WHERE id = ?', [req.params.id]);
    if (!loc) return res.status(404).json({ error: 'Sede no encontrada' });
    const [[inUse]] = await pool.execute('SELECT doctor_id FROM doctor_sedes WHERE sede_id = ? LIMIT 1', [req.params.id]);
    if (inUse) return res.status(400).json({ error: 'La sede está asignada a uno o más doctores' });
    await pool.execute('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── ESPECIALIDADES ────────────────────────────────────────────────────────────
router.get('/specialties', async (req, res, next) => {
  try { res.json((await pool.execute('SELECT * FROM specialties'))[0]); } catch (err) { next(err); }
});

router.post('/specialties', async (req, res, next) => {
  try {
    const { nombre, icono, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const id = uuidv4();
    await pool.execute('INSERT INTO specialties (id,nombre,icono,descripcion) VALUES (?,?,?,?)', [id, nombre, icono || 'Stethoscope', descripcion || '']);
    const [[spec]] = await pool.execute('SELECT * FROM specialties WHERE id = ?', [id]);
    res.status(201).json(spec);
  } catch (err) { next(err); }
});

router.put('/specialties/:id', async (req, res, next) => {
  try {
    const [[spec]] = await pool.execute('SELECT id FROM specialties WHERE id = ?', [req.params.id]);
    if (!spec) return res.status(404).json({ error: 'Especialidad no encontrada' });
    const { nombre, icono, descripcion } = req.body;
    const fields = []; const vals = [];
    if (nombre !== undefined)      { fields.push('nombre=?');      vals.push(nombre); }
    if (icono !== undefined)       { fields.push('icono=?');       vals.push(icono); }
    if (descripcion !== undefined) { fields.push('descripcion=?'); vals.push(descripcion); }
    if (fields.length) await pool.execute('UPDATE specialties SET ' + fields.join(',') + ' WHERE id = ?', [...vals, req.params.id]);
    const [[updated]] = await pool.execute('SELECT * FROM specialties WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/specialties/:id', async (req, res, next) => {
  try {
    const [[spec]] = await pool.execute('SELECT id FROM specialties WHERE id = ?', [req.params.id]);
    if (!spec) return res.status(404).json({ error: 'Especialidad no encontrada' });
    const [[inUse]] = await pool.execute('SELECT id FROM doctors WHERE especialidad_id = ? LIMIT 1', [req.params.id]);
    if (inUse) return res.status(400).json({ error: 'La especialidad está asignada a uno o más doctores' });
    await pool.execute('DELETE FROM specialties WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
`;

fs.writeFileSync(path.join(routesDir, 'medico.js'), medico, 'utf8');
console.log('✓ medico.js');
fs.writeFileSync(path.join(routesDir, 'admin.js'), admin, 'utf8');
console.log('✓ admin.js');
