/**
 * Valida la fortaleza de una contraseña.
 * @returns {string|null} Mensaje de error, o null si es válida.
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return 'La contrasena es requerida';
  if (password.length < 8)               return 'La contrasena debe tener al menos 8 caracteres';
  if (/\s/.test(password))               return 'La contrasena no puede contener espacios';
  if (!/[A-Z]/.test(password))           return 'La contrasena debe tener al menos una letra mayuscula';
  if (!/[a-z]/.test(password))           return 'La contrasena debe tener al menos una letra minuscula';
  if (!/[0-9]/.test(password))           return 'La contrasena debe tener al menos un numero';
  if (!/[!@#$%^&*]/.test(password))      return 'La contrasena debe tener al menos un caracter especial (!@#$%^&*)';
  return null;
};

module.exports = { validatePassword };
