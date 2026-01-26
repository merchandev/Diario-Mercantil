<?php
require_once __DIR__.'/../src/Database.php';

try {
    $pdo = Database::pdo();
    echo "--- DIAGNOSTICO DE USUARIOS ---\n";
    
    // 1. Check strict 'merchandev'
    $stmt = $pdo->prepare("SELECT id, document, name, password_hash, role FROM users WHERE document LIKE ?");
    $stmt->execute(['%merchandev%']);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($users)) {
        echo "❌ ERROR FATAL: El usuario 'merchandev' NO EXISTE en la base de datos.\n";
        echo "Debes correr: docker-compose exec -T backend php scripts/add_merchandev_user.php\n";
    } else {
        foreach ($users as $u) {
            echo "✅ Usuario encontrado: [ID: {$u['id']}] Documento: '{$u['document']}' | Nombre: '{$u['name']}' | Role: '{$u['role']}'\n";
            
            // 2. Validate Password
            $check = password_verify('G0ku*1896', $u['password_hash']);
            if ($check) {
                echo "✅ PASSWORD CORRECTO: Coincide con G0ku*1896\n";
            } else {
                echo "❌ PASSWORD INCORRECTO: El hash en DB no coincide con G0ku*1896\n";
                echo "   Hash actual: " . substr($u['password_hash'], 0, 10) . "...\n";
            }
        }
    }
    echo "---------------------------\n";

} catch (Throwable $e) {
    echo "❌ EXEPCION: " . $e->getMessage() . "\n";
}
