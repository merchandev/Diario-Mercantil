import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { me } from '../lib/api'

export default function RequireAdmin({children}:{children:JSX.Element}){
  const [role, setRole] = useState<string|undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(()=>{
    let mounted = true
    me().then(r=>{ 
      if(mounted){ 
        console.log('🔒 [RequireAdmin] Usuario cargado:', r.user.name, 'Rol:', r.user.role)
        setRole(r.user?.role); 
        setLoading(false) 
      } 
    }).catch(err=>{ 
      if(mounted){ 
        console.error('❌ [RequireAdmin] Error al verificar usuario:', err)
        setRole(undefined); 
        setLoading(false) 
      } 
    })
    return ()=>{ mounted=false }
  },[])

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-600">Verificando acceso...</div>
  
  if (role !== 'admin') {
    console.warn('⚠️ [RequireAdmin] Acceso denegado. Usuario no es admin. Redirigiendo a /solicitante/historial')
    return <Navigate to="/solicitante/historial" state={{ from: location }} replace />
  }
  
  return children
}
