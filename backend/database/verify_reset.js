require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');
const bcrypt = require('bcryptjs');

async function verify() {
  try {
    console.log('=== VERIFICACIÓN POST-SIEMBRA ===\n');

    // 1. Table counts
    const tables = ['users', 'doctors', 'appointments', 'medical_history', 'medical_history_recetas',
      'medical_history_examenes', 'medications', 'medication_horarios', 'medication_taken_log',
      'health_metrics', 'authorizations', 'renewal_requests'];
    
    for (const t of tables) {
      const [[{ c }]] = await pool.query(`SELECT COUNT(*) as c FROM \`${t}\``);
      console.log(`  ${t.padEnd(30)} ${c} registros`);
    }

    // 2. Verify user hierarchy
    console.log('\n--- Jerarquía de Usuarios ---');
    const [users] = await pool.query("SELECT id, nombre, apellido, role FROM users ORDER BY id");
    let lastRole = 'admin';
    const roleOrder = { admin: 1, medico: 2, paciente: 3 };
    let hierarchyOk = true;
    for (const u of users) {
      if (roleOrder[u.role] < roleOrder[lastRole]) {
        console.log(`  [ERROR] ID ${u.id} (${u.role}) rompe la jerarquía después de ${lastRole}`);
        hierarchyOk = false;
      }
      lastRole = u.role;
    }
    console.log(hierarchyOk ? '  [OK] Jerarquía admin -> medico -> paciente correcta' : '  [FAIL] Jerarquía rota');

    // 3. Verify IDs are sequential
    console.log('\n--- Secuencia de IDs ---');
    let seqOk = true;
    for (let i = 0; i < users.length; i++) {
      if (users[i].id !== i + 1) { seqOk = false; break; }
    }
    console.log(seqOk ? `  [OK] IDs secuenciales del 1 al ${users.length}` : '  [FAIL] IDs no son secuenciales');

    // 4. Verify password for a random patient
    console.log('\n--- Autenticación ---');
    const [[patient]] = await pool.query("SELECT * FROM users WHERE role = 'paciente' LIMIT 1");
    const pwOk = await bcrypt.compare('Password123!', patient.password_hash);
    console.log(pwOk ? `  [OK] Login OK para ${patient.nombre} ${patient.apellido} (Password123!)` : '  [FAIL] Password no coincide');

    // 5. Check for orphan records
    console.log('\n--- Integridad Referencial ---');
    const [[{ orphanApts }]] = await pool.query("SELECT COUNT(*) as orphanApts FROM appointments a LEFT JOIN users u ON a.user_id = u.id WHERE u.id IS NULL");
    const [[{ orphanMeds }]] = await pool.query("SELECT COUNT(*) as orphanMeds FROM medications m LEFT JOIN users u ON m.user_id = u.id WHERE u.id IS NULL");
    const [[{ orphanHist }]] = await pool.query("SELECT COUNT(*) as orphanHist FROM medical_history h LEFT JOIN users u ON h.user_id = u.id WHERE u.id IS NULL");
    const [[{ orphanAuth }]] = await pool.query("SELECT COUNT(*) as orphanAuth FROM authorizations a LEFT JOIN users u ON a.user_id = u.id WHERE u.id IS NULL");
    const totalOrphans = orphanApts + orphanMeds + orphanHist + orphanAuth;
    console.log(totalOrphans === 0 ? '  [OK] 0 registros huérfanos encontrados' : `  [FAIL] ${totalOrphans} registros huérfanos`);

    // 6. Verify appointment states make sense
    console.log('\n--- Distribución de Citas ---');
    const [aptStates] = await pool.query("SELECT estado, COUNT(*) as c FROM appointments GROUP BY estado");
    for (const s of aptStates) console.log(`  ${s.estado.padEnd(15)} ${s.c}`);

    // 7. Verify authorization states
    console.log('\n--- Distribución de Autorizaciones ---');
    const [authStates] = await pool.query("SELECT estado, COUNT(*) as c FROM authorizations GROUP BY estado");
    for (const s of authStates) console.log(`  ${s.estado.padEnd(15)} ${s.c}`);

    console.log('\n=== VERIFICACIÓN COMPLETADA ===');
    process.exit(0);
  } catch (err) {
    console.error('[ERROR]', err);
    process.exit(1);
  }
}
verify();
