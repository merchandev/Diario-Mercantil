import { useContext } from 'react'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'

/**
 * Custom hook to access authentication context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }

    return context
}
