<?php

declare(strict_types=1);

final class PasswordPolicy
{
    public const MIN_LENGTH = 12;
    public const MIN_LENGTH_MSG = 'La contraseña debe tener al menos 12 caracteres';

    /**
     * Validates the password meets the minimum length policy.
     *
     * @throws InvalidArgumentException if the password is too short.
     */
    public static function validate(string $password): void
    {
        if (strlen($password) < self::MIN_LENGTH) {
            throw new InvalidArgumentException(self::MIN_LENGTH_MSG);
        }
    }

    /**
     * Validates and hashes the password.
     *
     * @throws InvalidArgumentException if the password is too short.
     * @throws RuntimeException if hashing fails.
     */
    public static function hash(string $password): string
    {
        self::validate($password);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new RuntimeException('No se pudo generar el hash de la contraseña');
        }
        return $hash;
    }
}
