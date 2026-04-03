const router = require('express').Router();
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
