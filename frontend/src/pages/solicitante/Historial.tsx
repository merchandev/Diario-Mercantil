import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLegal, type LegalRequest, downloadLegal, me, deleteLegal } from '../../lib/api'
import AdvertisingSlider from '../../components/AdvertisingSlider'

export default function Historial() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<LegalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const load = (opts?: { status?: string; all?: string }) => {
    console.log('🔄 [Historial Solicitante] Iniciando carga con opciones:', opts)
    console.log('🔍 [Historial Solicitante] URL actual:', window.location.pathname)
    setLoading(true)
    setError(null)
    listLegal(opts as any)
      .then(r => {
        console.log('✅ [Historial Solicitante] Datos cargados:', r.items.length, 'publicaciones', opts?.status ? `(status=${opts.status})` : '', opts?.all ? '(all=1)' : '');
        console.log('📋 [Historial Solicitante] Primeros 3 registros:', r.items.slice(0, 3));
        setRows(r.items)
      })
      .catch(err => {
        console.error('❌ [Historial Solicitante] Error:', err)
        setError(err.message || 'Error al cargar el historial')
        setRows([])
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    me().then(r => setUserRole(r.user.role)).catch(() => setUserRole(''));
    load();
  }, [])
  return (
    <section className="space-y-4">
      <AdvertisingSlider className="mb-6 shadow-sm border border-slate-200" />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Historial de Publicaciones</h1>
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
      <div className="flex gap-3 items-center flex-wrap">
        <button disabled={loading} onClick={() => load()} className="px-3 py-1 rounded bg-brand-700 text-white text-sm">Recargar</button>
        <button disabled={loading} onClick={() => load({ status: 'Por verificar' })} className="px-3 py-1 rounded bg-slate-200 text-sm">Ver 'Por verificar'</button>
        <button disabled={loading} onClick={() => load({ status: 'Publicada' })} className="px-3 py-1 rounded bg-slate-200 text-sm">Ver Publicadas</button>
        {userRole && userRole !== 'solicitante' && (
          <button disabled={loading} onClick={() => load({ all: '1' })} className="px-3 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 text-sm">Ver todos (admin)</button>
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
          <p>Aún no tienes publicaciones registradas.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <>
          <p className="text-sm text-slate-700">Estimado(a) usuario: En este apartado podrá consultar el resumen de todas sus publicaciones gestionadas en el sistema, ya sean documentos o convocatorias. Aquí puede visualizar: el número de la orden de servicio, tipo de publicación, razón social asociada, fecha de solicitud y fecha de publicación; detalles de la solicitud, incluyendo los documentos enviados y los datos del pago registrado; estado actual y, cuando corresponda, descargar la edición.</p>
          <div className="card overflow-auto">
            <table className="min-w-full text-sm">
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
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">{r.publish_date || '-'}</td>
                    <td className="px-4 py-2">{r.status === 'Pendiente' || r.status === 'Borrador' ? 'Borrador' : (r.status === 'Publicado' ? 'Publicada' : r.status)}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {(r.status === 'Borrador' || r.status === 'Pendiente' || r.status === 'Por verificar') && (
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
                                if (!window.confirm('¿Está seguro de eliminar esta publicación en borrador?')) return;
                                try { setLoading(true); await deleteLegal(r.id); load(); }
                                catch (e: any) { alert(e.message || 'Error al eliminar'); setLoading(false); }
                              }}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                        <button className="text-brand-700 hover:underline" onClick={() => navigate(`/solicitante/publicaciones/${r.id}`)}>Ver detalles</button>
                        <button className="text-blue-600 hover:underline" onClick={async () => { const b = await downloadLegal(r.id); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = `orden-servicio-${r.id}.pdf`; a.click(); URL.revokeObjectURL(url) }}>Descargar orden</button>
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
