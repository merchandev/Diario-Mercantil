import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { fetchAuth } from '../lib/api'

type Props = { src: string; height?: number; watermark?: string }
export default function ProtectedPdfViewer({ src, height = 700, watermark }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(600)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(Math.max(100, element.clientWidth - 24)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    let cancelled = false
    let task: any
    setPdf(null); setPage(1); setError(''); setLoading(true)
    const load = async () => {
      try {
        const response = await fetchAuth(src, undefined, true)
        const data = new Uint8Array(await response.arrayBuffer())
        const { openPublicationPdf } = await import('../lib/publicationPdf')
        if (cancelled) return
        task = openPublicationPdf(data)
        const document = await task.promise
        if (!cancelled) setPdf(document)
      } catch (e: any) {
        if (!cancelled) setError(e.data?.error === 'FILE_MISSING' ? 'El documento no está disponible temporalmente. Contacte a administración.' : 'No se pudo visualizar el PDF. Compruebe que el archivo está disponible y es válido.')
      } finally { if (!cancelled) setLoading(false) }
    }
    if (src) void load(); else { setLoading(false); setError('PDF no disponible.') }
    return () => { cancelled = true; if (task) void task.destroy() }
  }, [src])
  useEffect(() => {
    if (!pdf || !canvas.current) return
    let cancelled = false
    let rendering: any
    const draw = async () => {
      try {
        const documentPage = await pdf.getPage(page)
        if (cancelled || !canvas.current) return
        const factor = window.devicePixelRatio || 1
        const base = documentPage.getViewport({ scale: 1 })
        const view = documentPage.getViewport({ scale: (width / base.width) * zoom * factor })
        const target = canvas.current
        target.width = Math.ceil(view.width); target.height = Math.ceil(view.height)
        target.style.width = Math.ceil(view.width / factor) + 'px'
        target.style.height = Math.ceil(view.height / factor) + 'px'
        rendering = documentPage.render({ canvas: target, canvasContext: target.getContext('2d')!, viewport: view })
        await rendering.promise
        if (!cancelled && stage.current) stage.current.scrollTop = 0
      } catch (e: any) { if (!cancelled && e.name !== 'RenderingCancelledException') setError('No se pudo mostrar esta página del PDF.') }
    }
    void draw()
    return () => { cancelled = true; rendering?.cancel() }
  }, [pdf, page, width, zoom])
  return <div className="relative border rounded-lg bg-slate-100 overflow-hidden flex flex-col min-w-0 w-full" style={{ height }}>
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-white text-xs shrink-0">
      <div className="flex items-center gap-2"><button type="button" aria-label="Página anterior" className="px-2 py-1 rounded border disabled:opacity-40" disabled={!pdf || page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{pdf ? 'Página ' + page + ' de ' + pdf.numPages : 'Documento PDF'}</span><button type="button" aria-label="Página siguiente" className="px-2 py-1 rounded border disabled:opacity-40" disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(page + 1)}>Siguiente</button></div>
      <select aria-label="Zoom del documento" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="border rounded p-1"><option value={1}>Ajustar al ancho</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option></select>
    </div>
    <div ref={stage} className="flex-1 min-h-0 overflow-auto p-3">
      {loading && <p role="status" className="text-center p-4">Cargando PDF...</p>}
      {error && <p role="alert" className="text-rose-700 p-4">{error}</p>}
      <canvas ref={canvas} className={'block mx-auto bg-white shadow ' + (!pdf || error ? 'hidden' : '')} />
    </div>
    {watermark && <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1 text-xs">{watermark}</div>}
  </div>
}
