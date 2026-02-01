import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { me as apiMe, getToken } from '../lib/api'

export interface User {
    id: number
    document: string
    name: string
    role: string
    email?: string
    phone?: string
    avatar_url?: string | null
}

export interface AuthContextType {
    user: User | null
    loading: boolean
    error: string | null
    isAuthenticated: boolean
    refreshUser: () => Promise<void>
    setUser: (user: User | null) => void
    clearAuth: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refreshUser = async () => {
        const token = getToken()
        if (!token) {
            console.log('🔐 [AuthProvider] No token found, skipping user fetch')
            setUser(null)
            setLoading(false)
            return
        }

        try {
            console.log('🔐 [AuthProvider] Fetching user data...')
            const response = await apiMe()
            console.log('✅ [AuthProvider] Usuario cargado:', response.user.name, 'Rol:', response.user.role)
            setUser(response.user)
            setError(null)
        } catch (err: any) {
            console.error('❌ [AuthProvider] Error cargando usuario:', err)
            setError(err.message || 'Error loading user')
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const clearAuth = () => {
        console.log('🔐 [AuthProvider] Clearing authentication')
        setUser(null)
        setError(null)
        setLoading(false)
    }

    // Initial load
    useEffect(() => {
        refreshUser()
    }, [])

    const value: AuthContextType = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        refreshUser,
        setUser,
        clearAuth,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
