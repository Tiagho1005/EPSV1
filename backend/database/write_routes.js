/**
 * Script generador: escribe todas las rutas migradas a MySQL.
 * Ejecutar: node backend/database/write_routes.js
 */
const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, '../src/routes');

// ─── Helpers comunes usados en múltiples rutas ────────────────────────────────
// fmtTime: MySQL devuelve TIME como string 'HH:MM:SS' o como Duration object
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

// ─── auth.js ──────────────────────────────────────────────────────────────────
const auth = `const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/mysql');
const { sendRecoveryEmail } = require('../config/mailer');
const auth = require('../middleware/auth');
const { validatePassword } = require('../utils/validators');
const formatUser = require('../utils/formatUser');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-local-dev';
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;
const PORTAL_LABELS = { paciente: 'Portal del Afiliado', medico: 'Portal del Médico', admin: 'Panel de Administración' };

router.post('/login', async (req, res, next) => {
  try {
    const { cedula, password, portal } = req.body;
    if (!cedula || !password) return res.status(400).json({ error: 'Cedula y contrasena son requeridas' });
    const [[user]] = await pool.execute('SELECT * FROM users WHERE cedula = ?', [cedula]);
    if (!user) return res.status(401).json({ error: 'Este numero de cedula no esta registrado. Deseas crear una cuenta?' });
    if (!user.activo) return res.status(401).json({ error: 'Tu cuenta esta inactiva. Contacta a servicio al cliente' });
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date())
      return res.status(401).json({ error: 'Tu cuenta ha sido bloqueada temporalmente. Intenta de nuevo en 15 minutos o recupera tu contrasena' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.intentos_fallidos || 0) + 1;
      const bloqueo = attempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + BLOCK_MINUTES * 60000).toISOString().slice(0, 19).replace('T', ' ')
        : null;
      await pool.execute('UPDATE users SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?', [attempts, bloqueo, user.id]);
      return res.status(401).json({ error: 'Usuario o contrasena incorrectos. Por favor, verifica tus datos' });
    }
    const userRole = user.role || 'paciente';
    if (portal && portal !== userRole)
      return res.status(403).json({ error: 'Esta cuenta no tiene acceso al ' + PORTAL_LABELS[portal] + '. Por favor ingresa por el ' + (PORTAL_LABELS[userRole] || 'portal correcto') + '.' });
    await pool.execute('UPDATE users SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [user.id]);
    const token = jwt.sign({ userId: user.id, cedula: user.cedula, role: userRole, medicoId: user.medico_id || null, jti: uuidv4() }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, user: formatUser(user), token });
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { cedula, password, nombre, apellido, nombreCompleto, email, celular, fechaNacimiento, departamento, municipio, direccion } = req.body;
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
    const [[ex1]] = await pool.execute('SELECT id FROM users WHERE cedula = ?', [cedula]);
    if (ex1) return res.status(400).json({ error: 'Esta cedula ya esta registrada. Deseas iniciar sesion?' });
    const [[ex2]] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (ex2) return res.status(400).json({ error: 'Este correo ya esta registrado' });
    let finalNombre = nombre, finalApellido = apellido || '';
    if (nombreCompleto && !nombre) {
      const p = nombreCompleto.trim().split(' ');
      finalNombre = p[0];
      finalApellido = p.slice(1).join(' ');
    }
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (id,cedula,nombre,apellido,email,celular,fecha_nacimiento,departamento,municipio,direccion,foto_url,password_hash,role,activo,intentos_fallidos,fecha_registro) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,'paciente',1,0,CURDATE())",
      [id, cedula, finalNombre, finalApellido, email, celular || null, fechaNacimiento || null, departamento || '', municipio || '', direccion || '', passwordHash]
    );
    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente!' });
  } catch (err) { next(err); }
});

router.post('/recover-password', async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE cedula = ? OR email = ?', [identifier, identifier]);
    if (!user) return res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000).toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute('UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?', [code, expires, user.id]);
    await sendRecoveryEmail({ to: user.email, nombre: user.nombre, code });
    res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código', ...(process.env.NODE_ENV === 'development' && { _devCode: code }) });
  } catch (err) { next(err); }
});

router.post('/verify-code', async (req, res, next) => {
  try {
    const { identifier, code } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE (cedula = ? OR email = ?) AND reset_code = ?', [identifier, identifier, code]);
    if (!user) return res.status(400).json({ error: 'El codigo es incorrecto' });
    if (new Date(user.reset_code_expires) < new Date()) return res.status(400).json({ error: 'El codigo ha expirado. Solicita uno nuevo' });
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '10m' });
    res.json({ success: true, resetToken });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    let payload;
    try { payload = jwt.verify(resetToken, JWT_SECRET); } catch { return res.status(400).json({ error: 'Token invalido o expirado' }); }
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Token invalido' });
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const history = Array.isArray(user.password_history) ? user.password_history : [];
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) return res.status(400).json({ error: 'No puedes reutilizar una contraseña reciente' });
    }
    const newHistory = [user.password_hash, ...history].slice(0, 5);
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires = NULL, password_history = ? WHERE id = ?', [newHash, JSON.stringify(newHistory), user.id]);
    res.json({ success: true, message: 'Contrasena actualizada exitosamente' });
  } catch (err) { next(err); }
});

router.post('/logout', auth, (req, res) => {
  if (req.user?.jti) auth.addToBlacklist(req.user.jti);
  res.json({ success: true });
});

module.exports = router;
`;

