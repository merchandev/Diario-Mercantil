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
  const meta = typeof req.meta === 'string'
    ? (() => { try { return JSON.parse(req.meta) } catch { return {} } })()
    : (req.meta || {})

  const razonSocial = meta.razon_denominacion_social || meta.razon_social || meta.razon_social_convocatoria || req.name || 'Sin especificar'

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="btn btn-ghost inline-flex items-center gap-2" onClick={()=>navigate(-1)}><IconArrowLeft/> Volver</button>
          <h1 className="text-xl font-semibold text-brand-800">Orden de Publicación</h1>
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Razón o Denominación Social</label>
          <div className="text-lg font-medium text-slate-900">{razonSocial}</div>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 font-semibold mb-1">CI / RIF</label>
            <div className="text-sm text-slate-900 font-mono">{req.document}</div>
          </div>
          {req.order_no && (
            <div>
              <label className="block text-xs text-slate-500 font-semibold mb-1">N° de Orden</label>
              <div className="text-sm text-slate-900 font-mono">{req.order_no}</div>
            </div>
          )}
          {meta.tipo_sociedad && (
            <div>
              <label className="block text-xs text-slate-500 font-semibold mb-1">Tipo de Sociedad</label>
              <div className="text-sm text-slate-900">{meta.tipo_sociedad}</div>
            </div>
          )}
          {meta.oficina && (
            <div>
              <label className="block text-xs text-slate-500 font-semibold mb-1">Oficina Registral</label>
              <div className="text-sm text-slate-900">{meta.oficina} ({meta.estado})</div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-start gap-4 border border-slate-100">
          <QRCode value={window.location.href} size={96} level="M" />
          <div className="text-sm text-slate-600 self-center">
            Escanea este código QR para verificar la autenticidad y estado de esta publicación directamente en el portal del Diario Mercantil de Venezuela.
          </div>
        </div>
      </div>

      <div className="card shadow-sm border border-slate-200">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Documento Publicado</h2>
          <div className="flex gap-2">
            {pdfUrl && <a className="btn btn-primary btn-sm inline-flex items-center gap-2" href={pdfUrl} target="_blank" rel="noreferrer">
              Descargar PDF
            </a>}
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
