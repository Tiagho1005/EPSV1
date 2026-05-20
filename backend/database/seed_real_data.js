require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ============================================================
//  SEED REAL DATA — Genera datos realistas para EPS Portal
//  Ejecutar: node database/seed_real_data.js
// ============================================================

// --- HELPERS ---
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function formatDate(d) { return d.toISOString().slice(0, 10); }
function formatDateTime(d) { return d.toISOString().slice(0, 19).replace('T', ' '); }
function formatTime(h, m) { return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`; }

const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

// --- DATA POOLS ---
const FAKE_PATIENTS = [
  { nombre: 'Valentina', apellido: 'Garcia Rios',     cedula: '1020304050', email: 'valentina.garcia@email.com', celular: '3101234567', fechaNac: '1995-03-14', depto: 'Cundinamarca', muni: 'Bogota', dir: 'Calle 45 #12-30' },
  { nombre: 'Andres',    apellido: 'Herrera Muñoz',   cedula: '1020304051', email: 'andres.herrera@email.com',   celular: '3112345678', fechaNac: '1988-07-22', depto: 'Cundinamarca', muni: 'Bogota', dir: 'Carrera 15 #80-45' },
  { nombre: 'Camila',    apellido: 'Ospina Velasquez', cedula: '1020304052', email: 'camila.ospina@email.com',   celular: '3123456789', fechaNac: '2001-11-05', depto: 'Antioquia',    muni: 'Medellin', dir: 'Av. Poblado #43A-15' },
  { nombre: 'Diego',     apellido: 'Rojas Parra',     cedula: '1020304053', email: 'diego.rojas@email.com',     celular: '3134567890', fechaNac: '1979-01-30', depto: 'Valle del Cauca', muni: 'Cali', dir: 'Calle 5 #38-20' },
  { nombre: 'Isabella',  apellido: 'Torres Castillo', cedula: '1020304054', email: 'isabella.torres@email.com', celular: '3145678901', fechaNac: '1992-09-18', depto: 'Cundinamarca', muni: 'Bogota', dir: 'Calle 72 #11-50' },
  { nombre: 'Julian',    apellido: 'Moreno Aguilar',  cedula: '1020304055', email: 'julian.moreno@email.com',   celular: '3156789012', fechaNac: '1985-05-10', depto: 'Santander',   muni: 'Bucaramanga', dir: 'Carrera 27 #36-15' },
  { nombre: 'Natalia',   apellido: 'Diaz Restrepo',   cedula: '1020304056', email: 'natalia.diaz@email.com',    celular: '3167890123', fechaNac: '1998-12-25', depto: 'Cundinamarca', muni: 'Bogota', dir: 'Calle 116 #7-20' },
  { nombre: 'Sebastian', apellido: 'Cardenas Mejia',  cedula: '1020304057', email: 'sebastian.cardenas@email.com', celular: '3178901234', fechaNac: '1974-04-08', depto: 'Risaralda', muni: 'Pereira', dir: 'Av. Circunvalar #5-60' },
  { nombre: 'Mariana',   apellido: 'Gutierrez Londoño', cedula: '1020304058', email: 'mariana.gutierrez@email.com', celular: '3189012345', fechaNac: '2003-08-15', depto: 'Cundinamarca', muni: 'Bogota', dir: 'Carrera 9 #25-40' },
  { nombre: 'Daniel',    apellido: 'Vargas Suarez',   cedula: '1020304059', email: 'daniel.vargas@email.com',  celular: '3190123456', fechaNac: '1990-06-02', depto: 'Atlantico',   muni: 'Barranquilla', dir: 'Calle 84 #51-30' },
];

const DIAGNOSTICOS = [
  { diag: 'Hipertensión arterial esencial grado I. Paciente presenta valores de presión arterial sostenidos por encima de 140/90 mmHg.', notas: 'Se inicia manejo farmacológico con Losartán 50mg. Control en 4 semanas. Dieta hiposódica y ejercicio aeróbico moderado.' },
  { diag: 'Diabetes mellitus tipo 2 no complicada. Glicemia en ayunas: 145 mg/dL. HbA1c: 7.2%.', notas: 'Inicio de Metformina 850mg cada 12 horas. Educación sobre automonitoreo glucémico. Referencia a nutrición clínica.' },
  { diag: 'Infección de vías urinarias baja no complicada. Urocultivo pendiente.', notas: 'Manejo con Nitrofurantoína 100mg cada 6 horas por 7 días. Aumentar ingesta de líquidos. Control post-tratamiento con urocultivo.' },
  { diag: 'Rinitis alérgica persistente moderada. Pruebas cutáneas positivas para ácaros del polvo.', notas: 'Se prescribe Loratadina 10mg diaria y spray nasal de Fluticasona. Evitar alérgenos identificados. Considerar inmunoterapia si no hay mejoría.' },
  { diag: 'Lumbalgia mecánica crónica sin signos de alarma. Radiografía sin hallazgos significativos.', notas: 'Terapia física 10 sesiones. Naproxeno 250mg cada 12 horas por 5 días en crisis. Higiene postural y fortalecimiento de core.' },
  { diag: 'Dermatitis atópica leve en pliegues antecubitales y poplíteos.', notas: 'Hidratación con emolientes dos veces al día. Betametasona tópica al 0.05% en lesiones activas por máximo 7 días. Evitar jabones agresivos.' },
  { diag: 'Gastritis crónica superficial. Test de Helicobacter pylori negativo.', notas: 'Omeprazol 20mg en ayunas por 4 semanas. Dieta fraccionada, evitar irritantes gástricos (café, picante, alcohol). Control con endoscopia si persisten síntomas.' },
  { diag: 'Trastorno de ansiedad generalizada leve a moderada. Escala GAD-7: 12 puntos.', notas: 'Se inicia terapia cognitivo-conductual semanal. Técnicas de respiración y mindfulness. Evaluación para posible manejo farmacológico en próxima consulta.' },
  { diag: 'Migraña sin aura, episódica frecuente. 6 episodios en el último mes.', notas: 'Sumatriptán 50mg como tratamiento abortivo. Propranolol 40mg cada 12 horas como profilaxis. Llevar diario de cefaleas y registro de desencadenantes.' },
  { diag: 'Conjuntivitis alérgica bilateral estacional.', notas: 'Olopatadina colirio cada 12 horas por 14 días. Compresas frías. Evitar frotarse los ojos. Control en 2 semanas si no mejora.' },
  { diag: 'Faringitis aguda de probable etiología viral. Sin exudados amigdalinos.', notas: 'Manejo sintomático: Acetaminofén 500mg cada 6 horas, gargarismos con agua tibia y sal. Reposo relativo por 3 días. Consultar si aparece fiebre >38.5°C por más de 48 horas.' },
  { diag: 'Control prenatal: embarazo de 20 semanas sin complicaciones. Ecografía morfológica normal.', notas: 'Continuar suplementación con ácido fólico y hierro. Próxima ecografía de crecimiento en semana 32. Vacunación contra influenza y TdaP según esquema.' },
];

const RECETAS = [
  'Losartán 50mg – 1 tableta vía oral cada 24 horas, en la mañana',
  'Metformina 850mg – 1 tableta vía oral cada 12 horas, con alimentos',
  'Omeprazol 20mg – 1 cápsula vía oral en ayunas, por 4 semanas',
  'Acetaminofén 500mg – 1 tableta vía oral cada 6 horas si hay dolor',
  'Loratadina 10mg – 1 tableta vía oral cada 24 horas',
  'Naproxeno 250mg – 1 tableta vía oral cada 12 horas por 5 días',
  'Fluticasona spray nasal – 2 puffs en cada fosa nasal, cada 24 horas',
  'Ibuprofeno 400mg – 1 tableta vía oral cada 8 horas si hay dolor, con alimentos',
  'Propranolol 40mg – 1 tableta vía oral cada 12 horas',
  'Nitrofurantoína 100mg – 1 cápsula vía oral cada 6 horas por 7 días',
];

const EXAMENES = [
  'Hemograma completo tipo IV',
  'Perfil lipídico completo (Colesterol total, HDL, LDL, Triglicéridos)',
  'Glicemia en ayunas',
  'Hemoglobina glicosilada (HbA1c)',
  'Parcial de orina con sedimento',
  'Urocultivo con antibiograma',
  'TSH y T4 libre',
  'Creatinina sérica y BUN',
  'Radiografía de tórax PA y lateral',
  'Electrocardiograma de 12 derivaciones en reposo',
  'Ecografía abdominal total',
  'Pruebas de función hepática (TGO, TGP, Bilirrubinas)',
];

const MEDICAMENTOS = [
  { nombre: 'Losartán', dosis: '50mg', presentacion: 'Tableta', frecuencia: 'Cada 24 horas', instrucciones: 'Tomar en la mañana con un vaso de agua. No suspender sin indicación médica.', horarios: ['08:00'] },
  { nombre: 'Metformina', dosis: '850mg', presentacion: 'Tableta', frecuencia: 'Cada 12 horas', instrucciones: 'Tomar con el desayuno y la cena. Puede causar molestias estomacales iniciales.', horarios: ['07:00', '19:00'] },
  { nombre: 'Omeprazol', dosis: '20mg', presentacion: 'Capsula', frecuencia: 'Cada 24 horas', instrucciones: 'Tomar 30 minutos antes del desayuno en ayunas.', horarios: ['06:30'] },
  { nombre: 'Loratadina', dosis: '10mg', presentacion: 'Tableta', frecuencia: 'Cada 24 horas', instrucciones: 'Tomar preferiblemente en la noche. No produce somnolencia significativa.', horarios: ['21:00'] },
  { nombre: 'Acetaminofén', dosis: '500mg', presentacion: 'Tableta', frecuencia: 'Cada 6 horas (si hay dolor)', instrucciones: 'No exceder 4 gramos al día. Evitar consumo de alcohol.', horarios: ['08:00', '14:00', '20:00'] },
  { nombre: 'Ibuprofeno', dosis: '400mg', presentacion: 'Tableta', frecuencia: 'Cada 8 horas', instrucciones: 'Tomar siempre con alimentos para proteger el estómago.', horarios: ['08:00', '16:00', '22:00'] },
  { nombre: 'Fluticasona spray nasal', dosis: '50mcg/puff', presentacion: 'Gotas', frecuencia: 'Cada 24 horas', instrucciones: 'Aplicar 2 puffs en cada fosa nasal una vez al día.', horarios: ['07:00'] },
  { nombre: 'Propranolol', dosis: '40mg', presentacion: 'Tableta', frecuencia: 'Cada 12 horas', instrucciones: 'No suspender abruptamente. Monitorear frecuencia cardíaca.', horarios: ['08:00', '20:00'] },
  { nombre: 'Atorvastatina', dosis: '20mg', presentacion: 'Tableta', frecuencia: 'Cada 24 horas', instrucciones: 'Tomar en la noche antes de dormir.', horarios: ['22:00'] },
  { nombre: 'Vitamina D3', dosis: '2000 UI', presentacion: 'Gotas', frecuencia: 'Cada 24 horas', instrucciones: 'Tomar con el desayuno para mejor absorción.', horarios: ['08:00'] },
];

const MOTIVOS_CANCELACION = [
  'Paciente solicitó cancelación por motivos personales.',
  'El paciente no pudo asistir debido a una emergencia familiar.',
  'Reagendamiento solicitado por el médico tratante.',
];

const AUTH_TIPOS = ['examen', 'procedimiento', 'consulta_especialista', 'imagen'];
const AUTH_DESCRIPCIONES = [
  'Resonancia magnética nuclear de columna lumbar sin contraste',
  'Endoscopia digestiva alta diagnóstica',
  'Electromiografía de miembros superiores',
  'Ecocardiograma transtorácico con Doppler color',
  'Tomografía computarizada de senos paranasales',
  'Colonoscopia total diagnóstica',
  'Densitometría ósea central (columna y cadera)',
  'Interconsulta con Endocrinología por sospecha de hipotiroidismo',
  'Biopsia de piel por lesión sospechosa de malignidad',
  'Prueba de esfuerzo con protocolo de Bruce',
];

const AUTH_PRIORIDADES = ['urgente', 'prioritario', 'normal', 'normal', 'normal'];
const AUTH_ESTADOS = ['pendiente', 'aprobada', 'aprobada', 'rechazada'];
const AUTH_RECHAZOS = [
  'Requiere documentación clínica adicional para justificar el procedimiento.',
  'Se sugiere agotar tratamiento conservador antes de autorizar imagen avanzada.',
];

// --- MAIN SEED FUNCTION ---
async function seed() {
  try {
    console.log('=== INICIO DE SIEMBRA DE DATOS REALISTAS ===\n');

    // 1. CREATE 10 FAKE PATIENTS
    console.log('--- Paso 1: Creando 10 pacientes ficticios ---');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    for (const p of FAKE_PATIENTS) {
      const [[exists]] = await pool.execute('SELECT id FROM users WHERE cedula = ?', [p.cedula]);
      if (exists) { console.log(`  Paciente ${p.nombre} ya existe, saltando.`); continue; }
      
      const [[{ maxId }]] = await pool.execute('SELECT COALESCE(MAX(id), 0) + 1 AS maxId FROM users');
      const tempId = maxId + 1000000;
      await pool.execute(
        "INSERT INTO users (id,cedula,nombre,apellido,email,celular,fecha_nacimiento,departamento,municipio,direccion,foto_url,password_hash,role,activo,intentos_fallidos,fecha_registro) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,'paciente',1,0,CURDATE())",
        [tempId, p.cedula, p.nombre, p.apellido, p.email, p.celular, p.fechaNac, p.depto, p.muni, p.dir, passwordHash]
      );
      console.log(`  [+] Paciente creado: ${p.nombre} ${p.apellido}`);
    }

    // Reorganize IDs
    console.log('  Reorganizando IDs...');
    await pool.execute("UPDATE users SET id = id + 1000000 ORDER BY id DESC");
    await pool.execute("SET @new_id = 0");
    await pool.execute(`
      UPDATE users SET id = (@new_id := COALESCE(@new_id, 0) + 1)
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'medico' THEN 2 WHEN 'paciente' THEN 3 ELSE 4 END, id
    `);
    console.log('  IDs reorganizados correctamente.\n');

    // 2. LOAD ALL PATIENTS AND DOCTORS
    const [patients] = await pool.query("SELECT id, nombre, apellido FROM users WHERE role = 'paciente'");
    const [doctors] = await pool.query("SELECT d.id, d.nombre, d.especialidad_id, s.nombre as especialidad_nombre FROM doctors d JOIN specialties s ON d.especialidad_id = s.id");
    const [doctorSedesRaw] = await pool.query("SELECT ds.doctor_id, ds.sede_id, l.nombre as sede_nombre FROM doctor_sedes ds JOIN locations l ON ds.sede_id = l.id");

    // Build doctor->sedes map
    const doctorSedes = {};
    for (const ds of doctorSedesRaw) {
      if (!doctorSedes[ds.doctor_id]) doctorSedes[ds.doctor_id] = [];
      doctorSedes[ds.doctor_id].push(ds);
    }

    console.log(`--- Paso 2: Sembrando datos para ${patients.length} pacientes ---\n`);

    let totalAppointments = 0, totalHistory = 0, totalMeds = 0, totalMetrics = 0, totalAuths = 0;

    for (const patient of patients) {
      console.log(`\n  >> Paciente: ${patient.nombre} ${patient.apellido} (ID: ${patient.id})`);

      // ---- APPOINTMENTS ----
      // 3-4 past appointments (completadas + 1 cancelada) and 2 future (pendiente/confirmada)
      const numPast = randomInt(3, 4);
      const numFuture = randomInt(1, 2);
      const usedDoctors = new Set();

      for (let i = 0; i < numPast + numFuture; i++) {
        let doctor;
        // Try to pick different doctors
        for (let attempt = 0; attempt < 10; attempt++) {
          doctor = randomItem(doctors);
          if (!usedDoctors.has(doctor.id) || usedDoctors.size >= doctors.length) break;
        }
        usedDoctors.add(doctor.id);

        const sedes = doctorSedes[doctor.id];
        if (!sedes || sedes.length === 0) continue;
        const sede = randomItem(sedes);

        const isPast = i < numPast;
        const appointmentDate = isPast
          ? addDays(TODAY, -randomInt(5, 55))
          : addDays(TODAY, randomInt(2, 25));

        const hour = randomItem([8, 9, 10, 11, 14, 15, 16]);
        const minute = randomItem([0, 30]);

        let estado, notas = null, diagnostico = null, motivoCancelacion = null;
        if (isPast) {
          if (i === numPast - 1 && Math.random() > 0.5) {
            estado = 'cancelada';
            motivoCancelacion = randomItem(MOTIVOS_CANCELACION);
            notas = 'Cita cancelada antes de la fecha programada.';
          } else {
            estado = 'completada';
            const diagData = randomItem(DIAGNOSTICOS);
            diagnostico = diagData.diag;
            notas = diagData.notas;
          }
        } else {
          estado = i === numPast ? 'confirmada' : 'pendiente';
          notas = 'Paciente asistirá a control de rutina.';
        }

        const aptId = uuidv4();
        await pool.execute(
          `INSERT INTO appointments (id, user_id, especialidad_id, especialidad_nombre, medico_id, medico_nombre, sede_id, sede_nombre, fecha, hora, estado, reagendamientos, notas, diagnostico, motivo_cancelacion, created_at) 
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [aptId, patient.id, doctor.especialidad_id, doctor.especialidad_nombre, doctor.id, doctor.nombre, sede.sede_id, sede.sede_nombre,
           formatDate(appointmentDate), formatTime(hour, minute), estado, isPast ? randomInt(0, 1) : 0, notas, diagnostico, motivoCancelacion,
           formatDateTime(addDays(appointmentDate, -randomInt(1, 10)))]
        );
        totalAppointments++;

        // ---- MEDICAL HISTORY for completed appointments ----
        if (estado === 'completada') {
          const histId = uuidv4();
          const diagData = { diagnostico: diagnostico, notas: notas };
          await pool.execute(
            `INSERT INTO medical_history (id, user_id, fecha, especialidad, medico, sede, diagnostico, notas) VALUES (?,?,?,?,?,?,?,?)`,
            [histId, patient.id, formatDate(appointmentDate), doctor.especialidad_nombre, doctor.nombre, sede.sede_nombre, diagnostico, notas]
          );
          totalHistory++;

          // Recetas (1-2 per history)
          const numRecetas = randomInt(1, 2);
          for (let r = 0; r < numRecetas; r++) {
            await pool.execute(
              `INSERT INTO medical_history_recetas (history_id, receta) VALUES (?,?)`,
              [histId, randomItem(RECETAS)]
            );
          }

          // Exámenes (0-2 per history)
          const numExams = randomInt(0, 2);
          for (let e = 0; e < numExams; e++) {
            await pool.execute(
              `INSERT INTO medical_history_examenes (history_id, examen) VALUES (?,?)`,
              [histId, randomItem(EXAMENES)]
            );
          }
        }
      }

      // ---- MEDICATIONS ----
      const numMeds = randomInt(1, 3);
      const selectedMeds = [];
      const medPool = [...MEDICAMENTOS];
      for (let m = 0; m < numMeds; m++) {
        const idx = randomInt(0, medPool.length - 1);
        selectedMeds.push(medPool.splice(idx, 1)[0]);
      }

      for (const med of selectedMeds) {
        const medId = uuidv4();
        const startDate = addDays(TODAY, -randomInt(10, 40));
        const endDate = Math.random() > 0.3 ? addDays(TODAY, randomInt(20, 90)) : null;
        const prescribingDoctor = randomItem(doctors);

        await pool.execute(
          `INSERT INTO medications (id, user_id, nombre, dosis, presentacion, frecuencia, fecha_inicio, fecha_fin, medico, renovable, instrucciones) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [medId, patient.id, med.nombre, med.dosis, med.presentacion, med.frecuencia, formatDate(startDate),
           endDate ? formatDate(endDate) : null, prescribingDoctor.nombre, Math.random() > 0.5 ? 1 : 0, med.instrucciones]
        );
        totalMeds++;

        // Horarios for this medication
        for (const h of med.horarios) {
          await pool.execute(
            `INSERT INTO medication_horarios (medication_id, hora) VALUES (?,?)`,
            [medId, h + ':00']
          );
        }

        // Medication taken log - last 7 days
        for (let d = 6; d >= 0; d--) {
          const logDate = addDays(TODAY, -d);
          for (const h of med.horarios) {
            // 85% chance the patient took their medication
            if (Math.random() < 0.85) {
              const [hh, mm] = h.split(':');
              const takenAt = new Date(logDate);
              takenAt.setHours(parseInt(hh), parseInt(mm) + randomInt(0, 15), 0);
              await pool.execute(
                `INSERT INTO medication_taken_log (id, medication_id, user_id, horario, taken_at, fecha) VALUES (?,?,?,?,?,?)`,
                [uuidv4(), medId, patient.id, h + ':00', formatDateTime(takenAt), formatDate(logDate)]
              );
            }
          }
        }
      }

      // ---- HEALTH METRICS ----
      // Presión arterial - 5-8 measurements over last 30 days
      const numBP = randomInt(5, 8);
      const baseSys = randomInt(115, 145);
      const baseDia = randomInt(70, 95);
      for (let i = 0; i < numBP; i++) {
        const metricDate = addDays(TODAY, -randomInt(0, 30));
        const hour = randomInt(7, 20);
        await pool.execute(
          `INSERT INTO health_metrics (id, user_id, tipo, valor_sistolica, valor_diastolica, valor, unidad, notas, fecha, hora) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), patient.id, 'presion_arterial', baseSys + randomInt(-8, 8), baseDia + randomInt(-5, 5), null, 'mmHg',
           i === 0 ? 'Medición en consulta médica' : (Math.random() > 0.5 ? 'Medición en casa con tensiómetro digital' : null),
           formatDate(metricDate), formatTime(hour, randomInt(0, 59))]
        );
        totalMetrics++;
      }

      // Peso - 3-4 measurements
      const baseWeight = randomInt(55, 95);
      for (let i = 0; i < randomInt(3, 4); i++) {
        const metricDate = addDays(TODAY, -randomInt(0, 30));
        await pool.execute(
          `INSERT INTO health_metrics (id, user_id, tipo, valor_sistolica, valor_diastolica, valor, unidad, notas, fecha, hora) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), patient.id, 'peso', null, null, baseWeight + randomInt(-2, 2), 'kg',
           Math.random() > 0.5 ? 'Peso registrado en ayunas' : null,
           formatDate(metricDate), formatTime(randomInt(6, 10), 0)]
        );
        totalMetrics++;
      }

      // Glucosa - 3-5 measurements (for some patients)
      if (Math.random() > 0.4) {
        const baseGlucose = randomInt(80, 130);
        for (let i = 0; i < randomInt(3, 5); i++) {
          const metricDate = addDays(TODAY, -randomInt(0, 25));
          await pool.execute(
            `INSERT INTO health_metrics (id, user_id, tipo, valor_sistolica, valor_diastolica, valor, unidad, notas, fecha, hora) VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [uuidv4(), patient.id, 'glucosa', null, null, baseGlucose + randomInt(-10, 15), 'mg/dL',
             'Medición en ayunas',
             formatDate(metricDate), formatTime(randomInt(6, 8), randomInt(0, 30))]
          );
          totalMetrics++;
        }
      }

      // Frecuencia cardiaca - 2-3 measurements
      const baseHR = randomInt(62, 88);
      for (let i = 0; i < randomInt(2, 3); i++) {
        const metricDate = addDays(TODAY, -randomInt(0, 20));
        await pool.execute(
          `INSERT INTO health_metrics (id, user_id, tipo, valor_sistolica, valor_diastolica, valor, unidad, notas, fecha, hora) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), patient.id, 'frecuencia_cardiaca', null, null, baseHR + randomInt(-5, 10), 'lpm', null,
           formatDate(metricDate), formatTime(randomInt(8, 18), randomInt(0, 59))]
        );
        totalMetrics++;
      }

      // ---- AUTHORIZATIONS ----
      const numAuths = randomInt(1, 2);
      for (let i = 0; i < numAuths; i++) {
        const authDoctor = randomItem(doctors);
        const estado = randomItem(AUTH_ESTADOS);
        const motivoRechazo = estado === 'rechazada' ? randomItem(AUTH_RECHAZOS) : null;
        const createdDate = addDays(TODAY, -randomInt(1, 30));

        await pool.execute(
          `INSERT INTO authorizations (id, user_id, medico_id, medico_nombre, tipo, descripcion, prioridad, estado, motivo_rechazo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), patient.id, authDoctor.id, authDoctor.nombre, randomItem(AUTH_TIPOS), randomItem(AUTH_DESCRIPCIONES),
           randomItem(AUTH_PRIORIDADES), estado, motivoRechazo, formatDateTime(createdDate)]
        );
        totalAuths++;
      }

      console.log(`     Citas: ${numPast + numFuture} | Historial: ${numPast} | Meds: ${numMeds} | Métricas: varias | Auths: ${numAuths}`);
    }

    // --- SUMMARY ---
    console.log('\n=== RESUMEN DE SIEMBRA ===');
    console.log(`  Pacientes nuevos creados:   10`);
    console.log(`  Citas médicas generadas:    ${totalAppointments}`);
    console.log(`  Historiales clínicos:       ${totalHistory}`);
    console.log(`  Medicamentos asignados:     ${totalMeds}`);
    console.log(`  Métricas de salud:          ${totalMetrics}`);
    console.log(`  Autorizaciones médicas:     ${totalAuths}`);
    console.log('\n=== SIEMBRA COMPLETADA EXITOSAMENTE ===');
    process.exit(0);

  } catch (error) {
    console.error('\n[ERROR] La siembra falló:', error);
    process.exit(1);
  }
}

seed();
