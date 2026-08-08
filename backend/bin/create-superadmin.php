<?php

declare(strict_types=1);

/**
 * CLI script to create or update the superadmin account.
 * Usage: php bin/create-superadmin.php
 * Reads credentials from environment variables:
 *   SUPERADMIN_DOCUMENT  - document ID (e.g. V-12345678)
 *   SUPERADMIN_PASS      - password (must be at least 12 characters)
 *
 * Never prints the password to stdout.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo puede ejecutarse desde la línea de comandos.\n");
    exit(1);
}

require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/PasswordPolicy.php';

$document = getenv('SUPERADMIN_DOCUMENT');
$password = getenv('SUPERADMIN_PASS');

if (!$document || !$password) {
    fwrite(STDERR, "Error: Se requieren las variables de entorno SUPERADMIN_DOCUMENT y SUPERADMIN_PASS.\n");
    fwrite(STDERR, "Ejemplo: SUPERADMIN_DOCUMENT=V-12345678 SUPERADMIN_PASS=miClave12Segura php bin/create-superadmin.php\n");
    exit(1);
}

try {
    PasswordPolicy::validate($password);
} catch (InvalidArgumentException $e) {
    fwrite(STDERR, "Error de validación: " . $e->getMessage() . "\n");
    exit(1);
}

$document = strtoupper(preg_replace('/[^A-Z0-9-]/i', '', $document));

try {
    $pdo = Database::pdo();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $hash = PasswordPolicy::hash($password);
    $now  = date('Y-m-d H:i:s');

    // Upsert: create or update the superadmin user
    $stmt = $pdo->prepare(
        "SELECT id, status FROM users WHERE document=? AND role='superadmin' LIMIT 1"
    );
    $stmt->execute([$document]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $pdo->prepare(
            "UPDATE users SET password_hash=?, status='active', updated_at=? WHERE id=?"
        )->execute([$hash, $now, $existing['id']]);

        // Revoke all existing sessions for security
        $pdo->prepare(
            "UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL"
        )->execute([$now, $existing['id']]);

        // Log the action
        try {
            $pdo->prepare(
                "INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, after_data, ip_address, created_at)"
                . " VALUES(NULL, 'superadmin_credential_reset', 'user', ?, JSON_OBJECT('document', ?, 'status', 'active'), 'cli', ?)"
            )->execute([$existing['id'], $document, $now]);
        } catch (Throwable) {
            // audit_logs may not exist yet in old installs
        }

        echo "[create-superadmin] Contraseña actualizada y cuenta activada para: {$document}\n";
    } else {
        $pdo->prepare(
            "INSERT INTO users(document, name, password_hash, role, email, status, created_at, updated_at)"
            . " VALUES(?, 'Super Administrador', ?, 'superadmin', '', 'active', ?, ?)"
        )->execute([$document, $hash, $now, $now]);

        $newId = (int) $pdo->lastInsertId();

        try {
            $pdo->prepare(
                "INSERT INTO audit_logs(actor_user_id, action, resource_type, resource_id, after_data, ip_address, created_at)"
                . " VALUES(NULL, 'superadmin_created', 'user', ?, JSON_OBJECT('document', ?), 'cli', ?)"
            )->execute([$newId, $document, $now]);
        } catch (Throwable) {
            // audit_logs may not exist yet in old installs
        }

        echo "[create-superadmin] Superadmin creado exitosamente: {$document}\n";
    }

    echo "[create-superadmin] Listo. No olvides rotar las credenciales periódicamente.\n";
    exit(0);

} catch (Throwable $e) {
    fwrite(STDERR, "[create-superadmin] Error: " . $e->getMessage() . "\n");
    exit(1);
}
