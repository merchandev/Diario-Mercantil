import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { me } from '../lib/api'

export default function RequireSolicitante({children}:{children:JSX.Element}){
  const [role, setRole] = useState<string|undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(()=>{
    let mounted = true
    me().then(r=>{ if(mounted){ setRole(r.user?.role); setLoading(false) } }).catch(()=>{ if(mounted){ setRole(undefined); setLoading(false) } })
    return ()=>{ mounted=false }
  },[])

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-600">Cargando...</div>
  if (role === 'admin') return <Navigate to="/dashboard" state={{ from: location }} replace />
  return children
}
