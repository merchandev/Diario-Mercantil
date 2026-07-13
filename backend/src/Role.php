<?php
declare(strict_types=1);

enum Role: string
{
    case APPLICANT = 'solicitante';
    case STAFF = 'staff';
    case MANAGER = 'manager';
    case ADMIN = 'admin';
    case SUPERADMIN = 'superadmin';

    public function rank(): int
    {
        return match ($this) {
            self::APPLICANT => 10,
            self::STAFF => 20,
            self::MANAGER => 30,
            self::ADMIN => 40,
            self::SUPERADMIN => 50,
        };
    }
}
