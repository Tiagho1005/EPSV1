require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');

async function migrate() {
  try {
    console.log('--- Starting Migration: ON UPDATE CASCADE for users(id) ---');
    
    const dbName = process.env.DB_NAME || 'eps_db';

    // 1. Find all foreign keys referencing users(id)
    const [rows] = await pool.query(`
      SELECT 
          kcu.TABLE_NAME as tableName,
          kcu.COLUMN_NAME as columnName,
          kcu.CONSTRAINT_NAME as constraintName,
          rc.DELETE_RULE as deleteRule
      FROM 
          information_schema.KEY_COLUMN_USAGE kcu
      JOIN 
          information_schema.REFERENTIAL_CONSTRAINTS rc 
      ON 
          kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
          AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE 
          kcu.REFERENCED_TABLE_NAME = 'users' 
          AND kcu.REFERENCED_COLUMN_NAME = 'id'
          AND kcu.TABLE_SCHEMA = ?
    `, [dbName]);

    console.log(`Found ${rows.length} foreign keys referencing users(id).`);

    for (const fk of rows) {
      console.log(`\nProcessing table ${fk.tableName}, constraint ${fk.constraintName}`);
      
      // Drop existing constraint
      const dropQuery = `ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``;
      console.log(`Executing: ${dropQuery}`);
      await pool.query(dropQuery);

      // Recreate with ON UPDATE CASCADE
      const createQuery = `
        ALTER TABLE \`${fk.tableName}\` 
        ADD CONSTRAINT \`${fk.constraintName}\` 
        FOREIGN KEY (\`${fk.columnName}\`) 
        REFERENCES \`users\`(\`id\`) 
        ON DELETE ${fk.deleteRule} 
        ON UPDATE CASCADE
      `;
      console.log(`Executing: ALTER TABLE \`${fk.tableName}\` ADD CONSTRAINT \`${fk.constraintName}\` ... ON UPDATE CASCADE`);
      await pool.query(createQuery);
    }

    console.log('\n--- Foreign Keys updated successfully ---');

    console.log('\n--- Running Initial ID Reorganization ---');
    // Ensure all numeric strings are cast properly and UUIDs replaced.
    // The user's query:
    // Step 1: Shift to temporary IDs to free up the 1, 2, 3... namespace
    // Step 1: Shift to temporary IDs to free up the 1, 2, 3... namespace using UUIDs to stay within VARCHAR(36)
    await pool.query("UPDATE users SET id = uuid()");
    
    // Step 2: Run the actual sequential update
    const query = `
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
    `;
    
    await pool.query('SET @new_id = 0');
    const [result] = await pool.query(query);
    console.log(`Updated ${result.affectedRows} users with sequential IDs.`);

    console.log('\n--- Migration Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
