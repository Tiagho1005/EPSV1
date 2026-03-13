const router = require('express').Router();
const auth = require('../middleware/auth');
const { getStore } = require('../config/db');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    const store = getStore();
    const { doctorId } = req.query;
    if (doctorId) {
      const doctor = store.doctors.find(d => d.id === doctorId);
      if (!doctor) return res.json([]);
      return res.json(store.locations.filter(l => doctor.sedes.includes(l.id)));
    }
    res.json(store.locations);
  } catch (err) { next(err); }
});

module.exports = router;
