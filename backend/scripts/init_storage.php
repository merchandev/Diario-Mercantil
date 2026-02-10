<?php
$dir = __DIR__ . '/../storage/uploads';
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
    echo "Created storage/uploads\n";
} else {
    echo "storage/uploads exists\n";
}
chmod($dir, 0777);
echo "Set permissions for storage/uploads\n";
