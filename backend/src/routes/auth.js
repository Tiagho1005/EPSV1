const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/mysql');
const { sendRecoveryEmail } = require('../config/mailer');
const auth = require('../middleware/auth');
const { addToBlacklist } = require('../services/tokenBlacklist');
const { validatePassword } = require('../utils/validators');
const formatUser = require('../utils/formatUser');
const {
  verifyCodeLimiterMiddleware,
  recordFailedAttempt,
  resetAttempts,
  getClientIp,
} = require('../services/verifyCodeLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-local-dev';
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

// Atributos comunes de la cookie de sesión
const cookieOptions = () => ({
  httpOnly: true,                                      // inaccesible desde JavaScript
  secure: process.env.NODE_ENV === 'production',       // solo HTTPS en prod
  sameSite: 'Lax',                                     // bloquea CSRF en peticiones cross-site POST/PUT/DELETE
  maxAge: 24 * 60 * 60 * 1000,                        // 24h (igual que la expiración del JWT)
  path: '/',
});

router.post('/login', async (req, res, next) => {
  try {
    const { cedula, password } = req.body;
    if (!cedula || !password) return res.status(400).json({ error: 'Cedula y contrasena son requeridas' });
    const [[user]] = await pool.execute('SELECT * FROM users WHERE cedula = ?', [cedula]);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.activo) return res.status(401).json({ error: 'Tu cuenta esta inactiva. Contacta a servicio al cliente' });
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date())
      return res.status(401).json({ error: 'Tu cuenta ha sido bloqueada temporalmente. Intenta de nuevo en 15 minutos o recupera tu contrasena' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.intentos_fallidos || 0) + 1;
      const bloqueo = attempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + BLOCK_MINUTES * 60000).toISOString().slice(0, 19).replace('T', ' ')
        : null;
      await pool.execute('UPDATE users SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?', [attempts, bloqueo, user.id]);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const userRole = user.role || 'paciente';
    await pool.execute('UPDATE users SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { userId: user.id, cedula: user.cedula, role: userRole, medicoId: user.medico_id || null, jti: uuidv4() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // El JWT va en una cookie httpOnly — nunca en el cuerpo de la respuesta.
    // JavaScript del cliente no puede leerlo ni robarlo vía XSS.
    res.cookie('eps_token', token, cookieOptions());
    res.json({ success: true, user: formatUser(user) });
  } catch (err) { next(err); }
});

/**
 * GET /auth/me
 * Devuelve el usuario de la sesión activa.
 * El frontend lo llama al cargar la app para restaurar la sesión
 * sin necesidad de guardar nada en localStorage.
 */
router.get('/me', auth, async (req, res, next) => {
  try {
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }
    res.json({ success: true, user: formatUser(user) });
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { cedula, password, nombre, apellido, nombreCompleto, email, celular, fechaNacimiento, departamento, municipio, direccion } = req.body;
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });
    const [[ex1]] = await pool.execute('SELECT id FROM users WHERE cedula = ?', [cedula]);
    if (ex1) return res.status(400).json({ error: 'Esta cedula ya esta registrada. Deseas iniciar sesion?' });
    const [[ex2]] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (ex2) return res.status(400).json({ error: 'Este correo ya esta registrado' });
    let finalNombre = nombre, finalApellido = apellido || '';
    if (nombreCompleto && !nombre) {
      const p = nombreCompleto.trim().split(' ');
      finalNombre = p[0];
      finalApellido = p.slice(1).join(' ');
    }
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO users (id,cedula,nombre,apellido,email,celular,fecha_nacimiento,departamento,municipio,direccion,foto_url,password_hash,role,activo,intentos_fallidos,fecha_registro) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,'paciente',1,0,CURDATE())",
      [id, cedula, finalNombre, finalApellido, email, celular || null, fechaNacimiento || null, departamento || '', municipio || '', direccion || '', passwordHash]
    );
    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente!' });
  } catch (err) { next(err); }
});

router.post('/recover-password', async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE cedula = ? OR email = ?', [identifier, identifier]);
    if (!user) return res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60000).toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute('UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?', [code, expires, user.id]);
    await sendRecoveryEmail({ to: user.email, nombre: user.nombre, code });
    res.json({ success: true, message: 'Si la cuenta existe, recibirás un correo con el código', ...(process.env.NODE_ENV === 'development' && { _devCode: code }) });
  } catch (err) { next(err); }
});

router.post('/verify-code', verifyCodeLimiterMiddleware, async (req, res, next) => {
  try {
    const { identifier, code } = req.body;
    const ip = getClientIp(req);

    // Buscar usuario + código en una sola consulta (respuesta genérica en caso de fallo
    // para no revelar si el identificador existe o no en el sistema).
    const [[user]] = await pool.execute(
      'SELECT id, reset_code, reset_code_expires FROM users WHERE (cedula = ? OR email = ?) AND reset_code IS NOT NULL',
      [identifier, identifier]
    );

    const codeValid = user && user.reset_code === code;
    const notExpired = codeValid && new Date(user.reset_code_expires) >= new Date();

    if (!codeValid || !notExpired) {
      // Registrar intento fallido (se aplica tanto si el usuario no existe como si el código es incorrecto/expirado)
      await recordFailedAttempt(ip, identifier);
      const msg = !codeValid
        ? 'El código es incorrecto'
        : 'El código ha expirado. Solicita uno nuevo';
      return res.status(400).json({ error: msg });
    }

    // Éxito: limpiar el contador para no penalizar futuros flujos
    await resetAttempts(ip, identifier);

    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '10m' });
    res.json({ success: true, resetToken });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    let payload;
    try { payload = jwt.verify(resetToken, JWT_SECRET); } catch { return res.status(400).json({ error: 'Token invalido o expirado' }); }
    if (payload.purpose !== 'reset') return res.status(400).json({ error: 'Token invalido' });
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ error: pwError });
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const history = Array.isArray(user.password_history) ? user.password_history : [];
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) return res.status(400).json({ error: 'No puedes reutilizar una contraseña reciente' });
    }
    const newHistory = [user.password_hash, ...history].slice(0, 5);
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires = NULL, password_history = ? WHERE id = ?', [newHash, JSON.stringify(newHistory), user.id]);
    res.json({ success: true, message: 'Contrasena actualizada exitosamente' });
  } catch (err) { next(err); }
});

router.post('/logout', auth, async (req, res, next) => {
  try {
    if (req.user?.jti && req.user?.exp) {
      const expiresAt = new Date(req.user.exp * 1000).toISOString().slice(0, 19).replace('T', ' ');
      await addToBlacklist(req.user.jti, expiresAt);
    }
    // Eliminar la cookie de sesión — el navegador la descarta inmediatamente
    res.clearCookie('eps_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
