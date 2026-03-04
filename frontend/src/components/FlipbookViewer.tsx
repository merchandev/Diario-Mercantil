/**
 * FlipbookViewer — Premium magazine-style PDF viewer
 *
 * • Portada (página 1) sola al inicio
 * • Spreads dobles (2 páginas) en adelante
 * • Animación CSS 3D (rotateY + backface-visibility)
 * • Botones Anterior/Siguiente siempre accesibles (fuera del overflow)
 * • Teclas ← → del teclado
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAuth } from '../lib/api'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Types ────────────────────────────────────────────────────────────────────

type FlipPage = { num: number; dataUrl: string }

type Props = {
  src: string
  minHeight?: number
  height?: number
  className?: string
  onPageChange?: (pageIndex: number) => void
}

// ─── Spread helpers ───────────────────────────────────────────────────────────

function spreadPages(pages: FlipPage[], s: number) {
  if (s === 0) return { left: undefined, right: pages[0] }
  const base = 2 * s - 1
  return { left: pages[base], right: pages[base + 1] }
}

function maxSpreadFor(pages: FlipPage[]) {
  if (pages.length === 0) return 0
  return Math.ceil((pages.length - 1) / 2)
}

function spreadToPageIdx(s: number) {
  return s === 0 ? 0 : 2 * s - 1
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Single page face ─────────────────────────────────────────────────────────

const PageFace = ({
  page, w, h, style = {},
}: { page?: FlipPage; w: number; h: number; style?: React.CSSProperties }) => (
  <div style={{
    width: w, height: h,
    background: page ? '#fff' : 'transparent',
    overflow: 'hidden',
    userSelect: 'none',
    flexShrink: 0,
    ...style,
  }}>
    {page && (
      <img
        src={page.dataUrl}
        alt={`Página ${page.num}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
      />
    )}
  </div>
)

// ─── Folding page ─────────────────────────────────────────────────────────────

interface FoldProps {
  frontPage?: FlipPage
  backPage?: FlipPage
  flipAngle: number
  side: 'right' | 'left'
  pageW: number
  pageH: number
}

function FoldingPage({ frontPage, backPage, flipAngle, side, pageW, pageH }: FoldProps) {
  const shadowT = flipAngle < 90 ? flipAngle / 90 : (180 - flipAngle) / 90
  const shadowA = shadowT * 0.45
  const rotateY = side === 'right' ? -flipAngle : flipAngle
  const origin = side === 'right' ? 'left center' : 'right center'

  const shadowFront = side === 'right'
    ? `linear-gradient(to left, rgba(0,0,0,${shadowA}), transparent 55%)`
    : `linear-gradient(to right, rgba(0,0,0,${shadowA}), transparent 55%)`
  const shadowBack = side === 'right'
    ? `linear-gradient(to right, rgba(0,0,0,${shadowA}), transparent 55%)`
    : `linear-gradient(to left, rgba(0,0,0,${shadowA}), transparent 55%)`

  return (
    <div style={{
      position: 'absolute',
      [side === 'right' ? 'right' : 'left']: 0,
      top: 0,
      width: pageW, height: pageH,
      transformOrigin: origin,
      transform: `rotateY(${rotateY}deg)`,
      transformStyle: 'preserve-3d',
      zIndex: 8,
    }}>
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
        <PageFace page={frontPage} w={pageW} h={pageH} />
        <div style={{ position: 'absolute', inset: 0, background: shadowFront, pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', overflow: 'hidden' }}>
        <PageFace page={backPage} w={pageW} h={pageH} style={{ transform: 'scaleX(-1)' }} />
        <div style={{ position: 'absolute', inset: 0, background: shadowBack, transform: 'scaleX(-1)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function ReadOverlay({ pages, startIdx, onClose }: { pages: FlipPage[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Página {idx + 1} / {pages.length}</span>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
        {pages[idx] && <img src={pages[idx].dataUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)} style={{ padding: '6px 18px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)', background: idx === 0 ? 'transparent' : 'rgba(255,255,255,0.09)', color: idx === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>‹ Anterior</button>
        <button disabled={idx >= pages.length - 1} onClick={() => setIdx(i => i + 1)} style={{ padding: '6px 18px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)', background: idx >= pages.length - 1 ? 'transparent' : 'rgba(255,255,255,0.09)', color: idx >= pages.length - 1 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, cursor: idx >= pages.length - 1 ? 'not-allowed' : 'pointer' }}>Siguiente ›</button>
      </div>
    </div>
  )
}

function GridOverlay({ pages, currentIdx, onSelect, onClose }: { pages: FlipPage[]; currentIdx: number; onSelect: (i: number) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>Todas las páginas</span>
        <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 }}>
        {pages.map((p, i) => (
          <button
            key={p.num}
            onClick={() => { onSelect(i); onClose() }}
            style={{ border: i === currentIdx ? '2px solid #e63d3d' : '2px solid rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', padding: 0, background: 'none', cursor: 'pointer' }}
          >
            <img src={p.dataUrl} alt="" style={{ width: '100%', display: 'block' }} />
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 10, padding: '2px 0', background: 'rgba(0,0,0,0.55)' }}>{p.num}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── NAV BUTTON (grande, accesible, siempre clickeable) ───────────────────────

function NavBtn({
  dir, disabled, onClick,
}: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const isPrev = dir === 'prev'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 22px',
        borderRadius: 36,
        border: disabled ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(255,255,255,0.3)',
        background: disabled
          ? 'rgba(255,255,255,0.04)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)',
        color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
        fontSize: 14,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.03em',
        backdropFilter: 'blur(12px)',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'all 0.18s ease',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: 0,
        minWidth: 120,
        justifyContent: 'center',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {isPrev && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      )}
      <span>{isPrev ? 'Anterior' : 'Siguiente'}</span>
      {!isPrev && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  )
}

// ─── FlipEngine ───────────────────────────────────────────────────────────────

function FlipEngine({ pages, onPageChange }: { pages: FlipPage[]; onPageChange?: (idx: number) => void }) {
  const [spread, setSpread] = useState(0)
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)
  const [flipAngle, setFlipAngle] = useState(0)

  const raf = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(900)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = containerW < 620
  const pageW = isMobile ? Math.min(containerW - 16, 380) : Math.floor((containerW - 60) / 2)
  const pageH = Math.round(pageW / 0.707)
  const maxS = maxSpreadFor(pages)

  const cur = spreadPages(pages, spread)
  const nxt = spreadPages(pages, spread + 1)
  const prv = spreadPages(pages, spread - 1)

  // ── animate flip ──────────────────────────────────────────────────────────────
  const doFlip = useCallback((dir: 'next' | 'prev') => {
    if (flipping) return
    if (dir === 'next' && spread >= maxS) return
    if (dir === 'prev' && spread <= 0) return
    setFlipping(dir)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 680, 1)
      setFlipAngle(easeInOut(p) * 180)
      if (p < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setFlipAngle(0)
        setFlipping(null)
        setSpread(s => {
          const ns = dir === 'next' ? s + 1 : s - 1
          onPageChange?.(spreadToPageIdx(ns))
          return ns
        })
      }
    }
    raf.current = requestAnimationFrame(tick)
  }, [flipping, spread, maxS, onPageChange])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') doFlip('next')
      if (e.key === 'ArrowLeft') doFlip('prev')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [doFlip])

  const totalPages = pages.length
  const curPageNum = spreadToPageIdx(spread) + 1
  const curMaxPage = cur.right ? curPageNum + (cur.left ? 1 : 0) : curPageNum
  const pct = Math.round((curMaxPage / totalPages) * 100)

  const bgLeft = flipping === 'next' ? cur.left : flipping === 'prev' ? prv.left : cur.left
  const bgRight = flipping === 'next' ? nxt.left : flipping === 'prev' ? cur.right : cur.right

  const foldFront = flipping === 'next' ? cur.right : cur.left
  const foldBack = flipping === 'next' ? nxt.left : prv.right

  // ── Mobile: single page ───────────────────────────────────────────────────────
  if (isMobile) {
    const visiblePage = cur.left ?? cur.right
    return (
      <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Book */}
        <div style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
          <PageFace page={visiblePage} w={pageW} h={pageH} />
        </div>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <NavBtn dir="prev" disabled={spread <= 0} onClick={() => doFlip('prev')} />
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600 }}>{curPageNum}/{totalPages}</span>
          <NavBtn dir="next" disabled={spread >= maxS} onClick={() => doFlip('next')} />
        </div>
      </div>
    )
  }

  // ── Desktop spread ────────────────────────────────────────────────────────────
  const isCover = spread === 0

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      {/* Book viewport */}
      <div style={{ perspective: '1800px', perspectiveOrigin: '50% 40%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex',
          transformStyle: 'preserve-3d',
          position: 'relative',
          boxShadow: '0 44px 110px rgba(0,0,0,0.75)',
        }}>
          {/* Background pages */}
          {flipping ? (
            <>
              <PageFace page={bgLeft} w={pageW} h={pageH} />
              <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.22),rgba(0,0,0,0.08),transparent)', flexShrink: 0 }} />
              <PageFace page={bgRight} w={pageW} h={pageH} />
            </>
          ) : (
            <>
              {isCover ? (
                <>
                  <div style={{ width: pageW, height: pageH, background: 'rgba(0,0,0,0.18)', flexShrink: 0 }} />
                  <div style={{ width: 3, background: 'rgba(0,0,0,0.2)', flexShrink: 0 }} />
                  <PageFace page={cur.right} w={pageW} h={pageH} />
                </>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <PageFace page={cur.left} w={pageW} h={pageH} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.16),transparent)', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.22),rgba(0,0,0,0.07),transparent)', flexShrink: 0 }} />
                  <div style={{ position: 'relative' }}>
                    <PageFace page={cur.right} w={pageW} h={pageH} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 22, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.16),transparent)', pointerEvents: 'none' }} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Folding overlay */}
          {flipping && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              <FoldingPage
                frontPage={foldFront}
                backPage={foldBack}
                flipAngle={flipAngle}
                side={flipping === 'next' ? 'right' : 'left'}
                pageW={pageW}
                pageH={pageH}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar — OUTSIDE the book, no overflow clipping ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: pageW * 2 + 60,
        padding: '12px 16px',
        borderRadius: 50,
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        zIndex: 50,
        position: 'relative',
      }}>
        <NavBtn dir="prev" disabled={spread <= 0 || !!flipping} onClick={() => doFlip('prev')} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
            Pág.&nbsp;{curPageNum}{cur.left && cur.right ? `–${curPageNum + 1}` : ''}&nbsp;de&nbsp;{totalPages}
          </span>
          <div style={{ width: '100%', maxWidth: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#e63d3d,#ff6b6b)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <NavBtn dir="next" disabled={spread >= maxS || !!flipping} onClick={() => doFlip('next')} />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
  flexShrink: 0,
}

export default function FlipbookViewer({ src, minHeight = 480, height, className = '', onPageChange }: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFs, setIsFs] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const [rootW, setRootW] = useState(900)

  useEffect(() => {
    if (!rootRef.current) return
    const ro = new ResizeObserver(([e]) => setRootW(e.contentRect.width))
    ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const loadPdf = useCallback(async () => {
    if (!src) return
    setLoading(true); setError(null); setPages([]); setProgress(0)
    try {
      const isSameOrigin = !src.startsWith('http') || src.startsWith(window.location.origin)
      let buf: ArrayBuffer
      if (isSameOrigin) {
        const url = src.startsWith('http') ? src : new URL(src, window.location.origin).toString()
        const res = await fetchAuth(url, undefined, true)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buf = await res.arrayBuffer()
      } else {
        const res = await fetch(src)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buf = await res.arrayBuffer()
      }
      const copy = new ArrayBuffer(buf.byteLength)
      new Uint8Array(copy).set(new Uint8Array(buf))
      const pdf = await pdfjs.getDocument({ data: copy }).promise
      const total = pdf.numPages
      const out: FlipPage[] = []
      for (let i = 1; i <= total; i++) {
        const pg = await pdf.getPage(i)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const vp = pg.getViewport({ scale: 2.2 * dpr })
        const cv = document.createElement('canvas')
        cv.width = vp.width
        cv.height = vp.height
        const ctx = cv.getContext('2d')
        if (!ctx) continue
        await pg.render({ canvasContext: ctx, viewport: vp } as any).promise
        out.push({ num: i, dataUrl: cv.toDataURL('image/jpeg', 0.92) })
        setProgress(Math.round((i / total) * 100))
      }
      setPages(out)
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [src])

  useEffect(() => { loadPdf() }, [loadPdf])

  const isMobile = rootW < 620
  const pageW = isMobile ? Math.min(rootW - 16, 380) : Math.floor((rootW - 60) / 2)
  const pageH = Math.round(pageW / 0.707)
  const viewerH = height ?? Math.max(minHeight, pageH + 160)

  const toggleFs = () => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen().catch(() => { })
    else document.exitFullscreen()
  }

  return (
    <>
      <style>{`
        @keyframes fb-spin { to { transform: rotate(360deg) } }
        @keyframes fb-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes fb-badge {
          0%  { opacity:0; transform:translate(10px,-6px) scale(.88) }
          12% { opacity:1; transform:translate(0,0) scale(1) }
          72% { opacity:1; transform:translate(0,0) scale(1) }
          100%{ opacity:0; transform:translate(4px,-3px) scale(.96) }
        }
        .fb-badge { animation: fb-badge 6.5s cubic-bezier(.4,0,.2,1) forwards; pointer-events:none }
        .fb-navbtn:not(:disabled):hover { background: rgba(255,255,255,0.22) !important; transform: scale(1.04); }
      `}</style>

      {/* Outer wrapper — NO overflow:hidden so controls are always visible */}
      <div
        ref={rootRef}
        className={`relative w-full select-none ${className}`}
        style={{
          minHeight: isFs ? '100vh' : viewerH,
          height: isFs ? '100vh' : undefined,
          background: 'linear-gradient(150deg,#5a0c0c 0%,#7c1515 38%,#3d0808 100%)',
          borderRadius: isFs ? 0 : 24,
          boxShadow: isFs ? 'none' : '0 40px 120px rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px 20px',
          gap: 0,
          // KEY: no overflow:hidden here — lets controls always be clickable
        }}
      >
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 18% 5%, rgba(255,130,130,0.07) 0%, transparent 55%)', borderRadius: 'inherit' }} />

        {/* Top-right action buttons */}
        {!loading && pages.length > 0 && (
          <>
            {/* Brand badge */}
            <div className="fb-badge" style={{ position: 'absolute', top: 14, right: 14, zIndex: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 30, background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e63d3d', boxShadow: '0 0 6px #e63d3d' }} />
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Diario Mercantil · PDF</span>
              </div>
            </div>

            {/* Icon buttons */}
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 30, display: 'flex', gap: 6 }}>
              <button title="Ver en cuadrícula" onClick={() => setShowGrid(true)} style={iconBtnStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button title="Modo lectura" onClick={() => setShowRead(true)} style={iconBtnStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              </button>
              <button title={isFs ? 'Salir pantalla completa' : 'Pantalla completa'} onClick={toggleFs} style={iconBtnStyle}>
                {isFs
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 0 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                }
              </button>
            </div>
          </>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.75)', animation: 'fb-spin 0.85s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>{progress}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, margin: 0 }}>Preparando edición digital…</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>Procesando páginas del documento</p>
            </div>
            <div style={{ width: 180, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#e63d3d,#ff8080)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>No se pudo cargar el PDF</p>
            <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: 12, margin: '4px 0 16px' }}>{error}</p>
            <button onClick={loadPdf} style={{ padding: '6px 18px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && pages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No hay páginas disponibles.</p>
        )}

        {/* FLIPBOOK */}
        {!loading && pages.length > 0 && (
          <div style={{ width: '100%' }}>
            <FlipEngine
              pages={pages}
              onPageChange={(idx) => { setCurrentIdx(idx); onPageChange?.(idx) }}
            />
          </div>
        )}
      </div>

      {showRead && <ReadOverlay pages={pages} startIdx={currentIdx} onClose={() => setShowRead(false)} />}
      {showGrid && <GridOverlay pages={pages} currentIdx={currentIdx} onSelect={setCurrentIdx} onClose={() => setShowGrid(false)} />}
    </>
  )
}
