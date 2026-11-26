require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/mysql');

const PASSWORD = 'Password123!';
const TIME_ZONE = 'America/Bogota';
const APPLY = process.argv.includes('--apply');
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const TARGETS = [
  { cedula: '1234567890', role: 'paciente' },
  { cedula: '1000100001', role: 'medico', specialty: 'Medicina General' },
  { cedula: '1000100002', role: 'medico', specialty: 'Ginecologia' },
  { cedula: '1000100003', role: 'medico', specialty: 'Pediatria' },
  { cedula: '1000100004', role: 'medico', specialty: 'Cardiologia' },
  { cedula: '1000100005', role: 'medico', specialty: 'Dermatologia' },
  { cedula: '1000100006', role: 'medico', specialty: 'Odontologia' },
  { cedula: '1000100007', role: 'medico', specialty: 'Oftalmologia' },
  { cedula: '1000100008', role: 'medico', specialty: 'Psicologia' },
  { cedula: '9999999999', role: 'admin' },
];
const TABLES_TO_UPDATE = [
  'users',
  'doctor_disponibilidad',
  'appointments',
  'medical_history',
  'medications',
  'medication_taken_log',
  'health_metrics',
  'authorizations',
  'renewal_requests',
];

const pad2 = (value) => String(value).padStart(2, '0');

function bogotaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
    time: `${values.hour}:${values.minute}`,
  };
}

