-- ============================================================
--  Migración: tabla de log persistente para recordatorios
--  Ejecutar UNA SOLA VEZ si se crea la tabla manualmente.
--  El scheduler también la crea automáticamente al arrancar.
-- ============================================================

USE eps_db;

CREATE TABLE IF NOT EXISTS reminder_sent_log (
  reminder_key VARCHAR(150) NOT NULL
    COMMENT 'Formato: {user_id}-{medication_id}-{HH:MM}-{YYYY-MM-DD}',
  sent_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reminder_key),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Registro persistente de recordatorios de medicamentos enviados';

SELECT 'add_reminder_log.sql ejecutado correctamente' AS resultado;
