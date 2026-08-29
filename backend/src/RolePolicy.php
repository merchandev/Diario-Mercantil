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
            && $newRole->rank() <= Role::ADMIN->rank();
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
                && $targetRole->rank() <= Role::ADMIN->rank()
            );
    }

    public static function canDeleteUser(array $actor, array $target): bool {
        return self::canModifyUser($actor, $target);
    }

    /**
     * Can the actor manage legal requests (verify, reject, return-to-draft, etc.)?
     * Superadmin has full access; admin/staff/manager have operational access.
     */
    public static function canManageLegalRequests(array $actor): bool {
        try {
            $role = Role::from(strtolower($actor['role'] ?? ''));
        } catch (ValueError) {
            return false;
        }
        return in_array($role, [Role::SUPERADMIN, Role::ADMIN, Role::STAFF, Role::MANAGER], true);
    }

    /**
     * Can the actor approve/reject payments?
     */
    public static function canVerifyPayments(array $actor): bool {
        return self::canManageLegalRequests($actor);
    }

    /**
     * Can the actor publish an edition?
     */
    public static function canPublishEdition(array $actor): bool {
        try {
            $role = Role::from(strtolower($actor['role'] ?? ''));
        } catch (ValueError) {
            return false;
        }
        return in_array($role, [Role::SUPERADMIN, Role::ADMIN], true);
    }

    /**
     * Can the actor manage global settings?
     */
    public static function canManageSettings(array $actor): bool {
        try {
            $role = Role::from(strtolower($actor['role'] ?? ''));
        } catch (ValueError) {
            return false;
        }
        return in_array($role, [Role::SUPERADMIN, Role::ADMIN], true);
    }
}
