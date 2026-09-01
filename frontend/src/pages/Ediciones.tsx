import React, { useEffect, useRef, useState } from 'react'
import { createEdition, deleteEdition, listEditions, listRetiredEditions, restoreEdition, type Edition, type EditionOrder, getEdition, updateEdition, listLegal, type LegalRequest, setEditionOrders, publishEdition, uploadEditionPdf, prepareEditionOrderPdf, uploadEditionOrderPdf, notifyEdition } from '../lib/api'
import { IconPlus, IconEdit, IconTrash, IconSave, IconClose, IconDownload, IconCheck, IconUpload } from '../components/icons'
import QRCode from 'qrcode.react'
import ConfirmDialog from '../components/ConfirmDialog'
import AlertDialog from '../components/AlertDialog'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import FlipbookViewer from '../components/FlipbookViewer'
import { useDialog } from '../contexts/DialogContext'

export default function Ediciones() {
  const { confirmAction } = useDialog()
  const [rows, setRows] = useState<Edition[]>([])
  const [retiredRows, setRetiredRows] = useState<Edition[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<{ date: string; selectedOrders: number[] }>({ date: new Date().toISOString().slice(0, 10), selectedOrders: [] })
  const [selId, setSelId] = useState<number | undefined>(undefined)
  const [detail, setDetail] = useState<{ edition: Edition; orders: EditionOrder[] } | null>(null)
  const [qrGenerated, setQrGenerated] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [allOrders, setAllOrders] = useState<LegalRequest[]>([])
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [orderPdfBusy, setOrderPdfBusy] = useState<Record<number, string>>({})
  const qrWrapRef = useRef<HTMLDivElement | null>(null)
  const newQrWrapRef = useRef<HTMLDivElement | null>(null)
  const pdfSectionRef = useRef<HTMLDivElement | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, title: '', message: '', variant: 'info' })
  const [expanded, setExpanded] = useState({ pdf: true, pubs: true, qr: true })
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false)
  const [isPubsCollapsed, setIsPubsCollapsed] = useState(false)
  const [publishingState, setPublishingState] = useState<{ active: boolean; progress: number; message: string }>({ active: false, progress: 0, message: '' })

  const load = async () => {
    try {
      const [edRes, retiredRes, legRes] = await Promise.all([listEditions(), listRetiredEditions(), listLegal()]);
      setRows(edRes.items);
      setRetiredRows(retiredRes.items);
      setAllOrders(legRes.items);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { load() }, [])
  const openDetail = async (id: number) => {
    setSelId(id)
    const [det, leg] = await Promise.all([getEdition(id), listLegal()])
    setDetail(det); setAllOrders(leg.items)
  }

  const onCreateAndPublish = async (e: any) => {
    e.preventDefault()
    setPublishingState({ active: true, progress: 0, message: 'Creando registro...' })
    try {
      let newId: number
      try {
        const payload = { status: 'Borrador', date: form.date, orders: form.selectedOrders }
        const res = await createEdition(payload) as any
        if (!res?.id) throw new Error('El servidor no confirmó la creación del borrador.')
        newId = Number(res.id)
      } catch (error) {
        await load()
        setAlertDialog({
          isOpen: true,
          title: 'No se pudo crear la edición',
          message: error instanceof Error ? error.message : String(error),
          variant: 'error',
        })
        return
      }

      try {
        setPublishingState({ active: true, progress: 10, message: 'Preparando PDFs individuales...' })
        await publishEdition(newId, (prog, msg) => {
          setPublishingState(prev => ({ ...prev, progress: Math.max(10, prog), message: msg }))
        })
      } catch (error) {
        await load()
        await openDetail(newId)
        setAlertDialog({
          isOpen: true,
          title: 'Edición conservada como borrador',
          message: `La edición fue creada, pero no se pudo publicar: ${error instanceof Error ? error.message : String(error)}. Puede corregirla o cargar el PDF faltante desde el detalle.`,
          variant: 'warning',
        })
        return
      }
      setForm({ date: new Date().toISOString().slice(0, 10), selectedOrders: [] })
      setQrGenerated(false)
      setGeneratedCode('')
      await load()
      setAlertDialog({ isOpen: true, title: 'Edición publicada', message: `Edición publicada exitosamente.`, variant: 'success' })
    } finally {
      setPublishingState({ active: false, progress: 0, message: '' })
    }
  }

  const handlePublish = async () => {
    if (!selId) return
    setPublishingState({ active: true, progress: 0, message: 'Iniciando...' })
    try {
      await publishEdition(selId, (prog, msg) => {
        setPublishingState(prev => ({ ...prev, progress: prog, message: msg }))
      })
      const det = await getEdition(selId)
      setDetail(det)
      await load()
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Edición publicada y PDF generado', variant: 'success' })
    } catch (error) {
      setAlertDialog({ isOpen: true, title: 'Error', message: error instanceof Error ? error.message : 'Error al publicar', variant: 'error' })
    } finally {
      setPublishingState({ active: false, progress: 0, message: '' })
    }
  }

  const handlePdfFile = async (file: File) => {
    if (!selId) return
    setUploadingPdf(true)
    try {
      const result = await uploadEditionPdf(selId, file)
      setDetail(prev => prev ? { ...prev, edition: { ...prev.edition, file_id: result.file_id, file_name: result.file_name, file_url: result.edition?.file_url || `/api/e/code/${encodeURIComponent(prev.edition.code)}/download` } } : prev)
      await load()
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'PDF actualizado', variant: 'success' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo subir el PDF'
      setAlertDialog({ isOpen: true, title: 'Error', message: msg, variant: 'error' })
    } finally {
      setUploadingPdf(false)
    }
  }

  const refreshDetail = async () => {
    if (!selId) return
    setDetail(await getEdition(selId))
    await load()
  }

  const handlePrepareOrderPdf = async (orderId: number) => {
    if (!selId) return
    setOrderPdfBusy(prev => ({ ...prev, [orderId]: 'Generando...' }))
    try {
      await prepareEditionOrderPdf(selId, orderId)
      await refreshDetail()
      setAlertDialog({ isOpen: true, title: 'PDF listo', message: `El PDF individual de la solicitud ${orderId} fue preparado.`, variant: 'success' })
    } catch (error) {
      setAlertDialog({ isOpen: true, title: 'Error', message: error instanceof Error ? error.message : 'No se pudo preparar el PDF individual', variant: 'error' })
    } finally {
      setOrderPdfBusy(prev => { const next = { ...prev }; delete next[orderId]; return next })
    }
  }

  const handleOrderPdfFile = async (orderId: number, file: File) => {
    if (!selId) return
    setOrderPdfBusy(prev => ({ ...prev, [orderId]: 'Cargando...' }))
    try {
      await uploadEditionOrderPdf(selId, orderId, file)
      await refreshDetail()
      setAlertDialog({ isOpen: true, title: 'PDF actualizado', message: `El PDF individual de la solicitud ${orderId} fue guardado.`, variant: 'success' })
    } catch (error) {
      setAlertDialog({ isOpen: true, title: 'Error', message: error instanceof Error ? error.message : 'No se pudo cargar el PDF individual', variant: 'error' })
    } finally {
      setOrderPdfBusy(prev => { const next = { ...prev }; delete next[orderId]; return next })
    }
  }

  const pdfUrl = detail?.edition.code ? `/api/e/code/${encodeURIComponent(detail.edition.code)}/download` : (selId ? `/api/e/id/${selId}/download` : '')
  const viewerUrl = detail?.edition.code ? `/visor-espresivo/${encodeURIComponent(detail.edition.code)}` : ''
  useEffect(() => {
    if (detail && pdfSectionRef.current) {
      const el = pdfSectionRef.current
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.focus({ preventScroll: true })
      })
    }
  }, [detail?.edition.id])

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-brand-800">Ediciones</h1>
        <p className="text-sm text-slate-600">Gestión y publicación de ediciones digitales.</p>
      </div>

      <div className="card shadow-sm border border-slate-200 mb-8">
        <div className="bg-brand-50/50 p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-brand-800 flex items-center gap-2">
            <IconPlus className="w-5 h-5 text-brand-600" />
            Crear Nueva Edición
          </h2>
          <p className="text-sm text-slate-600 mt-1">Configura la fecha, número de edición, sube el PDF y selecciona las publicaciones a incluir.</p>
        </div>

        <div className="p-5 space-y-6 bg-white">
          <div className="grid md:grid-cols-3 gap-6">
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5 text-slate-700">Fecha de la Edición</span>
              <input className="input w-full bg-slate-50" type="date" value={form.date} onChange={e => {
                // One edition per date: publication requires a date after the latest active edition.
                const lastPublished = rows.filter(r => r.status === 'Publicada').map(r => r.date).sort().reverse()[0]
                if (lastPublished && e.target.value <= lastPublished) {
                  setAlertDialog({ isOpen: true, title: 'Fecha inválida', message: `La fecha debe ser posterior a la última edición publicada (${lastPublished}).`, variant: 'warning' })
                  return
                }
                setForm({ ...form, date: e.target.value })
              }} required />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5 text-slate-700">Número de edición</span>
              <input type="text" disabled className="input w-full bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200" value="Automático" title="El backend asignará y confirmará el correlativo definitivo al crear la edición" />
            </label>

            {!qrGenerated ? (
              <div className="flex items-end">
                <button type="button" className="btn btn-primary w-full h-[42px] shadow-sm select-none" onClick={() => {
                  // The backend is the single authority for the annual atomic correlativo and CVE.
                  // This button only opens the draft configuration; it does not fabricate a provisional CVE.
                  setGeneratedCode('');
                  setQrGenerated(true);
                }}>
                  Nueva Edición
                </button>
              </div>
            ) : (
              <div className="flex items-end text-sm text-slate-500 pb-2">
                * El documento PDF será generado automáticamente al publicar.
              </div>
            )}
          </div>

          {qrGenerated && (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg mb-6 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-brand-800 font-semibold">Preparar nueva edición</h3>
              <p className="text-sm text-brand-700 mt-1">Selecciona las publicaciones que compondrán el borrador. El CVE definitivo y su código QR se generan exclusivamente en el backend al crear la edición, usando el correlativo anual atómico.</p>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-700 underline mt-3" onClick={() => { setQrGenerated(false); setGeneratedCode(''); }}>
                Cancelar
              </button>
            </div>
          )}

          {qrGenerated && (
            <>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-200">
                  <span className="block text-sm font-semibold text-slate-700">1. Seleccionar Publicaciones</span>
                  <span className="text-xs font-medium px-2.5 py-1 bg-brand-100 text-brand-700 rounded-full">{form.selectedOrders.length} seleccionadas</span>
                </div>
                <div className="p-3 bg-white">
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {allOrders.filter(o => o.status === 'En trámite').map(o => {
                      const isSelected = form.selectedOrders.includes(o.id)
                      const meta = typeof o.meta === 'string' ? (() => { try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                      return (
                        <label key={o.id} className={`flex items-start gap-3 p-3 rounded-lg border-2 ${isSelected ? 'bg-brand-50 border-brand-500 shadow-sm' : 'bg-white border-slate-100'} hover:border-brand-300 transition-all cursor-pointer`}>
                          <input type="checkbox" className="mt-1 w-4 h-4 text-brand-600 rounded focus:ring-brand-500" checked={isSelected} onChange={(e) => {
                            setForm(prev => ({
                              ...prev,
                              selectedOrders: e.target.checked
                                ? [...prev.selectedOrders, o.id]
                                : prev.selectedOrders.filter(id => id !== o.id)
                            }))
                          }} />
                          <div className="flex-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-brand-800">Orden #{String(o.id).padStart(8, '0')}</span>
                              <span className="text-xs text-slate-400">{o.date}</span>
                            </div>
                           <div className="text-slate-700 font-medium mt-0.5">
                              {(() => {
                                const m = typeof o.meta === 'string' ? (() => { try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                                return m.razon_denominacion_social || m.razon_social || o.name || 'Sin nombre asociado'
                              })()}
                            </div>
                            <div className="text-slate-500 text-xs mt-1.5 flex flex-wrap gap-2">
                              {meta?.tipo_sociedad && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_sociedad}</span>}
                              {meta?.tipo_acto && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_acto}</span>}
                              {meta?.tipo_convocatoria && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_convocatoria}</span>}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                    {allOrders.filter(o => o.status === 'En trámite').length === 0 && (
                      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <div className="text-3xl mb-2 opacity-50">📄</div>
                        <p className="text-sm font-medium">No hay publicaciones disponibles</p>
                        <p className="text-xs mt-1">Todas las órdenes aprobadas ya han sido publicadas o no hay solicitudes nuevas.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={onCreateAndPublish} className="btn btn-primary px-6 py-2.5 text-sm font-semibold shadow-md inline-flex items-center gap-2" disabled={publishingState.active || form.selectedOrders.length === 0}>
                  {publishingState.active ? 'Procesando...' : (<><IconCheck className="w-5 h-5" /> <span>Publicar edición</span></>)}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-800">Ediciones</h2>
          </div>
        <div className="overflow-x-auto pb-2">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead>
              <tr className="bg-brand-800 text-white">
                <th className="text-left px-4 py-2">Codigo</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="text-left px-4 py-2">Generado por</th>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-left px-4 py-2">Nro edicion</th>
                <th className="text-left px-4 py-2">Publicaciones</th>
                <th className="text-right px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-brand-700 font-semibold">{r.code}</td>
                    <td className="px-4 py-2">
                      <span className={`pill ${r.status === 'Publicada' ? 'bg-green-100 text-green-700' : r.status === 'Borrador' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.published_by_name ? <span className="font-medium" title={r.published_at || ''}>{r.published_by_name}</span> : <span className="italic text-slate-400">Pendiente</span>}
                    </td>
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2">{r.edition_no}</td>
                    <td className="px-4 py-2">
                      <span className="font-semibold">{r.orders_count}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button className="text-brand-700 hover:underline inline-flex items-center gap-1" onClick={() => {
                          if (selId === r.id) {
                            setIsDetailsCollapsed(!isDetailsCollapsed)
                          } else {
                            setIsDetailsCollapsed(false)
                            openDetail(r.id)
                          }
                        }}>
                          {selId === r.id && !isDetailsCollapsed ? <><IconClose className="w-4 h-4" /> <span>Minimizar</span></> : <><IconEdit className="w-4 h-4" /> <span>Ver detalles</span></>}
                        </button>
                        <button className="text-rose-700 hover:underline inline-flex items-center gap-1" onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar edición definitivamente', message: 'Se borrarán la edición, su PDF consolidado y los PDF individuales generados. Las publicaciones incluidas volverán a En trámite. Esta acción no se puede deshacer. ¿Deseas continuar?', onConfirm: async () => { try { await deleteEdition(r.id); if (selId === r.id) { setSelId(undefined); setDetail(null) }; await load() } catch (error) { setAlertDialog({ isOpen: true, title: 'No se pudo eliminar', message: error instanceof Error ? error.message : 'Error al eliminar la edición.', variant: 'error' }) } } })}>
                          <IconTrash className="w-4 h-4" /> <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {selId === r.id && detail && !isDetailsCollapsed && (
                    <tr className="bg-brand-50/20 border-b border-brand-100">
                      <td colSpan={6} className="p-0">
                        <div className="p-6 grid lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">
                          <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                              <h2 className="text-xl font-bold text-brand-800">Detalles de la edición #{detail.edition.edition_no}</h2>
                              <div className="flex items-center gap-2">
                                <button className="btn btn-ghost text-slate-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium" onClick={() => { setSelId(undefined); setDetail(null); setIsDetailsCollapsed(false); }}>
                                  <IconClose className="w-4 h-4" /> <span>Cerrar</span>
                                </button>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Código de Verificación Electrónica (CVE)</span>
                                <input className="input w-full font-mono bg-slate-50 text-slate-600" value={detail.edition.code} disabled title="El CVE es generado automáticamente y no puede modificarse" />
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Fecha de la Edición</span>
                                <input className="input w-full" type="date" value={detail.edition.date} disabled={detail.edition.status === 'Publicada'} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, date: e.target.value } })} />
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Estado</span>
                                <select className="input w-full" value={detail.edition.status} disabled>
                                  <option value={detail.edition.status}>{detail.edition.status}</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Numero de edicion</span>
                                <input className="input w-full" type="number" min={1} value={detail.edition.edition_no} disabled={detail.edition.status === 'Publicada'} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, edition_no: +e.target.value } })} />
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-2 border-t pt-4">
                              {detail.edition.status !== 'Publicada' && (
                                <button className="btn btn-primary inline-flex items-center gap-2" onClick={async () => { await updateEdition(selId, { code: detail.edition.code, date: detail.edition.date, status: detail.edition.status, edition_no: detail.edition.edition_no }); load(); setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Cambios guardados', variant: 'success' }) }}>
                                  <IconSave className="w-4 h-4" /> <span>Guardar cambios</span>
                                </button>
                              )}
                              
                              {detail.edition.status === 'Publicada' && (
                                <button className="btn btn-outline border-brand-200 text-brand-700 hover:bg-brand-50 inline-flex items-center gap-2" onClick={async () => {
                                  try {
                                    setPublishingState({ active: true, progress: 100, message: 'Enviando notificaciones...' })
                                    const res = await notifyEdition(selId)
                                    setAlertDialog({ isOpen: true, title: 'Notificación enviada', message: `Se enviaron ${res.sent} correos a los solicitantes.`, variant: 'success' })
                                  } catch (error) {
                                    setAlertDialog({ isOpen: true, title: 'Error', message: error instanceof Error ? error.message : 'Error al enviar notificaciones', variant: 'error' })
                                  } finally {
                                    setPublishingState({ active: false, progress: 0, message: '' })
                                  }
                                }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>Notificar Solicitantes</span>
                                </button>
                              )}

                              <button className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2" onClick={() => {
                                window.open(`/api/editions/${selId}/export`, '_blank')
                              }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Exportar Excel (.csv)</span>
                              </button>
                            </div>

                            <div
                              ref={pdfSectionRef}
                              tabIndex={-1}
                              className="border rounded-lg p-5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 scroll-mt-24 transition-all duration-300"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none" onClick={() => setIsPdfCollapsed(!isPdfCollapsed)}>
                                  PDF de la edición
                                  <span className="text-slate-400 text-xs font-normal">
                                    {isPdfCollapsed ? '▼ Expandir' : '▲ Minimizar'}
                                  </span>
                                </h3>
                                {detail.edition.status === 'Borrador' && (
                                  <div className="flex flex-wrap gap-2">
                                    <label className={`btn btn-outline inline-flex items-center gap-2 cursor-pointer ${uploadingPdf ? 'opacity-60 pointer-events-none' : ''}`}>
                                      <IconUpload className="w-4 h-4" />
                                      <span>{uploadingPdf ? 'Cargando...' : 'Cargar consolidado'}</span>
                                      <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="sr-only"
                                        disabled={uploadingPdf}
                                        onChange={event => {
                                          const file = event.target.files?.[0]
                                          if (file) void handlePdfFile(file)
                                          event.currentTarget.value = ''
                                        }}
                                      />
                                    </label>
                                    <button className="btn btn-primary inline-flex items-center gap-2" onClick={handlePublish} disabled={publishingState.active || detail.orders.length === 0}>
                                      <IconCheck className="w-4 h-4" /> <span>Publicar edición</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              {!isPdfCollapsed && !detail.edition.file_id && (
                                <p className="text-sm text-slate-600">El consolidado se generará al publicar, después de preparar cada PDF individual. También puedes cargar uno manualmente.</p>
                              )}
                              {!isPdfCollapsed && detail.edition.file_id && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3 text-slate-700">
                                      <div className="bg-brand-100 p-2 rounded-lg text-brand-600">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <span className="block font-semibold text-brand-800">Documento Consolidado</span>
                                        <span className="block text-xs text-slate-500">{detail.edition.file_name || 'edicion.pdf'}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-outline border-brand-200 text-brand-700 hover:bg-brand-50 inline-flex items-center gap-2"
                                      >
                                        <span>Ver Documento</span>
                                      </a>
                                      <a
                                        href={`${pdfUrl}?download=1`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-primary inline-flex items-center gap-2"
                                      >
                                        <IconDownload className="w-4 h-4" /> <span>Descargar</span>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="border rounded-lg p-5 bg-white shadow-sm transition-all duration-300">
                              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none" onClick={() => setIsPubsCollapsed(!isPubsCollapsed)}>
                                  Publicaciones seleccionadas
                                  <span className="text-slate-400 text-xs font-normal">
                                    {isPubsCollapsed ? '▼ Expandir' : '▲ Minimizar'}
                                  </span>
                                </h3>
                                <span className="text-xs font-medium px-2.5 py-1 bg-brand-100 text-brand-700 rounded-full">{detail.orders.length} total</span>
                              </div>

                              {!isPubsCollapsed && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <ul className="divide-y divide-slate-100 border rounded-lg bg-slate-50">
                                    {detail.orders.map(o => (
                                      <li key={o.id} className="p-3 text-sm flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white transition-colors">
                                        <div className="min-w-0">
                                          <div className="font-semibold text-brand-800">Orden #{String(o.id).padStart(8, '0')}</div>
                                          <div className="text-slate-600 mt-0.5">{(o as any).company_name || o.name}</div>
                                          <div className="mt-1 flex items-center gap-2 text-xs">
                                            {o.publication_file_id ? (
                                              <span className="text-emerald-700 font-medium">PDF individual listo · {o.publication_source === 'uploaded' ? 'carga manual' : 'generado'}</span>
                                            ) : (
                                              <span className="text-amber-700 font-medium">PDF individual pendiente</span>
                                            )}
                                            {o.publication_file_name && <span className="text-slate-500 truncate max-w-xs">{o.publication_file_name}</span>}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                          {o.publication_file_url && (
                                            <>
                                              <a className="btn btn-outline text-xs px-3 py-1.5" href={o.publication_file_url} target="_blank" rel="noreferrer">Ver</a>
                                              <a className="btn btn-outline text-xs px-3 py-1.5" href={`${o.publication_file_url}?download=1`} target="_blank" rel="noreferrer"><IconDownload className="w-3.5 h-3.5" /> Descargar</a>
                                            </>
                                          )}
                                          {detail.edition.status === 'Borrador' && (
                                            <>
                                              <button className="btn btn-outline text-xs px-3 py-1.5" disabled={Boolean(orderPdfBusy[o.id])} onClick={() => void handlePrepareOrderPdf(o.id)}>
                                                {orderPdfBusy[o.id] || (o.publication_file_id ? 'Regenerar' : 'Generar')}
                                              </button>
                                              <label className={`btn btn-outline text-xs px-3 py-1.5 cursor-pointer ${orderPdfBusy[o.id] ? 'opacity-60 pointer-events-none' : ''}`}>
                                                <IconUpload className="w-3.5 h-3.5" /> {o.publication_file_id ? 'Reemplazar' : 'Cargar PDF'}
                                                <input
                                                  type="file"
                                                  accept="application/pdf,.pdf"
                                                  className="sr-only"
                                                  disabled={Boolean(orderPdfBusy[o.id])}
                                                  onChange={event => {
                                                    const file = event.target.files?.[0]
                                                    if (file) void handleOrderPdfFile(o.id, file)
                                                    event.currentTarget.value = ''
                                                  }}
                                                />
                                              </label>
                                              <button className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-md transition-colors" title="Quitar publicación de esta edición" onClick={async () => {
                                                if (await confirmAction(`¿Quitar orden #${o.id} de esta edición?`, { title: 'Quitar publicación', danger: true })) {
                                                  const newOrders = detail.orders.filter(ord => ord.id !== o.id).map(ord => ord.id)
                                                  await setEditionOrders(selId!, newOrders)
                                                  await refreshDetail()
                                                }
                                              }}>
                                                <IconTrash className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                    {detail.orders.length === 0 && (
                                      <li className="p-6 text-center text-slate-500 text-sm">No hay publicaciones seleccionadas.</li>
                                    )}
                                  </ul>

                                  {detail.edition.status === 'Borrador' && (
                                  <div className="mt-4 border-t pt-4">
                                    <h4 className="text-sm font-semibold mb-2 text-slate-700">Añadir más publicaciones</h4>
                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                      {allOrders.filter(o => o.status === 'En trámite' && !detail.orders.some(d => d.id === o.id)).map(o => {
                                        const meta = typeof o.meta === 'string' ? (() => { try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                                        return (
                                          <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-brand-300 transition-all">
                                            <div className="flex-1 text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-brand-800">Orden #{String(o.id).padStart(8, '0')}</span>
                                                <span className="text-xs text-slate-400">{o.date}</span>
                                              </div>
                                              <div className="text-slate-700 font-medium mt-0.5">{(o as any).company_name || meta.razon_social || meta.razon_denominacion_social || o.name || 'Sin nombre'}</div>
                                            </div>
                                            <button className="btn btn-outline text-xs px-3 py-1.5 shrink-0 whitespace-nowrap" onClick={async () => {
                                              const newOrders = [...detail.orders.map(ord => ord.id), o.id];
                                              await setEditionOrders(selId!, newOrders);
                                              const data = await getEdition(selId); setDetail(data);
                                              load();
                                              setAlertDialog({ isOpen: true, title: 'Agregada', message: 'Publicación agregada a la edición.', variant: 'success' })
                                            }}>Añadir</button>
                                          </div>
                                        )
                                      })}
                                      {allOrders.filter(o => o.status === 'En trámite' && !detail.orders.some(d => d.id === o.id)).length === 0 && (
                                        <p className="text-xs text-slate-500 text-center py-4">No hay más publicaciones disponibles para añadir.</p>
                                      )}
                                    </div>
                                  </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-white">
                              <h3 className="font-semibold mb-2 text-brand-800 cursor-pointer flex items-center justify-between select-none" onClick={() => setExpanded({ ...expanded, qr: !expanded.qr })}>
                                Código QR <span className="text-slate-400 text-xs">{expanded.qr ? '▲ Minimizar' : '▼ Expandir'}</span>
                              </h3>
                              {expanded.qr && (() => {
                                const qrUrl = `${location.origin}/edicion/${detail.edition.code}`
                                return (
                                  <>
                                    <p className="text-xs text-slate-600 mb-3">Escanea para ver la edición publicada</p>
                                    <div ref={qrWrapRef} className="bg-white inline-block p-3 rounded-lg shadow-md border">
                                      <QRCode value={qrUrl} size={200} includeMargin={false} level="M" renderAs="canvas" />
                                    </div>
                                    <div className="text-xs text-center mt-2 text-slate-500 font-mono">{detail.edition.code}</div>
                                    <a href={qrUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-800 underline text-xs break-all block mt-2">{qrUrl}</a>
                                    <button className="btn btn-outline w-full mt-3 inline-flex items-center justify-center gap-2" onClick={() => {
                                      const canvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null
                                      if (!canvas) return
                                      const url = canvas.toDataURL('image/png')
                                      const a = document.createElement('a')
                                      a.href = url; a.download = `QR-edicion-${detail.edition.code}.png`; a.click()
                                    }}>
                                      <IconDownload className="w-4 h-4" /> <span>Descargar QR</span>
                                    </button>
                                  </>
                                )
                              })()}
                            </div>

                            <div className="border rounded-lg p-4 bg-white space-y-3">
                              <h3 className="font-semibold text-brand-800">Descargas</h3>
                              {detail.edition.file_id ? (
                                <>
                                  <a
                                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                                    href={`${pdfUrl}?download=1`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <IconDownload className="w-4 h-4" /> <span>Descargar PDF de edición</span>
                                  </a>
                                  <p className="text-xs text-slate-600">
                                    PDF generado automáticamente y listo para compartir.
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-slate-600">Carga un PDF para habilitar la descarga.</p>
                              )}
                            </div>

                            <div className="border rounded-lg p-4 bg-slate-50">
                              <h3 className="font-semibold mb-2 text-brand-800">Información</h3>
                              <dl className="text-sm space-y-2">
                                <div>
                                  <dt className="text-slate-600">Estado:</dt>
                                  <dd className="font-semibold">{detail.edition.status}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-600">Publicaciones:</dt>
                                  <dd className="font-semibold">{detail.edition.orders_count}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-600">Fecha:</dt>
                                  <dd className="font-semibold">{detail.edition.date}</dd>
                                </div>
                                {detail.edition.file_name && (
                                  <div>
                                    <dt className="text-slate-600">PDF:</dt>
                                    <dd className="font-semibold truncate" title={detail.edition.file_name}>{detail.edition.file_name}</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No hay ediciones registradas. Crea tu primera edicion usando el formulario superior.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {retiredRows.length > 0 && (
        <div className="card overflow-hidden border border-amber-200">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <h2 className="font-semibold text-amber-900">Ediciones retiradas</h2>
            <p className="text-xs text-amber-800 mt-1">Puedes restaurarlas o eliminarlas definitivamente junto con sus archivos generados.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {retiredRows.map(edition => (
              <div key={edition.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-mono font-semibold text-slate-800">{edition.code}</div>
                  <div className="text-xs text-slate-500">Fecha {edition.date} · retirada {edition.deleted_at || ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-outline" onClick={() => setConfirmDialog({
                    isOpen: true,
                    title: 'Restaurar edición',
                    message: `¿Volver a publicar la edición ${edition.code}?`,
                    onConfirm: async () => {
                      try {
                        await restoreEdition(edition.id)
                        await load()
                        setAlertDialog({ isOpen: true, title: 'Edición restaurada', message: 'La edición y sus solicitudes vuelven a estar publicadas.', variant: 'success' })
                      } catch (error) {
                        setAlertDialog({ isOpen: true, title: 'No se pudo restaurar', message: error instanceof Error ? error.message : 'Error al restaurar la edición.', variant: 'error' })
                      }
                    }
                  })}>Restaurar</button>
                  <button className="btn btn-danger" onClick={() => setConfirmDialog({
                    isOpen: true,
                    title: 'Eliminar edición definitivamente',
                    message: `¿Eliminar permanentemente la edición ${edition.code} y todos sus archivos generados?`,
                    onConfirm: async () => {
                      try {
                        await deleteEdition(edition.id)
                        await load()
                      } catch (error) {
                        setAlertDialog({ isOpen: true, title: 'No se pudo eliminar', message: error instanceof Error ? error.message : 'Error al eliminar la edición.', variant: 'error' })
                      }
                    }
                  })}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="warning" onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
      <AlertDialog {...alertDialog} onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })} />
      
      {publishingState.active && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 mx-4">
            <h3 className="text-lg font-semibold text-brand-900 mb-2">Publicando Edición</h3>
            <p className="text-slate-600 text-sm mb-4">{publishingState.message || 'Generando documento consolidado...'}</p>
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden relative">
              <div 
                className="bg-brand-600 h-3 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${publishingState.progress}%` }}
              ></div>
            </div>
            <div className="text-right text-xs font-medium text-brand-700">
              {publishingState.progress}%
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