function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function dayName(date) {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

function rotatedOffsets(index, start, end) {
  const count = end - start + 1;
  return Array.from({ length: count }, (_, position) => start + ((index + position) % count));
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function minutesOf(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function shiftTime(time, minutes) {
  const [hours, mins, seconds = '00'] = String(time).split(':');
  return `${pad2(Number(hours))}:${pad2(Number(mins))}:${pad2(Number(seconds))}`;
}

function formatPlan(plan, now) {
  console.log(`Base de datos: ${plan.database}`);
  console.log(`Fecha/hora America/Bogota: ${now.date} ${now.time}`);
  console.log(`Usuarios existentes: ${plan.users.length} (IDs y relaciones se conservan)`);
  console.log(`Cuentas demo verificadas: ${TARGETS.length}`);
  for (const [table, count] of Object.entries(plan.counts)) {
    const change = table === 'doctor_disponibilidad' && plan.demoAvailabilitySlot
      ? 'filas existentes intactas; se agregaría 1 franja'
      : 'filas existentes; se actualizarían sin borrar';
    console.log(`  ${table}: ${count} ${change}`);
  }
  console.log(`Citas completadas recientes: ${plan.appointments.filter((row) => row.estado === 'completada').length}`);
  console.log(`Citas para hoy: ${plan.todayAppointment ? 1 : 0}`);
  if (plan.todayAppointment) {
    console.log(
      `  Paciente 1234567890: ${plan.todayAppointment.doctorName}, ` +
      `${plan.todayAppointment.date} ${plan.todayAppointment.time}, ${plan.todayAppointment.sedeNombre}`
    );
  }
  console.log(`Citas pendientes/confirmadas futuras: ${plan.appointments.filter((row) => ['pendiente', 'confirmada'].includes(row.estado)).length - (plan.todayAppointment ? 1 : 0)}`);
  console.log(`Franjas semanales existentes: ${plan.slotCount} (son recurrentes, no fechas concretas)`);
  if (plan.demoAvailabilitySlot) {
    console.log(
      `Franja semanal demo adicional: ${plan.demoAvailabilitySlot.dia} ` +
      `${plan.demoAvailabilitySlot.hora} para ${plan.demoAvailabilitySlot.doctorName} ` +
      `en ${plan.demoAvailabilitySlot.sedeNombre} (se repetirá cada semana)`
    );
  }
  for (const blocker of plan.blockers) console.warn(`[BLOQUEO] ${blocker}`);
}

async function loadPlan(connection, locking) {
  const lockSuffix = locking ? ' FOR UPDATE' : '';
  const [[databaseRow]] = await connection.query('SELECT DATABASE() AS name');
  if (databaseRow.name !== (process.env.DB_NAME || 'eps_db')) {
    throw new Error(`La conexión apunta a "${databaseRow.name}", no a la base esperada.`);
  }

  const [users] = await connection.query(
    `SELECT id, cedula, role, activo, medico_id FROM users ORDER BY id${lockSuffix}`
  );
  const [doctors] = await connection.query(
    `SELECT d.id, d.user_id, d.especialidad_id, d.nombre, s.nombre AS specialty
     FROM doctors d
     JOIN specialties s ON s.id = d.especialidad_id
     ORDER BY d.id${lockSuffix}`
  );
  const [doctorLocations] = await connection.query(
    `SELECT ds.doctor_id, ds.sede_id, l.nombre AS sede_nombre, l.horario AS sede_horario
     FROM doctor_sedes ds
     JOIN locations l ON l.id = ds.sede_id
     ORDER BY ds.doctor_id, ds.sede_id${lockSuffix}`
  );
  const [availability] = await connection.query(
    `SELECT doctor_id, dia, hora FROM doctor_disponibilidad ORDER BY doctor_id, dia, hora${lockSuffix}`
  );
  const [appointments] = await connection.query(
    `SELECT id, user_id, especialidad_id, especialidad_nombre, medico_id, medico_nombre,
            sede_id, sede_nombre, fecha, hora, estado
     FROM appointments ORDER BY id${lockSuffix}`
  );
  const [history] = await connection.query(
    `SELECT id, user_id, medico FROM medical_history ORDER BY id${lockSuffix}`
  );
  const [medications] = await connection.query(
    `SELECT id, fecha_fin FROM medications ORDER BY id${lockSuffix}`
  );
  const [medicationLogs] = await connection.query(
    `SELECT id, DATE_FORMAT(taken_at, '%H:%i:%s') AS taken_time
     FROM medication_taken_log ORDER BY id${lockSuffix}`
  );
  const [metrics] = await connection.query(
    `SELECT id, hora, DATE_FORMAT(created_at, '%H:%i:%s') AS created_time
     FROM health_metrics ORDER BY id${lockSuffix}`
  );
  const [authorizations] = await connection.query(
    `SELECT id, estado FROM authorizations ORDER BY id${lockSuffix}`
  );
  const [renewals] = await connection.query(
    `SELECT id, estado FROM renewal_requests ORDER BY id${lockSuffix}`
  );

  const userByCedula = new Map(users.map((user) => [user.cedula, user]));
  const doctorByUser = new Map(doctors.map((doctor) => [String(doctor.user_id), doctor]));
  const blockers = [];
  for (const target of TARGETS) {
    const user = userByCedula.get(target.cedula);
    if (!user || user.role !== target.role) {
      blockers.push(`No existe la cédula ${target.cedula} con rol ${target.role}; no se crearán usuarios.`);
      continue;
    }
    if (target.role === 'medico') {
      const doctor = doctorByUser.get(String(user.id));
      if (!doctor || String(user.medico_id) !== String(doctor.id)
          || normalize(doctor.specialty) !== normalize(target.specialty)) {
        blockers.push(`La relación médico/especialidad de ${target.cedula} no coincide con lo esperado.`);
      }
    }
  }

  const doctorById = new Map(doctors.map((doctor) => [String(doctor.id), doctor]));
  const locationByDoctor = new Map();
  for (const location of doctorLocations) {
    const key = String(location.doctor_id);
    if (!locationByDoctor.has(key)) locationByDoctor.set(key, []);
    locationByDoctor.get(key).push(location);
  }
  const slotsByDoctorAndDay = new Map();
  for (const row of availability) {
    const key = String(row.doctor_id);
    if (!slotsByDoctorAndDay.has(key)) slotsByDoctorAndDay.set(key, new Map());
    const times = slotsByDoctorAndDay.get(key);
    if (!times.has(row.dia)) times.set(row.dia, []);
    times.get(row.dia).push(String(row.hora).slice(0, 5));
  }

  const demoPatient = userByCedula.get('1234567890');
  const todayRows = appointments
    .filter((row) => String(row.user_id) === String(demoPatient?.id)
      && ['pendiente', 'confirmada'].includes(row.estado))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  if (!todayRows.length) blockers.push('El paciente demo no tiene una cita pendiente/confirmada que se pueda reutilizar.');
  for (const target of TARGETS.filter((item) => item.role === 'medico')) {
    const user = userByCedula.get(target.cedula);
    const doctor = user && doctorByUser.get(String(user.id));
    if (!doctor || !slotsByDoctorAndDay.has(String(doctor.id))) {
      blockers.push(`No hay agenda semanal para el médico ${target.cedula}.`);
    }
  }

  const occupied = new Set();
  const planByAppointmentId = new Map();
  const now = bogotaNow();
  let demoAvailabilitySlot = null;
  const preferredDoctorOrder = (preferredId) => {
    const preferred = String(preferredId || '');
    return [
      ...doctors.filter((doctor) => String(doctor.id) === preferred),
      ...doctors.filter((doctor) => String(doctor.id) !== preferred),
    ];
  };
  const chooseSlot = (appointment, dates, requireFutureToday) => {
    for (const date of dates) {
      for (const doctor of preferredDoctorOrder(appointment.medico_id)) {
        const slots = slotsByDoctorAndDay.get(String(doctor.id))?.get(dayName(date)) || [];
        for (const time of slots) {
          if (requireFutureToday && date === now.date && minutesOf(time) <= now.minutes) continue;
          const slotKey = `${doctor.id}|${date}|${time}`;
          if (occupied.has(slotKey)) continue;
          const locations = locationByDoctor.get(String(doctor.id)) || [];
          if (!locations.length) continue;
          const location = locations.find((item) => String(item.sede_id) === String(appointment.sede_id))
            || locations[0];
          if (appointment.estado !== 'cancelada') occupied.add(slotKey);
          return { date, time, doctor, location };
        }
      }
    }
    return null;
  };

  let todayAppointment = null;
  if (todayRows.length) {
    const candidate = todayRows[0];
    todayAppointment = chooseSlot(candidate, [now.date], true);
    if (!todayAppointment && !['sabado', 'domingo'].includes(dayName(now.date))
        && now.minutes < minutesOf('18:30')) {
      const demoDoctor = doctorByUser.get(String(userByCedula.get('1000100001')?.id));
      const demoLocation = (locationByDoctor.get(String(demoDoctor?.id)) || [])
        .find((location) => location.sede_id === 'norte'
          && String(location.sede_horario || '').includes('20:00'));
      const day = dayName(now.date);
      const existingTimes = slotsByDoctorAndDay.get(String(demoDoctor?.id))?.get(day) || [];
      if (demoDoctor && demoLocation && !existingTimes.includes('18:30')) {
        demoAvailabilitySlot = {
          doctorId: demoDoctor.id,
          doctorName: demoDoctor.nombre,
          dia: day,
          hora: '18:30:00',
          sedeNombre: demoLocation.sede_nombre,
        };
        if (!slotsByDoctorAndDay.has(String(demoDoctor.id))) {
          slotsByDoctorAndDay.set(String(demoDoctor.id), new Map());
        }
        const doctorDays = slotsByDoctorAndDay.get(String(demoDoctor.id));
        if (!doctorDays.has(day)) doctorDays.set(day, []);
        doctorDays.get(day).push('18:30');
        doctorDays.get(day).sort();
        todayAppointment = chooseSlot(candidate, [now.date], true);
      }
    }
    if (!todayAppointment) {
      blockers.push(
        `No hay una franja semanal libre después de ${now.time} para hoy; ` +
        'no se generará una cita de hoy en una hora pasada ni fuera del horario registrado.'
      );
    } else {
      planByAppointmentId.set(String(candidate.id), todayAppointment);
    }
  }

  for (let index = 0; index < appointments.length; index += 1) {
    const appointment = appointments[index];
    const id = String(appointment.id);
    if (planByAppointmentId.has(id)) continue;
    const offsets = ['completada', 'cancelada'].includes(appointment.estado)
      ? rotatedOffsets(index, 3, 7).map((days) => -days)
      : rotatedOffsets(index, 7, 15);
    const slot = chooseSlot(
      appointment,
      offsets.map((days) => addDays(now.date, days)),
      false
    );
    if (!slot) {
      blockers.push(`No se pudo asignar una franja semanal sin colisión a la cita ${id}.`);
      continue;
    }
    planByAppointmentId.set(id, slot);
  }

  const appointmentUpdates = appointments
    .filter((row) => planByAppointmentId.has(String(row.id)))
    .map((row) => {
      const slot = planByAppointmentId.get(String(row.id));
      const createdDate = ['completada', 'cancelada'].includes(row.estado)
        ? addDays(slot.date, -1)
        : now.date;
      return {
        id: row.id,
        user_id: row.user_id,
        medico_id: slot.doctor.id,
        medico_nombre: slot.doctor.nombre,
        especialidad_id: slot.doctor.especialidad_id,
        especialidad_nombre: slot.doctor.specialty,
        sede_id: slot.location.sede_id,
        sede_nombre: slot.location.sede_nombre,
        fecha: slot.date,
        hora: shiftTime(slot.time, 0),
        created_at: `${createdDate} 08:00:00`,
        estado: row.estado,
      };
    });

  const completedDates = new Map();
  for (const update of appointmentUpdates.filter((row) => row.estado === 'completada')) {
    const doctor = doctorById.get(String(update.medico_id));
    const key = `${update.user_id}|${normalize(doctor?.nombre)}`;
    if (!completedDates.has(key)) completedDates.set(key, []);
    completedDates.get(key).push(update.fecha);
  }
  const historyUpdates = history.map((row, index) => {
    const key = `${row.user_id}|${normalize(row.medico)}`;
    const linkedDates = completedDates.get(key);
    const linkedDate = linkedDates?.length ? linkedDates.shift() : null;
    return { id: row.id, fecha: linkedDate || addDays(now.date, -rotatedOffsets(index, 3, 7)[0]) };
  });
  const medicationUpdates = medications.map((row, index) => ({
    id: row.id,
    fecha_inicio: addDays(now.date, -(7 + (index % 8))),
    fecha_fin: row.fecha_fin == null ? null : addDays(now.date, 30),
  }));
  const medicationLogUpdates = medicationLogs.map((row, index) => ({
    id: row.id,
    fecha: addDays(now.date, -(index % 7)),
    taken_at: `${addDays(now.date, -(index % 7))} ${row.taken_time || '08:00:00'}`,
  }));
  const metricUpdates = metrics.map((row, index) => {
    const fecha = addDays(now.date, -(index % 31));
    const time = String(row.hora || row.created_time || '12:00:00').slice(0, 8);
    return { id: row.id, fecha, created_at: `${fecha} ${time}` };
  });
  const authorizationUpdates = authorizations.map((row, index) => {
    const requestDate = addDays(now.date, -(1 + (index % 14)));
    const answered = row.estado !== 'pendiente';
    return {
      id: row.id,
      created_at: `${requestDate} 09:00:00`,
      fecha_solicitud: requestDate,
      fecha_respuesta: answered ? requestDate : null,
      fecha_vencimiento: row.estado === 'aprobada' ? addDays(now.date, 30) : null,
    };
  });
  const renewalUpdates = renewals.map((row, index) => {
    const created = addDays(now.date, -(1 + (index % 7)));
    return {
      id: row.id,
      created_at: `${created} 09:00:00`,
      fecha_respuesta: row.estado === 'pendiente' ? null : `${now.date} 10:00:00`,
    };
  });
  const counts = {};
  for (const table of TABLES_TO_UPDATE) {
    const [[result]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    counts[table] = Number(result.count);
  }

  return {
    database: databaseRow.name,
    users,
    doctors,
    appointments: appointmentUpdates,
    history: historyUpdates,
    medications: medicationUpdates,
    medicationLogs: medicationLogUpdates,
    metrics: metricUpdates,
    authorizations: authorizationUpdates,
    renewals: renewalUpdates,
    counts,
    slotCount: availability.length,
    demoAvailabilitySlot,
    todayAppointment: todayAppointment && todayRows.length > 0 ? {
      date: todayAppointment.date,
      time: todayAppointment.time,
      doctorName: todayAppointment.doctor.nombre,
      sedeNombre: todayAppointment.location.sede_nombre,
    } : null,
    blockers,
    now,
  };
}

async function userSnapshot(connection) {
  const [rows] = await connection.query(
    'SELECT id, cedula, role, medico_id FROM users ORDER BY id'
  );
  return JSON.stringify(rows);
}

async function checkForeignKeys(connection) {
  const checks = [
    [`appointments`, `SELECT COUNT(*) AS count FROM appointments a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN doctors d ON d.id = a.medico_id
      LEFT JOIN specialties s ON s.id = a.especialidad_id
      LEFT JOIN locations l ON l.id = a.sede_id
      WHERE u.id IS NULL OR d.id IS NULL OR s.id IS NULL OR l.id IS NULL`],
    [`doctor_disponibilidad`, `SELECT COUNT(*) AS count FROM doctor_disponibilidad x
      LEFT JOIN doctors d ON d.id = x.doctor_id WHERE d.id IS NULL`],
    [`medical_history`, `SELECT COUNT(*) AS count FROM medical_history x
      LEFT JOIN users u ON u.id = x.user_id WHERE u.id IS NULL`],
    [`medications`, `SELECT COUNT(*) AS count FROM medications x
      LEFT JOIN users u ON u.id = x.user_id WHERE u.id IS NULL`],
    [`medication_taken_log`, `SELECT COUNT(*) AS count FROM medication_taken_log x
      LEFT JOIN users u ON u.id = x.user_id
      LEFT JOIN medications m ON m.id = x.medication_id
      WHERE u.id IS NULL OR m.id IS NULL`],
    [`health_metrics`, `SELECT COUNT(*) AS count FROM health_metrics x
      LEFT JOIN users u ON u.id = x.user_id WHERE u.id IS NULL`],
    [`authorizations`, `SELECT COUNT(*) AS count FROM authorizations x
      LEFT JOIN users u ON u.id = x.user_id
      LEFT JOIN doctors d ON d.id = x.medico_id
      WHERE u.id IS NULL OR d.id IS NULL`],
    [`renewal_requests`, `SELECT COUNT(*) AS count FROM renewal_requests x
      LEFT JOIN users u ON u.id = x.user_id
      LEFT JOIN medications m ON m.id = x.medication_id
      LEFT JOIN doctors d ON d.id = x.medico_id
      WHERE u.id IS NULL OR m.id IS NULL OR (x.medico_id IS NOT NULL AND d.id IS NULL)`],
  ];
  const failures = [];
  for (const [table, sql] of checks) {
    const [[result]] = await connection.query(sql);
    if (Number(result.count) !== 0) failures.push(`${table}: ${result.count} referencias huérfanas`);
  }
  return failures;
}

async function applyPlan(connection, plan) {
  if (plan.blockers.length) {
    throw new Error('Preflight bloqueado: hay requisitos pendientes; no se escribió ningún dato.');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  if (plan.demoAvailabilitySlot) {
    await connection.execute(
      'INSERT INTO doctor_disponibilidad (doctor_id, dia, hora) VALUES (?, ?, ?)',
      [plan.demoAvailabilitySlot.doctorId, plan.demoAvailabilitySlot.dia, plan.demoAvailabilitySlot.hora]
    );
  }
  await connection.execute(
    `UPDATE users
     SET password_hash = ?, activo = 1, intentos_fallidos = 0,
         bloqueado_hasta = NULL, reset_code = NULL, reset_code_expires = NULL`,
    [passwordHash]
  );
  for (const row of plan.appointments) {
    await connection.execute(
      `UPDATE appointments
       SET fecha = ?, hora = ?, created_at = ?, medico_id = ?, medico_nombre = ?,
           especialidad_id = ?, especialidad_nombre = ?, sede_id = ?, sede_nombre = ?
       WHERE id = ?`,
      [row.fecha, row.hora, row.created_at, row.medico_id, row.medico_nombre,
        row.especialidad_id, row.especialidad_nombre, row.sede_id, row.sede_nombre, row.id]
    );
  }
  for (const row of plan.history) {
    await connection.execute('UPDATE medical_history SET fecha = ? WHERE id = ?', [row.fecha, row.id]);
  }
  for (const row of plan.medications) {
    await connection.execute(
      'UPDATE medications SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?',
      [row.fecha_inicio, row.fecha_fin, row.id]
    );
  }
  for (const row of plan.medicationLogs) {
    await connection.execute(
      'UPDATE medication_taken_log SET fecha = ?, taken_at = ? WHERE id = ?',
      [row.fecha, row.taken_at, row.id]
    );
  }
  for (const row of plan.metrics) {
    await connection.execute(
      'UPDATE health_metrics SET fecha = ?, created_at = ? WHERE id = ?',
      [row.fecha, row.created_at, row.id]
    );
  }
  for (const row of plan.authorizations) {
    await connection.execute(
      `UPDATE authorizations
       SET created_at = ?, fecha_solicitud = ?, fecha_respuesta = ?, fecha_vencimiento = ?
       WHERE id = ?`,
      [row.created_at, row.fecha_solicitud, row.fecha_respuesta, row.fecha_vencimiento, row.id]
    );
  }
  for (const row of plan.renewals) {
    await connection.execute(
      'UPDATE renewal_requests SET created_at = ?, fecha_respuesta = ? WHERE id = ?',
      [row.created_at, row.fecha_respuesta, row.id]
    );
  }

  const [accounts] = await connection.query(
    `SELECT cedula, role, activo, intentos_fallidos, bloqueado_hasta, password_hash
     FROM users WHERE cedula IN (${TARGETS.map(() => '?').join(',')})`,
    TARGETS.map((target) => target.cedula)
  );
  const [[invalidUserState]] = await connection.query(
    `SELECT COUNT(*) AS count FROM users
     WHERE activo <> 1 OR intentos_fallidos <> 0 OR bloqueado_hasta IS NOT NULL`
  );
  if (Number(invalidUserState.count) !== 0) {
    throw new Error('Quedaron usuarios inactivos, bloqueados o con intentos fallidos.');
  }
  const [allUsers] = await connection.query('SELECT password_hash FROM users');
  for (const user of allUsers) {
    if (!(await bcrypt.compare(PASSWORD, user.password_hash))) {
      throw new Error('La contraseña de demostración no pasó la verificación para todos los usuarios.');
    }
  }
  for (const target of TARGETS) {
    const account = accounts.find((row) => row.cedula === target.cedula);
    if (!account || account.role !== target.role || !account.activo
        || account.intentos_fallidos !== 0 || account.bloqueado_hasta
        || !(await bcrypt.compare(PASSWORD, account.password_hash))) {
      throw new Error(`Falló la verificación de autenticación de la cédula ${target.cedula}.`);
    }
  }

  const afterSnapshot = await userSnapshot(connection);
  if (afterSnapshot !== plan.userSnapshot) {
    throw new Error('Cambió la identidad o relación de algún usuario; se revertirá la transacción.');
  }
  for (const table of TABLES_TO_UPDATE) {
    const [[result]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    const expectedCount = plan.counts[table]
      + (table === 'doctor_disponibilidad' && plan.demoAvailabilitySlot ? 1 : 0);
    if (Number(result.count) !== expectedCount) {
      throw new Error(`Cambió el número de registros de ${table}; se revertirá la transacción.`);
    }
  }
  const fkFailures = await checkForeignKeys(connection);
  if (fkFailures.length) throw new Error(fkFailures.join('; '));
}

async function main() {
  const connection = await pool.getConnection();
  try {
    if (APPLY) await connection.beginTransaction();
    const plan = await loadPlan(connection, APPLY);
    plan.userSnapshot = JSON.stringify(plan.users.map((user) => ({
      id: user.id,
      cedula: user.cedula,
      role: user.role,
      medico_id: user.medico_id,
    })));
    formatPlan(plan, plan.now);

    if (!APPLY) {
      console.log('\nVista previa de solo lectura; no se modificó la base.');
      console.log('Tablas que actualizaría:', TABLES_TO_UPDATE.join(', '));
      console.log('Para aplicar: node database/prepare_demo_today.js --apply');
      return;
    }

    await applyPlan(connection, plan);
    await connection.commit();
    console.log('\nCambios aplicados y verificados: hashes bcrypt, estado de cuentas, IDs, conteos y llaves foráneas.');
  } catch (error) {
    if (APPLY) await connection.rollback();
    console.error(`[${APPLY ? 'ROLLBACK' : 'ERROR'}] ${error.message}`);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
