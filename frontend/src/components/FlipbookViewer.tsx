import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import { fetchAuth } from '../lib/api'
import * as pdfjs from 'pdfjs-dist'
const { GlobalWorkerOptions, getDocument } = pdfjs
import { ChevronLeft, ChevronRight, ZoomIn, Grid, X } from 'lucide-react'

// Import worker as a static URL for Vite to process
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source immediately
GlobalWorkerOptions.workerSrc = pdfWorkerUrl
type Props = {
  src: string
  minHeight?: number
  height?: number
}

type FlipPage = { num: number; dataUrl: string; width: number; height: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export default function FlipbookViewer({ src, minHeight = 420, height }: Props) {
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

  const naturalHeight = useMemo(() => {
    const ratio = 1.414
    const w = containerWidth > 1000 ? 1000 : containerWidth
    return w / ratio
  }, [containerWidth])

  const viewerHeight = useMemo(() => {
    if (height) return height
    if (typeof window === 'undefined') return Math.max(minHeight, naturalHeight)
    return Math.max(minHeight, naturalHeight, window.innerHeight * 0.7)
  }, [height, minHeight, naturalHeight])

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

      const renderScale = 1.8

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: renderScale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport } as any).promise
        rendered.push({
          num: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
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

  const onFlip = useCallback((e: any) => {
    setCurrentPageIndex(e.data)
  }, [])

  const toggleReadMode = () => {
    setReadMode(prev => !prev)
    setGridView(false)
  }

  const toggleGridView = () => {
    setGridView(prev => !prev)
    setReadMode(false)
  }

  const goToPage = (index: number) => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flip(index)
    }
    setCurrentPageIndex(index)
    setGridView(false)
  }

  const nextReadPage = () => {
    setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1))
  }
  const prevReadPage = () => {
    setCurrentPageIndex(prev => Math.max(prev - 1, 0))
  }

  const isMobile = containerWidth < 920
  const bookWidth = clamp(containerWidth - 120, isMobile ? 320 : 640, 1200)
  const bookHeight = Math.min(viewerHeight - 160, 960)

  const ReadModeOverlay = () => {
    const page = pages[currentPageIndex]
    if (!page) return null

    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex flex-col animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="text-white font-medium tracking-wide">
            Página {page.num} de {pages.length}
          </div>
          <button
            onClick={() => setReadMode(false)}
            className="text-slate-200 hover:text-white transition"
            aria-label="Salir de lectura"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          <img
            src={page.dataUrl}
            alt={`Página ${page.num}`}
            className="max-h-[90vh] max-w-full shadow-2xl rounded-md"
          />
        </div>

        <div className="flex justify-center gap-3 py-4 border-t border-white/10 bg-slate-900/60">
          <button
            onClick={prevReadPage}
            disabled={currentPageIndex === 0}
            className="px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} /> Anterior
          </button>
          <button
            onClick={nextReadPage}
            disabled={currentPageIndex >= pages.length - 1}
            className="px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  const GridViewOverlay = () => (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Todas las páginas</h3>
        <button onClick={() => setGridView(false)} className="p-2 rounded-full border border-white/20 text-white">
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto">
        {pages.map((p, idx) => (
          <button
            key={p.num}
            onClick={() => goToPage(idx)}
            className={`group relative rounded-2xl overflow-hidden border border-white/10 ${currentPageIndex === idx ? 'ring-2 ring-emerald-500' : ''}`}
          >
            <img src={p.dataUrl} alt={`Pag ${p.num}`} className="w-full h-auto object-cover" />
            <div className="absolute bottom-0 inset-x-0 px-2 pb-1 text-center text-xs text-white/80 bg-gradient-to-t from-black/70 to-transparent">
              Página {p.num}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      style={{ minHeight: `${viewerHeight}px` }}
      className="relative w-full rounded-[32px] border border-white/15 shadow-[0_35px_80px_rgba(0,0,0,0.45)] overflow-hidden bg-gradient-to-br from-slate-950 to-slate-900 transition"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)] pointer-events-none" />

      <div className="absolute top-6 inset-x-0 z-10 px-6">
        <div className="mx-auto max-w-4xl bg-white/5 text-white border border-white/10 rounded-2xl px-4 py-2 shadow-lg backdrop-blur flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-200">
            Página {currentPageIndex + 1} / {pages.length || '--'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleReadMode}
              className="w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition"
              title="Modo lectura"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={toggleGridView}
              className="w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center transition"
              title="Ver todas las páginas"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/80 px-6">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full animate-spin" />
            <div className="absolute inset-4 border-2 border-brand-500 rounded-full animate-pulse" />
          </div>
          <p className="text-white/80 tracking-wider">Procesando documento…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 p-6">
          <div className="bg-rose-500/10 border border-rose-400/40 rounded-2xl px-6 py-4 text-center">
            <p className="text-rose-200 font-semibold text-lg mb-2">No se pudo cargar el PDF</p>
            <p className="text-white/70 text-sm">{error}</p>
          </div>
        </div>
      )}

      {readMode && <ReadModeOverlay />}
      {gridView && <GridViewOverlay />}

      {!loading && !error && pages.length > 0 && (
        <div className="relative flex items-center justify-center w-full h-full px-4 py-10">
          <div className="max-w-6xl w-full">
            <HTMLFlipBook
              width={isMobile ? 320 : Math.min(bookWidth, 1100)}
              height={isMobile ? 420 : bookHeight}
              size="stretch"
              minWidth={320}
              maxWidth={1200}
              minHeight={440}
              maxHeight={1200}
              maxShadowOpacity={0.4}
              showCover={false}
              className="mx-auto rounded-2xl shadow-[0_35px_80px_rgba(0,0,0,0.6)]"
              ref={flipBookRef}
              onFlip={onFlip}
              drawShadow={true}
              flippingTime={600}
              useMouseEvents={!readMode}
            >
              {pages.map((p) => (
                <div
                  key={p.num}
                  className="page bg-white rounded-2xl overflow-hidden border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.45)]"
                >
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img src={p.dataUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        </div>
      )}

      {!loading && !error && pages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60">
          No hay páginas disponibles.
        </div>
      )}
    </div>
  )
}
