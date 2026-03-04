import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import HTMLFlipBook from 'react-pageflip'
import { fetchAuth } from '../lib/api'
import * as pdfjs from 'pdfjs-dist'

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Types ──────────────────────────────────────────────────────────────────

type FlipPage = {
  num: number
  dataUrl: string
  width: number
  height: number
}

type Props = {
  /** URL (absolute or relative) of the PDF to display */
  src: string
  /** Minimum height in pixels (defaults to 480) */
  minHeight?: number
  /** Fixed height in pixels — overrides auto height calculation */
  height?: number
  /** Extra CSS class names to apply to the root wrapper */
  className?: string
  /** Callback fired when the visible page changes */
  onPageChange?: (pageIndex: number) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RENDER_SCALE = 2.2       // supersampled for sharpness
const FLIP_TIME = 780       // ms for page-flip animation
const SHADOW_OP = 0.55      // max shadow opacity on flip

// ─── Helper ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// ─── Single-page overlay for READ mode ───────────────────────────────────────

function ReadModeOverlay({
  pages,
  pageIndex,
  onClose,
}: {
  pages: FlipPage[]
  pageIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(pageIndex)
  const page = pages[idx]
  if (!page) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-sm animate-fadein"
      style={{ animation: 'flipbook-fadein 0.2s ease' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <span className="text-white/80 text-sm font-semibold tracking-wide">
          Página {page.num} <span className="text-white/40">/ {pages.length}</span>
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          aria-label="Cerrar vista de lectura"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* page image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={page.dataUrl}
          alt={`Página ${page.num}`}
          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
          style={{ userSelect: 'none' }}
        />
      </div>

      {/* navigation */}
      <div className="flex items-center justify-center gap-3 py-4 border-t border-white/10 shrink-0">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/20 transition"
        >
          ← Anterior
        </button>
        {/* page dots (max 9 visible) */}
        <div className="flex gap-1">
          {pages.slice(Math.max(0, idx - 4), Math.min(pages.length, idx + 5)).map((p, i) => (
            <button
              key={p.num}
              onClick={() => setIdx(Math.max(0, idx - 4) + i)}
              className={`w-2 h-2 rounded-full transition ${Math.max(0, idx - 4) + i === idx ? 'bg-white scale-125' : 'bg-white/30'
                }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(i => Math.min(pages.length - 1, i + 1))}
          disabled={idx >= pages.length - 1}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/20 transition"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}

// ─── Grid-thumbnail overlay ───────────────────────────────────────────────────

function GridOverlay({
  pages,
  currentIdx,
  onSelect,
  onClose,
}: {
  pages: FlipPage[]
  currentIdx: number
  onSelect: (idx: number) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/96 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <h3 className="text-white font-semibold tracking-wide">Todas las páginas</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          aria-label="Cerrar galería"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      >
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
        >
          {pages.map((p, idx) => (
            <button
              key={p.num}
              onClick={() => onSelect(idx)}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${currentIdx === idx
                ? 'border-[#e63d3d] scale-[1.03] shadow-[0_0_0_3px_rgba(230,61,61,0.35)]'
                : 'border-white/10 hover:border-white/40 hover:scale-[1.02]'
                }`}
              aria-label={`Ir a página ${p.num}`}
            >
              <img
                src={p.dataUrl}
                alt={`Pág. ${p.num}`}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 inset-x-0 py-1 text-center text-[10px] text-white/80 bg-gradient-to-t from-black/80 to-transparent font-medium">
                {p.num}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FlipbookViewer({
  src,
  minHeight = 480,
  height,
  className = '',
  onPageChange,
}: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [showGrid, setShowGrid] = useState(false)
  const [showRead, setShowRead] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const flipBookRef = useRef<any>(null)
  const [containerW, setContainerW] = useState(800)

  // ── Track container width with ResizeObserver ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Fullscreen sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showGrid || showRead) return
      if (e.key === 'ArrowRight') flipBookRef.current?.pageFlip()?.flipNext()
      if (e.key === 'ArrowLeft') flipBookRef.current?.pageFlip()?.flipPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showGrid, showRead])

  // ── Load PDF buffer ────────────────────────────────────────────────────────
  const loadAndRender = useCallback(async () => {
    if (!src) return
    setLoading(true)
    setError(null)
    setPages([])
    setPageIndex(0)
    setLoadProgress(0)

    try {
      const isSameOrigin =
        !src.startsWith('http') ||
        src.startsWith(window.location.origin)

      let buffer: ArrayBuffer

      if (isSameOrigin) {
        // Same-origin API path → use fetchAuth (sends JWT if present)
        const absoluteUrl = src.startsWith('http')
          ? src
          : new URL(src, window.location.origin).toString()
        const res = await fetchAuth(absoluteUrl, undefined, true)
        if (!res.ok) throw new Error(`Error al descargar el PDF (${res.status})`)
        buffer = await res.arrayBuffer()
      } else {
        // External URL (CDN, S3, etc.) → plain fetch, no auth headers
        const res = await fetch(src)
        if (!res.ok) throw new Error(`Error al descargar el PDF (${res.status})`)
        buffer = await res.arrayBuffer()
      }

      // Clone to avoid detached-buffer issues with pdfjs
      const copy = new ArrayBuffer(buffer.byteLength)
      new Uint8Array(copy).set(new Uint8Array(buffer))

      const pdf = await pdfjs.getDocument({ data: copy }).promise
      const totalPages = pdf.numPages
      const rendered: FlipPage[] = []

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: RENDER_SCALE * dpr })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        await page.render({ canvasContext: ctx, viewport } as any).promise

        rendered.push({
          num: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          width: viewport.width / dpr,
          height: viewport.height / dpr,
        })

        setLoadProgress(Math.round((i / totalPages) * 100))
      }

      setPages(rendered)
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el PDF')
      console.error('[FlipbookViewer] error:', err)
    } finally {
      setLoading(false)
    }
  }, [src])

  useEffect(() => { loadAndRender() }, [loadAndRender])

  // ── Derived dimensions ─────────────────────────────────────────────────────
  const isMobile = containerW < 700
  const isTablet = containerW >= 700 && containerW < 1100

  // Single-page width (mobile) or double-page spread (desktop)
  // We aim for max viewport usage while keeping A4 ratio (1:√2 ≈ 0.707)
  const PAGE_RATIO = 1 / 1.414  // width / height for a single A4 page

  let bookPageW: number
  let bookPageH: number

  if (isMobile) {
    bookPageW = clamp(containerW - 32, 280, 480)
    bookPageH = Math.round(bookPageW / PAGE_RATIO)
  } else if (isTablet) {
    // double page, half container each
    bookPageW = clamp((containerW - 80) / 2, 300, 560)
    bookPageH = Math.round(bookPageW / PAGE_RATIO)
  } else {
    bookPageW = clamp((containerW - 120) / 2, 340, 680)
    bookPageH = Math.round(bookPageW / PAGE_RATIO)
  }

  const viewerH = height ?? Math.max(minHeight, bookPageH + 120)

  // ── Flip event ─────────────────────────────────────────────────────────────
  const onFlip = useCallback((e: any) => {
    const idx = e.data as number
    setPageIndex(idx)
    onPageChange?.(idx)
  }, [onPageChange])

  const goToPage = (idx: number) => {
    flipBookRef.current?.pageFlip()?.flip(idx)
    setPageIndex(idx)
    setShowGrid(false)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.warn)
    } else {
      document.exitFullscreen()
    }
  }

  const totalPages = pages.length
  const progressPct = totalPages ? Math.round(((pageIndex + (isMobile ? 1 : 2)) / totalPages) * 100) : 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes flipbook-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes flipbook-spin    { to { transform: rotate(360deg) } }
        @keyframes badge-enter {
          0%   { opacity: 0; transform: translate(12px, -8px) scale(0.9); }
          15%  { opacity: 1; transform: translate(0, 0) scale(1); }
          75%  { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(6px, -4px) scale(0.95); }
        }
        .flipbook-badge {
          animation: badge-enter 6s cubic-bezier(0.4,0,0.2,1) forwards;
          pointer-events: none;
        }
        .flipbook-page {
          background: #fff;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flipbook-page img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>

      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden select-none ${className}`}
        style={{
          minHeight: isFullscreen ? '100vh' : `${viewerH}px`,
          height: isFullscreen ? '100vh' : undefined,
          background: 'linear-gradient(145deg, #6b1111 0%, #7a1515 40%, #4a0a0a 100%)',
          borderRadius: isFullscreen ? 0 : 28,
          boxShadow: isFullscreen ? 'none' : '0 40px 120px rgba(0,0,0,0.6)',
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 0%, rgba(255,120,120,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(0,0,0,0.3) 0%, transparent 60%)',
          }}
        />

        {/* ── LOADING STATE ── */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-6">
            {/* Animated spinner */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full border-4 border-white/10"
                style={{ borderTopColor: 'rgba(255,255,255,0.7)', animation: 'flipbook-spin 0.9s linear infinite' }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-bold">
                {loadProgress}%
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-white/90 text-sm font-semibold tracking-wide">Preparando edición digital…</p>
              <p className="text-white/40 text-xs">Procesando páginas del documento</p>
            </div>
            {/* Progress bar */}
            <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${loadProgress}%`, background: 'linear-gradient(90deg, #e63d3d, #ff8080)' }}
              />
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {!loading && error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-8 py-6 text-center max-w-sm">
              <div className="text-3xl mb-3">📄</div>
              <p className="text-rose-100 font-semibold text-sm mb-1">No se pudo cargar el PDF</p>
              <p className="text-rose-200/70 text-xs">{error}</p>
              <button
                onClick={loadAndRender}
                className="mt-4 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs hover:bg-white/20 transition"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && !error && pages.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <p className="text-white/40 text-sm">No hay páginas disponibles.</p>
          </div>
        )}

        {/* ── FLIPBOOK ── */}
        {!loading && pages.length > 0 && (
          <div className="relative z-10 flex flex-col items-center w-full h-full py-8 px-2 gap-4">

            {/* Brand badge — top-right corner, appears then fades after 6s */}
            <div
              className="flipbook-badge absolute top-4 right-5 z-30"
            >
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-white/20"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
              >
                <span className="text-[9px] uppercase tracking-[0.45em] text-white/60 font-semibold">Visor · Espressivo PDF</span>
              </div>
            </div>

            {/* ── Book area ── */}
            <div
              className="relative flex items-center justify-center flex-1 w-full"
              style={{ minHeight: bookPageH + 20 }}
            >
              {/* Shadow under book */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  width: isMobile ? bookPageW * 0.8 : bookPageW * 1.6,
                  height: 30,
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
              />

              {/* react-pageflip */}
              {/* @ts-ignore – extended props valid at runtime */}
              <HTMLFlipBook
                width={bookPageW}
                height={bookPageH}
                size="stretch"
                minWidth={isMobile ? 240 : 280}
                maxWidth={isMobile ? 520 : 760}
                minHeight={isMobile ? 340 : 400}
                maxHeight={1400}
                maxShadowOpacity={0.7}
                showCover={true}
                className="flipbook-root"
                ref={flipBookRef}
                onFlip={onFlip}
                drawShadow={true}
                flippingTime={1050}
                useMouseEvents={true}
                startPage={0}
                style={{}}
              >
                {pages.map((p) => (
                  <div key={p.num} className="flipbook-page">
                    <img
                      src={p.dataUrl}
                      alt={`Página ${p.num}`}
                      draggable={false}
                    />
                  </div>
                ))}
              </HTMLFlipBook>
            </div>

            {/* ── Controls bar ── */}
            <div
              className="flex items-center justify-between gap-2 w-full max-w-2xl px-4 py-2.5 rounded-2xl"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Prev */}
              <button
                onClick={() => flipBookRef.current?.pageFlip()?.flipPrev()}
                disabled={pageIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white/80 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                aria-label="Página anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                {!isMobile && <span>Anterior</span>}
              </button>

              {/* Center: page info + progress bar + actions */}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-white/70 text-xs font-medium tracking-wide">
                  {isMobile
                    ? `${pageIndex + 1} / ${totalPages}`
                    : `Pág. ${pageIndex + 1}${pageIndex + 1 < totalPages ? `–${pageIndex + 2}` : ''} de ${totalPages}`
                  }
                </span>
                {/* Progress bar */}
                <div className="w-full max-w-xs h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #e63d3d, #ff9090)' }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Read mode */}
                <button
                  onClick={() => setShowRead(true)}
                  title="Leer esta página"
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
                  aria-label="Ver página completa"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                </button>

                {/* Grid */}
                <button
                  onClick={() => setShowGrid(true)}
                  title="Ver todas las páginas"
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
                  aria-label="Galería de páginas"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
                  aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                  )}
                </button>
              </div>

              {/* Next */}
              <button
                onClick={() => flipBookRef.current?.pageFlip()?.flipNext()}
                disabled={pageIndex >= totalPages - (isMobile ? 1 : 2)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white/80 text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                aria-label="Siguiente página"
              >
                {!isMobile && <span>Siguiente</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ── Overlays (rendered outside container to cover screen) ── */}
      {showRead && (
        <ReadModeOverlay
          pages={pages}
          pageIndex={pageIndex}
          onClose={() => setShowRead(false)}
        />
      )}
      {showGrid && (
        <GridOverlay
          pages={pages}
          currentIdx={pageIndex}
          onSelect={goToPage}
          onClose={() => setShowGrid(false)}
        />
      )}
    </>
  )
}
