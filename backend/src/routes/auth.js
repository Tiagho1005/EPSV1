const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getStore, save } = require('../config/db');
const { sendRecoveryEmail } = require('../config/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-local-dev';
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

const formatUser = (u) => ({
  id: u.id, cedula: u.cedula, nombre: u.nombre, apellido: u.apellido,
  nombreCompleto: `${u.nombre} ${u.apellido}`, email: u.email, celular: u.celular,
  fechaNacimiento: u.fecha_nacimiento, departamento: u.departamento,
  municipio: u.municipio, direccion: u.direccion, fotoUrl: u.foto_url,
  fechaRegistro: u.fecha_registro, activo: u.activo, role: u.role || 'paciente',
});

router.post('/login', (req, res, next) => {
  try {
    const { cedula, password } = req.body;
    if (!cedula || !password) return res.status(400).json({ error: 'Cedula y contrasena son requeridas' });
    const store = getStore();
    const user = store.users.find(u => u.cedula === cedula);
    if (!user) return res.status(401).json({ error: 'Este numero de cedula no esta registrado. Deseas crear una cuenta?' });
    if (!user.activo) return res.status(401).json({ error: 'Tu cuenta esta inactiva. Contacta a servicio al cliente' });
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) return res.status(401).json({ error: 'Tu cuenta ha sido bloqueada temporalmente. Intenta de nuevo en 15 minutos o recupera tu contrasena' });
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      const attempts = (user.intentos_fallidos || 0) + 1;
      user.intentos_fallidos = attempts;
      if (attempts >= MAX_ATTEMPTS) user.bloqueado_hasta = new Date(Date.now() + BLOCK_MINUTES * 60000).toISOString();
      save();
      return res.status(401).json({ error: 'Usuario o contrasena incorrectos. Por favor, verifica tus datos' });
    }
    user.intentos_fallidos = 0;
    user.bloqueado_hasta = null;
    save();
    const token = jwt.sign({ userId: user.id, cedula: user.cedula, role: user.role || 'paciente' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, user: formatUser(user), token });
  } catch (err) { next(err); }
});

router.post('/register', (req, res, next) => {
  try {
    const { cedula, password, nombre, apellido, email, celular, fechaNacimiento, departamento, municipio, direccion } = req.body;
    const store = getStore();
    if (store.users.find(u => u.cedula === cedula)) return res.status(400).json({ error: 'Esta cedula ya esta registrada. Deseas iniciar sesion?' });
    if (store.users.find(u => u.email === email)) return res.status(400).json({ error: 'Este correo ya esta registrado' });
    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    store.users.push({ id, cedula, nombre, apellido: apellido || '', email, celular, fecha_nacimiento: fechaNacimiento, departamento: departamento || '', municipio: municipio || '', direccion: direccion || '', foto_url: null, password_hash: passwordHash, role: 'paciente', activo: true, intentos_fallidos: 0, bloqueado_hasta: null, reset_code: null, reset_code_expires: null, fecha_registro: new Date().toISOString().split('T')[0] });
    save();
    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente!' });
  } catch (err) { next(err); }
});

router.post('/recover-password', async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const store = getStore();
    const user = store.users.find(u => u.cedula === identifier || u.email === identifier);
    // Responder siempre con éxito para no revelar si el usuario existe
    if (!user) return res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_code = code;
    user.reset_code_expires = new Date(Date.now() + 10 * 60000).toISOString();
    save();
    // Enviar email real (o Ethereal en dev sin SMTP configurado)
    await sendRecoveryEmail({ to: user.email, nombre: user.nombre, code });
    res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código', ...(process.env.NODE_ENV === 'development' && { _devCode: code }) });
  } catch (err) { next(err); }
});

router.post('/verify-code', (req, res, next) => {
  try {
    const { identifier, code } = req.body;
    const store = getStore();
    const user = store.users.find(u => (u.cedula === identifier || u.email === identifier) && u.reset_code === code);
    if (!user) return res.status(400).json({ error: 'El codigo es incorrecto' });
    if (new Date(user.reset_code_expires) < new Date()) return res.status(400).json({ error: 'El codigo ha expirado. Solicita uno nuevo' });
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '10m' });
    res.json({ success: true, resetToken });
  } catch (err) { next(err); }
});

router.post('/reset-password', (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    let payload;
    try { payload = jwt.verify(resetToken, JWT_SECRET); } catch { return res.status(400).json({ error: 'Token invalido o expirado' }); }
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Token invalido' });
    const store = getStore();
    const user = store.users.find(u => u.id === payload.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    user.reset_code = null;
    user.reset_code_expires = null;
    save();
    res.json({ success: true, message: 'Contrasena actualizada exitosamente' });
  } catch (err) { next(err); }
});

module.exports = router;
