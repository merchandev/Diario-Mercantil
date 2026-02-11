<?php
header('Content-Type: text/plain');

$base = realpath(__DIR__.'/../');
$storage = $base . '/storage';
$uploads = $storage . '/uploads';

echo "Base: $base\n";
echo "Storage: $storage\n";
echo "Uploads: $uploads\n";

if (is_dir($uploads)) {
    echo "Uploads dir EXISTS.\n";
    echo "Permissions: " . substr(sprintf('%o', fileperms($uploads)), -4) . "\n";
    echo "Owner/Group: " . fileowner($uploads) . "/" . filegroup($uploads) . "\n";
    
    // Test Write
    $testFile = $uploads . '/test_write_' . time() . '.txt';
    if (file_put_contents($testFile, 'test')) {
        echo "Write Test: SUCCESS ($testFile)\n";
        unlink($testFile);
    } else {
        echo "Write Test: FAILED\n";
        echo "Last Error: " . print_r(error_get_last(), true) . "\n";
    }

    // List Files
    echo "\n--- Files in Uploads ---\n";
    $files = scandir($uploads);
    foreach ($files as $f) {
        if ($f == '.' || $f == '..') continue;
        echo "$f\n";
    }

} else {
    echo "Uploads dir DOES NOT EXIST.\n";
}
