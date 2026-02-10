<?php
$logoPathRelative = __DIR__.'/../public/logo-blanco.png';
$logoPathReal = realpath($logoPathRelative);

echo "Relative: $logoPathRelative\n";
echo "Real: $logoPathReal\n";
echo "Exists: " . (file_exists($logoPathReal) ? 'YES' : 'NO') . "\n";
echo "Readable: " . (is_readable($logoPathReal) ? 'YES' : 'NO') . "\n";

if (function_exists('gd_info')) {
    echo "GD Installed: YES\n";
    print_r(gd_info());
} else {
    echo "GD Installed: NO\n";
}
