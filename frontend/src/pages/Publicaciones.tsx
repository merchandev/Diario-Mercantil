import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconSearch, IconTrash, IconDownload, IconClose, IconPlus, IconSave, IconQrCode } from '../components/icons'
import { listLegal, type LegalRequest, getLegal, updateLegal, rejectLegal, addLegalPayment, deleteLegalPayment, type LegalPayment, downloadLegal, deleteLegal, getToken } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import QRCodeModal from '../components/QRCodeModal'

const estOpts = ['Todos','Pendiente','Por verificar','En trámite','Publicado','Rechazado']

export default function Publicaciones(){
  const location = useLocation()
  const navigate = useNavigate()
  const [rows, setRows] = useState<LegalRequest[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string|null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('Todos')
  const [reqFrom, setReqFrom] = useState('')
  const [reqTo, setReqTo] = useState('')
  const [pubFrom, setPubFrom] = useState('')
  const [pubTo, setPubTo] = useState('')
  const [sel, setSel] = useState<LegalRequest|null>(null)
  const [payments, setPayments] = useState<LegalPayment[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{isOpen:boolean; title:string; message:string; variant:'danger'|'warning'|'info'; onConfirm:()=>void}>({isOpen:false, title:'', message:'', variant:'info', onConfirm:()=>{}})
    const [qrModal, setQrModal] = useState<{isOpen:boolean; url:string; title:string}>({isOpen:false, url:'', title:''})
  const mapFilterStatus = (s:string)=> s==='Pendiente' ? 'Borrador' : (s==='Publicado' ? 'Publicada' : s)
  const reload = ()=> {
    console.log('🔄 [Publicaciones Admin] Recargando lista de publicaciones...')
    console.log('🔍 [Publicaciones Admin] Filtros:', { q, status, reqFrom, reqTo, pubFrom, pubTo })
    console.log('🔑 [Publicaciones Admin] Token presente:', !!getToken())
    setLoading(true)
    setError(null)
    const filters = { 
      q, 
      status: status==='Todos' ? '' : mapFilterStatus(status), 
      req_from: reqFrom || undefined, 
      req_to: reqTo || undefined, 
      pub_from: pubFrom || undefined, 
      pub_to: pubTo || undefined 
    }
    console.log('📤 [Publicaciones Admin] Enviando request con filtros:', filters)
    listLegal(filters)
      .then(r=>{
        console.log('✅ [Publicaciones Admin] Cargadas:', r.items.length, 'publicaciones')
        console.log('📋 [Publicaciones Admin] Primeras 3:', r.items.slice(0, 3))
        console.log('📋 [Publicaciones Admin] Todas:', r.items)
        setRows(r.items)
        setError(null)
      })
      .catch(err=>{
        console.error('❌ [Publicaciones Admin] Error:', err)
        console.error('❌ [Publicaciones Admin] Error completo:', JSON.stringify(err, null, 2))
        setError(err.message || 'Error al cargar publicaciones')
        setRows([])
      })
      .finally(()=> setLoading(false))
  }
  useEffect(()=>{ reload() },[])
  // Auto-recargar cuando cambien filtros (ligero debounce)
  useEffect(()=>{
    const t = setTimeout(()=>{ reload() }, 400)
    return ()=> clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, reqFrom, reqTo, pubFrom, pubTo])
  // Initialize from URL params (?q=...&auto=1)
  useEffect(()=>{
    const sp = new URLSearchParams(location.search)
    const qParam = sp.get('q')||''
    const auto = sp.get('auto')==='1'
    if (qParam) setQ(qParam)
    if (qParam && auto) {
      listLegal({ q: qParam, status: '', req_from: undefined, req_to: undefined, pub_from: undefined, pub_to: undefined })
        .then(r=>setRows(r.items)).catch(()=>{})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const open = async (id:number)=>{
    const d = await getLegal(id); setSel(d.item); setPayments(d.payments)
  }
  const prettyDate = (s?:string)=> s ? s.split('-').reverse().join('/') : '-'
  const prettyStatus = (s?:string)=> {
    if (!s) return '-'
    if (s==='Borrador' || s==='Pendiente') return 'Pendiente'
    if (s==='Publicada' || s==='Publicado') return 'Publicado'
    return s
  }
  const totalPaid = useMemo(()=> payments.reduce((s,p)=>s+Number(p.amount_bs||0),0), [payments])
  const onAddPayment = async(e:any)=>{
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body: any = { ref: fd.get('ref')||'', date: fd.get('date')||new Date().toISOString().slice(0,10), bank: fd.get('bank')||'', type: fd.get('type')||'', amount_bs: Number(fd.get('amount_bs')||0), status: fd.get('pstatus')||'Verificado', comment: fd.get('comment')||'' }
    const r = await addLegalPayment(sel!.id, body); void r; const d = await getLegal(sel!.id); setSel(d.item); setPayments(d.payments); (e.target as HTMLFormElement).reset()
  }
  const download = async(id:number)=>{
    const blob = await downloadLegal(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`orden-servicio-${id}.pdf`; a.click(); URL.revokeObjectURL(url)
  }
  const handleDelete = async(id:number)=>{
    setConfirmDialog({
      isOpen: true,
      title: 'Mover a papelera',
      message: '¿Mover esta publicación a la papelera?\n\nSerá eliminada automáticamente después de 30 días.',
      variant: 'warning',
      onConfirm: async()=>{
        try {
          await deleteLegal(id)
          reload()
        } catch(e:any){
          alert('Error: ' + (e.message||'No se pudo eliminar'))
        }
      }
    })
  }
  return (
    <section className="space-y-4">
      <ConfirmDialog {...confirmDialog} onCancel={()=> setConfirmDialog({...confirmDialog, isOpen:false})} />
        <QRCodeModal {...qrModal} onClose={()=> setQrModal({isOpen:false, url:'', title:''})} />
      <h1 className="text-xl font-semibold">Publicaciones</h1>
            {error && (
              <div className="card p-4 bg-rose-50 border-rose-200 text-rose-800">
                <strong>Error:</strong> {error}
              </div>
            )}
      <div className="card p-3 grid md:grid-cols-4 gap-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 grid place-items-center text-slate-400 w-5"><IconSearch/></span>
          <input className="input pl-9" placeholder="Buscador..." value={q} onChange={e=>setQ(e.target.value)} />
        </div>
        <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
          {estOpts.map(o=> <option key={o} value={o}>{o}</option>)}
        </select>
        <input className="input" type="date" value={reqFrom} onChange={e=>setReqFrom(e.target.value)} placeholder="Fecha de solicitud (desde)" />
        <input className="input" type="date" value={reqTo} onChange={e=>setReqTo(e.target.value)} placeholder="Fecha de solicitud (hasta)" />
        <input className="input" type="date" value={pubFrom} onChange={e=>setPubFrom(e.target.value)} placeholder="Fecha de publicación (desde)" />
        <input className="input" type="date" value={pubTo} onChange={e=>setPubTo(e.target.value)} placeholder="Fecha de publicación (hasta)" />
        <div className="md:col-span-4 flex gap-2">
          <button className="btn btn-primary inline-flex items-center gap-2" onClick={reload} disabled={loading}>
            {loading ? <span className="animate-spin">⏳</span> : <IconSearch/>}
            <span>{loading ? 'Cargando...' : 'Filtrar'}</span>
          </button>
          {/* Botón de 'Limpiar' retirado a petición: evita confusión con borrar registros */}
        </div>
      </div>
      <div className="card overflow-auto">
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
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">N° de orden</th>
              <th className="text-left px-4 py-2">Fecha de solicitud</th>
              <th className="text-left px-4 py-2">Tipo de publicación</th>
              <th className="text-left px-4 py-2">Razón social</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Fecha de publicación</th>
              <th className="text-right px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-mono">{r.order_no || r.id}</td>
                <td className="px-4 py-2">{prettyDate(r.date)}</td>
                <td className="px-4 py-2">{r.pub_type || 'Documento'}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{prettyStatus(r.status)}</td>
                <td className="px-4 py-2">{prettyDate(r.publish_date)}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                                        {r.status === 'Publicada' && (
                                          <button className="text-purple-700 hover:underline inline-flex items-center gap-1" onClick={()=>setQrModal({isOpen:true, url:`${window.location.origin}/ediciones/${r.order_no || r.id}`, title:`Publicación ${r.order_no || r.id}`})}><IconQrCode/> <span>QR</span></button>
                                        )}
                    <button className="text-brand-700 hover:underline inline-flex items-center gap-1" onClick={()=>navigate(`/dashboard/publicaciones/${r.id}`)}><IconSave/> <span>Detalles</span></button>
                    <button className="text-amber-700 hover:underline inline-flex items-center gap-1" onClick={async()=>{ const reason = prompt('Motivo del rechazo:'); if(reason===null) return; await rejectLegal(r.id, reason||''); reload() }}><IconClose/> <span>Rechazar</span></button>
                    <button className="text-emerald-700 hover:underline inline-flex items-center gap-1" onClick={()=>download(r.id)}><IconDownload/> <span>Descargar</span></button>
                    <button className="text-red-700 hover:underline inline-flex items-center gap-1" onClick={()=>handleDelete(r.id)}><IconTrash/> <span>Eliminar</span></button>
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
              <button className="btn" onClick={()=>setSel(null)}>Cerrar</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Historial de Pagos</h3>
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-2 py-1">Ref.</th>
                    <th className="text-left px-2 py-1">Fecha</th>
                    <th className="text-left px-2 py-1">Banco</th>
                    <th className="text-left px-2 py-1">Tipo</th>
                    <th className="text-left px-2 py-1">Monto (Bs.)</th>
                    <th className="text-left px-2 py-1">Estado</th>
                    <th className="text-right px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p=> (
                    <tr key={p.id} className="border-t">
                      <td className="px-2 py-1">{p.ref}</td>
                      <td className="px-2 py-1">{p.date}</td>
                      <td className="px-2 py-1">{p.bank}</td>
                      <td className="px-2 py-1">{p.type}</td>
                      <td className="px-2 py-1">{Number(p.amount_bs).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      <td className="px-2 py-1">{p.status}</td>
                      <td className="px-2 py-1 text-right"><button className="text-rose-700 hover:underline inline-flex items-center gap-1" onClick={()=>{ 
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Eliminar pago',
                          message: '¿Eliminar este pago?',
                          variant: 'danger',
                          onConfirm: async()=>{
                            await deleteLegalPayment(sel.id, p.id)
                            const d=await getLegal(sel.id)
                            setSel(d.item)
                            setPayments(d.payments)
                          }
                        })
                      }}><IconTrash/> <span>Eliminar</span></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="px-2 py-1 font-semibold" colSpan={4}>Total pagado</td>
                    <td className="px-2 py-1 font-semibold">{totalPaid.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
              <form onSubmit={onAddPayment} className="mt-3 grid md:grid-cols-3 gap-2 items-end">
                <input className="input" name="ref" placeholder="Ref." />
                <input className="input" type="date" name="date" defaultValue={new Date().toISOString().slice(0,10)} />
                <input className="input" name="bank" placeholder="Banco" />
                <input className="input" name="type" placeholder="Tipo" />
                <input className="input" name="amount_bs" type="number" step="0.01" placeholder="Monto Bs." />
                <select className="input" name="pstatus" defaultValue="Verificado"><option>Verificado</option><option>Pendiente</option></select>
                <input className="input md:col-span-3" name="comment" placeholder="Comentario (opcional)" />
                <button className="btn btn-primary md:col-span-3 inline-flex items-center gap-2"><IconPlus/> <span>Agregar pago</span></button>
              </form>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Detalles de la Orden de Servicio</h3>
              <div className="border rounded p-3 text-sm space-y-1 bg-gray-50">
                <div><span className="font-semibold">A nombre de:</span> {sel.name}</div>
                <div><span className="font-semibold">Teléfono:</span> {sel.phone || '-'}</div>
                <div><span className="font-semibold">Dirección:</span> {sel.address || '-'}</div>
                <div><span className="font-semibold">CI/RIF:</span> {sel.document}</div>
                <div><span className="font-semibold">Fecha:</span> {sel.date}</div>
                <div className="mt-3"><span className="font-semibold">Descripción:</span> Servicio de publicación electrónica en el Diario Mercantil de Venezuela</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="block"><span className="text-sm">Folios</span><input className="input w-full" type="number" min={1} value={sel.folios||1} onChange={e=>setSel({...sel, folios:+e.target.value})} /></label>
                <label className="block"><span className="text-sm">Estado</span>
                  <select className="input w-full" value={sel.status}
                    onChange={e=>{
                      const v = e.target.value
                      setSel({...sel, status: v})
                    }}>
                    {[
                      {label:'Pendiente', value:'Borrador'},
                      {label:'Por verificar', value:'Por verificar'},
                      {label:'En trámite', value:'En trámite'},
                      {label:'Publicado', value:'Publicada'},
                      {label:'Rechazado', value:'Rechazado'},
                    ].map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="block col-span-2"><span className="text-sm">Fecha de publicación</span><input className="input w-full" type="date" value={sel.publish_date||''} onChange={e=>setSel({...sel, publish_date:e.target.value})} /></label>
              </div>
              
              {/* Acciones rápidas */}
              {sel.status === 'Por verificar' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-amber-900">⚠️ Solicitud pendiente de verificación</p>
                  <div className="flex gap-2">
                    <button 
                      className="btn bg-green-600 text-white hover:bg-green-700 flex-1"
                      onClick={()=>{ 
                        setConfirmDialog({
                          isOpen: true,
                          title: 'Aprobar solicitud',
                          message: '¿Aprobar esta solicitud y marcarla como Publicada?',
                          variant: 'info',
                          onConfirm: async()=>{
                            await updateLegal(sel.id, { status:'Publicada', publish_date: new Date().toISOString().slice(0,10) })
                            reload()
                            setSel(null)
                          }
                        })
                      }}
                    >
                      ✓ Aprobar y Publicar
                    </button>
                    <button 
                      className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
                      onClick={async()=>{ 
                        const reason = prompt('Motivo del rechazo:')
                        if(reason===null) return
                        await rejectLegal(sel.id, reason||'No especificado')
                        alert('Solicitud rechazada')
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
                <button className="btn btn-primary inline-flex items-center gap-2" onClick={async()=>{ await updateLegal(sel.id, { status:sel.status, folios:sel.folios, publish_date:sel.publish_date }); const d=await getLegal(sel.id); setSel(d.item); alert('Cambios guardados') }}><IconSave/> <span>Guardar cambios</span></button>
                <button className="btn inline-flex items-center gap-2" onClick={()=>download(sel.id)}><IconDownload/> <span>Descargar detalle</span></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
