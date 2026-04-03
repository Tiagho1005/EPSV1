const router = require('express').Router();
const { pool } = require('../config/mysql');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

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
