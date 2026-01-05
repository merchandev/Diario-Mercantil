<?php
// Reset database: backup current file, recreate empty, apply migrations, seed legal requests.
// Use with caution: this will DROP existing data.
require_once __DIR__.'/../src/Database.php';

function line($msg){ echo $msg, "\n"; }

$dbPath = getenv('DB_PATH') ?: realpath(__DIR__.'/../storage').'/database.sqlite';
if (!$dbPath) { fwrite(STDERR, "Cannot resolve DB_PATH\n" ); exit(1); }

// Close existing PDO if any
if (class_exists('Database')) {
  $ref = new ReflectionClass('Database');
  $prop = $ref->getProperty('pdo'); $prop->setAccessible(true); $prop->setValue(null, null);
}

if (file_exists($dbPath)) {
  $backup = $dbPath.'.bak.'.date('Ymd_His');
  if (!rename($dbPath, $backup)) { fwrite(STDERR, "Failed to backup existing DB\n" ); exit(1); }
  line("Existing database backed up to: $backup");
}

// Create new empty file
touch($dbPath);
chmod($dbPath, 0666);
line("Created new empty database file at $dbPath");

// Reconnect
$pdo = Database::pdo();

// Apply migrations init.sql
$initFile = realpath(__DIR__.'/../migrations/init.sql');
if (!$initFile || !file_exists($initFile)) { fwrite(STDERR, "init.sql not found\n" ); exit(1); }
$sql = file_get_contents($initFile);
$pdo->exec($sql);
line("Applied migrations from init.sql");

// Seed users first
require __DIR__.'/seed_users.php';

// Seed legal sample data
require __DIR__.'/seed_legal.php';

// Show counts summary
$tables = ['users','files','legal_requests','editions','payment_methods','settings'];
foreach ($tables as $t) {
  try { $c = (int)$pdo->query("SELECT COUNT(*) FROM $t")->fetchColumn(); line("$t: $c rows"); } catch (Throwable $e) { line("$t: error - ".$e->getMessage()); }
}

line("Database reset complete.");
?>