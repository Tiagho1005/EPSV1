const router = require('express').Router();
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
