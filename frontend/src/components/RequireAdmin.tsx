import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminRole } from '../lib/roleUtils'

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Verificando acceso...</div>
  }

  if (!isAdminRole(user?.role)) {
    console.warn('⚠️ [RequireAdmin] Acceso denegado. Rol:', user?.role, 'Redirigiendo a /solicitante/historial')
    return <Navigate to="/solicitante/historial" state={{ from: location }} replace />
  }

  console.log('✅ [RequireAdmin] Acceso concedido. Usuario:', user?.name, 'Rol:', user?.role)
  return children
}
