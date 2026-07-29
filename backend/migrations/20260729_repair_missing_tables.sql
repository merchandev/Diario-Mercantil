-- =============================================================================
-- Migracion: 20260729_repair_missing_tables.sql
-- Descripcion: Crea las tablas legal_files y directory_profiles que existen en
--              el codigo pero no fueron aplicadas a la base de datos de produccion.
-- Aplicar con:
--   docker compose exec -T db sh -lc \
--     'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
--     < backend/migrations/20260729_repair_missing_tables.sql
-- =============================================================================

-- legal_files: asocia archivos (tabla files) a solicitudes legales
CREATE TABLE IF NOT EXISTS legal_files (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    legal_request_id INT         NOT NULL,
    kind             VARCHAR(50) NOT NULL,
    file_id          INT         NOT NULL,
    created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_legal_files_request (legal_request_id),
    INDEX idx_legal_files_file    (file_id),

    CONSTRAINT fk_legal_files_request
        FOREIGN KEY (legal_request_id)
        REFERENCES legal_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_legal_files_file
        FOREIGN KEY (file_id)
        REFERENCES files(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- directory_profiles: perfil de directorio de abogados por usuario
CREATE TABLE IF NOT EXISTS directory_profiles (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    user_id               INT          NOT NULL,
    full_name             VARCHAR(255) NOT NULL,
    email                 VARCHAR(255) NULL,
    phones                VARCHAR(255) NULL,
    state                 VARCHAR(100) NULL,
    areas                 TEXT         NULL,
    colegio               VARCHAR(100) NULL,
    socials               TEXT         NULL,
    inpre_photo_file_id   INT          NULL,
    profile_photo_file_id INT          NULL,
    status                VARCHAR(50)  NOT NULL DEFAULT 'pendiente',
    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_directory_profiles_user (user_id),

    CONSTRAINT fk_directory_profiles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
