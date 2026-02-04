import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { IconHome, IconEditions, IconDocs, IconPayments, IconLegal, IconUsers, IconSettings, IconUserCircle, IconTrash, IconUser } from './icons'
import { useAuth } from '../hooks/useAuth'
import { isAdminRole } from '../lib/roleUtils'

const LinkItem = ({ to, icon, label, collapsed, end }: { to: string; icon: JSX.Element; label: string; collapsed?: boolean; end?: boolean }) => (
  <NavLink to={to} end={end} className={({ isActive }) => [
    'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 border border-transparent',
    isActive
      ? 'bg-brand-900 text-white shadow-md font-medium border-white/5'
      : 'text-white/70 hover:bg-white/10 hover:text-white hover:scale-[1.02]'
  ].join(' ')} title={collapsed ? label : ''}>
    {({ isActive }) => (
      <>
        <span className={isActive ? "text-brand-200" : "text-white/60"}>{icon}</span>
        {!collapsed && <span className="text-sm">{label}</span>}
      </>
    )}
  </NavLink>
)

export default function Sidebar({ onPublishClick, onCollapseChange }: { onPublishClick?: () => void; onCollapseChange?: (collapsed: boolean) => void }) {
  const location = useLocation()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { onCollapseChange?.(collapsed) }, [collapsed, onCollapseChange])

  const isAdminPath = location.pathname.startsWith('/dashboard')
  const isSolicitantePath = location.pathname.startsWith('/solicitante')
  const isAdmin = isAdminRole(user?.role)
  const isSolicitante = !isAdmin && !!user

  // Determine role display name
  const roleDisplayName = isAdminRole(user?.role) ? 'Super Administrador' : 'Solicitante'

  return (
    <aside className={`fixed left-0 top-0 h-screen hidden md:flex flex-col p-4 bg-brand-800 text-white transition-all duration-300 z-30 shadow-2xl border-r border-white/5 ${collapsed ? 'w-20' : 'w-64'}`}>
      {!collapsed && (
        <div className="flex flex-col items-center mb-8 mt-2">
          <div className="h-20 w-20 rounded-full bg-slate-400 grid place-items-center text-4xl mb-4 overflow-hidden ring-4 ring-white/10 shadow-lg">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <IconUserCircle className="text-slate-200" />
            )}
          </div>
          <div className="text-center">
            <div className="text-xs text-brand-200 uppercase tracking-wider font-semibold mb-1">Bienvenido</div>
            <div className="text-sm font-bold text-white mb-1 truncate max-w-[180px]">{user?.name || '...'}</div>
            {user && (
              <div className="text-xs bg-brand-900 px-2 py-0.5 rounded-full inline-block border border-white/10 text-brand-100">{roleDisplayName}</div>
            )}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex flex-col items-center mb-6 mt-4">
          <div className="h-10 w-10 rounded-full bg-slate-400 grid place-items-center overflow-hidden ring-2 ring-white/20">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <IconUserCircle className="text-slate-200 text-xl" />
            )}
          </div>
        </div>
      )}
      {isSolicitante && onPublishClick && (
        <button onClick={onPublishClick} className={`btn bg-white text-brand-800 hover:bg-brand-50 border-0 mb-6 font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all ${collapsed ? 'w-12 h-12 p-0 text-xl rounded-xl' : 'w-full rounded-xl py-3'}`} title={collapsed ? 'Publicar' : ''}>
          {collapsed ? '+' : <><span className="text-lg mr-1">+</span> Nueva Publicación</>}
        </button>
      )}
      <nav className="space-y-1.5 flex-1">
        {isAdmin && (
          <>
            <LinkItem to="/dashboard" icon={<IconHome />} label="Inicio" collapsed={collapsed} end />
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
            <LinkItem to="/solicitante" icon={<IconHome />} label="Inicio" collapsed={collapsed} end />
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
