const router = require('express').Router();
const { getStore, save } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendAuthorizationResult } = require('../config/mailer');

const VALID_TIPOS = ['examen', 'procedimiento', 'consulta_especialista', 'imagen', 'cirugia'];
const VALID_PRIORIDADES = ['urgente', 'prioritario', 'normal'];

router.use(auth);

// ─── Rutas del PACIENTE ───────────────────────────────────────────────────────

// GET /authorizations
router.get('/', (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    const store = getStore();

    let auths = store.authorizations.filter(a => a.user_id === req.user.userId);
    if (estado) auths = auths.filter(a => a.estado === estado);
    if (tipo)   auths = auths.filter(a => a.tipo === tipo);

    auths.sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(auths);
  } catch (err) { next(err); }
});

// ─── Rutas del MÉDICO ─────────────────────────────────────────────────────────

// GET /authorizations/medico  (registered before /:id to avoid shadowing)
router.get('/medico', requireRole('medico'), (req, res, next) => {
  try {
    const { estado, tipo } = req.query;
    const store = getStore();

    let auths = store.authorizations.filter(a => a.medico_id === req.user.medicoId);
    if (estado) auths = auths.filter(a => a.estado === estado);
    if (tipo)   auths = auths.filter(a => a.tipo === tipo);

    const enriched = auths.map(a => {
      const patient = store.users.find(u => u.id === a.user_id);
      return {
        ...a,
        paciente: patient
          ? {
              nombreCompleto: patient.nombreCompleto || `${patient.nombre || ''} ${patient.apellido || ''}`.trim(),
              cedula: patient.cedula,
            }
          : { nombreCompleto: 'Paciente desconocido', cedula: '' },
      };
    });

    enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(enriched);
  } catch (err) { next(err); }
});

// GET /authorizations/:id  (paciente — after /medico to avoid shadowing)
router.get('/:id', (req, res, next) => {
  try {
    const store = getStore();
    const auth_ = store.authorizations.find(
      a => a.id === req.params.id && a.user_id === req.user.userId
    );
    if (!auth_) return res.status(404).json({ error: 'Autorización no encontrada' });
    res.json(auth_);
  } catch (err) { next(err); }
});

// POST /authorizations
router.post('/', requireRole('medico'), (req, res, next) => {
  try {
    const { userId, tipo, descripcion, diagnosticoRelacionado, prioridad, sedeId, notasMedico } = req.body;
    const store = getStore();

    if (!VALID_TIPOS.includes(tipo))
      return res.status(400).json({ error: `tipo inválido. Valores permitidos: ${VALID_TIPOS.join(', ')}` });
    if (!VALID_PRIORIDADES.includes(prioridad))
      return res.status(400).json({ error: `prioridad inválida. Valores permitidos: ${VALID_PRIORIDADES.join(', ')}` });
    if (!descripcion || !descripcion.trim())
      return res.status(400).json({ error: 'descripcion es requerida' });
    if (!userId)
      return res.status(400).json({ error: 'userId es requerido' });

    const patient = store.users.find(u => u.id === userId);
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    const hasApt = store.appointments.some(
      a => a.user_id === userId && a.medico_id === req.user.medicoId
    );
    if (!hasApt) return res.status(403).json({ error: 'No tienes acceso a este paciente' });

    const doctor = store.doctors.find(d => d.id === req.user.medicoId);
    const sede   = store.locations.find(l => l.id === sedeId);
    const today  = new Date().toISOString().split('T')[0];

    const codigo = `AUT-${new Date().getFullYear()}-${String(store.authorizations.length + 1).padStart(6, '0')}`;

    const autoApprove = prioridad === 'urgente' || prioridad === 'prioritario';
    let fechaVencimiento = null;
    if (autoApprove) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      fechaVencimiento = d.toISOString().split('T')[0];
    }

    const authorization = {
      id: uuidv4(),
      user_id: userId,
      medico_id: req.user.medicoId,
      medico_nombre: doctor?.nombre || '',
      tipo,
      descripcion: descripcion.trim(),
      diagnostico_relacionado: diagnosticoRelacionado ? diagnosticoRelacionado.trim() : '',
      prioridad,
      estado: autoApprove ? 'aprobada' : 'pendiente',
      sede_id: sedeId || '',
      sede_nombre: sede?.nombre || '',
      notas_medico: notasMedico ? notasMedico.trim() : '',
      notas_autorizacion: autoApprove ? 'Aprobada automáticamente por prioridad.' : '',
      fecha_solicitud: today,
      fecha_respuesta: autoApprove ? today : null,
      fecha_vencimiento: fechaVencimiento,
      codigo_autorizacion: autoApprove ? codigo : null,
      created_at: new Date().toISOString(),
    };

    store.authorizations.push(authorization);
    save();
    res.status(201).json(authorization);
  } catch (err) { next(err); }
});

// PATCH /authorizations/:id/process
router.patch('/:id/process', requireRole('medico'), (req, res, next) => {
  try {
    const { action, notas } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Acción inválida. Usa approve o reject' });

    const store = getStore();
    const authorization = store.authorizations.find(a => a.id === req.params.id);
    if (!authorization) return res.status(404).json({ error: 'Autorización no encontrada' });
    if (authorization.medico_id !== req.user.medicoId)
      return res.status(403).json({ error: 'No tienes permiso para procesar esta autorización' });
    if (authorization.estado !== 'pendiente')
      return res.status(400).json({ error: 'Esta autorización ya fue procesada' });

    const today = new Date().toISOString().split('T')[0];
    authorization.fecha_respuesta = today;
    authorization.notas_autorizacion = notas ? notas.trim() : '';

    if (action === 'approve') {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      const year = new Date().getFullYear();
      authorization.estado = 'aprobada';
      authorization.fecha_vencimiento = d.toISOString().split('T')[0];
      authorization.codigo_autorizacion = `AUT-${year}-${String(store.authorizations.length).padStart(6, '0')}`;
    } else {
      authorization.estado = 'rechazada';
    }

    save();

    // Notificar al paciente (fire-and-forget)
    const patient = store.users.find(u => u.id === authorization.user_id);
    if (patient?.email) {
      const TIPO_LABELS = {
        examen: 'Examen de laboratorio', procedimiento: 'Procedimiento',
        consulta_especialista: 'Consulta con especialista',
        imagen: 'Imagen diagnóstica', cirugia: 'Cirugía',
      };
      sendAuthorizationResult({
        to: patient.email,
        nombre: patient.nombre || patient.nombreCompleto || 'Paciente',
        descripcion: authorization.descripcion,
        tipo: TIPO_LABELS[authorization.tipo] || authorization.tipo,
        aprobada: action === 'approve',
        codigoAutorizacion: authorization.codigo_autorizacion,
        fechaVencimiento: authorization.fecha_vencimiento,
        notas: authorization.notas_autorizacion || '',
      }).catch(err => console.error('[Mailer] Error al enviar email de autorización:', err.message));
    }

    res.json({ success: true, authorization });
  } catch (err) { next(err); }
});

module.exports = router;
