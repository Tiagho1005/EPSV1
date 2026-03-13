const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStore } = require('../config/db');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    res.json(getStore().specialties);
  } catch (err) { next(err); }
});

module.exports = router;
