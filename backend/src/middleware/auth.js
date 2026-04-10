const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../services/tokenBlacklist');

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET no está configurado. Deteniendo servidor.');
    process.exit(1);
  } else {
    console.warn('[WARN] JWT_SECRET no definido. Usando valor temporal solo para desarrollo.');
  }
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-local-dev';

/**
 * Extrae el JWT de la request en orden de prioridad:
 *  1. Cookie httpOnly `eps_token` — ruta segura principal.
 *  2. Header Authorization: Bearer — fallback para tests y clientes API externos.
 */
const getTokenFromRequest = (req) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('eps_token='));
    if (match) return decodeURIComponent(match.slice('eps_token='.length));
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
};

const authMiddleware = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.jti && await isBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Sesión cerrada. Inicia sesión nuevamente' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente' });
  }
};

module.exports = authMiddleware;
