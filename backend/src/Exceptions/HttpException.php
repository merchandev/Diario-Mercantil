<?php
declare(strict_types=1);

final class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $internalMessage = '',
        ?Throwable $previous = null
    ) {
        parent::__construct(
            $internalMessage ?: $errorCode,
            0,
            $previous
        );
    }
}
