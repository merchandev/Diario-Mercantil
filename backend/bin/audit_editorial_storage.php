<?php
/** Read-only inspection. No files or records are modified. */
declare(strict_types=1);
require_once __DIR__.'/../src/Database.php';
require_once __DIR__.'/../src/Http/StoragePath.php';
require_once __DIR__.'/../src/Services/EditionIntegrityService.php';
$pdo=Database::pdo(); $issues=[]; $checked=0;
foreach ($pdo->query('SELECT id,path,size,checksum FROM files WHERE deleted_at IS NULL') as $file) {
    $checked++;
    try {
        $path=StoragePath::getFile($file['path']);
        if ((int)filesize($path)!==(int)$file['size']) $issues[]=['id'=>$file['id'],'issue'=>'size_mismatch'];
        if (!hash_equals((string)$file['checksum'],(string)hash_file('sha256',$path))) $issues[]=['id'=>$file['id'],'issue'=>'checksum_mismatch'];
    } catch (Throwable $e) { $issues[]=['id'=>$file['id'],'issue'=>'missing_or_invalid_path']; }
}
$integrity=new EditionIntegrityService($pdo); $editions=[];
foreach ($pdo->query("SELECT * FROM editions WHERE deleted_at IS NULL AND status='Publicada'") as $e) {
    $editions[]=['id'=>$e['id'],'code'=>$e['code'],'cve'=>$e['cve'] ?? null,'file_id'=>$e['file_id'],'valid'=>$integrity->publishedFileIsValid($e)];
}
echo json_encode(['files_checked'=>$checked,'issues'=>$issues,'published_editions'=>$editions],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
exit($issues || in_array(false,array_column($editions,'valid'),true) ? 1 : 0);
