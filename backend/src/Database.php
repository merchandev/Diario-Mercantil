<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $connection = strtolower((string) (getenv('DB_CONNECTION') ?: 'mysql'));
        if ($connection === 'sqlite') {
            return self::$pdo = self::connectSqlite();
        }
        if ($connection !== 'mysql') {
            throw new RuntimeException('DB_CONNECTION no soportado.');
        }

        $host = (string) (getenv('DB_HOST') ?: 'db');
        $port = (string) (getenv('DB_PORT') ?: '3306');
        $database = self::requiredEnv('DB_DATABASE');
        $username = self::requiredEnv('DB_USERNAME');
        $password = self::requiredEnv('DB_PASSWORD');
        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";

        $last = null;
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            try {
                self::$pdo = new PDO($dsn, $username, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 5,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci; SET time_zone = '+00:00'",
                ]);
                return self::$pdo;
            } catch (PDOException $e) {
                $last = $e;
                error_log("[database] intento {$attempt}/5 falló: " . $e->getMessage());
                if ($attempt < 5) {
                    sleep(2);
                }
            }
        }

        error_log('[database] conexión MySQL agotó reintentos: ' . ($last?->getMessage() ?? 'unknown'));
        throw new RuntimeException('Database connection failed.');
    }

    public static function healthCheck(): bool
    {
        try {
            self::pdo()->query('SELECT 1');
            return true;
        } catch (Throwable $e) {
            error_log('[database.health] ' . $e->getMessage());
            return false;
        }
    }

    private static function connectSqlite(): PDO
    {
        $path = (string) (getenv('DB_PATH') ?: dirname(__DIR__) . '/storage/database.sqlite');
        $dir = dirname($path);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException('No se pudo crear el directorio SQLite.');
        }

        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        return $pdo;
    }

    private static function requiredEnv(string $name): string
    {
        $value = getenv($name);
        if ($value === false || trim((string) $value) === '') {
            throw new RuntimeException("Variable de entorno requerida no configurada: {$name}");
        }
        return (string) $value;
    }
}
