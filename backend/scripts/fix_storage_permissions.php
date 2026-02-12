<?php
// fix_storage_permissions.php
$base = '/var/www/html/storage';
$uploads = $base . '/uploads';

echo "--- Fixing Storage Permissions ---\n";

if (!is_dir($base)) {
    echo "Creating storage dir...\n";
    mkdir($base, 0777, true);
}
if (!is_dir($uploads)) {
    echo "Creating uploads dir...\n";
    mkdir($uploads, 0777, true);
}

// Recursive chmod 0777
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base));
foreach ($iterator as $item) {
    echo "Chmod 0777: " . $item->getPathname() . "\n";
    chmod($item->getPathname(), 0777);
    chown($item->getPathname(), 'www-data');
    chgrp($item->getPathname(), 'www-data');
}
chmod($base, 0777);
chmod($uploads, 0777);
chown($base, 'www-data');
chgrp($base, 'www-data');
chown($uploads, 'www-data');
chgrp($uploads, 'www-data');

echo "\n--- Verify Write ---\n";
$test = $uploads . '/perm_test.txt';
if (file_put_contents($test, 'OK')) {
    echo "Write OK.\n";
    unlink($test);
} else {
    echo "Write FAILED.\n";
}

echo "\nDONE.\n";
