import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { type LegalRequest } from '../lib/api'
import QRCode from 'qrcode.react'
import { IconArrowLeft } from '../components/icons'
import ProtectedPdfViewer from '../components/ProtectedPdfViewer'

export default function PublicacionPublic(){
  const { orden, razon } = useParams<{orden:string; razon?:string}>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState<LegalRequest|null>(null)
  const [error, setError] = useState<string|null>(null)

  useEffect(()=>{
    if(!orden) return
    setLoading(true)
    setError(null)
    fetch(`/api/public/publicaciones/${orden}`)
      .then(async(res) => {
        if(!res.ok) throw new Error('Publicacion no encontrada')
        const data = await res.json()
        setReq(data.item)
      })
      .catch(err => {
        setError(err.message || 'No se pudo cargar la publicacion')
      })
      .finally(()=> setLoading(false))
  }, [orden])

  const pdfUrl = useMemo(()=>{
    if (!req?.files || req.files.length===0) return null
    const file = req.files[0]
    return `/api/public/uploads/${file.id}`
  }, [req])

  if (loading) return <div className="max-w-3xl mx-auto p-6"><div className="card p-6">Cargando...</div></div>
  if (error) return <div className="max-w-3xl mx-auto p-6"><div className="card p-6 text-rose-700">{error}</div></div>
  if (!req) return <div className="max-w-3xl mx-auto p-6"><div className="card p-6">No encontrado</div></div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost" onClick={()=>navigate(-1)}><IconArrowLeft/> Volver</button>
        <h1 className="text-xl font-semibold">Publicacion #{req.id}</h1>
      </div>

      <div className="card p-4 flex flex-col gap-2">
        <div className="text-sm text-slate-600">{req.name}</div>
        <div className="text-xs text-slate-500">{req.document}</div>
        {req.order_no && <div className="text-xs text-slate-500">Orden: {req.order_no}</div>}
        <div className="mt-2">
          <QRCode value={window.location.href} size={96} />
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Documento PDF</h2>
          <div className="flex gap-2">
            {pdfUrl && <a className="btn btn-primary" href={pdfUrl} target="_blank" rel="noreferrer">Descargar</a>}
          </div>
        </div>
        {pdfUrl ? (
          <ProtectedPdfViewer src={pdfUrl} height={600} />
        ) : (
          <div className="p-6 text-sm text-slate-600">No hay PDF adjunto para esta publicacion.</div>
        )}
      </div>
    </div>
  )
}
