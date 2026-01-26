#!/usr/bin/env php
<?php
// Script para generar el hash correcto de la contraseña del superadmin
// Ejecutar: php generate_superadmin_hash.php

$password = 'G0ku*1896';
$hash = password_hash($password, PASSWORD_DEFAULT);

echo "Password: $password\n";
echo "Hash: $hash\n";
echo "\n";
echo "SQL para insertar superadmin:\n";
echo "INSERT INTO superadmins (username, password_hash) VALUES ('merchandev', '$hash');\n";
