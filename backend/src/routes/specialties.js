const router = require('express').Router();
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
