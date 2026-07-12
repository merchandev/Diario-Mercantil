<?php

final class RolePolicy {
    public const SUPERADMIN = 'superadmin';
    public const ADMIN = 'admin';
    public const MANAGER = 'manager';
    public const STAFF = 'staff';
    public const APPLICANT = 'solicitante';

    public static function canCreateRole(array $actor, string $role): bool {
        $actorRole = $actor['role'] ?? '';
        if ($actorRole === self::SUPERADMIN) {
            return true;
        }
        if ($actorRole === self::ADMIN) {
            return in_array($role, [self::APPLICANT, self::STAFF, self::MANAGER]);
        }
        return false;
    }

    public static function canModifyUser(array $actor, array $target): bool {
        $actorRole = $actor['role'] ?? '';
        $targetRole = $target['role'] ?? '';
        
        // Cannot modify someone of equal or higher rank (unless it's superadmin modifying themselves, but that's handled in controller logic for self-updates)
        if ($actorRole === self::SUPERADMIN) {
            return true;
        }
        
        if ($actorRole === self::ADMIN) {
            return in_array($targetRole, [self::APPLICANT, self::STAFF, self::MANAGER]);
        }
        
        return false;
    }

    public static function canDeleteUser(array $actor, array $target): bool {
        return self::canModifyUser($actor, $target);
    }
}
