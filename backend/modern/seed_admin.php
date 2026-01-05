<?php
declare(strict_types=1);
$path = getenv('DB_PATH') ?: dirname(__DIR__).'/storage/database.sqlite';
$pdo = new PDO('sqlite:'.$path);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pwd = password_hash('admin123', PASSWORD_BCRYPT);
$now = date('c');
$stmt = $pdo->prepare('INSERT OR IGNORE INTO users(document,name,password_hash,role,created_at) VALUES (?,?,?,?,?)');
$stmt->execute(['admin','Administrador',$pwd,'admin',$now]);
$row = $pdo->query("SELECT id,document,role FROM users WHERE document='admin'")->fetch(PDO::FETCH_ASSOC);
echo json_encode($row, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT),"\n";
