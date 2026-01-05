import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { IconHome, IconEditions, IconDocs, IconPayments, IconLegal, IconUsers, IconSettings, IconUserCircle, IconTrash, IconUser } from './icons'
import { me } from '../lib/api'

const LinkItem = ({ to, icon, label, collapsed }: { to: string; icon: JSX.Element; label: string; collapsed?: boolean }) => (
  <NavLink to={to} className={({ isActive }) => [
    'flex items-center gap-3 px-4 py-2 rounded-xl transition',
    isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
  ].join(' ')} title={collapsed ? label : ''}>
    <span className="text-white/80">{icon}</span>
    {!collapsed && <span className="text-sm">{label}</span>}
  </NavLink>
)

export default function Sidebar({ onPublishClick, onCollapseChange }: { onPublishClick?: () => void; onCollapseChange?: (collapsed: boolean) => void }) {
  const location = useLocation()
  const storedName = (typeof window !== 'undefined' && (localStorage.getItem('user_name') || sessionStorage.getItem('user_name'))) || undefined
  const storedRole = (typeof window !== 'undefined' && (localStorage.getItem('user_role') || sessionStorage.getItem('user_role'))) || undefined
  const storedDoc = (typeof window !== 'undefined' && (localStorage.getItem('user_doc') || sessionStorage.getItem('user_doc'))) || undefined
  const [user, setUser] = useState<{ id?: number; name?: string; role?: string; document?: string; avatar_url?: string | null } | null>(storedName || storedRole || storedDoc ? { name: storedName, role: storedRole, document: storedDoc } : null)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const loadUser = () => {
      me().then(r => {
        console.log('👤 [Sidebar] Usuario cargado:', r.user)
        setUser(r.user)
      }).catch(err => {
        console.error('❌ [Sidebar] Error cargando usuario:', err)
      })
    }
    loadUser()
    window.addEventListener('user_updated', loadUser)
    return () => window.removeEventListener('user_updated', loadUser)
  }, [])
  useEffect(() => { onCollapseChange?.(collapsed) }, [collapsed, onCollapseChange])
  const isAdminPath = location.pathname.startsWith('/dashboard')
  const isSolicitantePath = location.pathname.startsWith('/solicitante')
  const isAdmin = (user?.role === 'admin') || (!user && isAdminPath)
  const isSolicitante = (!!user && user.role !== 'admin') || (!user && isSolicitantePath)
  return (
    <aside className={`fixed left-0 top-0 h-screen hidden md:flex flex-col p-4 bg-brand-800 text-white transition-all duration-300 z-30 ${collapsed ? 'w-20' : 'w-64'}`}>
      {!collapsed && (
        <div className="flex flex-col items-center mb-6">
          <div className="h-20 w-20 rounded-full bg-slate-400 grid place-items-center text-4xl mb-3 overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <IconUserCircle className="text-slate-600" />
            )}
          </div>
          <div className="text-center">
            <div className="text-xs text-white/80 mb-1">Hola, {user?.name || '...'}</div>
            {user && (
              <div className="text-sm font-semibold">{user.role === 'admin' ? 'Super Administrador' : 'Solicitante'}</div>
            )}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex flex-col items-center mb-6 mt-4">
          <div className="h-10 w-10 rounded-full bg-slate-400 grid place-items-center overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <IconUserCircle className="text-slate-600 text-xl" />
            )}
          </div>
        </div>
      )}
      {isSolicitante && onPublishClick && (
        <button onClick={onPublishClick} className={`btn btn-primary mb-4 ${collapsed ? 'w-12 h-12 p-0 text-xl' : 'w-full'}`} title={collapsed ? 'Publicar' : ''}>
          {collapsed ? '+' : <><span className="text-lg">+</span> Publicar</>}
        </button>
      )}
      <nav className="space-y-1">
        {isAdmin && (
          <>
            <LinkItem to="/dashboard" icon={<IconHome />} label="Inicio" collapsed={collapsed} />
            <LinkItem to="/dashboard/ediciones" icon={<IconEditions />} label="Ediciones" collapsed={collapsed} />
            <LinkItem to="/dashboard/publicaciones" icon={<IconDocs />} label="Publicaciones" collapsed={collapsed} />
            <LinkItem to="/dashboard/papelera" icon={<IconTrash />} label="Papelera" collapsed={collapsed} />
            <LinkItem to="/dashboard/pagos" icon={<IconPayments />} label="Medios de pago" collapsed={collapsed} />
            <LinkItem to="/dashboard/directorio" icon={<IconLegal />} label="Directorio legal" collapsed={collapsed} />
            <LinkItem to="/dashboard/perfil" icon={<IconUser />} label="Mi perfil" collapsed={collapsed} />
            <LinkItem to="/dashboard/usuarios" icon={<IconUsers />} label="Gestionar usuarios" collapsed={collapsed} />
            <LinkItem to="/dashboard/configuracion" icon={<IconSettings />} label="Configuración" collapsed={collapsed} />
          </>
        )}
        {isSolicitante && (
          <>
            <LinkItem to="/solicitante/historial" icon={<IconHome />} label="Inicio" collapsed={collapsed} />
            <LinkItem to="/solicitante/historial" icon={<IconDocs />} label="Mis publicaciones" collapsed={collapsed} />
            <LinkItem to="/solicitante/cotizador" icon={<IconPayments />} label="Cotizador" collapsed={collapsed} />
            <LinkItem to="/solicitante/perfil" icon={<IconUser />} label="Mi perfil" collapsed={collapsed} />
          </>
        )}
      </nav>
      <div className="mt-auto">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full bg-brand-700 hover:bg-brand-600 transition rounded-lg flex items-center justify-center gap-2 ${collapsed ? 'h-10 px-2' : 'h-10 px-4'}`}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">Contraer</span>}
        </button>
      </div>
    </aside>
  )
}
