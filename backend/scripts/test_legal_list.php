<?php
// Script to test legal list endpoint as solicitante user
require_once __DIR__.'/../src/Database.php';

$pdo = Database::pdo();

// Get solicitante user
$userStmt = $pdo->query("SELECT * FROM users WHERE document='J000111222' LIMIT 1");
$user = $userStmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die("❌ Usuario solicitante no encontrado\n");
}

echo "✅ Usuario encontrado:\n";
echo "   ID: {$user['id']}\n";
echo "   Nombre: {$user['name']}\n";
echo "   Rol: {$user['role']}\n\n";

// Check if user is staff
$role = strtolower($user['role'] ?? '');
$isStaff = in_array($role, ['staff', 'admin']);

echo "👤 Permisos:\n";
echo "   Es staff/admin: " . ($isStaff ? 'SÍ' : 'NO') . "\n\n";

// Simulate the query that LegalController::list() would make for this user
$where = [];
$params = [];

// Non-staff users can only see their own requests (unless all=1)
if (!$isStaff) {
    $where[] = 'user_id = ?';
    $params[] = (int)$user['id'];
}

$sql = 'SELECT * FROM legal_requests' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY id DESC';

echo "📊 Consulta SQL:\n";
echo "   $sql\n";
echo "   Parámetros: " . json_encode($params) . "\n\n";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "📋 Resultados:\n";
echo "   Total: " . count($items) . " registros\n\n";

if (count($items) > 0) {
    echo "Detalle de registros:\n";
    foreach ($items as $item) {
        echo "   - ID: {$item['id']} | Estado: {$item['status']} | Nombre: {$item['name']} | user_id: {$item['user_id']}\n";
    }
} else {
    echo "❌ No se encontraron registros para user_id={$user['id']}\n\n";
    
    // Check if there are ANY records with this user_id
    $checkStmt = $pdo->prepare('SELECT COUNT(*) as total FROM legal_requests WHERE user_id = ?');
    $checkStmt->execute([(int)$user['id']]);
    $count = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    echo "🔍 Verificación directa:\n";
    echo "   Registros con user_id={$user['id']}: {$count['total']}\n\n";
    
    if ($count['total'] > 0) {
        $detailStmt = $pdo->prepare('SELECT id, status, name, user_id, created_at FROM legal_requests WHERE user_id = ? ORDER BY id DESC');
        $detailStmt->execute([(int)$user['id']]);
        $details = $detailStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "   Estos son los registros:\n";
        foreach ($details as $d) {
            echo "   - ID: {$d['id']} | Estado: {$d['status']} | Nombre: {$d['name']} | Creado: {$d['created_at']}\n";
        }
    }
}

echo "\n✅ Test completado\n";
