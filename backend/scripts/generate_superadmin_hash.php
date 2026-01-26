#!/usr/bin/env php
<?php
// Script para generar el hash de contraseña del superadmin
// Ejecutar en el SERVIDOR: docker exec -it diario-mercantil-backend-1 php /var/www/html/scripts/generate_superadmin_hash.php

// SECURITY: Password should be entered interactively or via environment variable
// For deployment, you can pass it as: php generate_superadmin_hash.php "YourPassword"

if ($argc > 1) {
    $password = $argv[1];
} else {
    // Interactive mode
    echo "Enter password for superadmin: ";
    $password = trim(fgets(STDIN));
}

if (empty($password)) {
    die("Error: Password cannot be empty\n");
}

$hash = password_hash($password, PASSWORD_DEFAULT);

echo "\n";
echo "Hash generated successfully!\n";
echo "================================\n";
echo "Hash: $hash\n";
echo "================================\n";
echo "\n";
echo "SQL to insert superadmin:\n";
echo "INSERT INTO superadmins (username, password_hash) VALUES ('merchandev', '$hash');\n";
echo "\n";
