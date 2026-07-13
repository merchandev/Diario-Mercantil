<?php
declare(strict_types=1);

final class RequestContext
{
    public readonly string $requestId;

    public function __construct()
    {
        $provided = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';

        $this->requestId = preg_match(
            '/^[a-zA-Z0-9._-]{8,100}$/',
            $provided
        )
            ? $provided
            : bin2hex(random_bytes(16));

        header("X-Request-ID: {$this->requestId}");
    }
}
