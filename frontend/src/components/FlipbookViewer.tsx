import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { fetchAuth } from '../lib/api'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut, Grid, X, Loader2 } from 'lucide-react'

// Worker will be loaded dynamically when component mounts

type Props = {
  src: string
  minHeight?: number
  height?: number
}

type FlipPage = { num: number; dataUrl: string; width: number; height: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export default function FlipbookViewer({ src, minHeight = 380, height }: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(520)
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null)

  // Controls
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [readMode, setReadMode] = useState(false)
  const [gridView, setGridView] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const flipBookRef = useRef<any>(null)

  // Determine container dimensions
  const naturalHeight = useMemo(() => {
    // Basic ratio calculation
    const ratio = 1.414 // A4 aspect ratio approx
    const w = containerWidth > 900 ? 900 : containerWidth
    return w / ratio
  }, [containerWidth])

  const viewerHeight = height ?? Math.max(minHeight, naturalHeight)

  const loadBuffer = useCallback(async () => {
    if (!src) return
    setLoading(true)
    setError(null)
    setPages([])
    setPdfBuffer(null)
    try {
      const absoluteUrl = src.startsWith('http') ? src : new URL(src, window.location.origin).toString()
      const res = await fetchAuth(absoluteUrl, undefined, true)
      if (!res.ok) throw new Error('Error al descargar el documento')
      const buffer = await res.arrayBuffer()
      setPdfBuffer(buffer)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el PDF')
      console.error('Flipbook load error', err)
      setLoading(false)
    }
  }, [src])

  // Load PDF.js worker dynamically
  useEffect(() => {
    const loadWorker = async () => {
      try {
        const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        GlobalWorkerOptions.workerSrc = workerModule.default as string
      } catch (err) {
        console.error('Failed to load PDF.js worker:', err)
      }
    }
    loadWorker()
  }, [])


  function cloneBuffer(buf: ArrayBuffer): ArrayBuffer {
    const copy = new ArrayBuffer(buf.byteLength)
    new Uint8Array(copy).set(new Uint8Array(buf))
    return copy
  }

  const renderPages = useCallback(async (buffer: ArrayBuffer) => {
    setLoading(true)
    setPages([])
    try {
      const safeBuffer = cloneBuffer(buffer)
      const pdf = await getDocument({ data: safeBuffer }).promise
      const rendered: FlipPage[] = []

      // Render pages with good quality for flipbook
      const renderScale = 1.5

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: renderScale })

        // Use a temporary canvas to render
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport } as any).promise
        rendered.push({
          num: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: viewport.width,
          height: viewport.height
        })
      }
      setPages(rendered)
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el PDF')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBuffer()
  }, [loadBuffer])

  useEffect(() => {
    if (!pdfBuffer) return
    renderPages(pdfBuffer)
  }, [pdfBuffer, renderPages])

  // Responsive observer
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])


  // Handlers
  const onFlip = useCallback((e: any) => {
    setCurrentPageIndex(e.data)
  }, [])

  const toggleReadMode = () => {
    setReadMode(!readMode)
    setGridView(false)
  }

  const toggleGridView = () => {
    setGridView(!gridView)
    setReadMode(false)
  }

  const goToPage = (index: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(index)
    }
    setCurrentPageIndex(index)
    setGridView(false)
    // If we are in read mode, we just update the index, no need to flip the book instance visually if hidden
  }

  // --- Read Mode Controls ---
  const nextReadPage = () => {
    setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1))
  }
  const prevReadPage = () => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0))
  }

  // Calculate flipbook dimensions
  // We want a two-page spread if width allows, or single page if mobile
  // But react-pageflip is tricky. For now, let's stick to valid dimensions.
  const isMobile = containerWidth < 600
  const bookWidth = isMobile ? containerWidth : Math.min(containerWidth, 1000)
  const bookHeight = Math.min(viewerHeight, 700)

  // Read Mode Component
  const ReadModeOverlay = () => {
    const page = pages[currentPageIndex]
    if (!page) return null

    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex flex-col animate-in fade-in duration-200">
        {/* Header Controls */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
          <div className="text-white font-medium">
            Página {page.num} de {pages.length}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReadMode(false)} className="p-2 hover:bg-white/10 rounded-full text-white" title="Cerrar modo lectura">
              <Minimize2 size={20} />
            </button>
            <button onClick={() => setReadMode(false)} className="p-2 hover:bg-red-500/20 rounded-full text-white" title="Cerrar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-4 sm:p-8">
          <img
            src={page.dataUrl}
            alt={`Página ${page.num}`}
            className="max-w-full h-auto shadow-2xl rounded-sm"
            style={{ maxHeight: 'none' }} // Allow full scrolling
          />
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-white/10 flex justify-center gap-4 bg-slate-900/50">
          <button
            onClick={prevReadPage}
            disabled={currentPageIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          <button
            onClick={nextReadPage}
            disabled={currentPageIndex === pages.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // Grid View Component
  const GridViewOverlay = () => {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur overflow-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Todas las páginas</h3>
          <button onClick={() => setGridView(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
            <X size={24} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pages.map((p, idx) => (
            <button
              key={p.num}
              onClick={() => goToPage(idx)}
              className={`group relative aspect-[1/1.4] bg-white rounded-lg overflow-hidden transition-all hover:scale-105 focus:ring-2 ring-blue-500 outline-none ${currentPageIndex === idx ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''}`}
            >
              <img src={p.dataUrl} alt={`Pag ${p.num}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 py-1 bg-black/60 text-center text-xs text-white">
                {p.num}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-white/10"
      style={{ height: height ? height : 'auto', minHeight: '600px' }}
    >
      {/* Floating Controls */}
      <div className="absolute top-16 right-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-950/80 backdrop-blur border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 shadow-lg">
          <button
            onClick={toggleReadMode}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Modo Lectura / Zoom"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={toggleGridView}
            className="p-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Ver todas las páginas"
          >
            <Grid size={20} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-3 text-emerald-500" />
          <p className="text-sm font-medium">Procesando documento...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900 p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-sm">
            <div className="text-red-400 font-medium mb-1">Error</div>
            <p className="text-red-300/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Overlays */}
      {readMode && <ReadModeOverlay />}
      {gridView && <GridViewOverlay />}

      {/* Main Flipbook */}
      {!loading && !error && pages.length > 0 && (
        <div className={`w-full h-full flex items-center justify-center py-8 transition-opacity duration-300 ${readMode || gridView ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Mobile view often needs simple scroller or single page, but let's try flipbook first */}
          <HTMLFlipBook
            width={isMobile ? 320 : 450}
            height={isMobile ? 450 : 600}
            size="stretch"
            minWidth={300}
            maxWidth={1000}
            minHeight={400}
            maxHeight={1400}
            maxShadowOpacity={0.5}
            showCover={false}

            className="mx-auto flipbook-shadow"
            ref={flipBookRef}
            onFlip={onFlip}
            startPage={currentPageIndex}
            drawShadow={true}
            flippingTime={800}
            useMouseEvents={!readMode}
          >
            {pages.map((p) => (
              <div key={p.num} className="page bg-white relative overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                  <img src={p.dataUrl} alt="" className="max-w-full max-h-full shadow-sm select-none" />
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] sm:text-xs text-slate-400 font-medium font-mono uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-full">
                  Página {p.num}
                </div>
                {/* Gradient spine effect for realism */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none mix-blend-multiply" />
              </div>
            ))}
          </HTMLFlipBook>
        </div>
      )}

      {/* Default text if no pages */}
      {!loading && !error && pages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          No hay páginas para mostrar
        </div>
      )}
    </div>
  )
}

