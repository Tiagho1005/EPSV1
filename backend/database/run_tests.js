
const http = require('http');

const BASE = 'http://localhost:3001/api';
let passed = 0, failed = 0;
let adminToken = '', medicoToken = '', pacienteToken = '';
let createdAppointmentId = '', createdMetricId = '', createdAuthId = '';

const req = (method, path, body, token) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const url = new URL(BASE + path);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
    },
  };
  const r = http.request(options, (res) => {
    let raw = '';
    res.on('data', (c) => raw += c);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
      catch { resolve({ status: res.statusCode, body: raw }); }
    });
  });
  r.on('error', reject);
  if (data) r.write(data);
  r.end();
});

const check = (label, condition, detail) => {
  if (condition) {
    console.log('  ✅ ' + label);
    passed++;
  } else {
    console.log('  ❌ ' + label + (detail ? ' → ' + detail : ''));
    failed++;
  }
};

async function run() {
  console.log('\n🧪  Pruebas completas de la API — EPS V1 + MySQL');
  console.log('='.repeat(55));

  // ── 1. Health ──────────────────────────────────────────────
  console.log('\n📋 1. Health Check');
  try {
    const r = await req('GET', '/health');
    check('GET /health → 200', r.status === 200);
    check('status: ok', r.body.status === 'ok');
  } catch (e) {
    check('servidor alcanzable', false, e.message);
    console.log('\n❌  El servidor no está corriendo. Inicia con: node server.js');
    process.exit(1);
  }

  // ── 2. Auth ────────────────────────────────────────────────
  console.log('\n📋 2. Autenticación');

  // Login admin
  let r = await req('POST', '/auth/login', { cedula: '9999999999', password: 'Password123!' });
  check('Login admin → 200', r.status === 200, JSON.stringify(r.body));
  if (r.body.token) adminToken = r.body.token;
  check('Token recibido (admin)', !!adminToken);

  // Login medico
  r = await req('POST', '/auth/login', { cedula: '1000100001', password: 'Password123!' });
  check('Login médico → 200', r.status === 200, JSON.stringify(r.body));
  if (r.body.token) medicoToken = r.body.token;
  check('Token recibido (médico)', !!medicoToken);

  // Login paciente
  r = await req('POST', '/auth/login', { cedula: '1234567890', password: 'Password123!' });
  check('Login paciente → 200', r.status === 200, JSON.stringify(r.body));
  if (r.body.token) pacienteToken = r.body.token;
  const pacienteLoginBody = r.body.user || r.body;
  check('Token recibido (paciente)', !!pacienteToken);

  // Login fallido
  r = await req('POST', '/auth/login', { cedula: '9999999999', password: 'wrong' });
  check('Login inválido → 401/400', r.status === 401 || r.status === 400);

  // Sin token → 401
  r = await req('GET', '/appointments');
  check('Sin token → 401', r.status === 401);

  // ── 3. Catálogos ───────────────────────────────────────────
  console.log('\n📋 3. Catálogos');

  r = await req('GET', '/specialties', null, pacienteToken);
  check('GET /specialties → 200', r.status === 200);
  check('Array de especialidades', Array.isArray(r.body) && r.body.length > 0, 'len=' + (r.body?.length));

  r = await req('GET', '/locations', null, pacienteToken);
  check('GET /locations → 200', r.status === 200);
  check('Array de sedes', Array.isArray(r.body) && r.body.length > 0);

  r = await req('GET', '/departments', null, pacienteToken);
  check('GET /departments → 200', r.status === 200);
  check('Array de departamentos', Array.isArray(r.body) && r.body.length > 0);

  r = await req('GET', '/doctors', null, pacienteToken);
  check('GET /doctors → 200', r.status === 200);
  check('Array de médicos', Array.isArray(r.body) && r.body.length > 0);
  const firstDoctor = r.body[0];
  if (firstDoctor) {
    check('Doctor tiene sedes[]', Array.isArray(firstDoctor.sedes));
    check('Doctor tiene disponibilidad{}', typeof firstDoctor.disponibilidad === 'object');
  }

  // Available times
  if (firstDoctor) {
    r = await req('GET', '/doctors/' + firstDoctor.id + '/available-times?date=2026-05-10', null, pacienteToken);
    check('GET /doctors/:id/available-times → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));
  }

  // ── 4. Citas ───────────────────────────────────────────────
  console.log('\n📋 4. Citas (appointments)');

  r = await req('GET', '/appointments', null, pacienteToken);
  check('GET /appointments → 200', r.status === 200);
  check('Array de citas', Array.isArray(r.body));

  // Crear cita (el route usa camelCase en el body)
  const newApt = {
    especialidad: firstDoctor ? firstDoctor.especialidad : 'medicina-general',
    especialidadNombre: 'Medicina General',
    medicoId: firstDoctor ? firstDoctor.id : 'doc-1',
    medico: firstDoctor ? firstDoctor.nombre : 'Dr. Test',
    sedeId: firstDoctor?.sedes?.[0] || 'loc-1',
    sede: 'Sede Principal',
    fecha: '2026-06-15',
    hora: '09:00',
    notas: '',
  };
  r = await req('POST', '/appointments', newApt, pacienteToken);
  check('POST /appointments → 201', r.status === 201, JSON.stringify(r.body).slice(0,150));
  if (r.body.id || r.body.appointment?.id) {
    createdAppointmentId = r.body.id || r.body.appointment?.id;
    check('Cita creada con ID', !!createdAppointmentId);
  } else {
    check('Cita creada con ID', false, JSON.stringify(r.body).slice(0,100));
  }

  // Reagendar (PATCH)
  if (createdAppointmentId) {
    r = await req('PATCH', '/appointments/' + createdAppointmentId + '/reschedule',
      { newDate: '2026-06-20', newTime: '10:00' }, pacienteToken);
    check('PATCH /appointments/:id/reschedule → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));

    // Cancelar (PATCH)
    r = await req('PATCH', '/appointments/' + createdAppointmentId + '/cancel',
      { motivo: 'Test de prueba' }, pacienteToken);
    check('PATCH /appointments/:id/cancel → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));
  }

  // ── 5. Medicamentos ────────────────────────────────────────
  console.log('\n📋 5. Medicamentos');

  r = await req('GET', '/medications', null, pacienteToken);
  check('GET /medications → 200', r.status === 200);
  check('Array de medicamentos', Array.isArray(r.body));

  r = await req('GET', '/medications/taken-today', null, pacienteToken);
  check('GET /medications/taken-today → 200', r.status === 200);

  // ── 6. Historial médico ────────────────────────────────────
  console.log('\n📋 6. Historial Médico');

  r = await req('GET', '/medical-history', null, pacienteToken);
  check('GET /medical-history → 200', r.status === 200);
  check('Array de historial', Array.isArray(r.body));

  // ── 7. Perfil ──────────────────────────────────────────────
  console.log('\n📋 7. Perfil');

  // El perfil llega en el payload del login
  check('Perfil en login tiene nombre', !!pacienteLoginBody?.nombre);
  check('Perfil en login tiene cedula', !!pacienteLoginBody?.cedula);

  r = await req('PUT', '/profile/reminder-preferences',
    { email_enabled: true, advance_minutes: 30 }, pacienteToken);
  check('PUT /profile/reminder-preferences → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));

  // ── 8. Métricas de salud ───────────────────────────────────
  console.log('\n📋 8. Métricas de Salud');

  r = await req('GET', '/health-metrics', null, pacienteToken);
  check('GET /health-metrics → 200', r.status === 200);

  r = await req('GET', '/health-metrics/summary', null, pacienteToken);
  check('GET /health-metrics/summary → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));

  // Crear métrica
  const newMetric = {
    tipo: 'glucosa',
    valor: { valor: 95 },
    unidad: 'mg/dL',
    notas: 'En ayunas',
    fecha: '2026-04-02',
    hora: '07:30',
  };
  r = await req('POST', '/health-metrics', newMetric, pacienteToken);
  check('POST /health-metrics → 201', r.status === 201, JSON.stringify(r.body).slice(0,150));
  if (r.body.id || r.body.metric?.id) {
    createdMetricId = r.body.id || r.body.metric?.id;
  }

  // Presión arterial
  const newBP = {
    tipo: 'presion_arterial',
    valor: { sistolica: 120, diastolica: 80 },
    unidad: 'mmHg',
    notas: '',
    fecha: '2026-04-02',
    hora: '08:00',
  };
  r = await req('POST', '/health-metrics', newBP, pacienteToken);
  check('POST /health-metrics (presión) → 201', r.status === 201, JSON.stringify(r.body).slice(0,150));

  // Filtro por tipo
  r = await req('GET', '/health-metrics?tipo=glucosa', null, pacienteToken);
  check('GET /health-metrics?tipo=glucosa → 200', r.status === 200);

  // Eliminar (retorna 204 sin cuerpo)
  if (createdMetricId) {
    r = await req('DELETE', '/health-metrics/' + createdMetricId, null, pacienteToken);
    check('DELETE /health-metrics/:id → 204', r.status === 204, 'status=' + r.status);
  }

  // ── 9. Autorizaciones ──────────────────────────────────────
  console.log('\n📋 9. Autorizaciones');

  r = await req('GET', '/authorizations', null, pacienteToken);
  check('GET /authorizations → 200', r.status === 200);

  // POST /authorizations requiere rol médico
  const newAuth = {
    tipo: 'procedimiento',
    descripcion: 'Prueba de autorización',
    prioridad: 'normal',
    userId: '1',  // paciente con citas con el médico
  };
  r = await req('POST', '/authorizations', newAuth, medicoToken);
  check('POST /authorizations (médico) → 201', r.status === 201, JSON.stringify(r.body).slice(0,150));
  if (r.body.id || r.body.authorization?.id) {
    createdAuthId = r.body.id || r.body.authorization?.id;
  }
  // Paciente no puede crear autorización
  r = await req('POST', '/authorizations', newAuth, pacienteToken);
  check('POST /authorizations (paciente) → 403', r.status === 403);

  // ── 10. Portal Médico ──────────────────────────────────────
  console.log('\n📋 10. Portal Médico');

  if (medicoToken) {
    r = await req('GET', '/medico/dashboard', null, medicoToken);
    check('GET /medico/dashboard → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));

    r = await req('GET', '/medico/appointments', null, medicoToken);
    check('GET /medico/appointments → 200', r.status === 200);

    r = await req('GET', '/medico/renewals', null, medicoToken);
    check('GET /medico/renewals → 200', r.status === 200);

    // Rol incorrecto (paciente accede a ruta médico)
    r = await req('GET', '/medico/dashboard', null, pacienteToken);
    check('Paciente en ruta médico → 403', r.status === 403);
  } else {
    check('Portal médico (token disponible)', false, 'No se pudo hacer login de médico');
  }

  // ── 11. Portal Admin ───────────────────────────────────────
  console.log('\n📋 11. Portal Admin');

  if (adminToken) {
    r = await req('GET', '/admin/dashboard', null, adminToken);
    check('GET /admin/dashboard → 200', r.status === 200, JSON.stringify(r.body).slice(0,100));

    r = await req('GET', '/admin/users', null, adminToken);
    check('GET /admin/users → 200', r.status === 200);
    check('Array de usuarios', Array.isArray(r.body) && r.body.length > 0, 'len=' + r.body?.length);

    r = await req('GET', '/admin/doctors', null, adminToken);
    check('GET /admin/doctors → 200', r.status === 200);

    r = await req('GET', '/admin/locations', null, adminToken);
    check('GET /admin/locations → 200', r.status === 200);

    r = await req('GET', '/admin/specialties', null, adminToken);
    check('GET /admin/specialties → 200', r.status === 200);

    // Rol incorrecto (paciente accede a ruta admin)
    r = await req('GET', '/admin/dashboard', null, pacienteToken);
    check('Paciente en ruta admin → 403', r.status === 403);
  } else {
    check('Portal admin (token disponible)', false, 'No se pudo hacer login de admin');
  }

  // ── Resumen ────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n' + '='.repeat(55));
  console.log(`📊  Resultado: ${passed}/${total} pruebas pasaron`);
  if (failed > 0) {
    console.log(`⚠️   ${failed} pruebas fallaron — revisar detalles arriba`);
  } else {
    console.log('🎉  ¡Todas las pruebas pasaron!');
  }
  console.log('='.repeat(55) + '\n');
}

run().catch(e => {
  console.error('\n❌  Error fatal en pruebas:', e.message);
  process.exit(1);
});
