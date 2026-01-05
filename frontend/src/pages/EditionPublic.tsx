import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'

type Edition = { id:number; code:string; status:string; date:string; edition_no:number; orders_count:number; file_id?:number|null; file_url?:string|null; file_name?:string|null }
type Order = { id:number; name:string; document:string; status:string; date:string }

export default function EditionPublic(){
  const { code } = useParams()
  const [edition, setEdition] = useState<Edition|null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [err, setErr] = useState('')

  useEffect(()=>{
    if (!code) return
    fetch(`/api/e/${encodeURIComponent(code)}`)
      .then(async r=>{ if(!r.ok) throw new Error(await r.text()); return r.json() })
      .then(d=>{ setEdition(d.edition); setOrders(d.orders||[]) })
      .catch(e=> setErr(typeof e==='string'? e: (e?.message||'Error')))
  },[code])

  const pdfUrl = useMemo(()=> edition ? (edition.file_url || `/api/e/${encodeURIComponent(edition.code)}/download`) : '', [edition])

  if (err) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">{err}</div></div>
  if (!edition) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">Cargando...</div></div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="card p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Edicion {edition.code}</h1>
            <div className="text-sm text-slate-600">Fecha: {edition.date} - Numero de edicion: {edition.edition_no}</div>
            {edition.status && <div className="text-xs text-slate-500 mt-1">Estado: {edition.status}</div>}
          </div>
          <div className="flex gap-2">
            <a className="btn btn-primary inline-flex items-center gap-2" href={`${pdfUrl}?download=1`} target="_blank" rel="noreferrer">Descargar PDF</a>
            <a className="btn btn-ghost inline-flex items-center gap-2" href={pdfUrl} target="_blank" rel="noreferrer">Abrir</a>
          </div>
        </div>
      </div>

      <div className="card p-4">
        {edition.file_id ? (
          <ProtectedPdfViewer src={pdfUrl} height={640} />
        ) : (
          <div className="p-6 text-sm text-slate-600">Esta edicion aun no tiene un PDF disponible.</div>
        )}
      </div>

      <div className="card overflow-auto">
        <div className="p-4 pb-2">
          <h3 className="text-lg font-semibold">Publicaciones incluidas ({orders.length})</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-brand-800 text-white">
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Razon social</th>
              <th className="text-left px-4 py-2">Documento</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-left px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o=> (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2 font-mono">{o.id}</td>
                <td className="px-4 py-2">{o.name}</td>
                <td className="px-4 py-2">{o.document}</td>
                <td className="px-4 py-2">{o.status==='Publicado'?'Publicada':(o.status==='Pendiente'?'Borrador':o.status)}</td>
                <td className="px-4 py-2">{o.date}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-600">Sin publicaciones asociadas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
