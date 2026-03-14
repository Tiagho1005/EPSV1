const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET no está configurado. Deteniendo servidor.');
    process.exit(1);
  } else {
    console.warn('[WARN] JWT_SECRET no definido. Usando valor temporal solo para desarrollo.');
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-local-dev';

// Blacklist en memoria de JTIs invalidados (logout).
// En producción reemplazar por Redis u otro store persistente.
const tokenBlacklist = new Set();

const addToBlacklist = (jti) => tokenBlacklist.add(jti);

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente' });
  }
};

authMiddleware.addToBlacklist = addToBlacklist;

module.exports = authMiddleware;
