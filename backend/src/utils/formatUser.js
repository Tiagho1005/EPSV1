// Convierte Date de MySQL a string YYYY-MM-DD
const formatDate = (d) => {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return d;
};

// Formatea una fila de MySQL al shape que espera el frontend.
// MySQL devuelve Date objects para DATE/DATETIME y 1/0 para TINYINT(1).
const formatUser = (u) => {
  const nombre = u.nombre || '';
  const apellido = u.apellido || '';
  const nombreCompleto = `${nombre} ${apellido}`.trim();

  return {
    id: u.id,
    cedula: u.cedula,
    nombre,
    apellido,
    nombreCompleto,
    email: u.email,
    celular: u.celular || null,
    fechaNacimiento: formatDate(u.fecha_nacimiento),
    departamento: u.departamento || '',
    municipio: u.municipio || '',
    direccion: u.direccion || '',
    fotoUrl: u.foto_url || null,
    fechaRegistro: formatDate(u.fecha_registro),
    activo: u.activo === 1 || u.activo === true,
    role: u.role || 'paciente',
    medicoId: u.medico_id || null,
    reminderPreferences: {
      email_enabled: u.reminder_email === 1 || u.reminder_email === true,
      advance_minutes: u.reminder_advance_min ?? 15,
    },
  };
};

module.exports = formatUser;
