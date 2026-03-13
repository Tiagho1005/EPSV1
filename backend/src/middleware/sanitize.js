// Middleware de sanitización para prevenir XSS e inyección
const DANGEROUS_PATTERN = /<[^>]*>|javascript:|on\w+\s*=/gi;

const sanitizeValue = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(DANGEROUS_PATTERN, '').trim();
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }
  return sanitized;
};

module.exports = (_req, _res, next) => {
  // No sanitizar contraseñas ni tokens (son binarios/hashes)
  const skipFields = new Set(['password', 'newPassword', 'currentPassword', 'resetToken']);

  if (_req.body && typeof _req.body === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(_req.body)) {
      sanitized[key] = skipFields.has(key) ? value : sanitizeValue(value);
    }
    _req.body = sanitized;
  }

  next();
};
