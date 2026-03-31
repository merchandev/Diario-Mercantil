import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegal, type LegalRequest, type LegalPayment, downloadLegal, listLegalFiles, type LegalFile } from '../../lib/api'
import ProtectedPdfViewer from '../../components/ProtectedPdfViewer'
import { IconArrowLeft, IconDownload, IconCheck } from '../../components/icons'
import QRCode from 'qrcode.react'
import AlertDialog from '../../components/AlertDialog'

export default function PublicacionDetalleSolicitante() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState<LegalRequest | null>(null)
  const [payments, setPayments] = useState<LegalPayment[]>([])
  const qrWrapRef = useRef<HTMLDivElement | null>(null)
  const [files, setFiles] = useState<LegalFile[]>([])
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, title: '', message: '', variant: 'info' })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getLegal(+id)
      .then(async data => {
        setReq(data.item)
        setPayments(data.payments || [])
        try {
          const filesRes = await listLegalFiles(+id)
          setFiles(filesRes.items)
        } catch { }
      })
      .catch(err => {
        console.error('Error cargando publicación:', err)
        setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo cargar la publicación', variant: 'error' })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDownloadPDF = async () => {
    if (!req) return
    try {
      const blob = await downloadLegal(req.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orden-${req.order_no || req.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo descargar el PDF', variant: 'error' })
    }
  }

  const handleDownloadQR = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas || !req) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-orden-${req.order_no || req.id}.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!req) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Publicación no encontrada</h2>
        <button onClick={() => navigate('/solicitante/historial')} className="btn btn-primary">
          Volver al historial
        </button>
      </div>
    )
  }

  const meta = typeof req.meta === 'string' ? JSON.parse(req.meta) : (req.meta || {})
  const totalPagado = payments.reduce((sum, p) => sum + (p.amount_bs || 0), 0)
  const isPublicada = req.status === 'Publicada'
  const publicUrl = `${window.location.origin}/publicaciones/${req.order_no || req.id}/${encodeURIComponent(req.name || 'publicacion')}`

  // Date: use created_at (system date) for "Fecha de solicitud", fallback to date
  const fechaSolicitud = (() => {
    const raw = (req as any).created_at || req.date
    if (!raw) return '-'
    return raw.slice(0, 10).split('-').reverse().join('/')
  })()

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/solicitante/historial')} className="btn btn-ghost inline-flex items-center gap-2">
            <IconArrowLeft /> Volver
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-brand-800">Detalles de Publicación</h1>
            <p className="text-sm text-slate-600">Orden N° {req.order_no || String(req.id).padStart(8, '0')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadPDF} className="btn btn-primary inline-flex items-center gap-2">
            <IconDownload /> Descargar Orden
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información básica */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-brand-800">Información de la Orden</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">N° de Orden</label>
                <div className="font-mono font-semibold text-brand-700">{req.order_no || String(req.id).padStart(8, '0')}</div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Estado</label>
                <span className={`pill ${req.status === 'Publicada' ? 'bg-green-100 text-green-700' :
                  req.status === 'En trámite' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'Por verificar' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'Rechazado' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                  }`}>
                  {req.status}
                </span>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Fecha de Solicitud</label>
                <div className="font-medium">{fechaSolicitud}</div>
              </div>
              {/* Only show publish_date when actually published */}
              {isPublicada && req.publish_date && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Fecha de Publicación</label>
                  <div className="font-medium">{req.publish_date}</div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tipo de Publicación</label>
                <div className="font-medium">{req.pub_type || 'Documento'}</div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">N° de Folios</label>
                <div className="font-medium">{req.folios || 1}</div>
              </div>
            </div>
          </div>

          {/* Datos Registrales del Documento (obs. 5 & 6) */}
          {Object.keys(meta).length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 text-brand-800">Datos Registrales del Documento</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {meta.tipo_sociedad && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo de Sociedad</label>
                    <div className="font-medium">{meta.tipo_sociedad}</div>
                  </div>
                )}
                {meta.tipo_acto && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo de Acto Inscrito</label>
                    <div className="font-medium">{meta.tipo_acto}</div>
                  </div>
                )}
                {meta.tipo_convocatoria && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo de Convocatoria</label>
                    <div className="font-medium">{meta.tipo_convocatoria}</div>
                  </div>
                )}
                {(meta.razon_denominacion_social || meta.razon_social) && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm text-slate-600 mb-1">Razón / Denominación Social</label>
                    <div className="font-medium">{meta.razon_denominacion_social || meta.razon_social}</div>
                  </div>
                )}
                {meta.estado && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Estado</label>
                    <div className="font-medium">{meta.estado}</div>
                  </div>
                )}
                {meta.oficina && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Oficina de Registro Mercantil</label>
                    <div className="font-medium">{meta.oficina}</div>
                  </div>
                )}
                {meta.registrador && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Nombre del Registrador(a)</label>
                    <div className="font-medium">{meta.registrador}</div>
                  </div>
                )}
                {meta.tipo_registrador && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tipo de Registrador(a)</label>
                    <div className="font-medium">{meta.tipo_registrador}</div>
                  </div>
                )}
                {meta.tomo && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Tomo</label>
                    <div className="font-medium">{meta.tomo}</div>
                  </div>
                )}
                {meta.letra && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Letra</label>
                    <div className="font-medium">{meta.letra}</div>
                  </div>
                )}
                {meta.numero && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Número</label>
                    <div className="font-medium">{meta.numero}</div>
                  </div>
                )}
                {meta.año && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Año</label>
                    <div className="font-medium">{meta.año}</div>
                  </div>
                )}
                {meta.expediente && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Número de Expediente</label>
                    <div className="font-medium">{meta.expediente}</div>
                  </div>
                )}
                {meta.fecha_registro && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Fecha del Registro</label>
                    <div className="font-medium">{meta.fecha_registro}</div>
                  </div>
                )}
                {meta.planilla && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Número de Planilla</label>
                    <div className="font-medium">{meta.planilla}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historial de pagos (obs. 8 — added phone column) */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-brand-800">Historial de Pagos</h2>
            {payments.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No hay pagos registrados</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto pb-2">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Referencia</th>
                        <th className="text-left py-2">Tipo</th>
                        <th className="text-left py-2">Banco</th>
                        <th className="text-left py-2">Teléfono Pago Móvil</th>
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-right py-2">Monto (Bs.)</th>
                        <th className="text-center py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b">
                          <td className="py-2 font-mono text-xs">{p.ref || '-'}</td>
                          <td className="py-2">{p.type}</td>
                          <td className="py-2">{p.bank || '-'}</td>
                          <td className="py-2">{(p as any).phone || '-'}</td>
                          <td className="py-2">{p.date}</td>
                          <td className="py-2 text-right font-semibold">{Number(p.amount_bs || 0).toFixed(2)}</td>
                          <td className="py-2 text-center">
                            <span className={`pill text-xs ${p.status === 'Verificado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end items-center gap-4 pt-4 border-t">
                  <span className="text-slate-600">Total Pagado:</span>
                  <span className="text-2xl font-bold text-brand-700">Bs. {Number(totalPagado || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Documentos adjuntos */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 text-brand-800">Documentos de la Publicación</h2>
            {files.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay documentos adjuntos</p>
            ) : (
              <div className="space-y-6">
                {files.map((f) => (
                  <div key={f.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm flex items-center justify-between">
                      <div className="font-medium">{f.name}</div>
                      <span className="text-xs text-slate-500">Vista protegida</span>
                    </div>
                    {f.type === 'pdf' ? (
                      <ProtectedPdfViewer src={`/api/uploads/${f.file_id}`} watermark={`Orden N° ${req.order_no || String(req.id).padStart(8, '0')} - Solo Lectura`} />
                    ) : (
                      <div className="p-6 text-center text-slate-500">Tipo de archivo no soportado para vista previa</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estado de la solicitud — always shown */}
          <div className="card p-6 bg-slate-50">
            <h3 className="font-semibold mb-3 text-brand-800">Estado de la Solicitud</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-600">Estado Actual:</dt>
                <dd className="font-semibold text-brand-700">{req.status}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Folios:</dt>
                <dd className="font-semibold">{req.folios || 1}</dd>
              </div>
              {isPublicada && req.publish_date && (
                <div>
                  <dt className="text-slate-600">Publicado:</dt>
                  <dd className="font-semibold">{req.publish_date}</dd>
                </div>
              )}
            </dl>
            {!isPublicada && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <p>Su solicitud se encuentra en proceso. El código QR y el enlace público estarán disponibles una vez que la publicación sea incorporada a una edición del diario.</p>
              </div>
            )}
          </div>

          {/* QR Code — only when published (obs. 9) */}
          {isPublicada && (
            <div className="card p-6">
              <h3 className="font-semibold mb-3 text-brand-800">Código QR</h3>
              <p className="text-xs text-slate-600 mb-4">Comparte este código para acceder a tu publicación</p>
              <div ref={qrWrapRef} className="bg-white inline-block p-4 rounded-lg shadow-md border mx-auto block">
                <QRCode value={publicUrl} size={200} includeMargin={false} level="M" renderAs="canvas" />
              </div>
              <div className="text-xs text-center mt-3 text-slate-500 font-mono break-all">
                {req.order_no || String(req.id).padStart(8, '0')}
              </div>
              <button
                onClick={handleDownloadQR}
                className="btn btn-outline w-full mt-4 inline-flex items-center justify-center gap-2"
              >
                <IconDownload /> Descargar QR
              </button>
            </div>
          )}

          {/* URL Pública — only when published (obs. 9) */}
          {isPublicada && (
            <div className="card p-6">
              <h3 className="font-semibold mb-3 text-brand-800">Enlace Público</h3>
              <p className="text-xs text-slate-600 mb-3">Comparte este enlace para que otros vean tu publicación</p>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-3">
                <p className="text-xs font-mono break-all text-slate-700">{publicUrl}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl)
                  setAlertDialog({ isOpen: true, title: 'Copiado', message: 'Enlace copiado al portapapeles', variant: 'success' })
                }}
                className="btn btn-outline w-full inline-flex items-center justify-center gap-2"
              >
                <IconCheck /> Copiar enlace
              </button>
            </div>
          )}

          {/* Acceso a la edición — only when published (obs. 10) */}
          {isPublicada && (
            <div className="card p-6 bg-green-50 border border-green-200">
              <h3 className="font-semibold mb-3 text-green-800">Publicación en Edición</h3>
              <p className="text-xs text-green-700 mb-4">Su documento ya forma parte de una edición del Diario Mercantil de Venezuela.</p>
              <a
                href="/ediciones"
                className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-sm"
              >
                <IconDownload /> Ver Ediciones del Diario
              </a>
            </div>
          )}
        </div>
      </div>

      <AlertDialog {...alertDialog} onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })} />
    </section>
  )
}
