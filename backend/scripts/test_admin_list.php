<?php
// Script to test legal list endpoint as ADMIN user
require_once __DIR__.'/../src/Database.php';

$pdo = Database::pdo();

// Get admin user
$userStmt = $pdo->query("SELECT * FROM users WHERE document='V12345678' LIMIT 1");
$user = $userStmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo "❌ Usuario admin no encontrado\n";
    exit(1);
}

echo "✅ Usuario encontrado:\n";
echo "   ID: {$user['id']}\n";
echo "   Nombre: {$user['name']}\n";
echo "   Rol: {$user['role']}\n\n";

// Check if user is staff
$role = strtolower($user['role'] ?? '');
$isStaff = in_array($role, ['admin', 'administrador', 'superadmin', 'staff'], true);

echo "👤 Permisos:\n";
echo "   Es staff/admin: " . ($isStaff ? 'SÍ' : 'NO') . "\n\n";

// Simulate what LegalController->list() does
if ($isStaff) {
    echo "📊 Consulta SQL (ADMIN - sin filtro de user_id):\n";
    echo "   SELECT * FROM legal_requests ORDER BY id DESC\n\n";
    
    $stmt = $pdo->query('SELECT * FROM legal_requests ORDER BY id DESC');
} else {
    echo "📊 Consulta SQL (NO ADMIN - con filtro de user_id):\n";
    echo "   SELECT * FROM legal_requests WHERE user_id = ? ORDER BY id DESC\n";
    echo "   Parámetros: [{$user['id']}]\n\n";
    
    $stmt = $pdo->prepare('SELECT * FROM legal_requests WHERE user_id = ? ORDER BY id DESC');
    $stmt->execute([$user['id']]);
}

$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "📋 Resultados:\n";
echo "   Total: " . count($rows) . " registros\n\n";

if (count($rows) > 0) {
    echo "Detalle de registros:\n";
    foreach ($rows as $row) {
        echo "   - ID: {$row['id']} | Estado: {$row['status']} | Nombre: {$row['name']} | user_id: {$row['user_id']}\n";
    }
} else {
    echo "   ⚠️ No se encontraron registros\n";
}

echo "\n✅ Test completado\n";
?>
