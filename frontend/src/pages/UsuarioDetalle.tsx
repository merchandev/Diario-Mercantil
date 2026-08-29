import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchAuth, listLegal } from '../lib/api'

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetchAuth(`/api/admin/users/${id}`)
        if (!res.ok) throw new Error('Error al cargar')
        const u = await res.json()
        setUser(u)
        
        const h = await listLegal({ user_id: u.id, limit: 100 })
        setHistory(h.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>
  if (!user) return <div className="p-8 text-center text-rose-500">Usuario no encontrado</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/dashboard/usuarios" className="btn btn-outline text-sm py-1.5 px-3">&larr; Volver</Link>
        <h2 className="text-2xl font-bold">Ficha de Usuario</h2>
      </div>

      <div className="card p-6 grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
          <div className="font-medium text-lg">{user.name}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cédula / RIF</label>
          <div className="font-medium">{user.person_type ? user.person_type + '-' : ''}{user.document}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo Electrónico</label>
          <div className="font-medium">{user.email}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teléfono</label>
          <div className="font-medium">{user.phone || '-'}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rol</label>
          <div className="font-medium capitalize">{user.role}</div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado</label>
          <div>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
              {user.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Historial de Solicitudes ({history.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-6 text-center text-slate-500 italic">No hay solicitudes registradas</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Nº Orden</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(req => {
                  const meta = typeof req.meta === 'string' ? JSON.parse(req.meta || '{}') : (req.meta || {})
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{req.order_no || req.id}</td>
                      <td className="px-4 py-3 text-slate-500">{req.created_at?.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700`}>{req.status}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={req.document_type}>{req.document_type || '-'}</td>
                      <td className="px-4 py-3">Bs {req.total_bs || '0.00'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/dashboard/publicaciones/${req.id}`} className="text-brand-600 hover:underline font-medium">Ver detalle</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
