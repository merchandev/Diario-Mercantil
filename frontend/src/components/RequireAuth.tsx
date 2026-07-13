import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RequireAuth({children}:{children:JSX.Element}){
  const { user, loading } = useAuth()
  const location = useLocation()
  
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Cargando...</div>
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
