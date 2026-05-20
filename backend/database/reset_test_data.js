require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  try {
    console.log('--- Iniciando Limpieza y Reinicio de Base de Datos ---');

    // 1. Limpieza de Tablas Operativas
    console.log('\nEliminando información de prueba y datos operativos...');
    const tablesToClear = [
      'appointments',
      'renewal_requests',
      'authorizations',
      'health_metrics',
      'medical_history',
      'medications'
    ];

    // Desactivamos temporalmente las llaves foráneas para poder hacer un TRUNCATE más eficiente si quisiéramos,
    // pero como algunas dependen de cascada, es más seguro hacer DELETE.
    for (const table of tablesToClear) {
      console.log(`Borrando datos de la tabla: ${table}`);
      const [result] = await pool.execute(`DELETE FROM \`${table}\``);
      console.log(` -> ${result.affectedRows} registros eliminados.`);
    }

    // Opcional: reiniciar auto increments de tablas relacionadas limpiadas
    await pool.execute("ALTER TABLE `medication_horarios` AUTO_INCREMENT = 1");
    await pool.execute("ALTER TABLE `medical_history_recetas` AUTO_INCREMENT = 1");
    await pool.execute("ALTER TABLE `medical_history_examenes` AUTO_INCREMENT = 1");
    
    // 2. Reinicio de Autenticación
    console.log('\nGenerando hash para la contraseña demo (Password123!)...');
    const demoPasswordHash = await bcrypt.hash('Password123!', 10);

    console.log('Restableciendo contraseñas, bloqueos y contadores de intentos en tabla users...');
    const [updateResult] = await pool.execute(`
      UPDATE users 
      SET 
        password_hash = ?,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        reset_code = NULL,
        reset_code_expires = NULL,
        fecha_registro = CURDATE()
    `, [demoPasswordHash]);

    console.log(` -> ${updateResult.affectedRows} usuarios actualizados con éxito.`);

    console.log('\n--- Proceso de Reinicio Completado Exitosamente ---');
    process.exit(0);

  } catch (error) {
    console.error('\n[ERROR] Fallo al reiniciar la base de datos:', error);
    process.exit(1);
  }
}

resetDatabase();
