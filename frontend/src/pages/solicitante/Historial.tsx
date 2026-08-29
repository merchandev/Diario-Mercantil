import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLegal, type LegalRequest, downloadLegal, me, deleteLegal } from '../../lib/api'
import AdvertisingSlider from '../../components/AdvertisingSlider'
import { useDialog } from '../../contexts/DialogContext'
import { formatCaracasDateTime } from '../../components/LegalRequestDetails'

const STATUS_OPTS = ['Todos', 'Borrador', 'Por verificar', 'En trámite', 'Publicada', 'Rechazado']

export default function Historial() {
  const { showAlert, confirmAction } = useDialog()
  const navigate = useNavigate()
  const [rows, setRows] = useState<LegalRequest[]>([])
  const [allRows, setAllRows] = useState<LegalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState('Todos')

  const load = (opts?: { all?: string }) => {
    setLoading(true)
    setError(null)
    listLegal(opts as any)
      .then(r => {
        setAllRows(r.items)
        setRows(r.items)
        setActiveFilter('Todos')
      })
      .catch(err => {
        setError(err.message || 'Error al cargar el historial')
        setRows([])
        setAllRows([])
      })
      .finally(() => setLoading(false))
  }

  const applyFilter = (status: string) => {
    setActiveFilter(status)
    if (status === 'Todos') {
      setRows(allRows)
    } else {
      setRows(allRows.filter(r => {
        const visual = (r.status === 'Pendiente' || r.status === 'Borrador') ? 'Borrador' 
                        : (r.status === 'Publicado' ? 'Publicada' : r.status)
        return visual === status
      }))
    }
  }

  useEffect(() => {
    me().then(r => setUserRole(r.user.role)).catch(() => setUserRole(''));
    load();
  }, [])

  const [dismissedNotifs, setDismissedNotifs] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('dismissedNotifs') || '[]') } catch { return [] }
  })
  
  const dismissNotif = (id: number) => {
    const updated = [...dismissedNotifs, id]
    setDismissedNotifs(updated)
    localStorage.setItem('dismissedNotifs', JSON.stringify(updated))
  }

  // Determine notifications: recent published ones not dismissed
  const notifications = allRows
    .filter(r => r.status === 'Publicada' && !dismissedNotifs.includes(r.id))
    .slice(0, 3)

  // Razón social from meta, fallback to r.name
  const razonSocial = (r: LegalRequest) => {
    const meta = typeof r.meta === 'string'
      ? (() => { try { return JSON.parse(r.meta) } catch { return {} } })()
      : (r.meta || {})
    return meta.razon_denominacion_social || meta.razon_social || meta.razon_social_convocatoria || r.name || '-'
  }

  return (
    <section className="space-y-4">
      <AdvertisingSlider className="mb-6 shadow-sm border border-slate-200" />

      {notifications.length > 0 && (
        <div className="space-y-2 mb-6">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full hidden sm:block">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">¡Publicación Confirmada!</h4>
                  <p className="text-sm">
                    Tu publicación con CVE <span className="font-mono bg-emerald-100 px-1 rounded">{notif.edition_code}</span> ha sido publicada {notif.edition_no ? <span>en la Edición N° <strong>{notif.edition_no}</strong></span> : 'con éxito'}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => navigate(`/solicitante/publicaciones/${notif.id}`)}
                  className="btn btn-sm bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 flex-1 sm:flex-none justify-center"
                >
                  Ver detalle
                </button>
                <button
                  onClick={() => dismissNotif(notif.id)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                  title="Ocultar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Mis Publicaciones</h1>
        <button
          onClick={() => navigate('/solicitante/documento')}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Publicación
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 items-center flex-wrap">
        {STATUS_OPTS.map(opt => (
          <button
            key={opt}
            disabled={loading}
            onClick={() => applyFilter(opt)}
            className={`px-3 py-1 rounded text-sm transition-colors ${activeFilter === opt
              ? 'bg-brand-700 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
        {userRole && userRole !== 'solicitante' && (
          <button
            disabled={loading}
            onClick={() => load({ all: '1' })}
            className="px-3 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 text-sm"
          >
            Ver todos (admin)
          </button>
        )}
        <span className="text-xs text-slate-500">{rows.length} registros</span>
      </div>

      {error && (
        <div className="card p-4 bg-rose-50 border-rose-200 text-rose-800">
          <strong>Error:</strong> {error}
        </div>
      )}
      {loading && (
        <div className="card p-8 text-center text-slate-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-2"></div>
          <p>Cargando historial...</p>
        </div>
      )}
      {!loading && rows.length === 0 && !error && (
        <div className="card p-8 text-center text-slate-500">
          <p>
            {activeFilter === 'Todos'
              ? 'Aún no tienes publicaciones registradas.'
              : `No hay publicaciones con estado "${activeFilter}".`}
          </p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <>
          <p className="text-sm text-slate-700">Estimado(a) usuario: En este apartado podrá consultar el resumen de todas sus publicaciones gestionadas en el sistema. Aquí puede visualizar el número de orden, tipo, razón social, fecha de solicitud y estado; así como los detalles del pago y, cuando corresponda, descargar la edición.</p>
          <div className="card overflow-x-auto pb-2 pt-1">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead>
                <tr className="bg-brand-800 text-white">
                  <th className="text-left px-4 py-2">N° de orden</th>
                  <th className="text-left px-4 py-2">Tipo de publicación</th>
                  <th className="text-left px-4 py-2">Razón social</th>
                  <th className="text-left px-4 py-2">Fecha de solicitud</th>
                  <th className="text-left px-4 py-2">Fecha de publicación</th>
                  <th className="text-left px-4 py-2">Estado</th>
                  <th className="text-right px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono">{r.order_no || r.id}</td>
                    <td className="px-4 py-2">{r.pub_type || 'Documento'}</td>
                    <td className="px-4 py-2">{razonSocial(r)}</td>
                    <td className="px-4 py-2">{formatCaracasDateTime((r as any).created_at || r.date)}</td>
                    <td className="px-4 py-2">
                      {r.status === 'Publicada' && r.publish_date ? r.publish_date : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {r.status === 'Pendiente' || r.status === 'Borrador'
                        ? 'Borrador'
                        : r.status}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {/* Only allow edit/delete for pure drafts (Borrador/Pendiente) */}
                        {(r.status === 'Borrador' || r.status === 'Pendiente') && (
                          <>
                            <button
                              className="text-amber-600 hover:underline"
                              onClick={() => navigate(r.pub_type === 'Convocatoria' ? `/solicitante/convocatoria?id=${r.id}` : `/solicitante/documento?id=${r.id}`)}
                            >
                              Editar
                            </button>
                            <button
                              className="text-rose-600 hover:underline"
                              onClick={async () => {
                                if (!(await confirmAction('¿Está seguro de eliminar esta publicación en borrador?', { title: 'Eliminar borrador', danger: true }))) return;
                                try { setLoading(true); await deleteLegal(r.id); load(); }
                                catch (e: any) { void showAlert(e.message || 'Error al eliminar', { title: 'Error' }); setLoading(false); }
                              }}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                        <button className="text-brand-700 hover:underline" onClick={() => navigate(`/solicitante/publicaciones/${r.id}`)}>Ver detalles</button>
                        <button className="text-blue-600 hover:underline" onClick={async () => { const b = await downloadLegal(r.id); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `orden-servicio-${r.id}.pdf`; a.click(); URL.revokeObjectURL(url) }}>Descargar orden</button>
                        {r.status === 'Publicada' && r.edition_code && (
                          <a href={`/api/e/code/${encodeURIComponent(r.edition_code)}/download?download=1`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                            Descargar publicación
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

