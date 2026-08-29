import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegal, updateLegal, rejectLegal, verifyLegal, returnToDraftLegal, addLegalPayment, deleteLegalPayment, downloadLegal, listLegalFiles, type LegalRequest, type LegalPayment, type LegalFile } from '../lib/api'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import { IconTrash, IconDownload, IconSave, IconClose, IconPlus, IconArrowLeft, IconQrCode } from '../components/icons'
import QRCodeModal from '../components/QRCodeModal'
import LegalRequestDetails from '../components/LegalRequestDetails'
import { BANCOS_VENEZUELA } from '../constants/banks'

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
    if (!confirm('¿Verificar esta solicitud y marcarla como En trámite?')) return
    try {
      await verifyLegal(item.id)
      alert('✅ Solicitud verificada y en trámite')
      loadData()
    } catch (err: any) {
      console.error('Error approving:', err)
      alert(err.message || 'Error al aprobar')
    }
  }

  const onReturnToDraft = async () => {
    if (!item) return
    if (!confirm('¿Devolver esta solicitud a Borrador?')) return
    try {
      await returnToDraftLegal(item.id)
      alert('✅ Solicitud devuelta a Borrador')
      loadData()
    } catch (err: any) {
      console.error('Error returning to draft:', err)
      alert(err.message || 'Error al devolver a borrador')
    }
  }

  const onAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    const form = e.target as HTMLFormElement
    const fd = new FormData(form)
    const prefix = String(fd.get('mobile_prefix') || '')
    const phone = String(fd.get('mobile_phone') || '').replace(/\D/g, '')
    const ref = String(fd.get('ref') || '').replace(/\D/g, '')
    const date = String(fd.get('date') || new Date().toISOString().slice(0, 10))
    const amount = Number(fd.get('amount_bs') || 0)
    if (!/^\d{4}$/.test(ref) || !/^04(12|14|16|22|24|26)$/.test(prefix) || !/^\d{7}$/.test(phone) || amount <= 0) {
      alert('Referencia, teléfono o monto inválidos. Revise los datos del Pago Móvil.')
      return
    }
    if (date > new Date().toISOString().slice(0, 10)) {
      alert('La fecha del pago no puede ser futura.')
      return
    }
    const body: any = {
      ref,
      date,
      bank: String(fd.get('bank') || ''),
      type: 'pago_movil',
      amount_bs: amount,
      mobile_phone: prefix + phone,
      comment: String(fd.get('comment') || '')
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
  const paymentStatusText = (payment?: LegalPayment) => {
    if (!payment) return 'Aún no reportado'
    switch (payment.status) {
      case 'Aprobado':
      case 'Verificado': return 'Pago verificado'
      case 'Rechazado': return 'Pago rechazado'
      case 'Por verificar':
      case 'Pendiente': return 'Pendiente de verificación'
      default: return payment.status || 'Sin estado'
    }
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
          {item.status === 'Publicada' && item.edition_code && (
            <button className="btn" onClick={() => setQrModal({ isOpen: true, url: `${window.location.origin}/edicion/${encodeURIComponent(item.edition_code!)}`, title: `Edición ${item.edition_code}` })}>
              <IconQrCode /> Código QR
            </button>
          )}
          <button className="btn" onClick={download}>
            <IconDownload /> Descargar PDF
          </button>
          {item.status !== 'Publicada' && (
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              <IconSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {['Por verificar', 'En trámite'].includes(item.status) && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900 mb-3">Acciones de Verificación</p>
          <div className="flex gap-2">
            {item.status === 'Por verificar' && (
              <button className="btn bg-green-600 text-white hover:bg-green-700" onClick={onApprove}>
                Verificar publicación
              </button>
            )}
            <button className="btn bg-red-600 text-white hover:bg-red-700" onClick={onReject}>
              Rechazar
            </button>
            <button className="btn bg-slate-600 text-white hover:bg-slate-700" onClick={onReturnToDraft}>
              Devolver a Borrador
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <LegalRequestDetails item={item} meta={meta} />
        </div>

        {/* Column 2: Solicitante Info (Editable) */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b pb-2">
            <h3 className="font-semibold text-lg">Datos del Solicitante (Editar)</h3>
            {item.user_id && (
              <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => navigate(`/dashboard/usuarios/${item.user_id}`)}>
                Ver ficha completa
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social / Nombre</label>
            <input
              className="input w-full"
              value={item.name || ''}
              disabled={item.status === 'Publicada'}
              onChange={e => setItem({ ...item, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RIF / Cédula</label>
            <input
              className="input w-full"
              value={item.document || ''}
              disabled={item.status === 'Publicada'}
              onChange={e => setItem({ ...item, document: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <input
              className="input w-full"
              value={item.phone || ''}
              disabled={item.status === 'Publicada'}
              onChange={e => setItem({ ...item, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              className="input w-full"
              type="email"
              value={item.email || ''}
              disabled={item.status === 'Publicada'}
              onChange={e => setItem({ ...item, email: e.target.value })}
            />
          </div>
        </div>

        {/* Column 4: Pago reportado */}
        <div className="card p-4 space-y-3 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-emerald-900">Pago reportado</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200">
              {paymentStatusText(latestPayment)}
            </span>
          </div>
          {latestPayment ? (
            <div className="space-y-2 text-sm text-slate-800">
              <div className="flex justify-between"><span className="font-medium">Referencia:</span><span>{latestPayment.ref}</span></div>
              <div className="flex justify-between"><span className="font-medium">Fecha:</span><span>{prettyDate(latestPayment.date)}</span></div>
              <div className="flex justify-between"><span className="font-medium">Banco:</span><span>{latestPayment.bank}</span></div>
              <div className="flex justify-between"><span className="font-medium">Tipo:</span><span>{latestPayment.type === 'pago_movil' ? 'Pago Móvil' : latestPayment.type}</span></div>
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
            Desde aquí el administrador valida el pago y puede aprobar/rechazar en la sección superior.
          </div>
        </div>
      </div>

      {/* Add Payment Form */}
      {item.status === 'En trámite' && (
        <form onSubmit={onAddPayment} className="card p-4 border border-slate-200 space-y-3">
          <div>
            <h4 className="font-semibold text-slate-800">Agregar Pago Móvil adicional</h4>
            <p className="text-xs text-slate-500 mt-1">Registre únicamente pagos móviles. El monto puede ser parcial y quedará pendiente de verificación.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="input" name="ref" inputMode="numeric" maxLength={4} pattern="\d{4}" placeholder="Últimos 4 dígitos" required />
            <input className="input" type="date" name="date" max={new Date().toISOString().slice(0, 10)} defaultValue={new Date().toISOString().slice(0, 10)} required />
            <select className="input" name="bank" required defaultValue="">
              <option value="" disabled>Banco emisor</option>
              {BANCOS_VENEZUELA.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <input className="input" name="amount_bs" type="number" min="0.01" step="0.01" placeholder="Monto parcial Bs." required />
            <select className="input" name="mobile_prefix" defaultValue="0412" required>
              {['0412','0414','0416','0422','0424','0426'].map(prefix => <option key={prefix} value={prefix}>{prefix}</option>)}
            </select>
            <input className="input" name="mobile_phone" inputMode="numeric" maxLength={7} pattern="\d{7}" placeholder="7 dígitos del teléfono" required />
            <input className="input md:col-span-2" name="comment" placeholder="Comentario (opcional)" />
          </div>
          <button className="btn btn-primary">
            <IconPlus /> Agregar Pago
          </button>
        </form>
      )}

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
