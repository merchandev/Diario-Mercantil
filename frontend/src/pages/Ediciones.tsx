import React, { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { createEdition, deleteEdition, listEditions, type Edition, getEdition, updateEdition, listLegal, type LegalRequest, setEditionOrders, publishEdition, uploadEditionPdf } from '../lib/api'
import { IconPlus, IconEdit, IconTrash, IconSave, IconClose, IconDownload, IconCheck, IconUpload } from '../components/icons'
import QRCode from 'qrcode.react'
import ConfirmDialog from '../components/ConfirmDialog'
import AlertDialog from '../components/AlertDialog'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import FlipbookViewer from '../components/FlipbookViewer'

export default function Ediciones() {
  const [rows, setRows] = useState<Edition[]>([])
  const [creating, setCreating] = useState(false)
  const nextEditionNo = rows.length > 0 ? Math.max(...rows.map(r => typeof r.edition_no === 'number' ? r.edition_no : parseInt(r.edition_no) || 0)) + 1 : 1
  const [form, setForm] = useState<{ date: string; edition_no: number; selectedOrders: number[] }>({ date: new Date().toISOString().slice(0, 10), edition_no: nextEditionNo, selectedOrders: [] })
  const [createPdf, setCreatePdf] = useState<File | null>(null)
  const [selId, setSelId] = useState<number | undefined>(undefined)
  const [detail, setDetail] = useState<{ edition: Edition; orders: LegalRequest[] } | null>(null)
  const [qrGenerated, setQrGenerated] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [allOrders, setAllOrders] = useState<LegalRequest[]>([])
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement | null>(null)
  const pdfSectionRef = useRef<HTMLDivElement | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } })
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>({ isOpen: false, title: '', message: '', variant: 'info' })
  const [expanded, setExpanded] = useState({ pdf: true, pubs: true, qr: true })
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false)
  const [isPubsCollapsed, setIsPubsCollapsed] = useState(false)

  const load = async () => {
    try {
      const [edRes, legRes] = await Promise.all([listEditions(), listLegal()]);
      setRows(edRes.items);
      setAllOrders(legRes.items);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { load() }, [])
  useEffect(() => {
    setForm(prev => ({ ...prev, edition_no: nextEditionNo }));
  }, [rows]);

  const openDetail = async (id: number) => {
    setSelId(id)
    const [det, leg] = await Promise.all([getEdition(id), listLegal()])
    setDetail(det); setAllOrders(leg.items)
  }

  const onCreate = async (e: any) => {
    e.preventDefault()
    if (!createPdf) {
      setAlertDialog({ isOpen: true, title: 'PDF requerido', message: 'Debes adjuntar el PDF de la edicion para crearla.', variant: 'error' })
      return
    }
    setCreating(true)
    try {
      const payload = { status: 'Publicada', date: form.date, edition_no: form.edition_no, orders: form.selectedOrders }
      const res = await createEdition(payload) as any
      const newId = res?.id
      if (newId) {
        await uploadEditionPdf(newId, createPdf)
      }
      setForm({ date: new Date().toISOString().slice(0, 10), edition_no: nextEditionNo, selectedOrders: [] })
      setCreatePdf(null)
      setQrGenerated(false)
      setGeneratedCode('')
      await load()
      if (newId) {
        const [det, leg] = await Promise.all([getEdition(newId), listLegal()])
        setSelId(newId)
        setDetail(det)
      }
      setAlertDialog({ isOpen: true, title: 'Exito', message: `Edicion creada y publicada con código: ${res?.code || 'Generado'}`, variant: 'success' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setAlertDialog({ isOpen: true, title: 'Error', message: `No se pudo crear la edicion: ${errorMsg}`, variant: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async () => {
    if (!selId) return
    try {
      await publishEdition(selId)
      const det = await getEdition(selId)
      setDetail(det)
      await load()
      setAlertDialog({ isOpen: true, title: 'Exito', message: 'Edicion publicada', variant: 'success' })
    } catch (error) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al publicar la edicion', variant: 'error' })
    }
  }

  const handlePdfFile = async (file: File) => {
    if (!selId) return
    setUploadingPdf(true)
    try {
      const result = await uploadEditionPdf(selId, file)
      setDetail(prev => prev ? { ...prev, edition: { ...prev.edition, file_id: result.file_id, file_name: result.file_name, file_url: result.edition?.file_url || `/api/e/${encodeURIComponent(prev.edition.code)}/download` } } : prev)
      await load()
      setAlertDialog({ isOpen: true, title: 'Exito', message: 'PDF actualizado', variant: 'success' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo subir el PDF'
      setAlertDialog({ isOpen: true, title: 'Error', message: msg, variant: 'error' })
    } finally {
      setUploadingPdf(false)
    }
  }

  const pdfUrl = detail?.edition.code ? `/api/e/${encodeURIComponent(detail.edition.code)}/download` : (selId ? `/api/e/${selId}/download` : '')
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

        <form onSubmit={onCreate} className="p-5 space-y-6 bg-white">
          <div className="grid md:grid-cols-3 gap-6">
            <label className="block">
              <span className="block text-sm font-semibold mb-1.5 text-slate-700">Fecha de Publicación</span>
              <input className="input w-full bg-slate-50" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </label>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1 text-slate-700">Número de Edición</label>
              <input type="text" disabled className="input w-full bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200" value={form.edition_no} title="El número de edición se genera automáticamente en orden consecutivo" />
            </div>

            {!qrGenerated ? (
              <div className="flex items-end">
                <button type="button" className="btn btn-primary w-full h-[42px] mb-[3px] shadow-sm select-none" onClick={() => {
                  const dateObj = new Date(form.date);
                  // Convert to user local time zone equivalent to get correct 'ddmmyy' string for the form context
                  const d = String(dateObj.getUTCDate()).padStart(2, '0');
                  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                  const y = String(dateObj.getUTCFullYear()).slice(2);
                  const dateStrNum = `${d}${m}${y}`;
                  setGeneratedCode(`dm${form.edition_no}${dateStrNum}`);
                  setQrGenerated(true);
                }}>
                  Generar QR
                </button>
              </div>
            ) : (
              <label className="block">
                <span className="block text-sm font-semibold mb-1.5 text-slate-700">Archivo PDF Final</span>
                <label className="btn btn-outline border-dashed hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-slate-600 w-full flex items-center justify-center gap-2 cursor-pointer h-[42px] transition-colors">
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; setCreatePdf(f || null); }} />
                  <IconUpload /> <span className="truncate">{createPdf ? createPdf.name : 'Click para subir PDF'}</span>
                </label>
              </label>
            )}
          </div>

          {qrGenerated && (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg flex flex-col items-center justify-center space-y-3 mb-6 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-brand-800 font-semibold text-center">Código y QR Generados</h3>
              <div className="bg-white p-3 rounded-md shadow-sm border border-slate-100">
                <QRCode value={`${location.origin}/dm/e-${generatedCode.replace(`dm${form.edition_no}`, '')}`} size={160} level="M" />
              </div>
              <div className="font-mono text-slate-700 bg-white px-3 py-1 rounded border border-slate-200 shadow-inner">
                {generatedCode}
              </div>
              <span className="text-xs text-brand-600 font-medium">Ahora puedes adjuntar el PDF y seleccionar las publicaciones para finalizar la edición.</span>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-700 underline mt-2" onClick={() => { setQrGenerated(false); setGeneratedCode(''); }}>
                Deshacer
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
                    {allOrders.filter(o => !['Rechazado', 'Borrador'].includes(o.status)).map(o => {
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
                            <div className="text-slate-700 font-medium mt-0.5">{o.name || 'Sin nombre asociado'}</div>
                            <div className="text-slate-500 text-xs mt-1.5 flex flex-wrap gap-2">
                              {meta?.tipo_sociedad && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_sociedad}</span>}
                              {meta?.tipo_acto && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_acto}</span>}
                              {meta?.tipo_convocatoria && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{meta.tipo_convocatoria}</span>}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                    {allOrders.filter(o => !['Rechazado', 'Borrador'].includes(o.status)).length === 0 && (
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
                <button type="submit" className="btn btn-primary px-6 py-2.5 text-sm font-semibold shadow-md inline-flex items-center gap-2" disabled={creating || !createPdf}>
                  {creating ? 'Procesando...' : (<><IconCheck className="w-5 h-5" /> <span>Crear y Publicar Edición Definitiva</span></>)}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="card shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Historial de Ediciones</h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead>
              <tr className="bg-brand-800 text-white">
                <th className="text-left px-4 py-2">Codigo</th>
                <th className="text-left px-4 py-2">Estado</th>
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
                        <button className="text-rose-700 hover:underline inline-flex items-center gap-1" onClick={() => setConfirmDialog({ isOpen: true, title: 'Eliminar edicion', message: 'Seguro de eliminar esta edicion?', onConfirm: async () => { await deleteEdition(r.id); if (selId === r.id) { setSelId(undefined); setDetail(null) }; load() } })}>
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
                              <h2 className="text-xl font-bold text-brand-800">Detalles de la edicion #{detail.edition.edition_no}</h2>
                              <div className="flex items-center gap-2">
                                <button className="btn btn-ghost text-slate-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium" onClick={() => { setSelId(undefined); setDetail(null); setIsDetailsCollapsed(false); }}>
                                  <IconClose className="w-4 h-4" /> <span>Cerrar</span>
                                </button>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Codigo de verificacion</span>
                                <input className="input w-full font-mono" value={detail.edition.code} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, code: e.target.value } })} />
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Fecha de publicacion</span>
                                <input className="input w-full" type="date" value={detail.edition.date} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, date: e.target.value } })} />
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Estado</span>
                                <select className="input w-full" value={detail.edition.status} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, status: e.target.value } })}>
                                  {['Borrador', 'Publicada', 'Archivado'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </label>
                              <label className="block">
                                <span className="block text-sm font-medium mb-2">Numero de edicion</span>
                                <input className="input w-full" type="number" min={1} value={detail.edition.edition_no} onChange={e => setDetail({ ...detail, edition: { ...detail.edition, edition_no: +e.target.value } })} />
                              </label>
                            </div>

                            <div className="flex flex-wrap gap-2 border-t pt-4">
                              <button className="btn btn-primary inline-flex items-center gap-2" onClick={async () => { await updateEdition(selId, { code: detail.edition.code, date: detail.edition.date, status: detail.edition.status, edition_no: detail.edition.edition_no }); load(); setAlertDialog({ isOpen: true, title: 'Exito', message: 'Cambios guardados', variant: 'success' }) }}>
                                <IconSave className="w-4 h-4" /> <span>Guardar cambios</span>
                              </button>
                              {detail.edition.status === 'Borrador' && (
                                <button className="btn bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2" onClick={() => setConfirmDialog({ isOpen: true, title: 'Publicar edicion', message: 'Aprobar esta edicion y marcarla como Publicada?', onConfirm: handlePublish })}>
                                  <IconCheck className="w-4 h-4" /> <span>Publicar edicion</span>
                                </button>
                              )}
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
                              </div>
                              {!isPdfCollapsed && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <label className="block">
                                    <span className="block text-sm font-semibold mb-2 text-slate-700">Reemplazar PDF de Edicion</span>
                                    <input type="file" accept="application/pdf" className="input w-full text-sm" onChange={async e => {
                                      const file = e.target.files?.[0]
                                      if (file && selId) {
                                        await uploadEditionPdf(selId, file)
                                        setAlertDialog({ isOpen: true, title: 'Exito', message: 'PDF actualizado!', variant: 'success' })
                                        load()
                                      }
                                    }} />
                                  </label>
                                  {detail.edition.file_id && (
                                    <div className="h-[550px] border rounded-lg overflow-hidden relative group shadow-inner bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex flex-col p-4">
                                      <div className="flex items-center justify-between text-slate-200 text-sm mb-3 z-10 relative">
                                        <span className="font-semibold">Visor Espressivo-PDF</span>
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded-full">Vista tipo revista</span>
                                      </div>
                                      <div className="flex-1 relative z-10 w-full max-w-full">
                                        <FlipbookViewer src={pdfUrl} height={420} />
                                      </div>
                                      <div className="flex flex-wrap gap-2 text-xs text-slate-300 mt-4 z-10 relative justify-center">
                                        <span className="px-2 py-1 rounded bg-white/10">Arrastra o clic para pasar página</span>
                                        <span className="px-2 py-1 rounded bg-white/10">Usa la rueda para navegar</span>
                                      </div>
                                      <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a
                                          href={`${pdfUrl}?download=1`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="btn btn-primary shadow-lg inline-flex items-center gap-2 pl-3 pr-4"
                                        >
                                          <IconDownload className="w-4 h-4" /> <span>Descargar PDF</span>
                                        </a>
                                      </div>
                                    </div>
                                  )}
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
                                      <li key={o.id} className="p-3 text-sm flex items-center justify-between hover:bg-white transition-colors">
                                        <div>
                                          <div className="font-semibold text-brand-800">Orden #{String(o.id).padStart(8, '0')}</div>
                                          <div className="text-slate-600 mt-0.5">{o.name}</div>
                                        </div>
                                        <button className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-md transition-colors" title="Quitar publicación de esta edición" onClick={async () => {
                                          if (confirm(`¿Quitar orden #${o.id} de esta edición?`)) {
                                            const newOrders = detail.orders.filter(ord => ord.id !== o.id).map(ord => ord.id);
                                            await api.post(`/editions/${selId}/orders`, { orders: newOrders });
                                            const { data } = await api.get(`/editions/${selId}`);
                                            setDetail({ edition: data.edition, orders: data.orders });
                                            load();
                                          }
                                        }}>
                                          <IconTrash className="w-4 h-4" />
                                        </button>
                                      </li>
                                    ))}
                                    {detail.orders.length === 0 && (
                                      <li className="p-6 text-center text-slate-500 text-sm">No hay publicaciones seleccionadas.</li>
                                    )}
                                  </ul>

                                  <div className="mt-4 border-t pt-4">
                                    <h4 className="text-sm font-semibold mb-2 text-slate-700">Añadir más publicaciones</h4>
                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                      {allOrders.filter(o => !['Rechazado', 'Borrador'].includes(o.status) && !detail.orders.some(d => d.id === o.id)).map(o => {
                                        const meta = typeof o.meta === 'string' ? (() => { try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                                        return (
                                          <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-brand-300 transition-all">
                                            <div className="flex-1 text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-brand-800">Orden #{String(o.id).padStart(8, '0')}</span>
                                                <span className="text-xs text-slate-400">{o.date}</span>
                                              </div>
                                              <div className="text-slate-700 font-medium mt-0.5">{o.name || 'Sin nombre'}</div>
                                            </div>
                                            <button className="btn btn-outline text-xs px-3 py-1.5 shrink-0 whitespace-nowrap" onClick={async () => {
                                              const newOrders = [...detail.orders.map(ord => ord.id), o.id];
                                              await api.post(`/editions/${selId}/orders`, { orders: newOrders });
                                              const { data } = await api.get(`/editions/${selId}`);
                                              setDetail({ edition: data.edition, orders: data.orders });
                                              load();
                                              setAlertDialog({ isOpen: true, title: 'Agregada', message: 'Publicación agregada a la edición.', variant: 'success' })
                                            }}>Añadir</button>
                                          </div>
                                        )
                                      })}
                                      {allOrders.filter(o => !['Rechazado', 'Borrador'].includes(o.status) && !detail.orders.some(d => d.id === o.id)).length === 0 && (
                                        <p className="text-xs text-slate-500 text-center py-4">No hay más publicaciones disponibles para añadir.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-white">
                              <h3 className="font-semibold mb-2 text-brand-800 cursor-pointer flex items-center justify-between select-none" onClick={() => setExpanded({ ...expanded, qr: !expanded.qr })}>
                                Codigo QR <span className="text-slate-400 text-xs">{expanded.qr ? '▲ Minimizar' : '▼ Expandir'}</span>
                              </h3>
                              {expanded.qr && (() => {
                                const qrUrl = `${location.origin}/dm/e-${detail.edition.date.split('-').reverse().join('').slice(0, 6)}`
                                return (
                                  <>
                                    <p className="text-xs text-slate-600 mb-3">Escanea para ver la edicion publicada</p>
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
                                    <IconDownload className="w-4 h-4" /> <span>Descargar PDF de edicion</span>
                                  </a>
                                  <p className="text-xs text-slate-600">
                                    PDF cargado manualmente y listo para compartir.
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-slate-600">Carga un PDF para habilitar la descarga.</p>
                              )}
                            </div>

                            <div className="border rounded-lg p-4 bg-slate-50">
                              <h3 className="font-semibold mb-2 text-brand-800">Informacion</h3>
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
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="warning" onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
      <AlertDialog {...alertDialog} onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })} />
    </section>
  )
}
