const router = require('express').Router();
const bcrypt = require('bcryptjs');
const sharp  = require('sharp');
const auth   = require('../middleware/auth');
const { pool } = require('../config/mysql');
const formatUser = require('../utils/formatUser');
const { uploadPhoto } = require('../middleware/uploadMiddleware');
const { uploadProfilePhoto, deleteProfilePhoto } = require('../services/storageService');

router.use(auth);

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PASSWORD_HISTORY_LIMIT = 5;

router.put('/', async (req, res, next) => {
  try {
    const { nombre, apellido, nombreCompleto, email, celular, fechaNacimiento, departamento, municipio, direccion, fotoUrl } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const [[emailUsed]] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id]);
    if (emailUsed) return res.status(400).json({ error: 'Este correo ya esta en uso' });
    let finalNombre = nombre || user.nombre;
    let finalApellido = apellido !== undefined ? apellido : user.apellido;
    if (nombreCompleto && !nombre) {
      const parts = nombreCompleto.trim().split(' ');
      finalNombre = parts[0];
      finalApellido = parts.slice(1).join(' ');
    }
    if (fotoUrl && fotoUrl.startsWith('data:') && fotoUrl.length > MAX_PHOTO_BYTES * 1.37)
      return res.status(400).json({ error: 'La foto es demasiado grande. Máximo 2 MB.' });
    await pool.execute(
      'UPDATE users SET nombre=?,apellido=?,email=?,celular=?,fecha_nacimiento=?,departamento=?,municipio=?,direccion=?,foto_url=? WHERE id=?',
      [finalNombre, finalApellido, email, celular || null, fechaNacimiento || null, departamento || '', municipio || '', direccion || '', fotoUrl !== undefined ? (fotoUrl || null) : user.foto_url, user.id]
    );
    const [[updated]] = await pool.execute('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ success: true, user: formatUser(updated) });
  } catch (err) { next(err); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [[user]] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!await bcrypt.compare(currentPassword, user.password_hash))
      return res.status(400).json({ error: 'La contrasena actual es incorrecta' });
    const history = Array.isArray(user.password_history) ? user.password_history : [];
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash))
        return res.status(400).json({ error: 'No puedes reutilizar una contraseña reciente. Elige una diferente.' });
    }
    const newHistory = [user.password_hash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ?, password_history = ? WHERE id = ?', [newHash, JSON.stringify(newHistory), user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/reminder-preferences', async (req, res, next) => {
  try {
    const { emailEnabled, advanceMinutes } = req.body;
    const VALID_MINUTES = [5, 10, 15, 30];
    const [[user]] = await pool.execute('SELECT reminder_email, reminder_advance_min FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const newEmail = typeof emailEnabled === 'boolean' ? emailEnabled : (user.reminder_email === 1);
    const newMin   = advanceMinutes !== undefined && VALID_MINUTES.includes(Number(advanceMinutes)) ? Number(advanceMinutes) : user.reminder_advance_min;
    await pool.execute('UPDATE users SET reminder_email = ?, reminder_advance_min = ? WHERE id = ?', [newEmail ? 1 : 0, newMin, req.user.userId]);
    res.json({ success: true, reminderPreferences: { email_enabled: newEmail, advance_minutes: newMin } });
  } catch (err) { next(err); }
});

// ── Subida de foto de perfil ──────────────────────────────────

/**
 * POST /api/profile/photo
 * Content-Type: multipart/form-data
 * Campo: photo (archivo de imagen)
 *
 * Flujo:
 *  1. uploadPhoto middleware: valida tipo/tamaño + magic bytes.
 *  2. sharp: redimensiona a máx 400×400 y convierte a WebP (q85).
 *  3. storageService: sube a S3 y elimina foto anterior si existe.
 *  4. Actualiza foto_url en DB y devuelve el usuario actualizado.
 */
router.post('/photo', uploadPhoto, async (req, res, next) => {
  try {
    const [[user]] = await pool.execute(
      'SELECT id, foto_url FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Redimensionar y convertir a WebP para tamaño consistente y óptimo
    const processedBuffer = await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Subir a S3
    const photoUrl = await uploadProfilePhoto(processedBuffer, req.user.userId, 'image/webp');

    // Eliminar foto anterior (no bloquea si falla)
    await deleteProfilePhoto(user.foto_url);

    // Actualizar DB
    await pool.execute('UPDATE users SET foto_url = ? WHERE id = ?', [photoUrl, user.id]);

    const [[updated]] = await pool.execute('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ success: true, photoUrl, user: formatUser(updated) });
  } catch (err) { next(err); }
});

module.exports = router;
