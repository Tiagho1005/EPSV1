/**
 * Middleware de autorización por rol.
 * Debe usarse después del middleware de autenticación (auth.js).
 *
 * Roles disponibles: 'paciente' | 'admin'
 *
 * Uso: router.get('/ruta', authMiddleware, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  const userRole = req.user?.role || 'paciente';
  if (!roles.includes(userRole)) {
    return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
  }
  next();
};

module.exports = requireRole;
