import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminRole } from '../lib/roleUtils'

export default function RequireSolicitante({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Cargando...</div>
  }

  if (!user) {
    console.log('🔄 [RequireSolicitante] No autenticado. Redirigiendo a login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isAdminRole(user?.role)) {
    console.log('🔄 [RequireSolicitante] Usuario admin detectado. Redirigiendo a dashboard')
    return <Navigate to="/dashboard" state={{ from: location }} replace />
  }

  console.log('✅ [RequireSolicitante] Acceso permitido. Usuario:', user?.name, 'Rol:', user?.role)
  return children
}
