-- ============================================================
--  EPS V1 — Columnas faltantes detectadas al comparar
--  el esquema original con la lógica de las rutas.
--  Ejecutar UNA SOLA VEZ con: mysql -u root -p eps_db < alter_tables.sql
-- ============================================================

USE eps_db;

-- ── 1. users: historial de contraseñas ───────────────────────────────────────
ALTER TABLE users
  ADD COLUMN password_history JSON NULL DEFAULT NULL;

-- ── 2. renewal_requests: hacer medico_id nullable y agregar campos ───────────
--    Primero detectamos y eliminamos el FK existente
SELECT @fk_rr := CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'renewal_requests'
    AND COLUMN_NAME = 'medico_id'
    AND REFERENCED_TABLE_NAME = 'doctors'
  LIMIT 1;

SET @sql_rr = IF(
  @fk_rr IS NOT NULL,
  CONCAT('ALTER TABLE renewal_requests DROP FOREIGN KEY `', @fk_rr, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql_rr;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE renewal_requests
  MODIFY COLUMN medico_id VARCHAR(36) NULL,
  ADD COLUMN nota_medico     TEXT     NULL,
  ADD COLUMN fecha_respuesta DATETIME NULL;

ALTER TABLE renewal_requests
  ADD CONSTRAINT fk_rr_medico
  FOREIGN KEY (medico_id) REFERENCES doctors(id) ON DELETE SET NULL;

-- ── 3. authorizations: campos extra del portal médico ────────────────────────
ALTER TABLE authorizations
  ADD COLUMN diagnostico_relacionado TEXT         NULL,
  ADD COLUMN sede_id                 VARCHAR(50)  NULL,
  ADD COLUMN sede_nombre             VARCHAR(100) NULL,
  ADD COLUMN notas_medico            TEXT         NULL,
  ADD COLUMN notas_autorizacion      TEXT         NULL,
  ADD COLUMN fecha_solicitud         DATE         NULL,
  ADD COLUMN fecha_respuesta         DATE         NULL,
  ADD COLUMN fecha_vencimiento       DATE         NULL,
  ADD COLUMN codigo_autorizacion     VARCHAR(50)  NULL;

SELECT 'alter_tables.sql ejecutado correctamente' AS resultado;
