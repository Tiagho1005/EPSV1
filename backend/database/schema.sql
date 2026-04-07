-- ============================================================
--  EPS V1 — Esquema de Base de Datos MySQL
--  Archivo: backend/database/schema.sql
--  Ejecutar con: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS eps_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eps_db;

CREATE TABLE IF NOT EXISTS specialties (
  id          VARCHAR(50)   NOT NULL,
  nombre      VARCHAR(100)  NOT NULL,
  icono       VARCHAR(50)   NULL,
  descripcion TEXT          NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS locations (
  id        VARCHAR(50)   NOT NULL,
  nombre    VARCHAR(100)  NOT NULL,
  direccion VARCHAR(255)  NULL,
  telefono  VARCHAR(20)   NULL,
  horario   VARCHAR(150)  NULL,
  lat       DECIMAL(10,7) NULL,
  lng       DECIMAL(10,7) NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS departments (
  id     VARCHAR(50)  NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS municipalities (
  id            INT          NOT NULL AUTO_INCREMENT,
  department_id VARCHAR(50)  NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS users (
  id                   VARCHAR(36)  NOT NULL,
  cedula               VARCHAR(20)  NOT NULL,
  nombre               VARCHAR(100) NOT NULL,
  apellido             VARCHAR(100) NOT NULL,
  email                VARCHAR(150) NOT NULL,
  celular              VARCHAR(20)  NULL,
  fecha_nacimiento     DATE         NULL,
  departamento         VARCHAR(50)  NULL,
  municipio            VARCHAR(100) NULL,
  direccion            VARCHAR(255) NULL,
  foto_url             MEDIUMTEXT   NULL,       
  password_hash        VARCHAR(255) NOT NULL,
  role                 ENUM('paciente','medico','admin') NOT NULL DEFAULT 'paciente',
  activo               TINYINT(1)   NOT NULL DEFAULT 1,
  intentos_fallidos    TINYINT      NOT NULL DEFAULT 0,
  bloqueado_hasta      DATETIME     NULL,
  reset_code           VARCHAR(10)  NULL,
  reset_code_expires   DATETIME     NULL,
  fecha_registro       DATE         NOT NULL DEFAULT (CURRENT_DATE),
  reminder_email       TINYINT(1)   NOT NULL DEFAULT 1,
  reminder_advance_min SMALLINT     NOT NULL DEFAULT 15,
  medico_id            VARCHAR(36)  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_cedula (cedula),
  UNIQUE KEY uq_users_email  (email)
);

CREATE TABLE IF NOT EXISTS doctors (
  id              VARCHAR(36)        NOT NULL,
  user_id         VARCHAR(36)        NULL,
  especialidad_id VARCHAR(50)        NOT NULL,
  nombre          VARCHAR(150)       NOT NULL,
  foto            VARCHAR(500)       NULL,
  experiencia     TINYINT UNSIGNED   NOT NULL DEFAULT 0,   
  rating          DECIMAL(3,2)       NOT NULL DEFAULT 5.00,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)         REFERENCES users(id)       ON DELETE SET NULL,
  FOREIGN KEY (especialidad_id) REFERENCES specialties(id) ON DELETE RESTRICT
);


ALTER TABLE users
  ADD CONSTRAINT fk_users_medico
  FOREIGN KEY (medico_id) REFERENCES doctors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS doctor_sedes (
  doctor_id VARCHAR(36) NOT NULL,
  sede_id   VARCHAR(50) NOT NULL,
  PRIMARY KEY (doctor_id, sede_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)   ON DELETE CASCADE,
  FOREIGN KEY (sede_id)   REFERENCES locations(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS doctor_disponibilidad (
  id        INT         NOT NULL AUTO_INCREMENT,
  doctor_id VARCHAR(36) NOT NULL,
  dia       ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  hora      TIME        NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_disp (doctor_id, dia, hora),     -- evita duplicados
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS appointments (
  id                  VARCHAR(36)  NOT NULL,
  user_id             VARCHAR(36)  NOT NULL,
  especialidad_id     VARCHAR(50)  NOT NULL,
  especialidad_nombre VARCHAR(100) NOT NULL,   -- desnormalizado para rendimiento
  medico_id           VARCHAR(36)  NOT NULL,
  medico_nombre       VARCHAR(150) NOT NULL,   -- desnormalizado
  sede_id             VARCHAR(50)  NOT NULL,
  sede_nombre         VARCHAR(100) NOT NULL,   -- desnormalizado
  fecha               DATE         NOT NULL,
  hora                TIME         NOT NULL,
  estado              ENUM('pendiente','confirmada','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  reagendamientos     TINYINT      NOT NULL DEFAULT 0,
  notas               TEXT         NULL,
  diagnostico         TEXT         NULL,
  motivo_cancelacion  TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)         REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (especialidad_id) REFERENCES specialties(id) ON DELETE RESTRICT,
  FOREIGN KEY (medico_id)       REFERENCES doctors(id)     ON DELETE RESTRICT,
  FOREIGN KEY (sede_id)         REFERENCES locations(id)   ON DELETE RESTRICT,
  
  INDEX idx_apt_user    (user_id),
  INDEX idx_apt_medico  (medico_id),
  INDEX idx_apt_fecha   (fecha),
  INDEX idx_apt_estado  (estado)
);


CREATE TABLE IF NOT EXISTS medications (
  id           VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  dosis        VARCHAR(50)  NOT NULL,
  presentacion ENUM('Tableta','Capsula','Jarabe','Inyeccion','Crema','Gotas','Otro') NOT NULL,
  frecuencia   VARCHAR(100) NOT NULL,
  fecha_inicio DATE         NOT NULL,
  fecha_fin    DATE         NULL,
  medico       VARCHAR(150) NULL,   
  renovable    TINYINT(1)   NOT NULL DEFAULT 0,
  instrucciones TEXT        NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_med_user (user_id)
);

CREATE TABLE IF NOT EXISTS medication_horarios (
  id            INT         NOT NULL AUTO_INCREMENT,
  medication_id VARCHAR(36) NOT NULL,
  hora          TIME        NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medication_taken_log (
  id            VARCHAR(36) NOT NULL,
  medication_id VARCHAR(36) NOT NULL,
  user_id       VARCHAR(36) NOT NULL,
  horario       TIME        NOT NULL,
  taken_at      DATETIME    NOT NULL,
  fecha         DATE        NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  INDEX idx_log_user_fecha (user_id, fecha)
);

CREATE TABLE IF NOT EXISTS renewal_requests (
  id            VARCHAR(36) NOT NULL,
  user_id       VARCHAR(36) NOT NULL,
  medication_id VARCHAR(36) NOT NULL,
  medico_id     VARCHAR(36) NOT NULL,
  estado        ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE,
  FOREIGN KEY (medico_id)     REFERENCES doctors(id)     ON DELETE RESTRICT
);



CREATE TABLE IF NOT EXISTS medical_history (
  id          VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  fecha       DATE         NOT NULL,
  especialidad VARCHAR(100) NULL,
  medico      VARCHAR(150) NULL,
  sede        VARCHAR(100) NULL,
  diagnostico TEXT         NULL,
  notas       TEXT         NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hist_user (user_id)
);

CREATE TABLE IF NOT EXISTS medical_history_recetas (
  id         INT          NOT NULL AUTO_INCREMENT,
  history_id VARCHAR(36)  NOT NULL,
  receta     TEXT         NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (history_id) REFERENCES medical_history(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS medical_history_examenes (
  id         INT          NOT NULL AUTO_INCREMENT,
  history_id VARCHAR(36)  NOT NULL,
  examen     VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (history_id) REFERENCES medical_history(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS health_metrics (
  id               VARCHAR(36)  NOT NULL,
  user_id          VARCHAR(36)  NOT NULL,
  tipo             ENUM(
                     'presion_arterial',
                     'glucosa',
                     'peso',
                     'frecuencia_cardiaca',
                     'temperatura',
                     'oximetria'
                   ) NOT NULL,
  -- Solo para presion_arterial (NULL en otros tipos)
  valor_sistolica  DECIMAL(5,1) NULL,
  valor_diastolica DECIMAL(5,1) NULL,
  -- Para todos los demás tipos (NULL en presion_arterial)
  valor            DECIMAL(6,2) NULL,
  unidad           VARCHAR(20)  NOT NULL,
  notas            VARCHAR(255) NULL,
  fecha            DATE         NOT NULL,
  hora             TIME         NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hm_user_tipo (user_id, tipo),
  INDEX idx_hm_fecha     (fecha)
);



CREATE TABLE IF NOT EXISTS authorizations (
  id             VARCHAR(36)  NOT NULL,
  user_id        VARCHAR(36)  NOT NULL,
  medico_id      VARCHAR(36)  NOT NULL,
  medico_nombre  VARCHAR(150) NULL,
  tipo           ENUM('examen','procedimiento','consulta_especialista','imagen','cirugia') NOT NULL,
  descripcion    TEXT         NOT NULL,
  prioridad      ENUM('urgente','prioritario','normal') NOT NULL DEFAULT 'normal',
  estado         ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  motivo_rechazo TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (medico_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  INDEX idx_auth_user   (user_id),
  INDEX idx_auth_medico (medico_id),
  INDEX idx_auth_estado (estado)
);