// ─── appointments.js ──────────────────────────────────────────────────────────
const appointments = `const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
const { sendAppointmentConfirmation } = require('../config/mailer');
${HELPERS}
router.use(auth);

const fmt = (a) => ({
  id: a.id,
  especialidad: a.especialidad_id,
  especialidadNombre: a.especialidad_nombre,
  medico: a.medico_nombre,
  medicoId: a.medico_id,
  sede: a.sede_nombre,
  sedeId: a.sede_id,
  fecha: fmtDate(a.fecha),
  hora: fmtTime(a.hora),
  estado: a.estado,
  reagendamientos: a.reagendamientos,
  notas: a.notas || '',
  ...(a.diagnostico && { diagnostico: a.diagnostico }),
  ...(a.motivo_cancelacion && { motivoCancelacion: a.motivo_cancelacion }),
});

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM appointments WHERE user_id = ? ORDER BY fecha DESC, hora DESC',
      [req.user.userId]
    );
    res.json(rows.map(fmt));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { especialidad, especialidadNombre, medico, medicoId, sede, sedeId, fecha, hora, notas } = req.body;
    const [[conflict]] = await pool.execute(
      "SELECT id FROM appointments WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'",
      [medicoId, fecha, hora]
    );
    if (conflict) return res.status(409).json({ error: 'Este horario ya no está disponible. Selecciona otro horario.' });
    const id = uuidv4();
    await pool.execute(
      "INSERT INTO appointments (id,user_id,especialidad_id,especialidad_nombre,medico_id,medico_nombre,sede_id,sede_nombre,fecha,hora,estado,reagendamientos,notas) VALUES (?,?,?,?,?,?,?,?,?,?,'confirmada',0,?)",
      [id, req.user.userId, especialidad, especialidadNombre, medicoId, medico, sedeId, sede, fecha, hora, notas || '']
    );
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ?', [id]);
    const [[user]] = await pool.execute('SELECT email, nombre FROM users WHERE id = ?', [req.user.userId]);
    if (user) {
      sendAppointmentConfirmation({ to: user.email, nombre: user.nombre, appointment: fmt(apt) })
        .catch(e => console.error('[Mailer] Error confirmación cita:', e.message));
    }
    res.status(201).json(fmt(apt));
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    if (apt.estado === 'cancelada') return res.status(400).json({ error: 'La cita ya está cancelada' });
    const aptDT = new Date(fmtDate(apt.fecha) + 'T' + fmtTime(apt.hora) + ':00');
    const hoursUntil = (aptDT - new Date()) / (1000 * 60 * 60);
    if (hoursUntil >= 0 && hoursUntil < 24)
      return res.status(400).json({ error: 'No puedes cancelar con menos de 24 horas de anticipación. Contacta a tu sede.' });
    await pool.execute("UPDATE appointments SET estado = 'cancelada', motivo_cancelacion = ? WHERE id = ?", [req.body.motivo || '', req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/reschedule', async (req, res, next) => {
  try {
    const [[apt]] = await pool.execute('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!apt) return res.status(404).json({ error: 'Cita no encontrada' });
    const { newDate, newTime } = req.body;
    if (!newDate || !newTime) return res.status(400).json({ error: 'newDate y newTime son requeridos' });
    if (apt.estado === 'cancelada' || apt.estado === 'completada')
      return res.status(400).json({ error: 'No puedes reagendar una cita cancelada o completada' });
    if ((apt.reagendamientos || 0) >= 2)
      return res.status(400).json({ error: 'Has alcanzado el límite de reagendamientos para esta cita' });
    if (new Date(newDate + 'T' + newTime + ':00') < new Date())
      return res.status(400).json({ error: 'No puedes reagendar a una fecha pasada' });
    const [[conflict]] = await pool.execute(
      "SELECT id FROM appointments WHERE id != ? AND medico_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelada'",
      [apt.id, apt.medico_id, newDate, newTime]
    );
    if (conflict) return res.status(409).json({ error: 'Este horario ya no está disponible. Selecciona otro horario.' });
    await pool.execute('UPDATE appointments SET fecha = ?, hora = ?, reagendamientos = reagendamientos + 1 WHERE id = ?', [newDate, newTime, req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── medications.js ───────────────────────────────────────────────────────────
const medications = `const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
${HELPERS}
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
`;

// ─── medicalHistory.js ────────────────────────────────────────────────────────
const medicalHistory = `const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
${HELPERS}
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
`;

// ─── profile.js ───────────────────────────────────────────────────────────────
const profile = `const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
const formatUser = require('../utils/formatUser');

