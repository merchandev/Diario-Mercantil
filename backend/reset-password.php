<?php
require_once __DIR__.'/src/Database.php';

$pdo = Database::pdo();
$document = 'V12345678';
$password = 'Admin#2025!';

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE document = ?');
$stmt->execute([$hash, $document]);

echo "✅ Contraseña actualizada exitosamente para usuario: $document\n";
echo "📄 Documento: $document\n";
echo "🔑 Contraseña: $password\n";
