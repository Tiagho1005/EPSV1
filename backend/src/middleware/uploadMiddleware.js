'use strict';

const multer = require('multer');

// ── Constantes ────────────────────────────────────────────────

const MAX_SIZE_BYTES    = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES     = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ── Magic bytes para validación real del contenido ────────────
// No confiamos solo en Content-Type o en la extensión del archivo.
// Verificamos los primeros bytes del buffer (firma del formato).

const SIGNATURES = [
  {
    mime:  'image/jpeg',
    check: b => b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  },
  {
    mime:  'image/png',
    check: b => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  },
  {
    mime:  'image/webp',
    // RIFF????WEBP — bytes 0-3 = 'RIFF', bytes 8-11 = 'WEBP'
    check: b =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

function detectMimeFromBuffer(buf) {
  for (const { mime, check } of SIGNATURES) {
    if (check(buf)) return mime;
  }
  return null;
}

// ── Configuración de Multer ───────────────────────────────────

const _upload = multer({
  storage: multer.memoryStorage(),           // buffer en RAM — nunca toca disco
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files:    1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes JPEG, PNG o WebP.'));
    }
  },
}).single('photo');

// ── Middleware exportado ──────────────────────────────────────

/**
 * Middleware de subida de foto de perfil.
 * Pasos:
 *  1. Multer: parsea multipart, aplica límites y fileFilter por Content-Type.
 *  2. Validación de magic bytes: detecta el MIME real del buffer (segunda capa).
 *
 * Tras pasar este middleware, `req.file.buffer` contiene el buffer y
 * `req.file.detectedMime` contiene el MIME verificado por magic bytes.
 */
const uploadPhoto = (req, res, next) => {
  _upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo supera el límite de 2 MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo. Usa el campo "photo".' });
    }

    // Segunda capa: validar MIME real desde el contenido del buffer
    const realMime = detectMimeFromBuffer(req.file.buffer);
    if (!realMime || !ALLOWED_MIMES.has(realMime)) {
      return res.status(400).json({
        error: 'El contenido del archivo no es una imagen válida (JPEG, PNG o WebP).',
      });
    }

    req.file.detectedMime = realMime;
    next();
  });
};

module.exports = { uploadPhoto };
