<?php
$hash = password_hash('G0ku*1896', PASSWORD_BCRYPT);
file_put_contents('hash_output.txt', $hash);
echo "Hash written to hash_output.txt";
