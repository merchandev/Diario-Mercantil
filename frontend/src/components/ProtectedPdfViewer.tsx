import { useEffect, useRef, useState } from 'react'
import { fetchAuth } from '../lib/api'

type Props = {
  src: string
  height?: number
  watermark?: string
}

export default function ProtectedPdfViewer({ src, height = 700, watermark }: Props){
  const iframeRef = useRef<HTMLIFrameElement|null>(null)
  const objectUrlRef = useRef<string|null>(null)
  const [blobUrl, setBlobUrl] = useState<string|null>(null)
  const [error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    let cancelled = false
    const load = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      if (!src) {
        setError('PDF no disponible')
        setBlobUrl(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const absoluteUrl = src.startsWith('http') ? src : new URL(src, window.location.origin).toString()
        const res = await fetchAuth(absoluteUrl, undefined, true)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrlRef.current = url
        setBlobUrl(url)
        if (iframeRef.current) iframeRef.current.scrollTo(0, 0)
      } catch (err) {
        console.error('Error cargando PDF:', err)
        if (!cancelled) {
          setError('Error al cargar el PDF')
          setBlobUrl(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [src])

  return (
    <div className="relative bg-slate-50 border rounded-lg overflow-hidden" style={{ height: `${height}px` }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/70 text-slate-600 text-sm">
          Cargando PDF...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-rose-50 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {blobUrl && !error && (
        <iframe
          ref={iframeRef}
          title="PDF"
          src={blobUrl}
          className="w-full"
          style={{ height: `${height}px`, border: 'none' }}
        />
      )}
      {watermark && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded text-xs pointer-events-none">
          {watermark}
        </div>
      )}
    </div>
  )
}
