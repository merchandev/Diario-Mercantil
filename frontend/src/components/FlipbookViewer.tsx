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
  const [creditVisible, setCreditVisible] = useState(true)

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
    if (!creditVisible) return
    const timer = setTimeout(() => setCreditVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [creditVisible])

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
      className="relative w-full overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#771919] via-[#6F0E15] to-[#4a090c] shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#771919] to-[#6F0E15] opacity-90" />

      <div
        className={`absolute top-4 right-4 z-20 transform transition-all duration-700 ${
          creditVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[0.55rem] uppercase tracking-[0.4em] text-white shadow-lg backdrop-blur">
          Visor · Espressivo
        </div>
      </div>

      <div className="relative z-10 flex min-h-[620px] w-full flex-col items-center justify-center gap-6 px-4 py-10 text-center text-white">
        <div className="flex flex-col items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/70">
          <span>Visor</span>
          <span className="text-[0.55rem] tracking-[0.45em]">Espressivo PDF</span>
        </div>

        <div className="w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 px-6 py-3 text-sm shadow-lg">
          {pages.length ? (
            <span className="font-semibold tracking-wide text-white">
              Página {currentPageIndex + 1} de {pages.length}
            </span>
          ) : (
            <span className="text-white/60">Cargando contenido…</span>
          )}
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 px-5 py-3">
            <p className="text-sm font-semibold text-rose-100">No se pudo cargar el PDF</p>
            <p className="text-xs text-rose-200">{error}</p>
          </div>
        )}

        {!loading && !error && pages.length > 0 && (
          <div className="w-full max-w-6xl px-3">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 -z-10 rounded-[36px] bg-gradient-to-br from-[#771919] via-[#6F0E15] to-[#4a090c]" />
              <HTMLFlipBook
                width={isMobile ? 300 : Math.min(bookWidth, 1100)}
                height={isMobile ? 400 : bookHeight}
                size="stretch"
                minWidth={280}
                maxWidth={1200}
                minHeight={380}
                maxHeight={1100}
                maxShadowOpacity={0.6}
                showCover={true}
                className="relative mx-auto rounded-[30px] border border-white/10 bg-white shadow-[0_35px_120px_rgba(0,0,0,0.65)]"
                ref={flipBookRef}
                onFlip={onFlip}
                drawShadow={true}
                flippingTime={650}
                useMouseEvents={!readMode}
              >
                {pages.map((p) => (
                  <div
                    key={p.num}
                    className="page flex items-center justify-center overflow-hidden rounded-[28px] bg-white px-6 py-4 drop-shadow-lg"
                  >
                    <img src={p.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                ))}
              </HTMLFlipBook>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/10 px-6 py-6 shadow-xl">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-transparent" />
            <p className="text-sm text-white/60">Procesando el documento…</p>
          </div>
        )}

        {!loading && pages.length === 0 && !error && (
          <div className="text-white/70">No hay páginas disponibles.</div>
        )}

        {!loading && pages.length > 0 && (
          <div className="flex w-full max-w-5xl items-center justify-between gap-4 px-6">
            <button
              onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
              disabled={currentPageIndex === 0}
              className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
              disabled={currentPageIndex >= pages.length - 1}
              className="flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {readMode && <ReadModeOverlay />}
      {gridView && <GridViewOverlay />}
    </div>
  )
}
