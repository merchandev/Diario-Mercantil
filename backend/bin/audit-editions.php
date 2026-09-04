#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Services/EditionIntegrityService.php';

$repair = in_array('--repair', $argv, true);
$editionId = null;
$actorId = null;
foreach ($argv as $argument) {
    if (preg_match('/^--edition=(\d+)$/', $argument, $match)) $editionId = (int) $match[1];
    if (preg_match('/^--actor-id=(\d+)$/', $argument, $match)) $actorId = (int) $match[1];
}

try {
    $service = new EditionIntegrityService(Database::pdo());
    $invalid = $service->findInvalidPublishedEditions($editionId);
    $result = ['mode' => $repair ? 'repair' : 'audit', 'invalid_editions' => $invalid, 'repairs' => []];

    if ($repair) {
        foreach ($invalid as $edition) {
            $result['repairs'][] = $service->repairInvalidPublishedEdition((int) $edition['id'], $actorId);
        }
    }

    fwrite(STDOUT, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit($invalid === [] ? 0 : ($repair ? 0 : 2));
} catch (Throwable $e) {
    fwrite(STDERR, json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE) . PHP_EOL);
    exit(1);
}
