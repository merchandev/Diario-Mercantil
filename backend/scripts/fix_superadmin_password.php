#!/usr/bin/env php
<?php
// Script para actualizar el password del superadmin con el hash correcto
// Ejecutar: docker exec -it diario-mercantil-backend-1 php /var/www/html/scripts/fix_superadmin_password.php

require_once __DIR__.'/../src/Database.php';

$password = 'G0ku*1896';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Generando hash para password: $password\n";
echo "Hash generado: $hash\n\n";

try {
    $pdo = Database::pdo();
    
    // Actualizar el password
    $stmt = $pdo->prepare("UPDATE superadmins SET password_hash = ? WHERE username = 'merchandev'");
    $stmt->execute([$hash]);
    
    echo "✅ Password actualizado correctamente para usuario 'merchandev'\n\n";
    
    // Verificar que se actualizó
    $stmt = $pdo->query("SELECT username, password_hash, created_at FROM superadmins WHERE username = 'merchandev'");
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "Verificación:\n";
        echo "- Usuario: {$user['username']}\n";
        echo "- Hash: {$user['password_hash']}\n";
        echo "- Creado: {$user['created_at']}\n\n";
        
        // Test del hash
        if (password_verify($password, $user['password_hash'])) {
            echo "✅ VERIFICACIÓN EXITOSA: El hash coincide con la contraseña '$password'\n";
        } else {
            echo "❌ ERROR: El hash NO coincide con la contraseña\n";
        }
    } else {
        echo "❌ Usuario 'merchandev' no encontrado\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
