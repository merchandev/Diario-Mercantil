<?php
declare(strict_types=1);

require_once __DIR__ . '/../Response.php';

final class ErrorHandler
{
    public static function handle(Throwable $e, ?RequestContext $context = null): never
    {
        $requestId = $context ? $context->requestId : bin2hex(random_bytes(8));

        error_log(json_encode([
            'request_id' => $requestId,
            'type' => $e::class,
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ], JSON_UNESCAPED_SLASHES));

        if ($e instanceof HttpException) {
            Response::json([
                'error' => $e->errorCode,
                'request_id' => $requestId,
            ], $e->status);
            exit;
        }

        Response::json([
            'error' => 'internal_server_error',
            'request_id' => $requestId,
        ], 500);
        exit;
    }
}
