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

    // Si la tabla users ya existe, asumimos que la base de datos ya fue inicializada.
    if ($tableExists('users')) {
        echo "[init_schema] La base de datos ya está inicializada. Omitiendo volcado.\n";
        return;
    }

    $initSqlPath = dirname(__DIR__, 2) . '/migrations/init.sql';
    if (!file_exists($initSqlPath)) {
        throw new RuntimeException("No se encontró el archivo base de esquema: {$initSqlPath}");
    }

    echo "[init_schema] Base de datos vacía detectada. Inicializando esquema base desde init.sql...\n";
    $sql = file_get_contents($initSqlPath);
    if ($sql === false) {
        throw new RuntimeException("No se pudo leer el archivo: {$initSqlPath}");
    }

    // Ejecutar el volcado completo. PDO::exec soporta múltiples statements por defecto en MySQL.
    try {
        $pdo->exec($sql);
    } catch (PDOException $e) {
        throw new RuntimeException("Error ejecutando init.sql: " . $e->getMessage(), 0, $e);
    }
    
    echo "[init_schema] Esquema base creado exitosamente.\n";
};
