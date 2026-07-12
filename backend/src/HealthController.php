<?php

use OpenApi\Attributes as OA;

class HealthController
{
    #[OA\Get(path: "/health/live", summary: "Liveness Check", tags: ["Health"])]
    #[OA\Response(response: 200, description: "Indica si el sistema está ejecutándose (vivo)")]
    public function live(): void
    {
        Response::json([
            'status' => 'alive',
            'timestamp' => gmdate(DATE_ATOM),
        ]);
    }

    #[OA\Get(path: "/health/ready", summary: "Readiness Check", tags: ["Health"])]
    #[OA\Response(response: 200, description: "Indica si el sistema está listo para recibir tráfico, comprobando DB, Disco, etc.")]
    #[OA\Response(response: 503, description: "El sistema no está listo (fallos en BD, Disco u otro)")]
    public function ready(): void
    {
        $checks = [
            'database' => 'ok',
            'storage' => 'ok',
            'disk' => 'ok',
        ];

        $ready = true;

        try {
            require_once __DIR__.'/Database.php';
            Database::pdo()->query('SELECT 1');
        } catch (Throwable $exception) {
            error_log('[health.database] ' . $exception->getMessage());
            $checks['database'] = 'failed';
            $ready = false;
        }

        $storage = getenv('UPLOAD_DIR')
            ?: dirname(__DIR__) . '/storage/uploads';

        if (!is_dir($storage) || !is_writable($storage)) {
            $checks['storage'] = 'failed';
            $ready = false;
        }

        $minimumBytes = (int) (
            getenv('HEALTH_MIN_DISK_BYTES')
            ?: 500 * 1024 * 1024
        );

        $freeBytes = @disk_free_space($storage);

        if ($freeBytes === false || $freeBytes < $minimumBytes) {
            $checks['disk'] = 'low';
            $ready = false;
        }

        Response::json([
            'status' => $ready ? 'ready' : 'not_ready',
            'timestamp' => gmdate(DATE_ATOM),
            'checks' => $checks,
        ], $ready ? 200 : 503);
    }
}
