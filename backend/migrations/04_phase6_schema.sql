-- 04_phase6_schema.sql
-- Migración para unificar sesiones y aplicar mejoras de privacidad e identidad (Fase 6)

-- 1. Tabla de Sesiones Unificadas (Reemplaza a personal_access_tokens y superadmin_tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL COLLATE utf8mb4_bin,
    ip_hash CHAR(64) NOT NULL,
    user_agent_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    UNIQUE KEY uq_token_hash (token_hash),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Limpieza de tablas de tokens obsoletas (opcional en producción, obligatorio para el nuevo modelo)
DROP TABLE IF EXISTS personal_access_tokens;
DROP TABLE IF EXISTS superadmin_tokens;
