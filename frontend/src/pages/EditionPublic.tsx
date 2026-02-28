import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'
import MagazineViewer from '../components/MagazineViewer'

type Edition = { id: number; code: string; status: string; date: string; edition_no: number; orders_count: number; file_id?: number | null; file_url?: string | null; file_name?: string | null }
type Order = { id: number; name: string; document: string; status: string; date: string }

export default function EditionPublic() {
  const { code } = useParams()
  const [edition, setEdition] = useState<Edition | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!code) return
    fetch(`/api/dm/e-${encodeURIComponent(code)}`)
      .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
      .then(d => { setEdition(d.edition); setOrders(d.orders || []) })
      .catch(e => setErr(typeof e === 'string' ? e : (e?.message || 'Error')))
  }, [code])

  const pdfUrl = useMemo(() => edition ? (edition.file_url || `/api/e/${encodeURIComponent(edition.code)}/download`) : '', [edition])

  if (err) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">{err}</div></div>
  if (!edition) return <div className="max-w-4xl mx-auto p-6"><div className="card p-6">Cargando...</div></div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="card p-4">
        {edition.file_id ? (
          <MagazineViewer src={pdfUrl} />
        ) : (
          <div className="p-6 text-sm text-slate-600">Esta edicion aun no tiene un PDF disponible.</div>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Edicion {edition.code}</h1>
            <div className="text-sm text-slate-600">Fecha: {edition.date} - Numero de edicion: {edition.edition_no}</div>
            {edition.status && <div className="text-xs text-slate-500 mt-1">Estado: {edition.status}</div>}
          </div>
          <div className="flex gap-2">
            <a className="btn btn-primary inline-flex items-center gap-2" href={`${pdfUrl}?download=1`} target="_blank" rel="noreferrer">Descargar PDF</a>
          </div>
        </div>
      </div>
    </div>
  )
}
