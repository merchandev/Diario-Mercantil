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

    if (!$tableExists('users')) {
        echo "[ensure_superadmin] La tabla users no existe aún. Omitiendo.\n";
        return;
    }

    // Verificar si existe algún superadmin
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'");
    $count = (int) $stmt->fetchColumn();

    if ($count === 0) {
        echo "[ensure_superadmin] No se detectaron superadmins. Creando superadmin por defecto...\n";
        
        $insert = $pdo->prepare(
            "INSERT INTO users (document, name, password_hash, role, email, status, created_at, updated_at) "
            . "VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())"
        );
        
        // La contraseña por defecto será 'superadmin123', puedes cambiarla luego en la interfaz
        $passwordHash = password_hash('superadmin123', PASSWORD_DEFAULT);
        
        $insert->execute([
            'V-00000000',
            'Super Administrador',
            $passwordHash,
            'superadmin',
            'superadmin@diariomercantil.com',
            'active'
        ]);
        
        echo "[ensure_superadmin] Creado usuario superadmin por defecto (documento: V-00000000, clave: superadmin123).\n";
    } else {
        echo "[ensure_superadmin] Superadmin ya existe. OK.\n";
    }
};
