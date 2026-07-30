-- Migración Idempotente para Fix de Esquema y Seguridad (Fase de 24 Horas)
-- Ejecutar en la base de datos de producción

SET FOREIGN_KEY_CHECKS=0;

-- 1. Asegurar la creación de tablas faltantes para no romper producción
CREATE TABLE IF NOT EXISTS legal_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legal_request_id INT NOT NULL,
  kind VARCHAR(50) NOT NULL,
  file_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directory_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phones VARCHAR(255),
  state VARCHAR(100),
  areas TEXT,
  colegio VARCHAR(100),
  socials TEXT,
  inpre_photo_file_id INT,
  profile_photo_file_id INT,
  status VARCHAR(50) DEFAULT 'pendiente',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directory_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS directory_colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- 2. Limpiar emails vacíos para convertirlos en NULL
UPDATE users SET email = NULL WHERE TRIM(email) = '';

-- 3. Crear índice único en emails (Manejo de errores si ya existe)
-- Se usa un PROCEDURE temporal para que sea idempotente
DELIMITER $$
CREATE PROCEDURE MakeEmailUnique()
BEGIN
    DECLARE idx_exists INT;
    SELECT COUNT(1) INTO idx_exists 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND INDEX_NAME = 'uq_users_email';
      
    IF idx_exists = 0 THEN
        ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
    END IF;
END $$
DELIMITER ;
CALL MakeEmailUnique();
DROP PROCEDURE MakeEmailUnique;

-- 4. Reconstruir password_resets orientada a user_id
DROP TABLE IF EXISTS password_resets;
CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS=1;
