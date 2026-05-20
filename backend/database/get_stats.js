require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');

async function dump() {
  const [users] = await pool.query("SELECT id, cedula, nombre, apellido, role FROM users ORDER BY id");
  console.log('--- USERS ---');
  console.table(users);

  const [doctors] = await pool.query("SELECT id, user_id, especialidad_id, nombre FROM doctors");
  console.log('--- DOCTORS ---');
  console.table(doctors);

  const [specialties] = await pool.query("SELECT * FROM specialties");
  console.log('--- SPECIALTIES ---');
  console.table(specialties);

  const [locations] = await pool.query("SELECT id, nombre, direccion FROM locations");
  console.log('--- LOCATIONS ---');
  console.table(locations);

  const [doctorSedes] = await pool.query("SELECT * FROM doctor_sedes");
  console.log('--- DOCTOR_SEDES ---');
  console.table(doctorSedes);

  const [disponibilidad] = await pool.query("SELECT * FROM doctor_disponibilidad LIMIT 20");
  console.log('--- DOCTOR_DISPONIBILIDAD (top 20) ---');
  console.table(disponibilidad);

  process.exit(0);
}
dump();
