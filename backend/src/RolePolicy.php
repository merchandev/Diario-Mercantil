<?php
declare(strict_types=1);

require_once __DIR__."/Role.php";

final class RolePolicy {
    public const SUPERADMIN = 'superadmin';
    public const ADMIN = 'admin';
    public const MANAGER = 'manager';
    public const STAFF = 'staff';
    public const APPLICANT = 'solicitante';

    public static function canCreateRole(array $actor, string $roleString): bool {
        try {
            $actorRole = Role::from(strtolower($actor['role'] ?? ''));
            $newRole = Role::from(strtolower($roleString));
        } catch (ValueError $e) {
            return false;
        }

        if ($actorRole === Role::SUPERADMIN) {
            return true;
        }

        return $actorRole === Role::ADMIN
            && $newRole->rank() < Role::ADMIN->rank();
    }

    public static function canModifyUser(array $actor, array $target): bool {
        try {
            $actorRole = Role::from(strtolower($actor['role'] ?? ''));
            $targetRole = Role::from(strtolower($target['role'] ?? ''));
        } catch (ValueError $e) {
            return false;
        }
        
        if ((int)$actor['id'] === (int)$target['id']) {
            return false;
        }

        return $actorRole === Role::SUPERADMIN
            || (
                $actorRole === Role::ADMIN
                && $targetRole->rank() < Role::ADMIN->rank()
            );
    }

    public static function canDeleteUser(array $actor, array $target): bool {
        return self::canModifyUser($actor, $target);
    }
}
