/**
 * Utility functions for role-based authorization
 */

/**
 * Check if a role is an administrative role
 * Accepts: 'admin', 'superadmin', 'Administrador'
 */
export function isAdminRole(role: string | undefined): boolean {
    if (!role) return false
    const normalized = role.toLowerCase().trim()
    return normalized === 'admin' || normalized === 'superadmin' || normalized === 'administrador'
}

/**
 * Check if a role is a solicitante (applicant) role
 * Accepts: 'solicitante', 'user'
 */
export function isSolicitanteRole(role: string | undefined): boolean {
    if (!role) return false
    const normalized = role.toLowerCase().trim()
    return normalized === 'solicitante' || normalized === 'user'
}
