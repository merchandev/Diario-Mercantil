<?php

declare(strict_types=1);

return static function (PDO $pdo): void {
    $database = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    if ($database === '') {
        throw new RuntimeException('No hay una base de datos seleccionada.');
    }

    $tableExists = static function (string $table) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_name=?'
        );
        $stmt->execute([$database, $table]);
        return (int) $stmt->fetchColumn() > 0;
    };

    $columnExists = static function (string $table, string $column) use ($pdo, $database): bool {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.columns '
            . 'WHERE table_schema=? AND table_name=? AND column_name=?'
        );
        $stmt->execute([$database, $table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    // ── sessions ────────────────────────────────────────────────────────────
    if (!$tableExists('sessions')) {
        $pdo->exec(
            'CREATE TABLE sessions ('
            . 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,'
            . 'user_id INT NOT NULL,'
            . 'token_hash CHAR(64) NOT NULL,'
            . 'ip_hash CHAR(64) NULL,'
            . 'user_agent_hash CHAR(64) NULL,'
            . 'expires_at DATETIME NOT NULL,'
            . 'revoked_at DATETIME NULL,'
            . 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,'
            . 'UNIQUE KEY uq_sessions_token (token_hash),'
            . 'INDEX idx_sessions_user (user_id),'
            . 'CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        echo "[003] Tabla sessions creada.\n";
    } else {
        echo "[003] Tabla sessions ya existe. OK.\n";
    }

    // ── password_resets ──────────────────────────────────────────────────────
    if (!$tableExists('password_resets')) {
        $pdo->exec(
            'CREATE TABLE password_resets ('
            . 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,'
            . 'user_id INT NOT NULL,'
            . 'token CHAR(64) NOT NULL,'
            . 'expires_at DATETIME NOT NULL,'
            . 'used_at DATETIME NULL,'
            . 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,'
            . 'UNIQUE KEY uq_password_resets_token (token),'
            . 'INDEX idx_password_resets_user (user_id),'
            . 'CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        echo "[003] Tabla password_resets creada.\n";
    } else {
        echo "[003] Tabla password_resets ya existe. OK.\n";
    }

    // ── audit_logs ───────────────────────────────────────────────────────────
    if (!$tableExists('audit_logs')) {
        $pdo->exec(
            'CREATE TABLE audit_logs ('
            . 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,'
            . 'actor_user_id INT NULL,'
            . 'action VARCHAR(100) NOT NULL,'
            . 'resource_type VARCHAR(100) NULL,'
            . 'resource_id VARCHAR(255) NULL,'
            . 'before_data JSON NULL,'
            . 'after_data JSON NULL,'
            . 'ip_address VARCHAR(45) NULL,'
            . 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,'
            . 'INDEX idx_audit_actor (actor_user_id),'
            . 'INDEX idx_audit_resource (resource_type, resource_id)'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        echo "[003] Tabla audit_logs creada.\n";
    } else {
        echo "[003] Tabla audit_logs ya existe. OK.\n";
    }

    // ── superadmins ──────────────────────────────────────────────────────────
    if (!$tableExists('superadmins')) {
        $pdo->exec(
            'CREATE TABLE superadmins ('
            . 'id INT AUTO_INCREMENT PRIMARY KEY,'
            . 'username VARCHAR(100) NOT NULL,'
            . 'password_hash VARCHAR(255) NOT NULL,'
            . 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,'
            . 'UNIQUE KEY uq_superadmins_username (username)'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        echo "[003] Tabla superadmins creada.\n";
    } else {
        echo "[003] Tabla superadmins ya existe. OK.\n";
    }

    // ── superadmin_tokens ────────────────────────────────────────────────────
    if (!$tableExists('superadmin_tokens')) {
        $pdo->exec(
            'CREATE TABLE superadmin_tokens ('
            . 'id INT AUTO_INCREMENT PRIMARY KEY,'
            . 'superadmin_id INT NOT NULL,'
            . 'token CHAR(64) NOT NULL,'
            . 'expires_at DATETIME NOT NULL,'
            . 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,'
            . 'UNIQUE KEY uq_superadmin_tokens_token (token),'
            . 'INDEX idx_superadmin_tokens_sa (superadmin_id),'
            . 'CONSTRAINT fk_superadmin_tokens_sa FOREIGN KEY (superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        echo "[003] Tabla superadmin_tokens creada.\n";
    } else {
        echo "[003] Tabla superadmin_tokens ya existe. OK.\n";
    }

    // ── Neutralizar cuenta comprometida V-00000000 ────────────────────────────
    // La migración 002 creó esta cuenta con credencial pública en GitHub.
    // Si existe y su contraseña sigue siendo 'superadmin123', suspenderla.
    if ($tableExists('users')) {
        $stmt = $pdo->prepare(
            "SELECT id, password_hash FROM users WHERE document='V-00000000' AND role='superadmin' AND status='active' LIMIT 1"
        );
        $stmt->execute();
        $defaultSa = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($defaultSa && password_verify('superadmin123', (string) $defaultSa['password_hash'])) {
            $pdo->prepare(
                "UPDATE users SET status='suspended', updated_at=NOW() WHERE id=?"
            )->execute([$defaultSa['id']]);

            if ($tableExists('sessions')) {
                $pdo->prepare(
                    "UPDATE sessions SET revoked_at=NOW() WHERE user_id=?"
                )->execute([$defaultSa['id']]);
            }

            if ($tableExists('audit_logs')) {
                $pdo->prepare(
                    "INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, after_data, ip_address, created_at)"
                    . " VALUES(NULL, 'auto_suspend_default_superadmin', 'user', ?, JSON_OBJECT('reason','credencial_publica_github'), '127.0.0.1', NOW())"
                )->execute([$defaultSa['id']]);
            }

            echo "[003] AVISO: La cuenta V-00000000 con contraseña predeterminada fue SUSPENDIDA automáticamente. Cree un nuevo superadmin con bin/create-superadmin.php.\n";
        } elseif ($defaultSa) {
            echo "[003] La cuenta V-00000000 existe pero ya tiene contraseña personalizada. OK.\n";
        }
    }

    echo "[003] Reconciliación de esquema de autenticación completada.\n";
};