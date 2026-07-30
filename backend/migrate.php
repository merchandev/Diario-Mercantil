<?php
require_once __DIR__ . '/src/Database.php';

echo "Ejecutando migraciones automáticas...\n";
$pdo = Database::pdo();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$migrationsDir = __DIR__ . '/migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

$pdo->exec("CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

foreach ($files as $file) {
    $filename = basename($file);
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM migrations WHERE migration = ?");
    $stmt->execute([$filename]);
    if ($stmt->fetchColumn() == 0) {
        echo "Aplicando: $filename\n";
        $sql = file_get_contents($file);
        try {
            $pdo->exec($sql);
            $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)")->execute([$filename]);
            echo "-> Completado.\n";
        } catch (Exception $e) {
            echo "Error en $filename: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
}
echo "¡Migraciones al día!\n";
