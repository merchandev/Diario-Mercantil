<?php
/**
 * reset_users_clean.php
 * =====================
 * Limpia TODOS los usuarios del sistema y deja únicamente:
 *   1. merchandev  → superadmin  (tabla superadmins)   contraseña: G0ku*1896
 *   2. soporte     → admin       (tabla users)          contraseña: G0ku*1896
 *
 * Cómo ejecutar en el servidor:
 *   docker exec -it <backend-container> php /var/www/html/scripts/reset_users_clean.php
 *
 * ADVERTENCIA: Esta operación es irreversible.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Database.php';

// ── Configuración ──────────────────────────────────────────────────────────────
const SUPERADMIN_USERNAME = 'merchandev';
const ADMIN_DOCUMENT      = 'soporte';          // clave de login en users.document
const ADMIN_EMAIL         = 'soporte@merchan.dev';
const ADMIN_NAME          = 'Soporte Mercantil';
const SHARED_PASSWORD     = 'G0ku*1896';
// ────────────────────────────────────────────────────────────────────────────────

try {
    $pdo = Database::pdo();

    echo "\n╔══════════════════════════════════════════════╗\n";
    echo   "║      RESET LIMPIO DE USUARIOS DEL SISTEMA    ║\n";
    echo   "╚══════════════════════════════════════════════╝\n\n";

    $hash = password_hash(SHARED_PASSWORD, PASSWORD_DEFAULT);
    $now  = gmdate('Y-m-d H:i:s');

    // ── 1. Limpiar sesiones y tokens (primero para evitar FK issues) ────────────
    echo "[1/6] Revocando todas las sesiones activas...\n";
    $pdo->exec("UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL");

    echo "[2/6] Eliminando tokens de superadmin...\n";
    $pdo->exec("DELETE FROM superadmin_tokens");

    // ── 2. Eliminar TODOS los usuarios regulares ────────────────────────────────
    // legal_requests.user_id tiene ON DELETE SET NULL → seguro
    // directory_profiles.user_id tiene ON DELETE CASCADE → seguro
    // sessions.user_id → eliminamos con DELETE en cascada
    echo "[3/6] Eliminando todos los usuarios regulares...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $pdo->exec("DELETE FROM sessions");
    $pdo->exec("DELETE FROM auth_tokens");
    $pdo->exec("DELETE FROM password_resets");
    $pdo->exec("DELETE FROM users");
    $pdo->exec("ALTER TABLE users AUTO_INCREMENT = 1");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "    → Tabla users vaciada.\n";

    // ── 3. Crear usuario admin: soporte@merchan.dev ─────────────────────────────
    echo "[4/6] Creando usuario admin: " . ADMIN_DOCUMENT . " (" . ADMIN_EMAIL . ")...\n";
    $stmt = $pdo->prepare("
        INSERT INTO users
            (document, name, password_hash, role, email, phone, person_type, status, created_at, updated_at)
        VALUES
            (?, ?, ?, 'admin', ?, '', 'natural', 'active', ?, ?)
    ");
    $stmt->execute([ADMIN_DOCUMENT, ADMIN_NAME, $hash, ADMIN_EMAIL, $now, $now]);
    $adminId = $pdo->lastInsertId();
    echo "    → Usuario creado con ID: $adminId\n";

    // ── 4. Verificar / crear superadmin merchandev ──────────────────────────────
    echo "[5/6] Configurando superadmin: " . SUPERADMIN_USERNAME . "...\n";

    // Asegurar que la tabla existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS superadmins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS superadmin_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        superadmin_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY(superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $check = $pdo->prepare("SELECT id FROM superadmins WHERE username = ?");
    $check->execute([SUPERADMIN_USERNAME]);
    $existingSa = $check->fetch();

    if ($existingSa) {
        $pdo->prepare("UPDATE superadmins SET password_hash = ?, updated_at = NOW() WHERE username = ?")
            ->execute([$hash, SUPERADMIN_USERNAME]);
        echo "    → Superadmin ACTUALIZADO (contraseña reseteada).\n";
    } else {
        $pdo->prepare("INSERT INTO superadmins (username, password_hash) VALUES (?, ?)")
            ->execute([SUPERADMIN_USERNAME, $hash]);
        echo "    → Superadmin CREADO.\n";
    }

    // ── 5. Verificación final ───────────────────────────────────────────────────
    echo "\n[6/6] Verificando credenciales...\n";

    // Verificar admin
    $adminRow = $pdo->prepare("SELECT * FROM users WHERE document = ?");
    $adminRow->execute([ADMIN_DOCUMENT]);
    $adminData = $adminRow->fetch(PDO::FETCH_ASSOC);
    $adminOk = $adminData && password_verify(SHARED_PASSWORD, $adminData['password_hash']);
    echo "    Admin login check:      " . ($adminOk ? "✅ PASS" : "❌ FAIL") . "\n";

    // Verificar superadmin
    $saRow = $pdo->prepare("SELECT * FROM superadmins WHERE username = ?");
    $saRow->execute([SUPERADMIN_USERNAME]);
    $saData = $saRow->fetch(PDO::FETCH_ASSOC);
    $saOk = $saData && password_verify(SHARED_PASSWORD, $saData['password_hash']);
    echo "    Superadmin login check: " . ($saOk ? "✅ PASS" : "❌ FAIL") . "\n";

    // ── Resumen ─────────────────────────────────────────────────────────────────
    echo "\n╔══════════════════════════════════════════════╗\n";
    echo   "║                  RESULTADO                   ║\n";
    echo   "╠══════════════════════════════════════════════╣\n";
    echo   "║ SUPERADMIN                                   ║\n";
    echo   "║   URL:      /lotus/superadmin                ║\n";
    printf("║   Usuario:  %-31s║\n", SUPERADMIN_USERNAME);
    printf("║   Password: %-31s║\n", SHARED_PASSWORD);
    echo   "╠══════════════════════════════════════════════╣\n";
    echo   "║ ADMINISTRADOR (panel /lotus)                 ║\n";
    printf("║   Documento: %-30s║\n", ADMIN_DOCUMENT);
    printf("║   Email:     %-30s║\n", ADMIN_EMAIL);
    printf("║   Password:  %-30s║\n", SHARED_PASSWORD);
    echo   "╚══════════════════════════════════════════════╝\n\n";

    if (!$adminOk || !$saOk) {
        echo "⚠️  Alguna verificación falló. Revisa los logs.\n\n";
        exit(1);
    }

    echo "✅ Reset completado exitosamente. El sistema tiene 2 cuentas activas.\n\n";

} catch (Throwable $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "   En: " . $e->getFile() . ":" . $e->getLine() . "\n\n";
    exit(1);
}
