$password = 'G0ku*1896';
$hash = password_hash($password, PASSWORD_BCRYPT);
file_put_contents('new_hash.txt', $hash);
echo "Hash written to new_hash.txt\n";
