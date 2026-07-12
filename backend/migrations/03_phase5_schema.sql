-- Fase 5: Auditoría de Seguridad Integral - Esquema
-- 1. Usuarios: Eliminación Lógica
ALTER TABLE users 
    ADD COLUMN deleted_at DATETIME NULL,
    ADD COLUMN deleted_by INT NULL,
    ADD COLUMN deletion_reason VARCHAR(500) NULL,
    ADD INDEX idx_users_deleted_at (deleted_at);

ALTER TABLE users
    ADD CONSTRAINT fk_users_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Ediciones: Inmutabilidad y Auditoría
ALTER TABLE editions
    ADD COLUMN published_at DATETIME NULL,
    ADD COLUMN published_by INT NULL,
    ADD COLUMN published_file_checksum VARCHAR(64) NULL;

-- Eliminar posibles duplicados antes de aplicar restricciones
-- (En un escenario de producción esto debe manejarse a mano; aquí lo asumimos limpio)
ALTER TABLE editions
    ADD UNIQUE KEY uq_editions_code (code),
    ADD UNIQUE KEY uq_editions_number (edition_no);

-- Evitar que la tabla edicions borre su PDF si se borra de la tabla files
-- En init.sql no hay FK, la creamos ahora
ALTER TABLE editions
    ADD CONSTRAINT fk_editions_file
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT;

-- 3. Solicitudes (Legal Requests): updated_at
ALTER TABLE legal_requests
    ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. Tabla de Auditoría General (audit_logs)
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NULL,
    before_data JSON NULL,
    after_data JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