router.use(auth);

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PASSWORD_HISTORY_LIMIT = 5;

router.put('/', async (req, res, next) => {
  try {
    const { nombre, apellido, nombreCompleto, email, celular, fechaNacimiento, departamento, municipio, direccion, fotoUrl } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const [[emailUsed]] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id]);
    if (emailUsed) return res.status(400).json({ error: 'Este correo ya esta en uso' });
    let finalNombre = nombre || user.nombre;
    let finalApellido = apellido !== undefined ? apellido : user.apellido;
    if (nombreCompleto && !nombre) {
      const parts = nombreCompleto.trim().split(' ');
      finalNombre = parts[0];
      finalApellido = parts.slice(1).join(' ');
    }
    if (fotoUrl && fotoUrl.startsWith('data:') && fotoUrl.length > MAX_PHOTO_BYTES * 1.37)
      return res.status(400).json({ error: 'La foto es demasiado grande. Máximo 2 MB.' });
    await pool.execute(
      'UPDATE users SET nombre=?,apellido=?,email=?,celular=?,fecha_nacimiento=?,departamento=?,municipio=?,direccion=?,foto_url=? WHERE id=?',
      [finalNombre, finalApellido, email, celular || null, fechaNacimiento || null, departamento || '', municipio || '', direccion || '', fotoUrl !== undefined ? (fotoUrl || null) : user.foto_url, user.id]
    );
    const [[updated]] = await pool.execute('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ success: true, user: formatUser(updated) });
  } catch (err) { next(err); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!await bcrypt.compare(currentPassword, user.password_hash))
      return res.status(400).json({ error: 'La contrasena actual es incorrecta' });
    const history = Array.isArray(user.password_history) ? user.password_history : [];
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash))
        return res.status(400).json({ error: 'No puedes reutilizar una contraseña reciente. Elige una diferente.' });
    }
    const newHistory = [user.password_hash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, password_history = ? WHERE id = ?', [newHash, JSON.stringify(newHistory), user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/reminder-preferences', async (req, res, next) => {
  try {
    const { emailEnabled, advanceMinutes } = req.body;
    const VALID_MINUTES = [5, 10, 15, 30];
    const [[user]] = await pool.execute('SELECT reminder_email, reminder_advance_min FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const newEmail = typeof emailEnabled === 'boolean' ? emailEnabled : (user.reminder_email === 1);
    const newMin   = advanceMinutes !== undefined && VALID_MINUTES.includes(Number(advanceMinutes)) ? Number(advanceMinutes) : user.reminder_advance_min;
    await pool.execute('UPDATE users SET reminder_email = ?, reminder_advance_min = ? WHERE id = ?', [newEmail ? 1 : 0, newMin, req.user.userId]);
    res.json({ success: true, reminderPreferences: { email_enabled: newEmail, advance_minutes: newMin } });
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── doctors.js ───────────────────────────────────────────────────────────────
const doctors = `const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');
${HELPERS}
router.use(auth);

const buildDoctor = async (d) => {
  const [sedesRows] = await pool.execute('SELECT sede_id FROM doctor_sedes WHERE doctor_id = ?', [d.id]);
  const [dispRows]  = await pool.execute('SELECT dia, hora FROM doctor_disponibilidad WHERE doctor_id = ? ORDER BY dia, hora', [d.id]);
  const disponibilidad = {};
  dispRows.forEach(r => {
    if (!disponibilidad[r.dia]) disponibilidad[r.dia] = [];
    disponibilidad[r.dia].push(fmtTime(r.hora));
  });
  return { id: d.id, nombre: d.nombre, especialidad: d.especialidad_id, foto: d.foto, experiencia: d.experiencia, rating: parseFloat(d.rating), sedes: sedesRows.map(s => s.sede_id), disponibilidad };
};

router.get('/', async (req, res, next) => {
  try {
    const { especialidadId } = req.query;
    const [rows] = especialidadId
      ? await pool.execute('SELECT * FROM doctors WHERE especialidad_id = ?', [especialidadId])
      : await pool.execute('SELECT * FROM doctors');
    const result = await Promise.all(rows.map(buildDoctor));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id/available-times', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' });
    const [[doctor]] = await pool.execute('SELECT id FROM doctors WHERE id = ?', [req.params.id]);
    if (!doctor) return res.json([]);
    const dayNames = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const dia = dayNames[new Date(date + 'T00:00:00').getDay()];
    const [dispRows] = await pool.execute('SELECT hora FROM doctor_disponibilidad WHERE doctor_id = ? AND dia = ?', [req.params.id, dia]);
    const [bookedRows] = await pool.execute(
      "SELECT hora FROM appointments WHERE medico_id = ? AND fecha = ? AND estado != 'cancelada'",
      [req.params.id, date]
    );
    const booked = new Set(bookedRows.map(r => fmtTime(r.hora)));
    res.json(dispRows.map(r => fmtTime(r.hora)).filter(t => !booked.has(t)));
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── locations.js ─────────────────────────────────────────────────────────────
const locations = `const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { doctorId } = req.query;
    if (doctorId) {
      const [rows] = await pool.execute(
        'SELECT l.* FROM locations l JOIN doctor_sedes ds ON l.id = ds.sede_id WHERE ds.doctor_id = ?',
        [doctorId]
      );
      return res.json(rows);
    }
    const [rows] = await pool.execute('SELECT * FROM locations');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── specialties.js ───────────────────────────────────────────────────────────
const specialties = `const router = require('express').Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/mysql');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM specialties');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── departments.js ───────────────────────────────────────────────────────────
const departments = `const router = require('express').Router();
const { pool } = require('../config/mysql');

router.get('/', async (req, res, next) => {
  try {
    const [depts] = await pool.execute('SELECT * FROM departments ORDER BY nombre');
    const result = await Promise.all(depts.map(async (d) => {
      const [munis] = await pool.execute('SELECT nombre FROM municipalities WHERE department_id = ? ORDER BY nombre', [d.id]);
      return { id: d.id, nombre: d.nombre, municipios: munis.map(m => m.nombre) };
    }));
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── healthMetrics.js ─────────────────────────────────────────────────────────
const healthMetrics = `const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
${HELPERS}
const VALID_TIPOS = ['presion_arterial','glucosa','peso','frecuencia_cardiaca','temperatura','oximetria'];
const UNIDADES = { presion_arterial:'mmHg', glucosa:'mg/dL', peso:'kg', frecuencia_cardiaca:'bpm', temperatura:'°C', oximetria:'%' };

router.use(auth);

// Reconstruye el objeto valor al formato esperado por el frontend
const fmtMetric = (m) => ({
  id: m.id, user_id: m.user_id, tipo: m.tipo,
  valor: m.tipo === 'presion_arterial'
    ? { sistolica: parseFloat(m.valor_sistolica), diastolica: parseFloat(m.valor_diastolica) }
    : { valor: parseFloat(m.valor) },
  unidad: m.unidad, notas: m.notas || '',
  fecha: fmtDate(m.fecha), hora: fmtTime(m.hora),
  created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
});

router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const summary = {};
    for (const tipo of VALID_TIPOS) {
      const [all]    = await pool.execute('SELECT * FROM health_metrics WHERE user_id = ? AND tipo = ? ORDER BY created_at DESC', [userId, tipo]);
      const recent   = all.filter(m => fmtDate(m.fecha) >= cutoffStr);
      if (tipo === 'presion_arterial') {
        const avgS = recent.length ? Math.round(recent.reduce((s,m) => s + parseFloat(m.valor_sistolica), 0) / recent.length) : null;
        const avgD = recent.length ? Math.round(recent.reduce((s,m) => s + parseFloat(m.valor_diastolica), 0) / recent.length) : null;
        summary[tipo] = { ultimo: all[0] ? fmtMetric(all[0]) : null, promedio: avgS !== null ? { sistolica: avgS, diastolica: avgD } : null, total: all.length };
      } else {
        const avg = recent.length ? Math.round((recent.reduce((s,m) => s + parseFloat(m.valor), 0) / recent.length) * 10) / 10 : null;
        summary[tipo] = { ultimo: all[0] ? fmtMetric(all[0]) : null, promedio: avg, total: all.length };
      }
    }
    res.json(summary);
  } catch (err) { next(err); }
});

router.get('/patient/:userId', requireRole('medico'), async (req, res, next) => {
  try {
    const { tipo, desde, hasta } = req.query;
    const [[patient]] = await pool.execute("SELECT id FROM users WHERE id = ? AND role = 'paciente'", [req.params.userId]);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    let sql = 'SELECT * FROM health_metrics WHERE user_id = ?';
    const params = [req.params.userId];
    if (tipo)  { sql += ' AND tipo = ?';  params.push(tipo); }
    if (desde) { sql += ' AND fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY fecha DESC, hora DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(fmtMetric));
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { tipo, desde, hasta } = req.query;
    let sql = 'SELECT * FROM health_metrics WHERE user_id = ?';
    const params = [req.user.userId];
    if (tipo)  { sql += ' AND tipo = ?';   params.push(tipo); }
    if (desde) { sql += ' AND fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY fecha DESC, hora DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(fmtMetric));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { tipo, valor, unidad, notas, fecha, hora } = req.body;
    if (!tipo || !VALID_TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido. Valores permitidos: ' + VALID_TIPOS.join(', ') });
    if (valor === undefined || valor === null) return res.status(400).json({ error: 'El campo valor es requerido' });
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const today   = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    const nowTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
    const id = uuidv4();
    const finalFecha = fecha || today;
    const finalHora  = hora  || nowTime;
    const finalUnidad = unidad || UNIDADES[tipo] || '';
    if (tipo === 'presion_arterial') {
      await pool.execute(
        'INSERT INTO health_metrics (id,user_id,tipo,valor_sistolica,valor_diastolica,valor,unidad,notas,fecha,hora,created_at) VALUES (?,?,?,?,?,NULL,?,?,?,?,NOW())',
        [id, req.user.userId, tipo, valor.sistolica, valor.diastolica, finalUnidad, notas || '', finalFecha, finalHora]
      );
    } else {
      const v = typeof valor === 'object' ? valor.valor : valor;
      await pool.execute(
        'INSERT INTO health_metrics (id,user_id,tipo,valor_sistolica,valor_diastolica,valor,unidad,notas,fecha,hora,created_at) VALUES (?,?,?,NULL,NULL,?,?,?,?,?,NOW())',
        [id, req.user.userId, tipo, v, finalUnidad, notas || '', finalFecha, finalHora]
      );
    }
    const [[metric]] = await pool.execute('SELECT * FROM health_metrics WHERE id = ?', [id]);
    res.status(201).json(fmtMetric(metric));
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [[m]] = await pool.execute('SELECT id FROM health_metrics WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!m) return res.status(404).json({ error: 'Métrica no encontrada' });
    await pool.execute('DELETE FROM health_metrics WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── authorizations.js ────────────────────────────────────────────────────────
const authorizations = `const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendAuthorizationResult } = require('../config/mailer');
${HELPERS}
const VALID_TIPOS      = ['examen','procedimiento','consulta_especialista','imagen','cirugia'];
const VALID_PRIORIDADES = ['urgente','prioritario','normal'];
const TIPO_LABELS = { examen:'Examen de laboratorio', procedimiento:'Procedimiento', consulta_especialista:'Consulta con especialista', imagen:'Imagen diagnóstica', cirugia:'Cirugía' };

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    let sql = 'SELECT * FROM authorizations WHERE user_id = ?';
    const params = [req.user.userId];
    if (estado) { sql += ' AND estado = ?'; params.push(estado); }
    if (tipo)   { sql += ' AND tipo = ?';   params.push(tipo); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(r => ({ ...r, fecha_solicitud: fmtDate(r.fecha_solicitud), fecha_respuesta: fmtDate(r.fecha_respuesta), fecha_vencimiento: fmtDate(r.fecha_vencimiento), created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at })));
  } catch (err) { next(err); }
});

router.get('/medico', requireRole('medico'), async (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    let sql = 'SELECT a.*, CONCAT(u.nombre, \" \", u.apellido) AS paciente_nombre, u.cedula AS paciente_cedula FROM authorizations a JOIN users u ON a.user_id = u.id WHERE a.medico_id = ?';
    const params = [req.user.medicoId];
    if (estado) { sql += ' AND a.estado = ?'; params.push(estado); }
    if (tipo)   { sql += ' AND a.tipo = ?';   params.push(tipo); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows.map(r => ({ ...r, fecha_solicitud: fmtDate(r.fecha_solicitud), fecha_respuesta: fmtDate(r.fecha_respuesta), fecha_vencimiento: fmtDate(r.fecha_vencimiento), created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at, paciente: { nombreCompleto: r.paciente_nombre, cedula: r.paciente_cedula } })));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [[auth_]] = await pool.execute('SELECT * FROM authorizations WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!auth_) return res.status(404).json({ error: 'Autorización no encontrada' });
    res.json({ ...auth_, fecha_solicitud: fmtDate(auth_.fecha_solicitud), fecha_respuesta: fmtDate(auth_.fecha_respuesta), fecha_vencimiento: fmtDate(auth_.fecha_vencimiento) });
  } catch (err) { next(err); }
});

router.post('/', requireRole('medico'), async (req, res, next) => {
  try {
    const { userId, tipo, descripcion, diagnosticoRelacionado, prioridad, sedeId, notasMedico } = req.body;
    if (!VALID_TIPOS.includes(tipo)) return res.status(400).json({ error: 'tipo inválido. Valores permitidos: ' + VALID_TIPOS.join(', ') });
    if (!VALID_PRIORIDADES.includes(prioridad)) return res.status(400).json({ error: 'prioridad inválida. Valores permitidos: ' + VALID_PRIORIDADES.join(', ') });
    if (!descripcion || !descripcion.trim()) return res.status(400).json({ error: 'descripcion es requerida' });
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });
    const [[patient]] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });
    const [[hasApt]] = await pool.execute("SELECT id FROM appointments WHERE user_id = ? AND medico_id = ?", [userId, req.user.medicoId]);
    if (!hasApt) return res.status(403).json({ error: 'No tienes acceso a este paciente' });
    const [[doctor]] = await pool.execute('SELECT nombre FROM doctors WHERE id = ?', [req.user.medicoId]);
    const [[sede]]   = await pool.execute('SELECT nombre FROM locations WHERE id = ?', [sedeId || '']);
    const autoApprove = prioridad === 'urgente' || prioridad === 'prioritario';
    const today = new Date().toISOString().split('T')[0];
    let fechaVencimiento = null;
    if (autoApprove) { const d = new Date(); d.setDate(d.getDate() + 30); fechaVencimiento = d.toISOString().split('T')[0]; }
    const [[countRow]] = await pool.execute('SELECT COUNT(*) as cnt FROM authorizations');
    const codigo = autoApprove ? 'AUT-' + new Date().getFullYear() + '-' + String(countRow.cnt + 1).padStart(6, '0') : null;
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO authorizations (id,user_id,medico_id,medico_nombre,tipo,descripcion,diagnostico_relacionado,prioridad,estado,sede_id,sede_nombre,notas_medico,notas_autorizacion,fecha_solicitud,fecha_respuesta,fecha_vencimiento,codigo_autorizacion,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())',
      [id, userId, req.user.medicoId, doctor?.nombre || '', tipo, descripcion.trim(), diagnosticoRelacionado ? diagnosticoRelacionado.trim() : '', prioridad, autoApprove ? 'aprobada' : 'pendiente', sedeId || '', sede?.nombre || '', notasMedico ? notasMedico.trim() : '', autoApprove ? 'Aprobada automáticamente por prioridad.' : '', today, autoApprove ? today : null, fechaVencimiento, codigo]
    );
    const [[aut]] = await pool.execute('SELECT * FROM authorizations WHERE id = ?', [id]);
    res.status(201).json({ ...aut, fecha_solicitud: fmtDate(aut.fecha_solicitud), fecha_respuesta: fmtDate(aut.fecha_respuesta), fecha_vencimiento: fmtDate(aut.fecha_vencimiento) });
  } catch (err) { next(err); }
});

