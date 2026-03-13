const router = require('express').Router();
const { getStore } = require('../config/db');

router.get('/', (req, res, next) => {
  try {
    res.json(getStore().departments);
  } catch (err) { next(err); }
});

module.exports = router;
