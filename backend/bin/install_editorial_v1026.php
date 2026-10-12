<?php
declare(strict_types=1);
require __DIR__.'/../src/Database.php';
require __DIR__.'/../src/Services/EditorialReleaseInstaller.php';

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (count($argv) > 2 || (isset($argv[1]) && $argv[1] !== '--apply')) {
    fwrite(STDERR,"Uso: php bin/install_editorial_v1026.php [--apply]\n"); exit(2);
}
try {
    $installer = new EditorialReleaseInstaller(Database::pdo(),__DIR__.'/../resources/editorial',getenv('UPLOAD_DIR') ?: __DIR__.'/../storage/uploads');
    echo json_encode($installer->run(($argv[1] ?? '') === '--apply'),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
} catch (Throwable $error) { fwrite(STDERR,$error->getMessage()."\n"); exit(1); }