router.patch('/:id/process', requireRole('medico'), async (req, res, next) => {
  try {
    const { action, notas } = req.body;
    if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida. Usa approve o reject' });
    const [[authorization]] = await pool.execute('SELECT * FROM authorizations WHERE id = ?', [req.params.id]);
    if (!authorization) return res.status(404).json({ error: 'Autorización no encontrada' });
    if (authorization.medico_id !== req.user.medicoId) return res.status(403).json({ error: 'No tienes permiso para procesar esta autorización' });
    if (authorization.estado !== 'pendiente') return res.status(400).json({ error: 'Esta autorización ya fue procesada' });
    const today = new Date().toISOString().split('T')[0];
    let fechaVencimiento = null, codigoAutorizacion = null, estado = 'rechazada';
    if (action === 'approve') {
      const d = new Date(); d.setDate(d.getDate() + 30);
      fechaVencimiento = d.toISOString().split('T')[0];
      const [[cnt]] = await pool.execute('SELECT COUNT(*) as c FROM authorizations');
      codigoAutorizacion = 'AUT-' + new Date().getFullYear() + '-' + String(cnt.c).padStart(6, '0');
      estado = 'aprobada';
    }
    await pool.execute(
      'UPDATE authorizations SET estado=?,fecha_respuesta=?,notas_autorizacion=?,fecha_vencimiento=?,codigo_autorizacion=? WHERE id=?',
      [estado, today, notas ? notas.trim() : '', fechaVencimiento, codigoAutorizacion, req.params.id]
    );
    const [[updated]] = await pool.execute('SELECT * FROM authorizations WHERE id = ?', [req.params.id]);
    const [[patient]]  = await pool.execute('SELECT email, nombre FROM users WHERE id = ?', [authorization.user_id]);
    if (patient?.email) {
      sendAuthorizationResult({
        to: patient.email, nombre: patient.nombre || 'Paciente',
        descripcion: authorization.descripcion, tipo: TIPO_LABELS[authorization.tipo] || authorization.tipo,
        aprobada: action === 'approve', codigoAutorizacion: updated.codigo_autorizacion,
        fechaVencimiento: fmtDate(updated.fecha_vencimiento), notas: updated.notas_autorizacion || '',
      }).catch(e => console.error('[Mailer] Error email autorización:', e.message));
    }
    res.json({ success: true, authorization: { ...updated, fecha_solicitud: fmtDate(updated.fecha_solicitud), fecha_respuesta: fmtDate(updated.fecha_respuesta), fecha_vencimiento: fmtDate(updated.fecha_vencimiento) } });
  } catch (err) { next(err); }
});

module.exports = router;
`;

// ─── Escribir todos los archivos ──────────────────────────────────────────────
const files = { 'auth.js': auth, 'appointments.js': appointments, 'medications.js': medications, 'medicalHistory.js': medicalHistory, 'profile.js': profile, 'doctors.js': doctors, 'locations.js': locations, 'specialties.js': specialties, 'departments.js': departments, 'healthMetrics.js': healthMetrics, 'authorizations.js': authorizations };

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(routesDir, name), content, 'utf8');
  console.log(`✓ ${name}`);
}
