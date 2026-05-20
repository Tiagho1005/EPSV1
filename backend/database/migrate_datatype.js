require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/mysql');

async function migrateDataType() {
  try {
    console.log('--- Starting Datatype Migration: VARCHAR to INT UNSIGNED ---');
    const dbName = process.env.DB_NAME || 'eps_db';

    // 1. Find all foreign keys referencing users(id)
    const [rows] = await pool.query(`
      SELECT 
          kcu.TABLE_NAME as tableName,
          kcu.COLUMN_NAME as columnName,
          kcu.CONSTRAINT_NAME as constraintName,
          rc.DELETE_RULE as deleteRule,
          rc.UPDATE_RULE as updateRule
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

    // 2. Drop all foreign keys
    for (const fk of rows) {
      console.log(`Dropping FK ${fk.constraintName} on table ${fk.tableName}...`);
      await pool.query(`ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``);
    }

    // 3. Alter columns in dependent tables
    for (const fk of rows) {
      console.log(`Altering column ${fk.columnName} on table ${fk.tableName} to INT UNSIGNED...`);
      await pool.query(`ALTER TABLE \`${fk.tableName}\` MODIFY \`${fk.columnName}\` INT UNSIGNED NULL`);
    }

    // 4. Alter users.id column to INT UNSIGNED
    console.log(`Altering column id on table users to INT UNSIGNED...`);
    await pool.query(`ALTER TABLE \`users\` MODIFY \`id\` INT UNSIGNED NOT NULL`);

    // 5. Recreate all foreign keys
    for (const fk of rows) {
      console.log(`Recreating FK ${fk.constraintName} on table ${fk.tableName}...`);
      await pool.query(`
        ALTER TABLE \`${fk.tableName}\` 
        ADD CONSTRAINT \`${fk.constraintName}\` 
        FOREIGN KEY (\`${fk.columnName}\`) 
        REFERENCES \`users\`(\`id\`) 
        ON DELETE ${fk.deleteRule} 
        ON UPDATE ${fk.updateRule || 'CASCADE'}
      `);
    }

    console.log('--- Datatype Migration Completed Successfully ---');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDataType();
