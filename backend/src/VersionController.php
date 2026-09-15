<?php
declare(strict_types=1);
final class VersionController {
    public function get(): void {
        header('Cache-Control: no-store');
        $metadata = json_decode((string) @file_get_contents(__DIR__ . '/../build-info.json'), true) ?: [];
        Response::json(['git_sha'=>$metadata['git_sha'] ?? 'unknown', 'build'=>'DiarioMercantil', 'built_at'=>$metadata['built_at'] ?? null]);
    }
}
