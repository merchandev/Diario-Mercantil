<?php
/**
 * Repair All Users Script
 * Activates all inactive users and displays current database state
 * Run: php backend/scripts/repair_all_users.php
 */

require_once __DIR__ . '/../src/Database.php';

try {
    $pdo = Database::pdo();
    $now = gmdate('Y-m-d H:i:s');
    
    echo "=== REPARACIÓN DE USUARIOS ===\n\n";
    
    // 1. Count users by status
    echo "--- Estado Actual ---\n";
    $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM users GROUP BY status");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $status = $row['status'] ?: 'NULL';
        echo "  {$status}: {$row['count']} usuarios\n";
    }
    echo "\n";
    
    // 2. Activate all users with status != 'active'
    echo "--- Activando Usuarios ---\n";
    $stmt = $pdo->prepare("UPDATE users SET status = 'active', updated_at = ? WHERE status != 'active' OR status IS NULL");
    $stmt->execute([$now]);
    $affected = $stmt->rowCount();
    echo "✓ {$affected} usuarios activados\n\n";
    
    // 3. List all users with their current state
    echo "--- Lista de Usuarios ---\n";
    $stmt = $pdo->query("SELECT id, document, name, role, status, email FROM users ORDER BY id");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $status_icon = $row['status'] === 'active' ? '✓' : '✗';
        echo "{$status_icon} ID:{$row['id']} | {$row['document']} | {$row['name']} | {$row['role']} | {$row['status']}\n";
    }
    echo "\n";
    
    // 4. Verify critical users
    echo "--- Verificación de Usuarios Críticos ---\n";
    $critical = ['merchandev', 'V12345678', '12345678', '123456789', 'V123456789'];
    foreach ($critical as $doc) {
        $stmt = $pdo->prepare("SELECT id, name, role, status FROM users WHERE document = ?");
        $stmt->execute([$doc]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            $icon = $user['status'] === 'active' ? '✓' : '✗';
            echo "{$icon} {$doc}: {$user['name']} ({$user['role']}) - {$user['status']}\n";
        } else {
            echo "✗ {$doc}: NO ENCONTRADO\n";
        }
    }
    
    echo "\n=== REPARACIÓN COMPLETADA ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
