<?php
require_once __DIR__ . '/src/Database.php';
$pdo = Database::pdo();
$pdo->exec("UPDATE superadmins SET password_hash='\$2y\$12\$6.9anQL/.0KNdFLad4OHXeCKPIzxkxcxSBVabowAnPxfOdBoXKsCa' WHERE username='merchandev'");
$pdo->exec("UPDATE users SET password_hash='\$2y\$12\$3mlPyEcSBaNa4DKTT1V9Su4SymMrEw8G3R8QK43Y/zQhIwLyUkySm' WHERE document='V12345678'");
echo "Hashes updated\n";
