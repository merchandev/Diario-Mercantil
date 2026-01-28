<?php
// Read the new hash
// Note: We used generate_hash_v2.php to write to hash_output.txt
$newHash = file_get_contents('hash_output.txt');
$newHash = trim($newHash);

if (strlen($newHash) !== 60) {
    die("Error: Hash length is " . strlen($newHash) . ", expected 60.");
}

$sqlFile = 'backend/migrations/CLEAN_INIT.sql';
$sql = file_get_contents($sqlFile);

// The old hash we want to replace
$oldHash = '$2y$12$SeRdNDi6YB3snGhzV0zyNuOIDFRqZeewpon35e7V';

if (strpos($sql, $oldHash) === false) {
    die("Error: Old hash not found in SQL file.");
}

$newSql = str_replace($oldHash, $newHash, $sql);
file_put_contents($sqlFile, $newSql);

echo "SUCCESS: Replaced old hash with new hash: $newHash\n";
