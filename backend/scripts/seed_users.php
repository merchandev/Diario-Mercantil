<?php
// Seed initial users (admin + solicitante) if users table empty
require_once __DIR__.'/../src/Database.php';

try {
  $pdo = Database::pdo();
  $count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
  if ($count > 0) { echo "users table already has $count rows, skipping\n"; exit(0); }

  $now = gmdate('c');
  // Admin from env or defaults
  $adminDoc = getenv('ADMIN_DOCUMENT') ?: 'V12345678';
  $adminPass = getenv('ADMIN_PASSWORD') ?: 'Admin#2025!';
  $adminName = getenv('ADMIN_NAME') ?: 'Administrador';
  $adminHash = password_hash($adminPass, PASSWORD_DEFAULT);
  $stmt = $pdo->prepare('INSERT INTO users(document,name,password_hash,role,created_at) VALUES(?,?,?,?,?)');
  $stmt->execute([$adminDoc,$adminName,$adminHash,'admin',$now]);

  // Test solicitante
  $solDoc = 'J000111222';
  $solPass = 'Test#2025!';
  $solHash = password_hash($solPass, PASSWORD_DEFAULT);
  $stmt->execute([$solDoc,'Solicitante Demo',$solHash,'solicitante',$now]);

  echo "Seeded admin (document=$adminDoc) and solicitante (document=$solDoc).\n";
  echo "Admin password: $adminPass\nSolicitante password: $solPass\n";
} catch (Throwable $e) {
  fwrite(STDERR, 'Seed users error: '.$e->getMessage()."\n");
  exit(1);
}
?>