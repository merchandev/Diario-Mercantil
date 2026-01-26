<?php
require_once __DIR__.'/../src/Database.php';

echo "\n============================================\n";
echo "   REPARACION DEL SISTEMA - DIARIO MERCANTIL\n";
echo "============================================\n";

try {
    $pdo = Database::pdo();
    echo "✅ Conexión a Base de Datos: OK\n";

    // 1. REPARAR TABLA USERS
    echo "\n[1/3] Verificando tabla 'users'...\n";
    $cols = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_COLUMN);
    
    $missingUsers = [];
    if (!in_array('phone', $cols)) $missingUsers['phone'] = "VARCHAR(20) NULL";
    if (!in_array('email', $cols)) $missingUsers['email'] = "VARCHAR(100) NULL";
    if (!in_array('person_type', $cols)) $missingUsers['person_type'] = "VARCHAR(20) DEFAULT 'natural'";
    if (!in_array('created_at', $cols)) $missingUsers['created_at'] = "DATETIME NULL";
    if (!in_array('updated_at', $cols)) $missingUsers['updated_at'] = "DATETIME NULL";

    foreach ($missingUsers as $col => $def) {
        $pdo->exec("ALTER TABLE users ADD COLUMN $col $def");
        echo "   ➜ Columna agregada: $col\n";
    }
    if (empty($missingUsers)) echo "   ✔ Estructura de 'users' correcta.\n";

    // 2. REPARAR TABLA AUTH_TOKENS
    echo "\n[2/3] Verificando tabla 'auth_tokens'...\n";
    $colsT = $pdo->query("DESCRIBE auth_tokens")->fetchAll(PDO::FETCH_COLUMN);

    $missingTokens = [];
    if (!in_array('created_at', $colsT)) $missingTokens['created_at'] = "DATETIME NULL";
    
    foreach ($missingTokens as $col => $def) {
        $pdo->exec("ALTER TABLE auth_tokens ADD COLUMN $col $def");
        echo "   ➜ Columna agregada: $col\n";
    }
    if (empty($missingTokens)) echo "   ✔ Estructura de 'auth_tokens' correcta.\n";

    // 3. REINICIAR SUPERADMIN
    echo "\n[3/3] Reiniciando Superusuario 'merchandev'...\n";
    
    // Borrar versiones corruptas
    $pdo->exec("DELETE FROM users WHERE document IN ('merchandev', 'Vmerchandev', 'Jmerchandev', 'Emerchandev')");
    
    // Crear nuevo limpio
    $pass = 'G0ku*1896';
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $now = gmdate("Y-m-d H:i:s");
    
    $sql = "INSERT INTO users (document, name, password_hash, role, phone, email, person_type, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'merchandev', 
        'Super Admin', 
        $hash, 
        'admin', 
        '0000000000', 
        'admin@diariomercantil.com', 
        'juridica', 
        $now, 
        $now
    ]);
    
    echo "   ✔ Usuario 'merchandev' creado exitosamente.\n";
    echo "   ✔ Contraseña asignada: $pass\n";
    
    echo "\n============================================\n";
    echo "   TODO LISTO. PRUEBA INICIAR SESION AHORA.\n";
    echo "============================================\n";

} catch (Throwable $e) {
    echo "\n❌ ERROR FATAL: " . $e->getMessage() . "\n";
    echo "   Traza: " . $e->getTraceAsString() . "\n";
}
