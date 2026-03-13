const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getStore, save } = require('../config/db');

router.use(auth);

const formatUser = (u) => ({
  id: u.id, cedula: u.cedula, nombre: u.nombre, apellido: u.apellido,
  nombreCompleto: `${u.nombre} ${u.apellido}`, email: u.email, celular: u.celular,
  fechaNacimiento: u.fecha_nacimiento, departamento: u.departamento,
  municipio: u.municipio, direccion: u.direccion, fotoUrl: u.foto_url,
  fechaRegistro: u.fecha_registro, activo: u.activo,
});

router.put('/', (req, res, next) => {
  try {
    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { nombre, apellido, email, celular, fechaNacimiento, departamento, municipio, direccion, fotoUrl } = req.body;
    if (store.users.find(u => u.email === email && u.id !== user.id)) return res.status(400).json({ error: 'Este correo ya esta en uso' });
    Object.assign(user, { nombre, apellido, email, celular, fecha_nacimiento: fechaNacimiento, departamento, municipio, direccion, foto_url: fotoUrl || null });
    save();
    res.json({ success: true, user: formatUser(user) });
  } catch (err) { next(err); }
});

router.post('/change-password', (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(400).json({ error: 'La contrasena actual es incorrecta' });
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
