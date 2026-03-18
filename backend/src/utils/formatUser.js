const formatUser = (u) => {
  const nombre = u.nombre || '';
  const apellido = u.apellido || '';
  const nombreCompleto = u.nombreCompleto || `${nombre} ${apellido}`.trim();

  return {
    id: u.id,
    cedula: u.cedula,
    nombre: nombre || nombreCompleto.split(' ')[0],
    apellido: apellido,
    nombreCompleto: nombreCompleto,
    email: u.email,
    celular: u.celular,
    fechaNacimiento: u.fecha_nacimiento,
    departamento: u.departamento,
    municipio: u.municipio,
    direccion: u.direccion,
    fotoUrl: u.foto_url,
    fechaRegistro: u.fecha_registro,
    activo: u.activo,
    role: u.role || 'paciente',
    medicoId: u.medico_id || null,
  };
};

module.exports = formatUser;
