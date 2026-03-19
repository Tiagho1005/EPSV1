const router = require('express').Router();
const { getStore, save } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const VALID_TIPOS = [
  'presion_arterial', 'glucosa', 'peso',
  'frecuencia_cardiaca', 'temperatura', 'oximetria',
];

const UNIDADES = {
  presion_arterial:   'mmHg',
  glucosa:            'mg/dL',
  peso:               'kg',
  frecuencia_cardiaca:'bpm',
  temperatura:        '°C',
  oximetria:          '%',
};

router.use(auth);

// ─── GET /health-metrics/summary ── (ANTES de /:id) ──────────────────────────
router.get('/summary', (req, res, next) => {
  try {
    const store = getStore();
    const userId = req.user.userId;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

    const all = store.health_metrics.filter(m => m.user_id === userId);
    const recent = all.filter(m => new Date(m.created_at) >= cutoff);

    const summary = {};

    for (const tipo of VALID_TIPOS) {
      const byTipo = all.filter(m => m.tipo === tipo)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

      const recentByTipo = recent.filter(m => m.tipo === tipo);

      if (tipo === 'presion_arterial') {
        const avgSist = recentByTipo.length
          ? Math.round(recentByTipo.reduce((s, m) => s + m.valor.sistolica, 0) / recentByTipo.length)
          : null;
        const avgDias = recentByTipo.length
          ? Math.round(recentByTipo.reduce((s, m) => s + m.valor.diastolica, 0) / recentByTipo.length)
          : null;

        summary[tipo] = {
          ultimo:   byTipo[0] || null,
          promedio: avgSist !== null ? { sistolica: avgSist, diastolica: avgDias } : null,
          total:    byTipo.length,
        };
      } else {
        const avg = recentByTipo.length
          ? Math.round(
              (recentByTipo.reduce((s, m) => s + m.valor.valor, 0) / recentByTipo.length) * 10,
            ) / 10
          : null;

        summary[tipo] = {
          ultimo:   byTipo[0] || null,
          promedio: avg,
          total:    byTipo.length,
        };
      }
    }

    res.json(summary);
  } catch (err) { next(err); }
});

// ─── GET /health-metrics/patient/:userId ── (MÉDICO) ─────────────────────────
router.get('/patient/:userId', requireRole('medico'), (req, res, next) => {
  try {
    const store = getStore();
    const targetId = req.params.userId;
    const { tipo, desde, hasta } = req.query;

    // Verify patient exists
    const patient = store.users.find(u => u.id === targetId && u.role === 'paciente');
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    let metrics = store.health_metrics.filter(m => m.user_id === targetId);
    if (tipo)   metrics = metrics.filter(m => m.tipo === tipo);
    if (desde)  metrics = metrics.filter(m => m.fecha >= desde);
    if (hasta)  metrics = metrics.filter(m => m.fecha <= hasta);

    metrics.sort((a, b) =>
      b.fecha !== a.fecha
        ? b.fecha.localeCompare(a.fecha)
        : b.hora.localeCompare(a.hora),
    );

    res.json(metrics);
  } catch (err) { next(err); }
});

// ─── GET /health-metrics ── (PACIENTE) ────────────────────────────────────────
router.get('/', (req, res, next) => {
  try {
    const store = getStore();
    const { tipo, desde, hasta } = req.query;

    let metrics = store.health_metrics.filter(m => m.user_id === req.user.userId);
    if (tipo)   metrics = metrics.filter(m => m.tipo === tipo);
    if (desde)  metrics = metrics.filter(m => m.fecha >= desde);
    if (hasta)  metrics = metrics.filter(m => m.fecha <= hasta);

    metrics.sort((a, b) =>
      b.fecha !== a.fecha
        ? b.fecha.localeCompare(a.fecha)
        : b.hora.localeCompare(a.hora),
    );

    res.json(metrics);
  } catch (err) { next(err); }
});

// ─── POST /health-metrics ── (PACIENTE) ───────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const { tipo, valor, unidad, notas, fecha, hora } = req.body;

    if (!tipo || !VALID_TIPOS.includes(tipo))
      return res.status(400).json({ error: `Tipo inválido. Valores permitidos: ${VALID_TIPOS.join(', ')}` });

    if (valor === undefined || valor === null)
      return res.status(400).json({ error: 'El campo valor es requerido' });

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const store = getStore();
    const metric = {
      id:         uuidv4(),
      user_id:    req.user.userId,
      tipo,
      valor,
      unidad:     unidad || UNIDADES[tipo] || '',
      notas:      notas || '',
      fecha:      fecha || today,
      hora:       hora  || nowTime,
      created_at: now.toISOString(),
    };

    store.health_metrics.push(metric);
    save();

    res.status(201).json(metric);
  } catch (err) { next(err); }
});

// ─── DELETE /health-metrics/:id ── (PACIENTE) ─────────────────────────────────
router.delete('/:id', (req, res, next) => {
  try {
    const store = getStore();
    const idx = store.health_metrics.findIndex(
      m => m.id === req.params.id && m.user_id === req.user.userId,
    );

    if (idx === -1)
      return res.status(404).json({ error: 'Métrica no encontrada' });

    store.health_metrics.splice(idx, 1);
    save();

    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
