import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchAuth, listLegal, type LegalRequest } from '../lib/api'
import { formatCaracasDateTime } from '../components/LegalRequestDetails'

type UserDetail = {
  id: number
  document: string
  name: string
  role: string
  email?: string | null
  phone?: string | null
  status?: string | null
  person_type?: string | null
  state?: string | null
  municipality?: string | null
  address?: string | null
  avatar_url?: string | null
  created_at?: string | null
}

function parseMeta(meta: LegalRequest['meta']): Record<string, any> {
  if (!meta) return {}
  if (typeof meta === 'object') return meta
  try { return JSON.parse(meta) || {} } catch { return {} }
}

export default function UsuarioDetalle() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [history, setHistory] = useState<LegalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetchAuth(`/api/admin/users/${encodeURIComponent(id)}`)
        const u = await res.json() as UserDetail
        setUser(u)
        const h = await listLegal({ user_id: u.id, limit: 100 })
        setHistory(h.items || [])
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'No se pudo cargar la ficha del usuario')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div className="card p-8 text-center text-slate-500">Cargando ficha de usuario...</div>
  if (!user) return <div className="card p-8 text-center text-rose-600">{error || 'Usuario no encontrado'}</div>

  const profileFields = [
    ['Nombre / Razón social', user.name || '-'],
    ['Cédula / RIF', user.document || '-'],
    ['Tipo de persona', user.person_type === 'juridica' ? 'Jurídica' : 'Natural'],
    ['Correo electrónico', user.email || '-'],
    ['Teléfono', user.phone || '-'],
    ['Estado / Región', user.state || '-'],
    ['Municipio', user.municipality || '-'],
    ['Dirección', user.address || '-'],
    ['Fecha de registro', user.created_at ? formatCaracasDateTime(user.created_at) : '-'],
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/usuarios" className="btn btn-outline text-sm">← Volver</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ficha de Usuario</h1>
            <p className="text-sm text-slate-500">Información completa e historial de solicitudes.</p>
          </div>
        </div>
        <span className={`pill ${user.status === 'active' ? 'bg-green-100 text-green-700' : user.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
          {user.status === 'active' ? 'Activo' : user.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
        </span>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-200">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center text-brand-700 text-xl font-bold">
            {user.avatar_url ? <img src={user.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" /> : user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-semibold text-slate-900">{user.name}</div>
            <div className="text-sm text-slate-500 capitalize">{user.role}</div>
          </div>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {profileFields.map(([label, value]) => (
            <div key={label} className={label === 'Dirección' ? 'sm:col-span-2 lg:col-span-3' : ''}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</dt>
              <dd className="font-medium text-slate-800 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Historial de solicitudes y publicaciones</h2>
            <p className="text-xs text-slate-500">{history.length} registro(s) asociados directamente a este usuario.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay solicitudes registradas para este usuario.</div>
          ) : (
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">N° Orden</th>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Razón social</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(req => {
                  const meta = parseMeta(req.meta)
                  const company = meta.razon_social || meta.razon_denominacion_social || req.name || '-'
                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-medium">{req.order_no || String(req.id).padStart(8, '0')}</td>
                      <td className="px-4 py-3 text-slate-600">{formatCaracasDateTime(req.submitted_at || req.created_at || req.date)}</td>
                      <td className="px-4 py-3 max-w-[260px] whitespace-normal font-medium">{company}</td>
                      <td className="px-4 py-3">{req.pub_type || 'Documento'}</td>
                      <td className="px-4 py-3"><span className="pill bg-slate-100 text-slate-700">{req.status}</span></td>
                      <td className="px-4 py-3 text-right font-mono">Bs. {Number(req.total_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right"><Link to={`/dashboard/publicaciones/${req.id}`} className="text-brand-700 hover:underline font-medium">Ver detalle</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}
