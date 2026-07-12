import { describe, it, expect } from 'vitest'
import { isAdminRole, isSolicitanteRole } from './roleUtils'

describe('roleUtils', () => {
    describe('isAdminRole', () => {
        it('should return true for admin roles', () => {
            expect(isAdminRole('admin')).toBe(true)
            expect(isAdminRole('superadmin')).toBe(true)
            expect(isAdminRole('Administrador')).toBe(true)
            expect(isAdminRole(' ADMIN ')).toBe(true)
        })

        it('should return false for non-admin roles', () => {
            expect(isAdminRole('solicitante')).toBe(false)
            expect(isAdminRole('user')).toBe(false)
            expect(isAdminRole(undefined)).toBe(false)
            expect(isAdminRole('')).toBe(false)
        })
    })

    describe('isSolicitanteRole', () => {
        it('should return true for solicitante roles', () => {
            expect(isSolicitanteRole('solicitante')).toBe(true)
            expect(isSolicitanteRole('user')).toBe(true)
            expect(isSolicitanteRole(' SOLICITANTE ')).toBe(true)
        })

        it('should return false for non-solicitante roles', () => {
            expect(isSolicitanteRole('admin')).toBe(false)
            expect(isSolicitanteRole('superadmin')).toBe(false)
            expect(isSolicitanteRole(undefined)).toBe(false)
            expect(isSolicitanteRole('')).toBe(false)
        })
    })
})
