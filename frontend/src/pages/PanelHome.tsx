import { useEffect, useState } from 'react'
import { clearStats, getStats } from '../lib/api'

export default function PanelHome() {
  const [stats, setStats] = useState<{ publications: number; editions: number; users_active: number }>({ publications: 0, editions: 0, users_active: 0 })
  const [loading, setLoading] = useState(false)
  const load = () => getStats().then(setStats).catch(() => setStats({ publications: 0, editions: 0, users_active: 0 }))
  useEffect(() => { load() }, [])
  const onClear = async () => {
    if (!confirm('¿Seguro que deseas borrar todas las publicaciones, ediciones y pagos? Esta acción no se puede deshacer.')) return
    setLoading(true)
    try { const r = await clearStats(); setStats(r) } finally { setLoading(false) }
  }
  const cards = [
    { t: 'Publicaciones', v: String(stats.publications) },
    { t: 'Ediciones', v: String(stats.editions) },
    { t: 'Usuarios activos', v: String(stats.users_active) },
  ]
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inicio</h1>
          <p className="text-sm text-slate-600">Resumen rápido y accesos a las secciones clave.</p>
        </div>
        <button className="btn btn-ghost" onClick={onClear} disabled={loading}>{loading ? 'Limpiando...' : 'Limpiar datos'}</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.t} className="card p-4">
            <div className="text-sm text-slate-500">{c.t}</div>
            <div className="text-3xl font-semibold text-brand-800">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <a href="/dashboard/publicaciones" className="card p-4 hover:shadow transition">
          <div className="text-sm text-slate-500">Gestión</div>
          <div className="text-lg font-semibold">Publicaciones</div>
          <div className="text-xs text-slate-500 mt-1">Revisa y actualiza el estado.</div>
        </a>
        <a href="/dashboard/ediciones" className="card p-4 hover:shadow transition">
          <div className="text-sm text-slate-500">Editorial</div>
          <div className="text-lg font-semibold">Ediciones</div>
          <div className="text-xs text-slate-500 mt-1">Organiza órdenes por edición.</div>
        </a>
        <a href="/dashboard/usuarios" className="card p-4 hover:shadow transition">
          <div className="text-sm text-slate-500">Administración</div>
          <div className="text-lg font-semibold">Usuarios</div>
          <div className="text-xs text-slate-500 mt-1">Gestiona cuentas y roles.</div>
        </a>
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-4">Herramientas de Sistema</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <a href={`http://${window.location.hostname}:8081`} target="_blank" rel="noopener noreferrer" className="card p-4 hover:shadow transition border-l-4 border-l-blue-500">
          <div className="text-sm text-slate-500">Base de Datos</div>
          <div className="text-lg font-semibold flex items-center gap-2">
            phpMyAdmin
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </div>
          <div className="text-xs text-slate-500 mt-1">Gestión visual de la base de datos MySQL.</div>
        </a>
        <a href="/dashboard/archivos" className="card p-4 hover:shadow transition border-l-4 border-l-orange-500">
          <div className="text-sm text-slate-500">Archivos</div>
          <div className="text-lg font-semibold">Gestor de Archivos</div>
          <div className="text-xs text-slate-500 mt-1">Explora documentos organizados por fecha.</div>
        </a>
      </div>
    </section>
  )
}
