<?php

declare(strict_types=1);

require_once __DIR__ . '/../Exceptions/HttpException.php';

final class EditorialClock
{
    private const TIMEZONE = 'America/Caracas';

    public static function nextDay(string $date): string
    {
        $day = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone(self::TIMEZONE));
        if (!$day || $day->format('Y-m-d') !== $date) {
            throw new HttpException(422, 'invalid_date', 'Fecha inválida. Use YYYY-MM-DD.');
        }
        return $day->modify('+1 day')->format('Y-m-d');
    }

    public static function today(): string
    {
        return self::now()->format('Y-m-d');
    }

    public static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone(self::TIMEZONE));
    }
}
