import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegal, updateLegal, rejectLegal, addLegalPayment, deleteLegalPayment, downloadLegal, listLegalFiles, type LegalRequest, type LegalPayment, type LegalFile } from '../lib/api'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import { IconTrash, IconDownload, IconSave, IconClose, IconPlus, IconArrowLeft, IconQrCode } from '../components/icons'
import QRCodeModal from '../components/QRCodeModal'

export default function PublicacionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<LegalRequest | null>(null)
  const [payments, setPayments] = useState<LegalPayment[]>([])
  const [files, setFiles] = useState<LegalFile[]>([])
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState<any>({})
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>('')
  const [currentPdfName, setCurrentPdfName] = useState<string>('')
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' })

  useEffect(() => {
    if (!id) return
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const d = await getLegal(Number(id))
      setItem(d.item)
      setPayments(d.payments)

      // Parse metadata
      if (d.item.meta) {
        try {
          setMeta(JSON.parse(d.item.meta))
        } catch {
          setMeta({})
        }
      }

      // Load files
      const filesData = await listLegalFiles(Number(id))
      setFiles(filesData.items)
    } catch (err) {
      console.error('Error loading data:', err)
      alert('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const onSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      await updateLegal(item.id, {
        status: item.status,
        folios: item.folios,
        publish_date: item.publish_date,
        order_no: item.order_no,
        name: item.name,
        document: item.document,
        phone: item.phone,
        email: item.email,
        address: item.address,
        comment: item.comment
      })
      alert('✅ Cambios guardados correctamente')
      loadData()
    } catch (err) {
      console.error('Error saving:', err)
      alert('❌ Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const onReject = async () => {
    if (!item) return
    const reason = prompt('Motivo del rechazo:')
    if (reason === null) return
    try {
      await rejectLegal(item.id, reason || 'No especificado')
      alert('❌ Solicitud rechazada')
      navigate('/dashboard/publicaciones')
    } catch (err) {
      console.error('Error rejecting:', err)
      alert('Error al rechazar')
    }
  }

  const onApprove = async () => {
    if (!item) return
    if (!confirm('¿Aprobar esta solicitud y marcarla como Publicada?')) return
    try {
      await updateLegal(item.id, {
        status: 'Publicada',
        publish_date: new Date().toISOString().slice(0, 10)
      })
      alert('✅ Solicitud aprobada y publicada')
      loadData()
    } catch (err) {
      console.error('Error approving:', err)
      alert('Error al aprobar')
    }
  }

  const onAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    const form = e.target as HTMLFormElement
    const fd = new FormData(form)
    const body: any = {
      ref: fd.get('ref') || '',
      date: fd.get('date') || new Date().toISOString().slice(0, 10),
      bank: fd.get('bank') || '',
      type: fd.get('type') || '',
      amount_bs: Number(fd.get('amount_bs') || 0),
      status: fd.get('pstatus') || 'Verificado',
      comment: fd.get('comment') || ''
    }
    try {
      await addLegalPayment(item.id, body)
      form.reset()
      loadData()
      alert('✅ Pago agregado')
    } catch (err) {
      console.error('Error adding payment:', err)
      alert('Error al agregar pago')
    }
  }

  const onDeletePayment = async (paymentId: number) => {
    if (!item) return
    if (!confirm('¿Eliminar este pago?')) return
    try {
      await deleteLegalPayment(item.id, paymentId)
      loadData()
      alert('✅ Pago eliminado')
    } catch (err) {
      console.error('Error deleting payment:', err)
      alert('Error al eliminar pago')
    }
  }

  const download = async () => {
    if (!item) return
    try {
      const blob = await downloadLegal(item.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orden-servicio-${item.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading:', err)
      alert('Error al descargar')
    }
  }

  const openPdfViewer = (fileId: number, fileName: string) => {
    setCurrentPdfUrl(`/api/uploads/${fileId}`)
    setCurrentPdfName(fileName)
    setPdfViewerOpen(true)
  }

  const closePdfViewer = () => {
    setPdfViewerOpen(false)
    setCurrentPdfUrl('')
    setCurrentPdfName('')
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount_bs || 0), 0)
  const latestPayment = payments[0]
  const prettyDate = (s?: string) => s ? s.split('-').reverse().join('/') : '-'
  const prettyStatus = (s?: string) => {
    if (!s) return '-'
    if (s === 'Borrador' || s === 'Pendiente') return 'Pendiente'
    if (s === 'Publicada' || s === 'Publicado') return 'Publicado'
    return s
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full mb-4"></div>
        <p className="text-slate-600">Cargando detalles...</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Publicación no encontrada</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate('/dashboard/publicaciones')}>
          Volver a Publicaciones
        </button>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <QRCodeModal {...qrModal} onClose={() => setQrModal({ isOpen: false, url: '', title: '' })} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => navigate('/dashboard/publicaciones')}>
            <IconArrowLeft /> Volver
          </button>
          <h1 className="text-xl font-semibold">Orden de servicio #{item.order_no || item.id}</h1>
        </div>
        <div className="flex gap-2">
          {item.status === 'Publicada' && (
            <button className="btn" onClick={() => setQrModal({ isOpen: true, url: `${window.location.origin}/ediciones/${item.order_no || item.id}`, title: `Publicación ${item.order_no || item.id}` })}>
              <IconQrCode /> Código QR
            </button>
          )}
          <button className="btn" onClick={download}>
            <IconDownload /> Descargar PDF
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            <IconSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {item.status === 'Por verificar' && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900 mb-3">⚠️ Solicitud pendiente de verificación</p>
          <div className="flex gap-2">
            <button className="btn bg-green-600 text-white hover:bg-green-700" onClick={onApprove}>
              ✓ Aprobar y Publicar
            </button>
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onReject}>
              ✗ Rechazar
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Column 1: Basic Info */}
        <div className="card p-4 space-y-4 lg:col-span-2">
          <h3 className="font-semibold text-lg border-b pb-2">Información Básica</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">N° de Orden</label>
            <input
              className="input w-full"
              value={item.order_no || ''}
              onChange={e => setItem({ ...item, order_no: e.target.value })}
              placeholder="ORD-2025-XXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select
              className="input w-full"
              value={item.status}
              onChange={e => setItem({ ...item, status: e.target.value })}
            >
              <option value="Borrador">Pendiente</option>
              <option value="Por verificar">Por verificar</option>
              <option value="En trámite">En trámite</option>
              <option value="Publicada">Publicado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Solicitud</label>
            <input
              className="input w-full"
              type="date"
              value={item.date || ''}
              onChange={e => setItem({ ...item, date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Publicación</label>
            <input
              className="input w-full"
              type="date"
              value={item.publish_date || ''}
              onChange={e => setItem({ ...item, publish_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <input className="input w-full" value={item.pub_type || 'Documento'} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folios</label>
            <input
              className="input w-full"
              type="number"
              min="1"
              value={item.folios || 1}
              onChange={e => setItem({ ...item, folios: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* Column 2: Solicitante Info */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Datos del Solicitante</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social / Nombre</label>
            <input
              className="input w-full"
              value={item.name || ''}
              onChange={e => setItem({ ...item, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RIF / Cédula</label>
            <input
              className="input w-full"
              value={item.document || ''}
              onChange={e => setItem({ ...item, document: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input
              className="input w-full"
              value={item.phone || ''}
              onChange={e => setItem({ ...item, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              className="input w-full"
              type="email"
              value={item.email || ''}
              onChange={e => setItem({ ...item, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
            <textarea
              className="input w-full"
              rows={3}
              value={item.address || ''}
              onChange={e => setItem({ ...item, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
            <textarea
              className="input w-full"
              rows={3}
              value={item.comment || ''}
              onChange={e => setItem({ ...item, comment: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Column 3: Metadata */}
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Información Adicional</h3>

          {meta.tipo_sociedad && (
            <div>
              <span className="text-sm font-medium text-slate-700">Tipo de Sociedad:</span>
              <p className="text-slate-900">{meta.tipo_sociedad}</p>
            </div>
          )}

          {meta.tipo_acto && (
            <div>
              <span className="text-sm font-medium text-slate-700">Tipo de Acto:</span>
              <p className="text-slate-900">{meta.tipo_acto}</p>
            </div>
          )}

          {meta.tipo_convocatoria && (
            <div>
              <span className="text-sm font-medium text-slate-700">Tipo de Convocatoria:</span>
              <p className="text-slate-900">{meta.tipo_convocatoria}</p>
            </div>
          )}

          {meta.estado && (
            <div>
              <span className="text-sm font-medium text-slate-700">Estado:</span>
              <p className="text-slate-900">{meta.estado}</p>
            </div>
          )}

          {meta.oficina && (
            <div>
              <span className="text-sm font-medium text-slate-700">Oficina:</span>
              <p className="text-slate-900">{meta.oficina}</p>
            </div>
          )}

          {meta.registrador && (
            <div>
              <span className="text-sm font-medium text-slate-700">Registrador:</span>
              <p className="text-slate-900">{meta.registrador}</p>
            </div>
          )}

          {meta.tomo && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-sm font-medium text-slate-700">Tomo:</span>
                <p className="text-slate-900">{meta.tomo}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-700">Número:</span>
                <p className="text-slate-900">{meta.numero}</p>
              </div>
            </div>
          )}

          {meta.anio && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-sm font-medium text-slate-700">Año:</span>
                <p className="text-slate-900">{meta.anio}</p>
              </div>
              {meta.expediente && (
                <div>
                  <span className="text-sm font-medium text-slate-700">Expediente:</span>
                  <p className="text-slate-900">{meta.expediente}</p>
                </div>
              )}
            </div>
          )}

          {Object.keys(meta).length === 0 && (
            <p className="text-slate-500 text-sm">No hay información adicional</p>
          )}
        </div>

        {/* Column 4: Pago reportado */}
        <div className="card p-4 space-y-3 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-emerald-900">Pago reportado</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200">
              {latestPayment ? 'Pendiente de verificación' : 'Aún no reportado'}
            </span>
          </div>
          {latestPayment ? (
            <div className="space-y-2 text-sm text-slate-800">
              <div className="flex justify-between"><span className="font-medium">Referencia:</span><span>{latestPayment.ref}</span></div>
              <div className="flex justify-between"><span className="font-medium">Fecha:</span><span>{prettyDate(latestPayment.date)}</span></div>
              <div className="flex justify-between"><span className="font-medium">Banco:</span><span>{latestPayment.bank}</span></div>
              <div className="flex justify-between"><span className="font-medium">Tipo:</span><span>{latestPayment.type}</span></div>
              <div className="flex justify-between"><span className="font-medium">Monto:</span><span className="font-mono">{Number(latestPayment.amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span></div>
              {latestPayment.mobile_phone && (
                <div className="flex justify-between"><span className="font-medium">Telf. Pago Móvil:</span><span>{latestPayment.mobile_phone}</span></div>
              )}
              <div className="flex justify-between"><span className="font-medium">Estado:</span>
                <span className={`px-2 py-1 rounded text-xs ${latestPayment.status === 'Verificado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {latestPayment.status}
                </span>
              </div>
              {latestPayment.comment && (
                <div>
                  <span className="font-medium block">Comentario:</span>
                  <p className="text-slate-700">{latestPayment.comment}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No hay pagos cargados por el solicitante.</p>
          )}
          <div className="border-t pt-3 text-xs text-slate-600">
            Desde aquÇ­ el administrador valida el pago y puede aprobar/rechazar en la secciÇün superior.
          </div>
        </div>
      </div>

      {/* Add Payment Form */}
      <form onSubmit={onAddPayment} className="border-t pt-4">
        <h4 className="font-medium mb-3">Agregar Nuevo Pago</h4>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="input" name="ref" placeholder="Referencia" required />
          <input
            className="input"
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <input className="input" name="bank" placeholder="Banco" required />
          <input className="input" name="type" placeholder="Tipo" required />
          <input
            className="input"
            name="amount_bs"
            type="number"
            step="0.01"
            placeholder="Monto Bs."
            required
          />
          <select className="input" name="pstatus" defaultValue="Verificado">
            <option>Verificado</option>
            <option>Pendiente</option>
          </select>
          <input
            className="input md:col-span-2"
            name="comment"
            placeholder="Comentario (opcional)"
          />
        </div>
        <button className="btn btn-primary mt-3">
          <IconPlus /> Agregar Pago
        </button>
      </form>

      {/* Files Section */}
      {
        files.length > 0 && (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-lg">Archivos Adjuntos</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {files.map(f => (
                <div key={f.id} className="border rounded p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{f.name}</p>
                    <p className="text-sm text-slate-500">{f.kind} • {(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.type === 'pdf' && (
                      <button
                        onClick={() => openPdfViewer(f.file_id, f.name)}
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        title="Ver PDF"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                      </button>
                    )}
                    <a
                      href={`/api/uploads/${f.file_id}`}
                      download={f.name}
                      className="text-brand-600 hover:text-brand-800"
                      title="Descargar"
                    >
                      <IconDownload />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* PDF Viewer Modal */}
      {
        pdfViewerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-lg truncate flex-1">{currentPdfName}</h3>
                <div className="flex items-center gap-2">
                  {/* Descarga disponible para administradores desde la lista, no en el visor */}
                  <button
                    onClick={closePdfViewer}
                    className="btn bg-slate-200 hover:bg-slate-300"
                  >
                    <IconClose /> Cerrar
                  </button>
                </div>
              </div>

              {/* PDF Viewer protegido */}
              <div className="flex-1 overflow-hidden">
                <ProtectedPdfViewer src={currentPdfUrl} watermark={`Orden ${item.order_no || item.id} - Solo Lectura`} />
              </div>
            </div>
          </div>
        )
      }
    </section >
  )
}
