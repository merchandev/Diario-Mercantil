import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconSearch, IconTrash, IconDownload, IconClose, IconPlus, IconSave, IconQrCode } from '../components/icons'
import { listLegal, type LegalRequest, getLegal, updateLegal, verifyLegal, rejectLegal, addLegalPayment, deleteLegalPayment, type LegalPayment, downloadLegal, deleteLegal } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import QRCodeModal from '../components/QRCodeModal'
import { BANCOS_VENEZUELA } from '../constants/banks'
import { useDialog } from '../contexts/DialogContext'
import { formatCaracasDateTime } from '../components/LegalRequestDetails'

const estOpts = ['Todos', 'Pendiente', 'Por verificar', 'En trámite', 'Publicado', 'Rechazado']
const mapFilterStatus = (s: string) => s === 'Pendiente' ? 'Borrador' : (s === 'Publicado' ? 'Publicada' : s)

export default function Publicaciones() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showAlert, requestText } = useDialog()
  const [rows, setRows] = useState<LegalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Todos')
  const [editionCode, setEditionCode] = useState('')
  const [reqFrom, setReqFrom] = useState('')
  const [reqTo, setReqTo] = useState('')
  const [pubFrom, setPubFrom] = useState('')
  const [pubTo, setPubTo] = useState('')
  const [sel, setSel] = useState<LegalRequest | null>(null)
  const [payments, setPayments] = useState<LegalPayment[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ isOpen: false, title: '', message: '', variant: 'info', onConfirm: () => { } })
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({ isOpen: false, url: '', title: '' })

  const reload = () => {
    setLoading(true)
    setError(null)
    const filters = {
      q,
      status: status === 'Todos' ? '' : mapFilterStatus(status),
      edition_code: editionCode || undefined,
      req_from: reqFrom || undefined,
      req_to: reqTo || undefined,
      pub_from: pubFrom || undefined,
      pub_to: pubTo || undefined
    }
    listLegal(filters)
      .then(r => {
        setRows(r.items)
        setError(null)
      })
      .catch(err => {
        setError(err.message || 'Error al cargar publicaciones')
        setRows([])
      })
      .finally(() => setLoading(false))
  }
  // Auto-recargar cuando cambien filtros (ligero debounce)
  useEffect(() => {
    const t = setTimeout(() => { reload() }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, editionCode, reqFrom, reqTo, pubFrom, pubTo])
  // Initialize from URL params (?q=...&auto=1)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const qParam = sp.get('q') || ''
    const auto = sp.get('auto') === '1'
    if (qParam) setQ(qParam)
    if (qParam && auto) {
      listLegal({ q: qParam, status: '', req_from: undefined, req_to: undefined, pub_from: undefined, pub_to: undefined })
        .then(r => setRows(r.items)).catch(() => { })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const open = async (id: number) => {
    const d = await getLegal(id); setSel(d.item); setPayments(d.payments)
  }
  const prettyDate = (s?: string) => {
    if (!s) return '-'
    const d = s.slice(0, 10)
    return d.split('-').reverse().join('/')
  }
  const razonSocial = (r: LegalRequest) => {
    const meta = typeof r.meta === 'string'
      ? (() => { try { return JSON.parse(r.meta) } catch { return {} } })()
      : (r.meta || {})
    return meta.razon_denominacion_social || meta.razon_social || meta.razon_social_convocatoria || r.name || '-'
  }
  const prettyStatus = (s?: string) => {
    if (!s) return '-'
    if (s === 'Borrador' || s === 'Pendiente') return 'Pendiente'
    if (s === 'Publicada' || s === 'Publicado') return 'Publicado'
    return s
  }
  const totalPaid = useMemo(() => payments.reduce((s, p) => s + Number(p.amount_bs || 0), 0), [payments])
  const onAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!sel || sel.status !== 'En trámite') return
    const form = e.currentTarget
    const fd = new FormData(form)
    const ref = String(fd.get('ref') || '').replace(/\D/g, '').slice(0, 4)
    const prefix = String(fd.get('mobile_prefix') || '0412')
    const phone = String(fd.get('mobile_phone') || '').replace(/\D/g, '').slice(0, 7)
    const amount = Number(fd.get('amount_bs') || 0)
    if (!/^\d{4}$/.test(ref) || !/^04(12|14|16|22|24|26)$/.test(prefix) || !/^\d{7}$/.test(phone) || amount <= 0) {
      void showAlert('Revise referencia, operadora, teléfono y monto del Pago Móvil.', { title: 'Datos inválidos' })
      return
    }
    await addLegalPayment(sel.id, {
      ref,
      date: String(fd.get('date') || new Date().toISOString().slice(0, 10)),
      bank: String(fd.get('bank') || ''),
      type: 'pago_movil',
      amount_bs: amount,
      status: 'Pendiente',
      mobile_phone: prefix + phone,
      comment: String(fd.get('comment') || '')
    })
    const d = await getLegal(sel.id)
    setSel(d.item)
    setPayments(d.payments)
    form.reset()
  }
  const download = async (id: number) => {
    const blob = await downloadLegal(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `orden-servicio-${id}.pdf`; a.click(); URL.revokeObjectURL(url)
  }
  const handleDelete = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar publicación definitivamente',
      message: 'Esta acción borrará permanentemente la publicación, sus pagos y archivos. Si pertenece a una edición, esa edición también se eliminará para impedir que el documento siga disponible. ¿Deseas continuar?',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await deleteLegal(id)
          reload()
        } catch (e: any) {
          void showAlert('Error: ' + (e.message || 'No se pudo eliminar'), { title: 'Error' })
        }
      }
    })
  }
  return (
    <section className="space-y-4">
      <ConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
      <QRCodeModal {...qrModal} onClose={() => setQrModal({ isOpen: false, url: '', title: '' })} />
      <h1 className="text-xl font-semibold">Publicaciones</h1>
      {error && (
        <div className="card p-4 bg-rose-50 border-rose-200 text-rose-800">
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 grid place-items-center text-slate-400 w-5"><IconSearch /></span>
          <input className="input !pl-10 w-full" placeholder="Buscador..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="input w-full" value={status} onChange={e => setStatus(e.target.value)}>
          {estOpts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="flex flex-col gap-1">
          <input className="input w-full" placeholder="Cód. Edición (ej: 0001)" value={editionCode} onChange={e => setEditionCode(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Solicitud desde</span>
          <input className="input w-full" type="date" value={reqFrom} onChange={e => setReqFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Solicitud hasta</span>
          <input className="input w-full" type="date" value={reqTo} onChange={e => setReqTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Publicación desde</span>
          <input className="input w-full" type="date" value={pubFrom} onChange={e => setPubFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500 font-medium">Publicación hasta</span>
          <input className="input w-full" type="date" value={pubTo} onChange={e => setPubTo(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex gap-2 mt-2">
          <button className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2" onClick={reload} disabled={loading}>
            {loading ? <span className="animate-spin">⏳</span> : <IconSearch />}
            <span>{loading ? 'Cargando...' : 'Filtrar'}</span>
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto pb-2 pt-1">
        {loading && (
          <div className="p-8 text-center text-slate-500">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-2"></div>
            <p>Cargando publicaciones...</p>
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <p>No se encontraron publicaciones con los filtros aplicados.</p>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead>
              <tr className="bg-brand-800 text-white">
                <th className="text-left px-4 py-2">N° de orden</th>
                <th className="text-left px-4 py-2">Fecha de solicitud</th>
                <th className="text-left px-4 py-2">Tipo de publicación</th>
                <th className="text-left px-4 py-2">Razón social</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Edición</th>
                <th className="text-left px-4 py-2">Fecha de Verificación</th>
                <th className="text-left px-4 py-2">Fecha de publicación</th>
                <th className="text-right px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{r.order_no || r.id}</td>
                  <td className="px-4 py-2">{formatCaracasDateTime((r as any).created_at || r.date)}</td>
                  <td className="px-4 py-2">{r.pub_type || 'Documento'}</td>
                  <td className="px-4 py-2">{razonSocial(r)}</td>
                  <td className="px-4 py-2">{prettyStatus(r.status)}</td>
                  <td className="px-4 py-2 font-mono text-slate-600">{(r as any).edition_code || '-'}</td>
                  <td className="px-4 py-2">{prettyDate(r.verification_date)}</td>
                  <td className="px-4 py-2">{prettyDate(r.publish_date)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {/* QR Button removed - QR is now edition-based */}
                      <button className="text-brand-700 hover:underline inline-flex items-center gap-1" onClick={() => navigate(`/dashboard/publicaciones/${r.id}`)}><IconSave /> <span>Detalles</span></button>
                      {['Por verificar', 'En trámite'].includes(r.status) && (
                        <button className="text-amber-700 hover:underline inline-flex items-center gap-1" onClick={async () => { const reason = await requestText('Indique el motivo del rechazo.', { title: 'Motivo del rechazo', confirmText: 'Confirmar rechazo', danger: true }); if (reason === null) return; await rejectLegal(r.id, reason); reload() }}><IconClose /> <span>Rechazar</span></button>
                      )}
                      <button className="text-emerald-700 hover:underline inline-flex items-center gap-1" onClick={() => download(r.id)}><IconDownload /> <span>Descargar</span></button>
                      <button className="text-red-700 hover:underline inline-flex items-center gap-1" onClick={() => handleDelete(r.id)}><IconTrash /> <span>Eliminar</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {sel && (
        <div className="card p-4 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold">Orden de servicio #{sel.order_no || sel.id}</h2>
            <div className="flex gap-2">
              <button className="btn" onClick={() => setSel(null)}>Cerrar</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="overflow-hidden">
              <h3 className="font-semibold mb-2">Historial de Pagos</h3>
              <div className="overflow-x-auto pb-2">
                <table className="min-w-[800px] w-full text-left text-sm border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-2 py-1">Ref.</th>
                      <th className="text-left px-2 py-1">Fecha</th>
                      <th className="text-left px-2 py-1">Banco</th>
                      <th className="text-left px-2 py-1">Teléfono</th>
                      <th className="text-left px-2 py-1">Tipo</th>
                      <th className="text-left px-2 py-1">Monto (Bs.)</th>
                      <th className="text-left px-2 py-1">Estado</th>
                      <th className="text-right px-2 py-1">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t">
                        <td className="px-2 py-1">{p.ref}</td>
                        <td className="px-2 py-1">{p.date}</td>
                        <td className="px-2 py-1">{p.bank}</td>
                        <td className="px-2 py-1">{(p as any).mobile_phone || '-'}</td>
                        <td className="px-2 py-1">{p.type}</td>
                        <td className="px-2 py-1">{Number(p.amount_bs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1">{p.status}</td>
                        <td className="px-2 py-1 text-right"><button className="text-rose-700 hover:underline inline-flex items-center gap-1" onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Eliminar pago',
                            message: '¿Eliminar este pago?',
                            variant: 'danger',
                            onConfirm: async () => {
                              await deleteLegalPayment(sel.id, p.id)
                              const d = await getLegal(sel.id)
                              setSel(d.item)
                              setPayments(d.payments)
                            }
                          })
                        }}><IconTrash /> <span>Eliminar</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td className="px-2 py-1 font-semibold" colSpan={4}>Total pagado</td>
                      <td className="px-2 py-1 font-semibold">{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {sel.status === 'En trámite' && (
                <form onSubmit={onAddPayment} className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <input className="input w-full" name="ref" inputMode="numeric" maxLength={4} pattern="\d{4}" placeholder="Últimos 4 dígitos" required />
                  <input className="input w-full" type="date" name="date" max={new Date().toISOString().slice(0, 10)} defaultValue={new Date().toISOString().slice(0, 10)} required />
                  <select className="input w-full" name="bank" required defaultValue="">
                    <option value="" disabled>Banco emisor</option>
                    {BANCOS_VENEZUELA.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                  </select>
                  <input className="input w-full" name="amount_bs" type="number" min="0.01" step="0.01" placeholder="Monto parcial Bs." required />
                  <select className="input w-full" name="mobile_prefix" defaultValue="0412" required>
                    {['0412','0414','0416','0422','0424','0426'].map(prefix => <option key={prefix} value={prefix}>{prefix}</option>)}
                  </select>
                  <input className="input w-full" name="mobile_phone" inputMode="numeric" maxLength={7} pattern="\d{7}" placeholder="7 dígitos del teléfono" required />
                  <input className="input w-full sm:col-span-2 md:col-span-3" name="comment" placeholder="Comentario (opcional)" />
                  <button className="btn btn-primary w-full sm:col-span-2 md:col-span-3 inline-flex items-center justify-center gap-2"><IconPlus /> <span>Agregar Pago Móvil</span></button>
                </form>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Detalles de la Orden de Servicio</h3>
              <div className="border rounded p-3 text-sm space-y-1 bg-gray-50">
                <div><span className="font-semibold">A nombre de:</span> {sel.name}</div>
                <div><span className="font-semibold">Teléfono:</span> {sel.phone || '-'}</div>
                <div><span className="font-semibold">Dirección:</span> {sel.address || '-'}</div>
                <div><span className="font-semibold">CI/RIF:</span> {sel.document}</div>
                <div><span className="font-semibold">Fecha de Solicitud:</span> {formatCaracasDateTime((sel as any).created_at || sel.date)}</div>
                <div className="mt-3"><span className="font-semibold">Descripción:</span> Servicio de publicación electrónica en el Diario Mercantil de Venezuela</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block"><span className="text-sm">Folios</span><input className="input w-full" type="number" min={1} value={sel.folios || 1} onChange={e => setSel({ ...sel, folios: +e.target.value })} /></label>
                <label className="block"><span className="text-sm">Estado</span>
                  <div className="input w-full bg-slate-50 text-slate-700 cursor-default">{prettyStatus(sel.status)}</div>
                  <p className="text-xs text-slate-500 mt-1">El estado cambia únicamente mediante las acciones del flujo de verificación y publicación.</p>
                </label>
                <label className="block"><span className="text-sm">Fecha de Verificación</span><input className="input w-full bg-slate-50" type="date" value={sel.verification_date || ''} readOnly /></label>
                <label className="block col-span-2"><span className="text-sm">Fecha de publicación</span><input className="input w-full bg-slate-50" type="date" value={sel.publish_date || ''} readOnly /></label>
              </div>

              {/* Acciones rápidas */}
              {['Por verificar', 'En trámite'].includes(sel.status) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-amber-900">⚠️ Solicitud pendiente de verificación</p>
                  <div className="flex gap-2">
                    {sel.status === 'Por verificar' && <button
                      className="btn bg-green-600 text-white hover:bg-green-700 flex-1"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Verificar solicitud',
                          message: '¿Marcar esta solicitud como En trámite?\n\nSe registrará la fecha de hoy como fecha de verificación. La publicación quedará pendiente de ser incorporada a una edición del diario.',
                          variant: 'info',
                          onConfirm: async () => {
                            await verifyLegal(sel.id)
                            reload()
                            setSel(null)
                          }
                        })
                      }}
                    >
                      ✓ Verificar (Aprobado)
                    </button>}
                    <button
                      className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
                      onClick={async () => {
                        const reason = await requestText('Indique el motivo del rechazo.', { title: 'Motivo del rechazo', confirmText: 'Confirmar rechazo', danger: true })
                        if (reason === null) return
                        await rejectLegal(sel.id, reason)
                        await showAlert('Solicitud rechazada', { title: 'Solicitud actualizada' })
                        reload()
                        setSel(null)
                      }}
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button className="btn btn-primary inline-flex items-center gap-2" onClick={async () => { await updateLegal(sel.id, { folios: sel.folios }); const d = await getLegal(sel.id); setSel(d.item); await showAlert('Cambios guardados', { title: 'Guardado' }) }}><IconSave /> <span>Guardar cambios</span></button>
                <button className="btn inline-flex items-center gap-2" onClick={() => download(sel.id)}><IconDownload /> <span>Descargar detalle</span></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
