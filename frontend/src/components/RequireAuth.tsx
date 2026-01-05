import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../lib/api'

export default function RequireAuth({children}:{children:JSX.Element}){
  const token = getToken()
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}
