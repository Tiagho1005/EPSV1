require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function testRegistration() {
  try {
    const [[{maxId}]] = await pool.execute('SELECT COALESCE(MAX(id), 0) + 1 AS maxId FROM users');
    const tempId = maxId + 1000000;
    
    const passwordHash = await bcrypt.hash('password123', 10);
    
    console.log('Inserting new test patient...');
    await pool.execute(
      "INSERT INTO users (id,cedula,nombre,apellido,email,celular,fecha_nacimiento,departamento,municipio,direccion,foto_url,password_hash,role,activo,intentos_fallidos,fecha_registro) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,'paciente',1,0,CURDATE())",
      [tempId, '111222333', 'Test', 'Patient', 'test@patient.com', '1234567890', '1990-01-01', 'Test', 'Test', 'Test', passwordHash]
    );

    console.log('Running reorganization logic...');
    await pool.execute("UPDATE users SET id = id + 1000000 ORDER BY id DESC");
    await pool.execute("SET @new_id = 0");
    await pool.execute(`
      UPDATE users 
      SET id = (@new_id := COALESCE(@new_id, 0) + 1)
      ORDER BY 
          CASE role
              WHEN 'admin' THEN 1
              WHEN 'medico' THEN 2
              WHEN 'paciente' THEN 3
              ELSE 4
          END,
          id
    `);

    console.log('Fetching all users to verify sequence...');
    const [users] = await pool.execute("SELECT id, role, nombre FROM users ORDER BY id");
    console.table(users);

    console.log('Cleaning up test patient...');
    await pool.execute("DELETE FROM users WHERE email = 'test@patient.com'");

    // Run reorg one last time
    await pool.execute("UPDATE users SET id = id + 1000000 ORDER BY id DESC");
    await pool.execute("SET @new_id = 0");
    await pool.execute(`
      UPDATE users 
      SET id = (@new_id := COALESCE(@new_id, 0) + 1)
      ORDER BY 
          CASE role
              WHEN 'admin' THEN 1
              WHEN 'medico' THEN 2
              WHEN 'paciente' THEN 3
              ELSE 4
          END,
          id
    `);

    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testRegistration();
