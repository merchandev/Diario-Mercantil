<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Services/EditionIntegrityService.php';
$options = getopt('', ['edition:', 'repair']);
$id = isset($options['edition']) ? filter_var($options['edition'], FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]) : null;
if ($id === false || (isset($options['repair']) && $id === null)) {
    fwrite(STDERR, "Uso: php bin/repair_editions.php [--edition=ID] [--repair]. Reparar requiere una edición concreta.\n");
    exit(2);
}
try {
    $service = new EditionIntegrityService(Database::pdo());
    $invalid = $service->findInvalidPublishedEditions($id);
    echo json_encode(['invalid_editions'=>$invalid], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), PHP_EOL;
    if (isset($options['repair'])) {
        if (!$invalid) throw new RuntimeException('No hay una edición publicada inválida con ese ID.');
        echo json_encode($service->repairInvalidPublishedEdition($id, null)), PHP_EOL;
    }
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
