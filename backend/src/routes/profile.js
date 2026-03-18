const router = require('express').Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { getStore, save } = require('../config/db');
const formatUser = require('../utils/formatUser');

router.use(auth);

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB en base64 ~2.7MB de chars, este límite es razonable
const PASSWORD_HISTORY_LIMIT = 5;

router.put('/', (req, res, next) => {
  try {
    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { nombre, apellido, nombreCompleto, email, celular, fechaNacimiento, departamento, municipio, direccion, fotoUrl } = req.body;

    if (store.users.find(u => u.email === email && u.id !== user.id)) {
      return res.status(400).json({ error: 'Este correo ya esta en uso' });
    }

    // Handle names
    let finalNombre = nombre || user.nombre;
    let finalApellido = apellido !== undefined ? apellido : user.apellido;
    let finalNombreCompleto = nombreCompleto || user.nombreCompleto;

    if (nombreCompleto && !nombre) {
      const parts = nombreCompleto.trim().split(' ');
      finalNombre = parts[0];
      finalApellido = parts.slice(1).join(' ');
    } else if (nombre && !nombreCompleto) {
      finalNombreCompleto = `${nombre} ${finalApellido}`.trim();
    }

    // Validar tamaño de foto (base64 data URL)
    if (fotoUrl && fotoUrl.startsWith('data:') && fotoUrl.length > MAX_PHOTO_BYTES * 1.37) {
      return res.status(400).json({ error: 'La foto es demasiado grande. Máximo 2 MB.' });
    }

    Object.assign(user, {
      nombre: finalNombre,
      apellido: finalApellido,
      nombreCompleto: finalNombreCompleto,
      email,
      celular,
      fecha_nacimiento: fechaNacimiento,
      departamento,
      municipio,
      direccion,
      foto_url: fotoUrl !== undefined ? fotoUrl : user.foto_url,
    });
    save();
    res.json({ success: true, user: formatUser(user) });
  } catch (err) { next(err); }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const store = getStore();
    const user = store.users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'La contrasena actual es incorrecta' });
    }

    // Verificar que no sea igual a las últimas N contraseñas
    const history = user.password_history || [];
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res.status(400).json({ error: 'No puedes reutilizar una contraseña reciente. Elige una diferente.' });
      }
    }

    // Guardar hash actual en historial antes de cambiarlo
    user.password_history = [user.password_hash, ...history].slice(0, PASSWORD_HISTORY_LIMIT);
    user.password_hash = await bcrypt.hash(newPassword, 10);
    save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
