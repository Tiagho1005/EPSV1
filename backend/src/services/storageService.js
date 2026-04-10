'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// ── Configuration ─────────────────────────────────────────────

const BUCKET  = process.env.AWS_S3_BUCKET;
const REGION  = process.env.AWS_REGION;
const FOLDER  = 'profile-photos';

const EXT_MAP = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

/** Lazy-initialised client — app boots even without S3 config. */
let _s3 = null;

function getS3Client() {
  if (_s3) return _s3;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !BUCKET || !REGION) {
    throw new Error(
      'Configuración de S3 incompleta. Verifica AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET y AWS_REGION.'
    );
  }

  const options = {
    region: REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  // Compatible con MinIO, Cloudflare R2, LocalStack, etc.
  if (process.env.AWS_ENDPOINT_URL) {
    options.endpoint        = process.env.AWS_ENDPOINT_URL;
    options.forcePathStyle  = true;
  }

  _s3 = new S3Client(options);
  return _s3;
}

/** Construye la URL pública base del bucket. */
function publicBaseUrl() {
  if (process.env.AWS_S3_PUBLIC_URL) return process.env.AWS_S3_PUBLIC_URL.replace(/\/$/, '');
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Sube una imagen al bucket S3 y devuelve su URL pública.
 *
 * @param {Buffer} buffer   Buffer de la imagen (ya procesada/comprimida).
 * @param {number} userId   ID del usuario, usado como prefijo del key.
 * @param {string} mime     MIME type real del buffer ('image/jpeg', etc.).
 * @returns {Promise<string>} URL pública del objeto subido.
 */
async function uploadProfilePhoto(buffer, userId, mime) {
  const ext = EXT_MAP[mime] || 'jpg';
  const key = `${FOLDER}/${userId}/${uuidv4()}.${ext}`;

  await getS3Client().send(new PutObjectCommand({
    Bucket:       BUCKET,
    Key:          key,
    Body:         buffer,
    ContentType:  mime,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return `${publicBaseUrl()}/${key}`;
}

/**
 * Elimina una foto de perfil anterior del bucket.
 * Ignora URLs base64 (formato antiguo) y URLs de dominios externos.
 * No lanza error si falla — el upload ya fue exitoso.
 *
 * @param {string|null} url URL de la foto a eliminar.
 */
async function deleteProfilePhoto(url) {
  if (!url || url.startsWith('data:')) return;

  const base = publicBaseUrl();
  if (!url.startsWith(base + '/')) return; // URL externa — no tocar

  try {
    const key = url.slice(base.length + 1);
    await getS3Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // No fatal: si falla el borrado, la foto quedará huérfana pero el flujo no se interrumpe.
  }
}

module.exports = { uploadProfilePhoto, deleteProfilePhoto };
