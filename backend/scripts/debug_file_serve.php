<?php
require_once __DIR__.'/../src/Database.php';

$id = 1; // Default ID to test, change as needed or take from args
if ($argc > 1) $id = (int)$argv[1];

echo "--- Debugging File Serving for ID: $id ---\n";

try {
    $pdo = Database::pdo();
    $stmt = $pdo->prepare('SELECT * FROM files WHERE id=?');
    $stmt->execute([$id]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        echo "ERROR: File record not found in database.\n";
        exit(1);
    }

    echo "Database Record:\n";
    print_r($file);

    $uploadDir = realpath(__DIR__.'/../storage/uploads');
    echo "Upload Directory: $uploadDir\n";

    if (!is_dir($uploadDir)) {
        echo "ERROR: Upload directory does not exist!\n";
    } else {
        echo "Upload directory exists.\n";
        echo "Permissions: " . substr(sprintf('%o', fileperms($uploadDir)), -4) . "\n";
        echo "Owner/Group: " . fileowner($uploadDir) . "/" . filegroup($uploadDir) . "\n";
    }

    $path = $file['path'] ?? null;
    $filePath = $uploadDir . '/' . $path;
    echo "Expected File Path: $filePath\n";

    if (file_exists($filePath)) {
        echo "SUCCESS: File exists on disk.\n";
        echo "Size: " . filesize($filePath) . " bytes\n";
        echo "Permissions: " . substr(sprintf('%o', fileperms($filePath)), -4) . "\n";
    } else {
        echo "ERROR: File NOT found on disk.\n";
        
        // List contents of upload dir to see what's there
        echo "\nGenerated listing of storage/uploads:\n";
        $files = scandir($uploadDir);
        foreach ($files as $f) {
            if ($f == '.' || $f == '..') continue;
            echo "- $f\n";
        }
    }

} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}
