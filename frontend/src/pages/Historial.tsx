import { useEffect, useState } from 'react'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/LoadingSpinner'
import { listLegal, type LegalRequest } from '../lib/api'

export default function Historial() {
  const [rows, setRows] = useState<LegalRequest[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Todos')
  const [reqFrom, setReqFrom] = useState('')
  const [reqTo, setReqTo] = useState('')
  const [pubFrom, setPubFrom] = useState('')
  const [pubTo, setPubTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = () => {
    console.log('🔄 [Historial Admin] Cargando datos...')
    setLoading(true)
    setError(null)
    listLegal({ q, status: status === 'Todos' ? '' : status, req_from: reqFrom || undefined, req_to: reqTo || undefined, pub_from: pubFrom || undefined, pub_to: pubTo || undefined })
      .then(r => {
        console.log('✅ [Historial Admin] Datos cargados:', r.items.length, 'publicaciones')
        console.log('📋 [Historial Admin] Primeros 3 registros:', r.items.slice(0, 3))
        setRows(r.items)
      })
      .catch(err => {
        console.error('❌ [Historial Admin] Error cargando historial:', err)
        setError('No se pudo cargar el historial')
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">HISTORIAL DE PUBLICACIONES. Revisa y gestiona todas tus publicaciones, consulta su estado y, una vez publicadas, descárgalas cuando lo necesites.</h1>
      {error && <ErrorMessage message={error} onRetry={load} />}
      {loading && <LoadingSpinner message="Cargando historial..." />}
      {!loading && !error && (
        <>
          <div className="card p-4 text-sm space-y-3 text-slate-700 bg-white">
            <p>Estimado(a) usuario: En este apartado podrá consultar el resumen de todas sus publicaciones gestionadas en el sistema, ya sean documentos o convocatorias.</p>
            <div>
              <p className="mb-1">Aquí puede visualizar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El número de la orden de servicio, tipo de publicación, razón social asociada, fecha de solicitud y fecha de publicación.</li>
                <li>Detalles de la solicitud, incluyendo los documentos enviados y los datos del pago registrado.</li>
                <li>Estado actual de la solicitud y, cuando corresponda, la opción para descargar la edición del Diario Mercantil de Venezuela donde fue publicada su convocatoria o documento.</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-3 rounded border">
              <div className="font-semibold mb-2">Los estados de la solicitud son los siguientes:</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div><span className="font-semibold text-slate-900">Borrador:</span> Indica que el usuario completó los datos de la publicación, pero aún no ha adjuntado los archivos o reportado el pago. Mientras permanezca en este estado, no se genera la orden de servicio ni se inicia el proceso de publicación.</div>
                <div><span className="font-semibold text-slate-900">Por verificar:</span> La solicitud fue enviada y está pendiente la revisión de documentos y verificación del pago.</div>
                <div><span className="font-semibold text-slate-900">En trámite:</span> La publicación fue verificada y se encuentra en proceso para su publicación en el Diario.</div>
                <div><span className="font-semibold text-slate-900">Publicada:</span> La publicación ya se realizó y la edición correspondiente está disponible para descargar desde este mismo apartado.</div>
              </div>
            </div>
          </div>

          <div className="card p-3 grid md:grid-cols-4 gap-3">
            <input className="input" placeholder="Buscador..." value={q} onChange={e => setQ(e.target.value)} />
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {['Todos', 'Borrador', 'Por verificar', 'Verificada', 'Publicada', 'Rechazado'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input className="input" type="date" value={reqFrom} onChange={e => setReqFrom(e.target.value)} placeholder="Fecha de solicitud (desde)" />
            <input className="input" type="date" value={reqTo} onChange={e => setReqTo(e.target.value)} placeholder="Fecha de solicitud (hasta)" />
            <input className="input" type="date" value={pubFrom} onChange={e => setPubFrom(e.target.value)} placeholder="Fecha de publicación (desde)" />
            <input className="input" type="date" value={pubTo} onChange={e => setPubTo(e.target.value)} placeholder="Fecha de publicación (hasta)" />
            <div className="md:col-span-4 flex gap-2">
              <button className="btn btn-primary" onClick={load}>Filtrar</button>
              <button className="btn" onClick={() => { setQ(''); setStatus('Todos'); setReqFrom(''); setReqTo(''); setPubFrom(''); setPubTo(''); setTimeout(load, 0) }}>Limpiar</button>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState message="No se encontraron publicaciones que coincidan con los criterios de búsqueda." />
          ) : (
            <div className="card overflow-x-auto pb-2 pt-1">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead>
                  <tr className="bg-brand-800 text-white">
                    <th className="text-left px-4 py-2">N° de orden</th>
                    <th className="text-left px-4 py-2">Fecha de solicitud</th>
                    <th className="text-left px-4 py-2">Tipo de publicación</th>
                    <th className="text-left px-4 py-2">Razón social</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    <th className="text-left px-4 py-2">Fecha de publicación</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono">{r.order_no || r.id}</td>
                      <td className="px-4 py-2">{r.date.split('-').reverse().join('/')}</td>
                      <td className="px-4 py-2">{r.pub_type || 'Documento'}</td>
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${(r.status === 'Pendiente' || r.status === 'Borrador') ? 'bg-slate-100 text-slate-800' : ''}
                        ${r.status === 'Por verificar' ? 'bg-amber-100 text-amber-800' : ''}
                        ${(r.status === 'En trámite' || r.status === 'Verificada') ? 'bg-blue-100 text-blue-800' : ''}
                        ${(r.status === 'Publicado' || r.status === 'Publicada') ? 'bg-green-100 text-green-800' : ''}
                        ${r.status === 'Rechazado' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                          {r.status === 'Pendiente' ? 'Borrador' : (r.status === 'Publicado' ? 'Publicada' : r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {(r.publish_date) ? (
                          <span className="flex items-center gap-2">
                            {r.publish_date.split('-').reverse().join('/')}
                            {(r.status === 'Publicada' || r.status === 'Publicado') && (
                              <button className="text-brand-600 hover:text-brand-800" title="Descargar" onClick={() => console.log('Descargar', r.id)}>
                                ⬇
                              </button>
                            )}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>

  )
}
