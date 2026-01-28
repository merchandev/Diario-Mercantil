<?php
$hash = password_hash('G0ku*1896', PASSWORD_BCRYPT);
echo "PART1:" . substr($hash, 0, 30) . "\n";
echo "PART2:" . substr($hash, 30) . "\n";
