<?php
require_once __DIR__.'/../src/Database.php';

echo "--- DIAGNOSTICO DE REGISTRO ---\n";

try {
    $pdo = Database::pdo();
    echo "✅ Conexión DB exitosa.\n";
    
    // 1. Verify 'users' table structure
    echo "🔍 Verificando tabla 'users'...\n";
    $cols = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_COLUMN);
    echo "   Columnas: " . implode(", ", $cols) . "\n";
    
    $required = ['document', 'name', 'password_hash', 'role', 'phone', 'email', 'person_type', 'created_at', 'updated_at'];
    foreach ($required as $r) {
        if (!in_array($r, $cols)) echo "❌ FALTA COLUMNA: $r\n";
    }

    // 2. Verify 'auth_tokens' table structure
    echo "🔍 Verificando tabla 'auth_tokens'...\n";
    try {
        $colsT = $pdo->query("DESCRIBE auth_tokens")->fetchAll(PDO::FETCH_COLUMN);
        echo "   Columnas: " . implode(", ", $colsT) . "\n";
    } catch (Exception $e) {
         echo "❌ ERROR: Tabla 'auth_tokens' inaccesible. " . $e->getMessage() . "\n";
    }

    // 3. Attempt Dummy Insert
    echo "🧪 Intentando insertar usuario de prueba 'test_debug_script'...\n";
    $doc = 'test_' . time();
    $name = 'Test Debug';
    $hash = password_hash('123456', PASSWORD_DEFAULT);
    $now = gmdate("Y-m-d H:i:s");
    
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare("INSERT INTO users(document,name,password_hash,role,phone,email,person_type,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)");
        $ins->execute([$doc, $name, $hash, "solicitante", "555555", "test@debug.com", "natural", $now, $now]);
        $uid = $pdo->lastInsertId();
        echo "✅ Usuario insertado ID: $uid\n";
        
        $token = bin2hex(random_bytes(32));
        $expiry = gmdate("Y-m-d H:i:s", time() + 604800);
        
        $insT = $pdo->prepare("INSERT INTO auth_tokens(user_id,token,expires_at,created_at) VALUES(?,?,?,?)");
        $insT->execute([$uid, $token, $expiry, $now]);
        echo "✅ Token insertado correctamente.\n";
        
        $pdo->rollBack(); // Don't keep junk
        echo "✅ INSERT DE PRUEBA EXITOSO (Rollback realizado).\n";
        
    } catch (Throwable $ex) {
        $pdo->rollBack();
        echo "❌ ERROR EN INSERT: " . $ex->getMessage() . "\n";
    }

} catch (Throwable $e) {
    echo "❌ ERROR FATAL GENERAL: " . $e->getMessage() . "\n";
}
echo "---------------------------\n";
