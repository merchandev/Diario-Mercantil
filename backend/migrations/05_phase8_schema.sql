-- 05_phase8_schema.sql
-- Migración para idempotencia, configuración estricta y auditoría financiera

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    route VARCHAR(150) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_status SMALLINT NOT NULL,
    response_body JSON NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idempotency (user_id, idempotency_key, route),
    CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
