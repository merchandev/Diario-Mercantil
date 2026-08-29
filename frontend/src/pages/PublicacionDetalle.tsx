import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLegal, updateLegal, rejectLegal, verifyLegal, returnToDraftLegal, addLegalPayment, verifyLegalPayment, rejectLegalPayment, deleteLegalPayment, downloadLegal, listLegalFiles, type LegalRequest, type LegalPayment, type LegalFile } from '../lib/api'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import { IconTrash, IconDownload, IconSave, IconClose, IconPlus, IconArrowLeft, IconQrCode } from '../components/icons'
import QRCodeModal from '../components/QRCodeModal'
import LegalRequestDetails from '../components/LegalRequestDetails'
import { BANCOS_VENEZUELA } from '../constants/banks'
import { useDialog } from '../contexts/DialogContext'

export default function PublicacionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showAlert, confirmAction, requestText } = useDialog()
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
  const [paymentError, setPaymentError] = useState('')
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null)

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
      void showAlert('Error al cargar los datos', { title: 'Error' })
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
      await showAlert('Cambios guardados correctamente', { title: 'Guardado' })
      loadData()
    } catch (err) {
      console.error('Error saving:', err)
      void showAlert('Error al guardar cambios', { title: 'Error' })
    } finally {
      setSaving(false)
    }
  }

  const onReject = async () => {
    if (!item) return
    const reason = await requestText('Indique el motivo del rechazo.', { title: 'Motivo del rechazo', confirmText: 'Confirmar rechazo', danger: true })
    if (reason === null) return
    try {
      await rejectLegal(item.id, reason)
      await showAlert('Solicitud rechazada', { title: 'Solicitud actualizada' })
      navigate('/dashboard/publicaciones')
    } catch (err) {
      console.error('Error rejecting:', err)
      void showAlert('Error al rechazar', { title: 'Error' })
    }
  }

  const onApprove = async () => {
    if (!item) return
    if (!(await confirmAction('¿Verificar esta solicitud y marcarla como En trámite?', { title: 'Verificar solicitud' }))) return
    try {
      await verifyLegal(item.id)
      await showAlert('Solicitud verificada y en trámite', { title: 'Solicitud actualizada' })
      loadData()
    } catch (err: any) {
      console.error('Error approving:', err)
      void showAlert(err.message || 'Error al aprobar', { title: 'Error' })
    }
  }

  const onReturnToDraft = async () => {
    if (!item) return
    if (!(await confirmAction('¿Devolver esta solicitud a Borrador?', { title: 'Devolver solicitud' }))) return
    try {
      await returnToDraftLegal(item.id)
      await showAlert('Solicitud devuelta a Borrador', { title: 'Solicitud actualizada' })
      loadData()
    } catch (err: any) {
      console.error('Error returning to draft:', err)
      void showAlert(err.message || 'Error al devolver a borrador', { title: 'Error' })
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
      void showAlert('Referencia, teléfono o monto inválidos. Revise los datos del Pago Móvil.', { title: 'Datos inválidos' })
      return
    }
    if (amount > remainingBalance + 0.005) {
      setPaymentError(`El monto supera el saldo pendiente de ${formatBs(remainingBalance)} Bs.`)
      return
    }
    if (date > new Date().toISOString().slice(0, 10)) {
      void showAlert('La fecha del pago no puede ser futura.', { title: 'Fecha inválida' })
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
      setPaymentError('')
      await addLegalPayment(item.id, body)
      form.reset()
      loadData()
      await showAlert('Pago agregado', { title: 'Pago registrado' })
    } catch (err: any) {
      console.error('Error adding payment:', err)
      const serverRemaining = Number(err?.data?.remaining_bs)
      setPaymentError(
        err?.message === 'payment_exceeds_remaining' && Number.isFinite(serverRemaining)
          ? `El monto supera el saldo pendiente de ${formatBs(serverRemaining)} Bs.`
          : err?.message || 'Error al agregar pago'
      )
    }
  }

  const updatePaymentStatus = async (paymentId: number, action: 'verify' | 'reject') => {
    if (!item || processingPaymentId !== null) return
    setProcessingPaymentId(paymentId)
    setPaymentError('')
    try {
      if (action === 'verify') {
        await verifyLegalPayment(item.id, paymentId)
      } else {
        await rejectLegalPayment(item.id, paymentId)
      }
      await loadData()
    } catch (err: any) {
      setPaymentError(err?.message || 'No se pudo actualizar el pago.')
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const onDeletePayment = async (paymentId: number) => {
    if (!item) return
    if (!(await confirmAction('¿Eliminar este pago?', { title: 'Eliminar pago', danger: true }))) return
    try {
      await deleteLegalPayment(item.id, paymentId)
      loadData()
      await showAlert('Pago eliminado', { title: 'Pago actualizado' })
    } catch (err) {
      console.error('Error deleting payment:', err)
      void showAlert('Error al eliminar pago', { title: 'Error' })
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
      void showAlert('Error al descargar', { title: 'Error' })
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

  const approvedTotal = payments
    .filter(payment => ['Aprobado', 'Verificado'].includes(payment.status || ''))
    .reduce((sum, payment) => sum + Number(payment.amount_bs || 0), 0)
  const reportedTotal = payments
    .filter(payment => ['Aprobado', 'Verificado', 'Por verificar', 'Pendiente'].includes(payment.status || ''))
    .reduce((sum, payment) => sum + Number(payment.amount_bs || 0), 0)
  const orderTotal = Number(item?.total_bs || 0)
  const remainingBalance = Math.max(0, orderTotal - reportedTotal)
  const formatBs = (amount: number) => amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const prettyDate = (s?: string) => s ? s.split('-').reverse().join('/') : '-'
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

        {/* Column 4: Pagos reportados */}
        <div className="card p-4 space-y-3 bg-emerald-50 border-emerald-200">
          <h3 className="font-semibold text-lg text-emerald-900">Pagos reportados</h3>
          <div className="grid gap-2 text-sm rounded-lg bg-white p-3 border border-emerald-100">
            <div className="flex justify-between"><span>Total de la orden:</span><strong>{formatBs(orderTotal)} Bs.</strong></div>
            <div className="flex justify-between"><span>Pagado:</span><strong>{formatBs(approvedTotal)} Bs.</strong></div>
            <div className="flex justify-between"><span>Pagado / reportado:</span><strong>{formatBs(reportedTotal)} Bs.</strong></div>
            <div className="flex justify-between text-emerald-900"><span>Saldo pendiente:</span><strong>{formatBs(remainingBalance)} Bs.</strong></div>
          </div>
          {payments.length > 0 ? payments.map(payment => (
            <div key={payment.id} className="space-y-2 text-sm text-slate-800 rounded-lg bg-white p-3 border border-emerald-100">
              <div className="flex justify-between"><span className="font-medium">Monto:</span><span className="font-mono">{formatBs(Number(payment.amount_bs || 0))} Bs.</span></div>
              <div className="flex justify-between"><span className="font-medium">Banco:</span><span className="text-right">{payment.bank || '-'}</span></div>
              <div className="flex justify-between"><span className="font-medium">Referencia:</span><span>{payment.ref || '-'}</span></div>
              <div className="flex justify-between"><span className="font-medium">Teléfono:</span><span>{payment.mobile_phone || '-'}</span></div>
              <div className="flex justify-between"><span className="font-medium">Fecha:</span><span>{prettyDate(payment.date)}</span></div>
              <div className="flex justify-between items-center"><span className="font-medium">Estado:</span>
                <span className={`px-2 py-1 rounded text-xs ${['Aprobado', 'Verificado'].includes(payment.status || '') ? 'bg-green-100 text-green-800' : payment.status === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {paymentStatusText(payment)}
                </span>
              </div>
              {payment.comment && <p className="text-slate-600">{payment.comment}</p>}
              {payment.status === 'Por verificar' && (
                <div className="flex gap-2 pt-1">
                  <button type="button" className="btn btn-primary text-xs" disabled={processingPaymentId !== null} onClick={() => updatePaymentStatus(payment.id, 'verify')}>Aprobar pago</button>
                  <button type="button" className="btn bg-rose-600 text-white text-xs" disabled={processingPaymentId !== null} onClick={() => updatePaymentStatus(payment.id, 'reject')}>Rechazar pago</button>
                </div>
              )}
            </div>
          )) : (
            <p className="text-sm text-slate-600">No hay pagos cargados por el solicitante.</p>
          )}
          {paymentError && <p className="text-sm text-rose-700" role="alert">{paymentError}</p>}
        </div>
      </div>

      {/* Add Payment Form */}
      {item.status === 'En trámite' && remainingBalance > 0 && (
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
            <input className="input" name="amount_bs" type="number" min="0.01" max={remainingBalance} step="0.01" placeholder="Monto parcial Bs." required />
            <select className="input" name="mobile_prefix" defaultValue="0412" required>
              {['0412','0414','0416','0422','0424','0426'].map(prefix => <option key={prefix} value={prefix}>{prefix}</option>)}
            </select>
            <input className="input" name="mobile_phone" inputMode="numeric" maxLength={7} pattern="\d{7}" placeholder="7 dígitos del teléfono" required />
            <input className="input md:col-span-2" name="comment" placeholder="Comentario (opcional)" />
          </div>
          <button className="btn btn-primary">
            <IconPlus /> Agregar Pago
          </button>
          {paymentError && <p className="text-sm text-rose-700" role="alert">{paymentError}</p>}
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
