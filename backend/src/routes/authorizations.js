const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendAuthorizationResult } = require('../config/mailer');

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
    let sql = 'SELECT a.*, CONCAT(u.nombre, " ", u.apellido) AS paciente_nombre, u.cedula AS paciente_cedula FROM authorizations a JOIN users u ON a.user_id = u.id WHERE a.medico_id = ?';
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
