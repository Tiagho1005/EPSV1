/**
 * ============================================================
 *  Migración de datos: db.json → MySQL
 *  Ejecutar UNA SOLA VEZ: node backend/database/migrate_data.js
 *
 *  ⚠️  Antes de ejecutar:
 *    1. El servidor NO debe estar corriendo.
 *    2. Las tablas deben estar vacías (o el script saltará duplicados).
 *    3. El .env debe tener las credenciales correctas.
 * ============================================================
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

// Convierte undefined a null (mysql2 no acepta undefined como parámetro)
const n = (v) => (v === undefined ? null : v);

const fmtDate = (d) => {
  if (!d) return null;
  return String(d).split('T')[0];   // 'YYYY-MM-DD'
};

const fmtTime = (t) => {
  if (!t) return null;
  return String(t).slice(0, 5);     // 'HH:MM'
};

const fmtDT = (dt) => {
  if (!dt) return null;
  return dt.replace('T', ' ').slice(0, 19);  // 'YYYY-MM-DD HH:MM:SS'
};

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌  No se encontró db.json en', DB_PATH);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'eps_db',
    multipleStatements: false,
  });

  let ok = 0, skip = 0, err = 0;
  const log = (msg) => console.log(msg);
  const safe = async (label, fn) => {
    try { await fn(); ok++; }
    catch (e) {
      if (e.code === 'ER_DUP_ENTRY') { skip++; }
      else { err++; console.error(`  ⚠️  ${label}: ${e.message}`); }
    }
  };

  // ── 1. specialties ────────────────────────────────────────────────────────
  log('\n📋  Migrando specialties...');
  for (const s of (db.specialties || [])) {
    await safe(`specialty ${s.id}`, () => conn.execute(
      'INSERT INTO specialties (id,nombre,icono,descripcion) VALUES (?,?,?,?)',
      [s.id, s.nombre, s.icono || null, s.descripcion || null]
    ));
  }
  log(`   specialties → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 2. locations ──────────────────────────────────────────────────────────
  log('📋  Migrando locations...');
  for (const l of (db.locations || [])) {
    await safe(`location ${l.id}`, () => conn.execute(
      'INSERT INTO locations (id,nombre,direccion,telefono,horario,lat,lng) VALUES (?,?,?,?,?,?,?)',
      [l.id, l.nombre, l.direccion || null, l.telefono || null, l.horario || null, l.lat || null, l.lng || null]
    ));
  }
  log(`   locations → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 3. departments + municipalities ───────────────────────────────────────
  log('📋  Migrando departments y municipalities...');
  for (const d of (db.departments || [])) {
    await safe(`dept ${d.id}`, () => conn.execute(
      'INSERT INTO departments (id,nombre) VALUES (?,?)',
      [d.id, d.nombre]
    ));
    for (const muni of (d.municipios || [])) {
      await safe(`muni ${muni}`, () => conn.execute(
        'INSERT INTO municipalities (department_id,nombre) VALUES (?,?)',
        [d.id, muni]
      ));
    }
  }
  log(`   departments/municipalities → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 4. users (sin FK circular medico_id por ahora) ────────────────────────
  log('📋  Migrando users...');
  for (const u of (db.users || [])) {
    const reminderEmail = u.reminder_preferences?.email_enabled !== false ? 1 : 0;
    const reminderMin   = u.reminder_preferences?.advance_minutes ?? 15;
    await safe(`user ${u.id}`, () => conn.execute(
      `INSERT INTO users
         (id,cedula,nombre,apellido,email,celular,fecha_nacimiento,departamento,municipio,
          direccion,foto_url,password_hash,role,activo,intentos_fallidos,bloqueado_hasta,
          reset_code,reset_code_expires,fecha_registro,reminder_email,reminder_advance_min,
          medico_id,password_history)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)`,
      [
        u.id, u.cedula, u.nombre || '', u.apellido || '',
        n(u.email) || `sin_email_${u.id}@pendiente.com`, n(u.celular),
        fmtDate(u.fecha_nacimiento),
        u.departamento || '', u.municipio || '', u.direccion || '',
        n(u.foto_url),
        u.password_hash,
        u.role || 'paciente',
        u.activo ? 1 : 0,
        u.intentos_fallidos || 0,
        fmtDT(u.bloqueado_hasta),
        n(u.reset_code),
        fmtDT(u.reset_code_expires),
        fmtDate(u.fecha_registro) || new Date().toISOString().split('T')[0],
        reminderEmail, reminderMin,
      ]
    ));
  }
  log(`   users → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 5. doctors ────────────────────────────────────────────────────────────
  log('📋  Migrando doctors...');
  for (const d of (db.doctors || [])) {
    // Buscar user_id (el usuario médico que apunta a este doctor)
    const userForDoctor = (db.users || []).find(u => u.medico_id === d.id);
    await safe(`doctor ${d.id}`, () => conn.execute(
      'INSERT INTO doctors (id,user_id,especialidad_id,nombre,foto,experiencia,rating) VALUES (?,?,?,?,?,?,?)',
      [d.id, userForDoctor?.id || null, d.especialidad_id, d.nombre, d.foto || null, d.experiencia || 0, d.rating || 5.0]
    ));
    // Sedes
    for (const sedeId of (d.sedes || [])) {
      await safe(`doctor_sede ${d.id}-${sedeId}`, () => conn.execute(
        'INSERT INTO doctor_sedes (doctor_id,sede_id) VALUES (?,?)',
        [d.id, sedeId]
      ));
    }
    // Disponibilidad
    for (const [dia, horas] of Object.entries(d.disponibilidad || {})) {
      for (const hora of horas) {
        await safe(`disp ${d.id}-${dia}-${hora}`, () => conn.execute(
          'INSERT INTO doctor_disponibilidad (doctor_id,dia,hora) VALUES (?,?,?)',
          [d.id, dia, fmtTime(hora)]
        ));
      }
    }
  }
  log(`   doctors/sedes/disponibilidad → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 6. Actualizar medico_id en users (FK circular) ────────────────────────
  log('📋  Actualizando medico_id en users...');
  for (const u of (db.users || []).filter(u => u.medico_id)) {
    await safe(`medico_id user ${u.id}`, () => conn.execute(
      'UPDATE users SET medico_id = ? WHERE id = ?',
      [u.medico_id, u.id]
    ));
  }
  log(`   medico_id actualizado → ${ok} OK, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 7. appointments ───────────────────────────────────────────────────────
  log('📋  Migrando appointments...');
  for (const a of (db.appointments || [])) {
    await safe(`apt ${a.id}`, () => conn.execute(
      `INSERT INTO appointments
         (id,user_id,especialidad_id,especialidad_nombre,medico_id,medico_nombre,
          sede_id,sede_nombre,fecha,hora,estado,reagendamientos,notas,diagnostico,motivo_cancelacion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.user_id, a.especialidad_id, a.especialidad_nombre || '',
        a.medico_id, a.medico || '', a.sede_id || '', a.sede || '',
        fmtDate(a.fecha), fmtTime(a.hora),
        a.estado || 'confirmada', a.reagendamientos || 0,
        a.notas || '', a.diagnostico || null, a.motivo_cancelacion || null,
      ]
    ));
  }
  log(`   appointments → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 8. medications + horarios ─────────────────────────────────────────────
  log('📋  Migrando medications...');
  for (const m of (db.medications || [])) {
    await safe(`med ${m.id}`, () => conn.execute(
      `INSERT INTO medications
         (id,user_id,nombre,dosis,presentacion,frecuencia,fecha_inicio,fecha_fin,medico,renovable,instrucciones)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        m.id, m.user_id, m.nombre, m.dosis, m.presentacion || 'Tableta',
        m.frecuencia, fmtDate(m.fecha_inicio), fmtDate(m.fecha_fin),
        m.medico || null, m.renovable ? 1 : 0, m.instrucciones || '',
      ]
    ));
    for (const hora of (m.horarios || [])) {
      await safe(`med_hor ${m.id}-${hora}`, () => conn.execute(
        'INSERT INTO medication_horarios (medication_id,hora) VALUES (?,?)',
        [m.id, fmtTime(hora)]
      ));
    }
  }
  log(`   medications/horarios → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 9. medication_taken_log ───────────────────────────────────────────────
  log('📋  Migrando medication_taken_log...');
  for (const l of (db.medication_taken_log || [])) {
    await safe(`log ${l.id}`, () => conn.execute(
      'INSERT INTO medication_taken_log (id,medication_id,user_id,horario,taken_at,fecha) VALUES (?,?,?,?,?,?)',
      [l.id, l.medication_id, l.user_id, fmtTime(l.horario), fmtDT(l.taken_at), fmtDate(l.fecha)]
    ));
  }
  log(`   medication_taken_log → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 10. renewal_requests ──────────────────────────────────────────────────
  log('📋  Migrando renewal_requests...');
  for (const r of (db.renewal_requests || [])) {
    await safe(`renewal ${r.id}`, () => conn.execute(
      "INSERT INTO renewal_requests (id,user_id,medication_id,medico_id,estado,created_at) VALUES (?,?,?,NULL,?,?)",
      [r.id, r.user_id, r.medication_id, r.estado || 'pendiente', fmtDT(r.created_at) || new Date().toISOString().slice(0,19).replace('T',' ')]
    ));
  }
  log(`   renewal_requests → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 11. medical_history + recetas + examenes ──────────────────────────────
  log('📋  Migrando medical_history...');
  for (const h of (db.medical_history || [])) {
    await safe(`history ${h.id}`, () => conn.execute(
      'INSERT INTO medical_history (id,user_id,fecha,especialidad,medico,sede,diagnostico,notas) VALUES (?,?,?,?,?,?,?,?)',
      [h.id, h.user_id, fmtDate(h.fecha), h.especialidad || null, h.medico || null, h.sede || null, h.diagnostico || null, h.notas || null]
    ));
    for (const receta of (h.recetas || [])) {
      await safe(`receta ${h.id}`, () => conn.execute(
        'INSERT INTO medical_history_recetas (history_id,receta) VALUES (?,?)', [h.id, receta]
      ));
    }
    for (const examen of (h.examenes || [])) {
      await safe(`examen ${h.id}`, () => conn.execute(
        'INSERT INTO medical_history_examenes (history_id,examen) VALUES (?,?)', [h.id, examen]
      ));
    }
  }
  log(`   medical_history → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 12. health_metrics ────────────────────────────────────────────────────
  log('📋  Migrando health_metrics...');
  for (const m of (db.health_metrics || [])) {
    let sistolica = null, diastolica = null, valor = null;
    if (m.tipo === 'presion_arterial') {
      sistolica  = m.valor?.sistolica ?? null;
      diastolica = m.valor?.diastolica ?? null;
    } else {
      valor = m.valor?.valor ?? m.valor ?? null;
    }
    await safe(`metric ${m.id}`, () => conn.execute(
      'INSERT INTO health_metrics (id,user_id,tipo,valor_sistolica,valor_diastolica,valor,unidad,notas,fecha,hora,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [m.id, m.user_id, m.tipo, sistolica, diastolica, valor, m.unidad || '', m.notas || '', fmtDate(m.fecha), fmtTime(m.hora), fmtDT(m.created_at)]
    ));
  }
  log(`   health_metrics → ${ok} OK, ${skip} duplicados, ${err} errores`);
  [ok, skip, err] = [0, 0, 0];

  // ── 13. authorizations ────────────────────────────────────────────────────
  log('📋  Migrando authorizations...');
  for (const a of (db.authorizations || [])) {
    await safe(`auth ${a.id}`, () => conn.execute(
      `INSERT INTO authorizations
         (id,user_id,medico_id,medico_nombre,tipo,descripcion,diagnostico_relacionado,prioridad,estado,
          sede_id,sede_nombre,notas_medico,notas_autorizacion,fecha_solicitud,fecha_respuesta,
          fecha_vencimiento,codigo_autorizacion,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id, a.user_id, a.medico_id, a.medico_nombre || null,
        a.tipo, a.descripcion || '', a.diagnostico_relacionado || null,
        a.prioridad || 'normal', a.estado || 'pendiente',
        a.sede_id || null, a.sede_nombre || null,
        a.notas_medico || null, a.notas_autorizacion || null,
        fmtDate(a.fecha_solicitud), fmtDate(a.fecha_respuesta),
        fmtDate(a.fecha_vencimiento), a.codigo_autorizacion || null,
        fmtDT(a.created_at) || new Date().toISOString().slice(0,19).replace('T',' '),
      ]
    ));
  }
  log(`   authorizations → ${ok} OK, ${skip} duplicados, ${err} errores`);

  await conn.end();
  console.log('\n✅  Migración completada. Verifica los datos en MySQL Workbench.');
}

main().catch(err => { console.error('\n❌  Error fatal:', err.message); process.exit(1); });
