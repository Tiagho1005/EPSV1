-- ============================================================
--  Migración: tabla de blacklist persistente para tokens JWT
--  El servicio también la crea automáticamente al arrancar.
-- ============================================================

USE eps_db;

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti        VARCHAR(36) NOT NULL
    COMMENT 'JWT ID único (claim jti) generado en el login',
  expires_at DATETIME    NOT NULL
    COMMENT 'Expiración original del token — permite limpiar filas obsoletas',
  PRIMARY KEY (jti),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='JWTs invalidados en logout — persiste entre reinicios del servidor';

SELECT 'add_token_blacklist.sql ejecutado correctamente' AS resultado;
