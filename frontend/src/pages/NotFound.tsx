import { useMemo } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound(){
  const role = useMemo(()=>{
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('user_role') || sessionStorage.getItem('user_role') || ''
  }, [])
  const homeHref = role === 'admin' ? '/dashboard' : (role ? '/solicitante/historial' : '/')

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="text-center space-y-4">
        <div className="text-7xl font-black text-brand-700">404</div>
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-slate-600 max-w-md mx-auto">
          La ruta que intentas abrir no existe o fue movida.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={homeHref} className="btn btn-primary">Ir al inicio</Link>
          <Link to="/" className="btn btn-secondary">Página principal</Link>
        </div>
      </div>
    </div>
  )
}
