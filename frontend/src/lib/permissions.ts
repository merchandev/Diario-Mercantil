import { isAdminRole } from './roleUtils'

/**
 * Sistema de permisos basado en roles
 */

export const permissions = {
    // Gestión de usuarios
    canManageUsers: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Gestión de ediciones
    canManageEditions: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Ver todas las publicaciones (vs solo las propias)
    canViewAllPublications: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Eliminar cualquier publicación
    canDeleteAny: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Gestionar medios de pago
    canManagePayments: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Gestionar configuración del sistema
    canManageSettings: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Acceso a papelera
    canAccessTrash: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Acceso al directorio legal
    canAccessDirectory: (role: string | undefined): boolean => {
        return isAdminRole(role)
    },

    // Crear publicaciones (todos los usuarios autenticados)
    canCreatePublications: (role: string | undefined): boolean => {
        return !!role
    },

    // Editar publicaciones propias
    canEditOwnPublications: (role: string | undefined): boolean => {
        return !!role
    },
}

export type PermissionKey = keyof typeof permissions
