import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type Props = {
  src: string
  title: string
}

export default function PublicPdfViewer({ src, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [document, setDocument] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState(900)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width))
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    const task = pdfjs.getDocument({ url: src, withCredentials: true })
    setLoading(true)
    setError('')
    setDocument(null)
    setPageNumber(1)

    task.promise
      .then(pdf => {
        if (!active) {
          void pdf.destroy()
          return
        }
        setDocument(pdf)
      })
      .catch(error => {
        if (active) {
          console.error('No se pudo cargar la edición pública:', error)
          setError('No se pudo abrir el PDF de esta edición. Puede utilizar el botón “Descargar PDF”.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      void task.destroy()
    }
  }, [src])

  useEffect(() => {
    if (!document || !canvasRef.current) return
    let active = true
    let renderTask: ReturnType<pdfjs.PDFPageProxy['render']> | null = null
    setRendering(true)
    setError('')

    document.getPage(pageNumber)
      .then(page => {
        if (!active || !canvasRef.current) return
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas no disponible')

        const baseViewport = page.getViewport({ scale: 1 })
        const cssWidth = Math.max(280, Math.min(containerWidth - 32, 1100))
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: (cssWidth / baseViewport.width) * pixelRatio })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`
        renderTask = page.render({ canvasContext: context, viewport, canvas } as any)
        return renderTask.promise
      })
      .catch(error => {
        if (active && error?.name !== 'RenderingCancelledException') {
          console.error('No se pudo renderizar la página del PDF:', error)
          setError('No se pudo mostrar esta página del PDF.')
        }
      })
      .finally(() => {
        if (active) setRendering(false)
      })

    return () => {
      active = false
      renderTask?.cancel()
    }
  }, [document, pageNumber, containerWidth])

  const totalPages = document?.numPages || 0

  return (
    <div ref={containerRef} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label={title}>
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-200 bg-white p-3">
        <button type="button" className="btn btn-outline" disabled={!document || pageNumber <= 1} onClick={() => setPageNumber(page => page - 1)}>
          Anterior
        </button>
        <span className="min-w-32 text-center text-sm font-medium text-slate-700">
          {totalPages ? `Página ${pageNumber} de ${totalPages}` : 'Cargando edición…'}
        </span>
        <button type="button" className="btn btn-outline" disabled={!document || pageNumber >= totalPages} onClick={() => setPageNumber(page => page + 1)}>
          Siguiente
        </button>
      </div>

      <div className="relative flex min-h-[680px] items-start justify-center overflow-auto p-4">
        {(loading || rendering) && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/80 text-sm font-medium text-slate-600">
            {loading ? 'Cargando PDF…' : 'Cargando página…'}
          </div>
        )}
        {error ? (
          <div className="m-auto max-w-lg rounded-lg border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800" role="alert">{error}</div>
        ) : (
          <canvas ref={canvasRef} className="max-w-full bg-white shadow-lg" />
        )}
      </div>
    </div>
  )
}
