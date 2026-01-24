#!/usr/bin/env php
<?php
// Script para agregar usuario merchandev (admin) para acceso rápido
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__.'/../src/Database.php';

$pdo = Database::pdo();
$document = 'merchandev';
$name = 'Merchandev';
$password = 'G0ku*1896';
$role = 'admin';
$email = 'merchandev@demo.local';
$phone = null;
$person_type = 'natural';
$status = 'active';
$now = gmdate('c');

$hash = password_hash($password, PASSWORD_DEFAULT);

// Verificar si ya existe
$exists = $pdo->prepare('SELECT id FROM users WHERE document=?');
$exists->execute([$document]);
$user = $exists->fetch();

if ($user) {
    // Actualizar si existe
    $stmt = $pdo->prepare('UPDATE users SET password_hash=?, role=?, status=?, updated_at=? WHERE id=?');
    $stmt->execute([$hash, $role, $status, $now, $user['id']]);
    echo "\n[OK] Usuario 'merchandev' ACTUALIZADO con nueva contraseña y rol admin.\n";
} else {
    // Insertar si no existe
    $stmt = $pdo->prepare('INSERT INTO users(document,name,password_hash,role,phone,email,person_type,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
    $stmt->execute([$document, $name, $hash, $role, $phone, $email, $person_type, $status, $now, $now]);
    echo "\n[OK] Usuario 'merchandev' CREADO con contraseña 'G0ku*1896' y rol admin.\n";
}

// Verificación inmediata
echo "\n--- Verificando credenciales ---\n";
$checkStmt = $pdo->prepare('SELECT * FROM users WHERE document=?');
$checkStmt->execute([$document]);
$u = $checkStmt->fetch(); // Use fetch here, previously $user might be stale or null
if ($u && password_verify($password, $u['password_hash'])) {
    echo "[PASS] La contraseña almacenada coincide con 'G0ku*1896'.\n";
    echo "ID Usuario: " . $u['id'] . "\n";
    echo "Rol: " . $u['role'] . "\n";
} else {
    echo "[FAIL] La verificación de contraseña falló.\n";
}
