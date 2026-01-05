import { useEffect, useRef, useState } from 'react'
import { createEdition, deleteEdition, listEditions, type Edition, getEdition, updateEdition, listLegal, type LegalRequest, setEditionOrders, publishEdition, uploadEditionPdf } from '../lib/api'
import { IconPlus, IconEdit, IconTrash, IconSave, IconClose, IconDownload, IconCheck, IconUpload } from '../components/icons'
import QRCode from 'qrcode.react'
import ConfirmDialog from '../components/ConfirmDialog'
import AlertDialog from '../components/AlertDialog'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import FlipbookViewer from '../components/FlipbookViewer'

export default function Ediciones(){
  const [rows, setRows] = useState<Edition[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ code:'', status:'Borrador', date:'', edition_no:1, orders_count:0 })
  const [createPdf, setCreatePdf] = useState<File|null>(null)
  const [selId, setSelId] = useState<number|undefined>(undefined)
  const [detail, setDetail] = useState<{edition:Edition; orders:LegalRequest[]}|null>(null)
  const [allOrders, setAllOrders] = useState<LegalRequest[]>([])
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const qrWrapRef = useRef<HTMLDivElement|null>(null)
  const pdfSectionRef = useRef<HTMLDivElement|null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{isOpen:boolean; title:string; message:string; onConfirm:()=>void}>({isOpen:false, title:'', message:'', onConfirm:()=>{}})
  const [alertDialog, setAlertDialog] = useState<{isOpen:boolean; title:string; message:string; variant:'success'|'error'|'info'|'warning'}>({isOpen:false, title:'', message:'', variant:'info'})
  
  const load = ()=> listEditions().then(r=>setRows(r.items))
  useEffect(()=>{ load() },[])

  const openDetail = async(id:number)=>{
    setSelId(id)
    const [det, leg] = await Promise.all([getEdition(id), listLegal()])
    setDetail(det); setAllOrders(leg.items)
  }

  const onCreate = async(e:any)=>{
    e.preventDefault()
    if (!createPdf) {
      setAlertDialog({isOpen:true, title:'PDF requerido', message:'Debes adjuntar el PDF de la edicion para crearla.', variant:'error'})
      return
    }
    setCreating(true)
    try {
      const payload = { ...form, date: form.date || new Date().toISOString().slice(0,10) }
      const res = await createEdition(payload) as any
      const newId = res?.id
      if (newId) {
        await uploadEditionPdf(newId, createPdf)
      }
      setForm({ code:'', status:'Borrador', date:'', edition_no:1, orders_count:0 })
      setCreatePdf(null)
      await load()
      if (newId) {
        const [det, leg] = await Promise.all([getEdition(newId), listLegal()])
        setSelId(newId)
        setDetail(det)
        setAllOrders(leg.items)
      }
      setAlertDialog({isOpen:true, title:'Exito', message:'Edicion creada con PDF cargado', variant:'success'})
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setAlertDialog({isOpen:true, title:'Error', message:`No se pudo crear la edicion: ${errorMsg}`, variant:'error'})
    } finally {
      setCreating(false)
    }
  }

  const handlePublish = async()=>{
    if (!selId) return
    try {
      await publishEdition(selId)
      const det = await getEdition(selId)
      setDetail(det)
      await load()
      setAlertDialog({isOpen:true, title:'Exito', message:'Edicion publicada', variant:'success'})
    } catch (error) {
      setAlertDialog({isOpen:true, title:'Error', message:'Error al publicar la edicion', variant:'error'})
    }
  }

  const handlePdfFile = async(file: File)=>{
    if (!selId) return
    setUploadingPdf(true)
    try {
      const result = await uploadEditionPdf(selId, file)
      setDetail(prev=> prev ? {...prev, edition:{...prev.edition, file_id:result.file_id, file_name:result.file_name, file_url: result.edition?.file_url || `/api/e/${encodeURIComponent(prev.edition.code)}/download`}} : prev)
      await load()
      setAlertDialog({isOpen:true, title:'Exito', message:'PDF actualizado', variant:'success'})
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo subir el PDF'
      setAlertDialog({isOpen:true, title:'Error', message:msg, variant:'error'})
    } finally {
      setUploadingPdf(false)
    }
  }

  const pdfUrl = detail?.edition.code ? `/api/e/${encodeURIComponent(detail.edition.code)}/download` : (selId ? `/api/e/${selId}/download` : '')
  const viewerUrl = detail?.edition.code ? `/visor-espresivo/${encodeURIComponent(detail.edition.code)}` : ''
  useEffect(()=>{
    if (detail && pdfSectionRef.current) {
      const el = pdfSectionRef.current
      requestAnimationFrame(()=> {
        el.scrollIntoView({ behavior:'smooth', block:'start' })
        el.focus({ preventScroll:true })
      })
    }
  }, [detail?.edition.id])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ediciones</h1>
        <form onSubmit={onCreate} className="flex flex-wrap items-center gap-2">
          <input className="input" placeholder="Codigo (ej: E1125-24UVZAB)" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required />
          <input className="input w-40" type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
          <input className="input w-28" type="number" min={1} placeholder="Nro Ed." value={form.edition_no} onChange={e=>setForm({...form, edition_no:+e.target.value})} />
          <label className="btn btn-ghost border-dashed border-slate-300 text-slate-700 inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="application/pdf" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; setCreatePdf(f||null); }} />
            <IconUpload/> <span>{createPdf ? createPdf.name : 'Adjuntar PDF'}</span>
          </label>
          <button type="submit" className="btn btn-primary inline-flex items-center gap-2" disabled={creating || !form.code || !createPdf}>
            {creating? 'Creando...': (<><IconPlus/> <span>Nueva edicion</span></>)}
          </button>
        </form>
      </div>

      <div className="card overflow-auto">
        <table className="min-w-full text-sm">
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
            {rows.map(r=> (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-brand-700 font-semibold">{r.code}</td>
                <td className="px-4 py-2">
                  <span className={`pill ${r.status==='Publicada'?'bg-green-100 text-green-700':r.status==='Borrador'?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-700'}`}>
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
                    <button className="text-brand-700 hover:underline inline-flex items-center gap-1" onClick={()=>openDetail(r.id)}>
                      <IconEdit/> <span>Ver detalles</span>
                    </button>
                    <button className="text-rose-700 hover:underline inline-flex items-center gap-1" onClick={()=>setConfirmDialog({isOpen:true, title:'Eliminar edicion', message:'Seguro de eliminar esta edicion?', onConfirm:async()=>{await deleteEdition(r.id); if(selId===r.id){setSelId(undefined); setDetail(null)}; load()}})}>
                      <IconTrash/> <span>Eliminar</span>
                    </button>
                  </div>
                </td>
              </tr>
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

      {detail && selId && (
        <div className="card p-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-2xl font-semibold text-brand-800">Detalles de la edicion</h2>
              <button className="btn btn-ghost inline-flex items-center gap-2" onClick={()=>{ setSelId(undefined); setDetail(null) }}>
                <IconClose/> <span>Cerrar</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium mb-2">Codigo de verificacion</span>
                <input className="input w-full font-mono" value={detail.edition.code} onChange={e=>setDetail({...detail, edition:{...detail.edition, code:e.target.value}})} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-2">Fecha de publicacion</span>
                <input className="input w-full" type="date" value={detail.edition.date} onChange={e=>setDetail({...detail, edition:{...detail.edition, date:e.target.value}})} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-2">Estado</span>
                <select className="input w-full" value={detail.edition.status} onChange={e=>setDetail({...detail, edition:{...detail.edition, status:e.target.value}})}>
                  {['Borrador','Publicada','Archivado'].map(s=> <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-sm font-medium mb-2">Numero de edicion</span>
                <input className="input w-full" type="number" min={1} value={detail.edition.edition_no} onChange={e=>setDetail({...detail, edition:{...detail.edition, edition_no:+e.target.value}})} />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <button className="btn btn-primary inline-flex items-center gap-2" onClick={async()=>{ await updateEdition(selId, { code:detail.edition.code, date:detail.edition.date, status:detail.edition.status, edition_no:detail.edition.edition_no }); load(); setAlertDialog({isOpen:true, title:'Exito', message:'Cambios guardados', variant:'success'}) }}>
                <IconSave/> <span>Guardar cambios</span>
              </button>
              {detail.edition.status === 'Borrador' && (
                <button className="btn bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2" onClick={()=>setConfirmDialog({isOpen:true, title:'Publicar edicion', message:'Aprobar esta edicion y marcarla como Publicada?', onConfirm:handlePublish})}>
                  <IconCheck/> <span>Publicar edicion</span>
                </button>
              )}
            </div>

            <div
              ref={pdfSectionRef}
              tabIndex={-1}
              className="border rounded-lg p-4 bg-white space-y-3 outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-300 transition-shadow relative"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-800">PDF de la edicion (visor simple)</h3>
                  <p className="text-sm text-slate-600">Sube el PDF final y muestralo en el visor.</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="file" accept="application/pdf" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value=''; }} />
                  <span className="btn btn-outline inline-flex items-center gap-2">
                    {uploadingPdf ? 'Subiendo...' : (<><IconUpload/> <span>Cargar PDF</span></>)}
                  </span>
                </label>
              </div>
              {detail.edition.file_name && (
                <div className="text-sm text-slate-700">Archivo actual: <span className="font-semibold">{detail.edition.file_name}</span></div>
              )}
              {detail.edition.file_id ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <a className="btn btn-primary inline-flex items-center gap-2" href={viewerUrl} target="_blank" rel="noreferrer">
                      <IconDownload/> <span>Ir a la edición</span>
                    </a>
                    <a className="btn btn-ghost inline-flex items-center gap-2" href={pdfUrl} target="_blank" rel="noreferrer">Abrir en pestana</a>
                  </div>
                    <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between text-slate-200 text-sm">
                        <span className="font-semibold">Visor Espressivo-PDF</span>
                      <span className="text-xs bg-white/10 px-2 py-1 rounded-full">Vista tipo revista</span>
                    </div>
                    <FlipbookViewer src={pdfUrl} height={520} />
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="px-2 py-1 rounded bg-white/10">Arrastra o clic para pasar página</span>
                      <span className="px-2 py-1 rounded bg-white/10">Usa la rueda para navegar</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600 bg-slate-50 border border-dashed border-slate-300 rounded p-3">
                  Aun no has cargado el PDF de esta edicion. Sube el archivo diagramado y se mostrara aqui.
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-brand-800">Publicaciones seleccionadas ({detail.orders.length})</h3>
                <span className="text-xs text-slate-500">Solo se listan las publicaciones con estado Publicada</span>
              </div>
              <div className="max-h-96 overflow-auto border rounded-lg p-3 bg-white space-y-2">
                {allOrders.filter(o => o.status === 'Publicada').map(o=> {
                  const checked = detail.orders.some(x=>x.id===o.id)
                  const meta = typeof o.meta === 'string' ? (()=>{ try { return JSON.parse(o.meta) } catch { return {} } })() : (o.meta || {})
                  return (
                    <label key={o.id} className={`flex items-start gap-3 p-3 rounded border ${checked?'bg-brand-50 border-brand-300':'bg-white border-slate-200'} hover:shadow-sm transition-all cursor-pointer`}>
                      <input type="checkbox" className="mt-1" checked={checked} onChange={(e)=>{
                        const exists = detail.orders.some(x=>x.id===o.id)
                        const next = e.target.checked ? (exists? detail.orders : [...detail.orders, o]) : detail.orders.filter(x=>x.id!==o.id)
                        setDetail({...detail, orders: next})
                      }} />
                      <div className="flex-1 text-sm">
                        <div className="font-semibold text-brand-700">Orden #{String(o.id).padStart(8, '0')}</div>
                        <div className="text-slate-700 mt-1">{o.name || 'Sin nombre'}</div>
                        <div className="text-slate-500 text-xs mt-1">
                          {meta?.tipo_sociedad && <span className="mr-2">- {meta.tipo_sociedad}</span>}
                          {meta?.tipo_acto && <span>- {meta.tipo_acto}</span>}
                          {meta?.tipo_convocatoria && <span>- {meta.tipo_convocatoria}</span>}
                        </div>
                        <div className="text-slate-400 text-xs mt-1">{o.date}</div>
                      </div>
                    </label>
                  )
                })}
                {allOrders.filter(o => o.status === 'Publicada').length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No hay publicaciones publicadas disponibles.
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2 items-center">
                <button className="btn btn-primary inline-flex items-center gap-2" onClick={async()=>{ 
                  const ids = detail.orders.map(o=>o.id)
                  const r = await setEditionOrders(selId, ids)
                  setDetail({...detail, edition:{...detail.edition, orders_count:r.orders_count}})
                  load()
                  setAlertDialog({isOpen:true, title:'Exito', message:'Publicaciones guardadas', variant:'success'})
                }}>
                  <IconSave/> <span>Guardar seleccion</span>
                </button>
                <span className="text-sm text-slate-600">
                  {detail.orders.length} seleccionadas
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="font-semibold mb-2 text-brand-800">Codigo QR</h3>
              <p className="text-xs text-slate-600 mb-3">Escanea para ver la edicion publicada</p>
              <div ref={qrWrapRef} className="bg-white inline-block p-3 rounded-lg shadow-md border">
                <QRCode value={`${location.origin}/edicion/${encodeURIComponent(detail.edition.code)}`} size={200} includeMargin={false} level="M" renderAs="canvas" />
              </div>
              <div className="text-xs text-center mt-2 text-slate-500 font-mono">{detail.edition.code}</div>
              <button className="btn btn-outline w-full mt-3 inline-flex items-center justify-center gap-2" onClick={()=>{
                const canvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null
                if (!canvas) return
                const url = canvas.toDataURL('image/png')
                const a = document.createElement('a')
                a.href = url; a.download = `QR-edicion-${detail.edition.code}.png`; a.click()
              }}>
                <IconDownload/> <span>Descargar QR</span>
              </button>
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
                    <IconDownload/> <span>Descargar PDF de edicion</span>
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
                    <dd className="font-semibold truncate">{detail.edition.file_name}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} variant="warning" onConfirm={confirmDialog.onConfirm} onCancel={()=>setConfirmDialog({...confirmDialog,isOpen:false})} />
      <AlertDialog {...alertDialog} onClose={()=>setAlertDialog({...alertDialog,isOpen:false})} />
    </section>
  )
}
