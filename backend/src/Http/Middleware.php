<?php
declare(strict_types=1);

final class Middleware
{
    public static function requireSession(): callable
    {
        return function () {
            AuthController::requireAuth();
        };
    }

    public static function requireRole(string ...$roles): callable
    {
        return function () use ($roles) {
            $u = AuthController::requireAuth();
            if (!in_array($u['role'], $roles, true) && $u['role'] !== 'superadmin') {
                throw new HttpException(403, 'forbidden', 'Rol insuficiente');
            }
        };
    }

    public static function requireCsrf(): callable
    {
        return function () {
            // Disable CSRF check for GET, OPTIONS, HEAD
            if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'])) {
                return;
            }
            
            $cookie = $_COOKIE['dm_csrf'] ?? '';
            $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            
            if (!$cookie || !$header || !hash_equals($cookie, $header)) {
                throw new HttpException(403, 'csrf_invalid', 'Token CSRF inválido o ausente');
            }
        };
    }
}
