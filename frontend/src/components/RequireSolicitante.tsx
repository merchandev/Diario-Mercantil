import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isAdminRole } from '../lib/roleUtils'
import { SEO } from './SEO'

export default function RequireSolicitante({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isAdminRole(user?.role)) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />
  }

  return (
    <>
      <SEO title="Panel de Usuario | Diario Mercantil" description="Sistema de clientes" noindex={true} />
      {children}
    </>
  )
}
