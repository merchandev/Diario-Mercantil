-- Script de Migración P1 (Endurecimiento de Esquema)
-- Ejecutar en la base de datos de producción

DELIMITER //

CREATE PROCEDURE AddColumnIfNotExists(
    IN dbName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN colName VARCHAR(255),
    IN colDef TEXT
)
BEGIN
    DECLARE colCount INT;
    SELECT COUNT(*) INTO colCount
    FROM information_schema.COLUMNS
    WHERE table_schema = dbName
      AND table_name = tableName
      AND column_name = colName;

    IF colCount = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', colName, ' ', colDef);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- Users
CALL AddColumnIfNotExists(DATABASE(), 'users', 'state', 'VARCHAR(100)');
CALL AddColumnIfNotExists(DATABASE(), 'users', 'municipality', 'VARCHAR(100)');
CALL AddColumnIfNotExists(DATABASE(), 'users', 'address', 'TEXT');
CALL AddColumnIfNotExists(DATABASE(), 'users', 'avatar_updated_at', 'DATETIME');

-- Files
CALL AddColumnIfNotExists(DATABASE(), 'files', 'deleted_at', 'DATETIME');

-- Legal Requests (Financial Snapshots)
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'precio_unitario_usd', 'DECIMAL(15,4)');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'subtotal_usd', 'DECIMAL(15,4)');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'porcentaje_iva', 'DECIMAL(5,2)');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'iva_usd', 'DECIMAL(15,4)');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'tasa_bcv', 'DECIMAL(15,4)');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'fecha_tasa', 'DATETIME');
CALL AddColumnIfNotExists(DATABASE(), 'legal_requests', 'total_bs', 'DECIMAL(15,2)');

-- Legal Requests (Foreign Key)
-- Intentaremos agregarlo si no existe (Requiere un workaround)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_legal_requests_user');
SET @s = IF(@fk_exists = 0,
    'ALTER TABLE legal_requests ADD CONSTRAINT fk_legal_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT "FK already exists"');
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP PROCEDURE AddColumnIfNotExists;
