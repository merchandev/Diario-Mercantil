<?php

declare(strict_types=1);

final class EditorialClock
{
    private const TIMEZONE = 'America/Caracas';

    public static function today(): string
    {
        return self::now()->format('Y-m-d');
    }

    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(self::TIMEZONE));
    }
}
